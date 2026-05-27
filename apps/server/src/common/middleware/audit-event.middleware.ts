import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { AuditJsonValue } from '../../modules/audit/audit-log.types';
import { AuditLogService } from '../../modules/audit/services/audit-log.service';
import { AuditRequestContextService } from '../../modules/audit/services/audit-request-context.service';
import { SecurityAuditService } from '../../modules/security/services/security-audit.service';

type RequestWithAuthContext = Request & {
  body?: unknown;
  user?: unknown;
  auth?: unknown;
};

type IdentityContext = {
  actorId?: string;
  workspaceId?: string;
};

@Injectable()
export class AuditEventMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditEventMiddleware.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly auditRequestContextService: AuditRequestContextService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    let responseBody: unknown;
    const originalJson = response.json;
    const originalSend = response.send;

    response.json = function patchedJson(this: Response, body?: unknown): Response {
      responseBody = body;
      return originalJson.call(this, body);
    } as Response['json'];

    response.send = function patchedSend(this: Response, body?: unknown): Response {
      responseBody ??= parseResponseBody(body);
      return originalSend.call(this, body);
    } as Response['send'];

    response.on('finish', () => {
      void this.recordAuditEvent(request, response, responseBody).catch((error: unknown) => {
        const stack = error instanceof Error ? error.stack : undefined;
        const message = error instanceof Error ? error.message : 'Failed to write audit event';
        this.logger.error(message, stack, request.requestId);
      });
    });

    next();
  }

  private async recordAuditEvent(
    request: Request,
    response: Response,
    responseBody: unknown,
  ): Promise<void> {
    const path = this.normalizePath(request.originalUrl || request.url);
    const metadata = this.buildMetadata(request, response, responseBody, path);

    if (response.statusCode === 403) {
      await this.recordPermissionDeniedAudit(request, responseBody, metadata);
      return;
    }

    if (this.isLoginPath(request, path)) {
      await this.recordLoginAudit(request, response, responseBody, metadata);
      return;
    }

    if (this.isLogoutPath(request, path)) {
      await this.recordLogoutAudit(request, response, metadata);
      return;
    }
  }

  private async recordLoginAudit(
    request: Request,
    response: Response,
    responseBody: unknown,
    metadata: AuditJsonValue,
  ): Promise<void> {
    const requestContext = this.auditRequestContextService.fromRequest(request);
    const loginIdentifier = this.getLoginIdentifier(request);

    if (response.statusCode >= 200 && response.statusCode < 400) {
      const identity = this.extractIdentity(request, responseBody);

      if (!identity.actorId) {
        this.logger.warn('Skipping login success audit because actor_id is unavailable');
        return;
      }

      await this.auditLogService.recordLoginSuccess({
        workspaceId: identity.workspaceId,
        actorId: identity.actorId,
        requestContext,
        metadata,
      });
      return;
    }

    if (response.statusCode === 429) {
      await this.auditLogService.recordLoginRateLimited({
        loginIdentifier,
        requestContext,
        reason: this.extractErrorReason(responseBody) ?? 'login_rate_limited',
        metadata,
      });
      return;
    }

    if (response.statusCode >= 400) {
      await this.auditLogService.recordLoginFailure({
        loginIdentifier,
        requestContext,
        reason: this.extractErrorReason(responseBody) ?? 'login_failed',
        metadata,
      });
    }
  }

  private async recordLogoutAudit(
    request: Request,
    response: Response,
    metadata: AuditJsonValue,
  ): Promise<void> {
    if (response.statusCode < 200 || response.statusCode >= 400) {
      return;
    }

    const identity = this.extractIdentity(request);

    if (!identity.actorId) {
      this.logger.warn('Skipping logout audit because actor_id is unavailable');
      return;
    }

    await this.auditLogService.recordLogout({
      workspaceId: identity.workspaceId,
      actorId: identity.actorId,
      requestContext: this.auditRequestContextService.fromRequest(request),
      metadata,
    });
  }

  private async recordPermissionDeniedAudit(
    request: Request,
    responseBody: unknown,
    metadata: AuditJsonValue,
  ): Promise<void> {
    const identity = this.extractIdentity(request);
    const permissionCode = this.extractPermissionCode(responseBody);

    await this.securityAuditService.recordPermissionDenied({
      workspaceId: identity.workspaceId,
      actorId: identity.actorId,
      permissionCode,
      requestContext: this.auditRequestContextService.fromRequest(request),
      reason: this.extractErrorReason(responseBody) ?? 'permission_denied',
      metadata,
    });
  }

  private buildMetadata(
    request: Request,
    response: Response,
    responseBody: unknown,
    path: string,
  ): AuditJsonValue {
    return compactJson({
      method: request.method,
      path,
      status_code: response.statusCode,
      error_code: this.extractErrorCode(responseBody),
    });
  }

  private extractIdentity(request: Request, responseBody?: unknown): IdentityContext {
    const authRequest = request as RequestWithAuthContext;
    const requestUser = toRecord(authRequest.user);
    const requestAuth = toRecord(authRequest.auth);
    const responseRoot = toRecord(responseBody);
    const responseData = toRecord(responseRoot?.data) ?? responseRoot;
    const nestedRequestUser = toRecord(requestUser?.user);
    const nestedResponseUser = toRecord(responseData?.user);
    const nestedRequestWorkspace = toRecord(requestUser?.workspace);
    const nestedResponseWorkspace = toRecord(responseData?.workspace);

    return {
      actorId: firstString(
        nestedRequestUser?.id,
        requestUser?.id,
        requestUser?.sub,
        requestAuth?.user_id,
        requestAuth?.userId,
        nestedResponseUser?.id,
        responseData?.user_id,
        responseData?.userId,
        responseData?.actor_id,
        responseData?.actorId,
      ),
      workspaceId: firstString(
        nestedRequestWorkspace?.id,
        requestUser?.workspace_id,
        requestUser?.workspaceId,
        nestedResponseWorkspace?.id,
        responseData?.workspace_id,
        responseData?.workspaceId,
      ),
    };
  }

  private getLoginIdentifier(request: Request): string | undefined {
    const body = toRecord((request as RequestWithAuthContext).body);
    const email = firstString(body?.email);

    return email?.trim().toLowerCase();
  }

  private extractErrorReason(responseBody: unknown): string | undefined {
    const root = toRecord(responseBody);
    const error = toRecord(root?.error);

    return firstString(error?.message, root?.message, error?.code, root?.code);
  }

  private extractErrorCode(responseBody: unknown): string | undefined {
    const root = toRecord(responseBody);
    const error = toRecord(root?.error);

    return firstString(error?.code, root?.code);
  }

  private extractPermissionCode(responseBody: unknown): string {
    const root = toRecord(responseBody);
    const error = toRecord(root?.error);
    const details = toRecord(error?.details) ?? toRecord(root?.details);

    return (
      firstString(
        details?.permission_code,
        details?.permissionCode,
        error?.permission_code,
        error?.permissionCode,
        error?.code,
        root?.code,
      ) ?? 'permission_denied'
    );
  }

  private isLoginPath(request: Request, path: string): boolean {
    return request.method.toUpperCase() === 'POST' && path.endsWith('/auth/login');
  }

  private isLogoutPath(request: Request, path: string): boolean {
    return request.method.toUpperCase() === 'POST' && path.endsWith('/auth/logout');
  }

  private normalizePath(url: string): string {
    const path = url.split('?')[0] || '/';

    return path.length > 1 ? path.replace(/\/+$/, '') : path;
  }
}

function parseResponseBody(body: unknown): unknown {
  if (Buffer.isBuffer(body)) {
    return parseJson(body.toString('utf8')) ?? body;
  }

  if (typeof body === 'string') {
    return parseJson(body) ?? body;
  }

  return body;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function compactJson(value: Record<string, AuditJsonValue | undefined>): AuditJsonValue {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as { [key: string]: AuditJsonValue };
}
