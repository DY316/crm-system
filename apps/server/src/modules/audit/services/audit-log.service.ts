import { Injectable } from '@nestjs/common';

import {
  AUDIT_ACTIONS,
  AUDIT_RELATED_TYPES,
  AUDIT_TARGET_TABLES,
} from '../audit.constants';
import {
  AuditEventInput,
  AuditJsonValue,
  AuditLogWriteInput,
  LoginFailureAuditInput,
  LoginRateLimitedAuditInput,
  LoginSuccessAuditInput,
  LogoutAuditInput,
  PermissionDeniedAuditInput,
} from '../audit-log.types';
import { AuditLogWriterService } from './audit-log-writer.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly auditLogWriter: AuditLogWriterService) {}

  async write(input: AuditLogWriteInput): Promise<void> {
    await this.auditLogWriter.write(input);
  }

  async recordLoginSuccess(input: LoginSuccessAuditInput): Promise<void> {
    await this.writeAuthAuditLog(input, {
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      actorId: input.actorId,
      targetId: input.actorId,
      result: 'success',
    });
  }

  async recordLoginFailure(input: LoginFailureAuditInput): Promise<void> {
    await this.writeAuthAuditLog(input, {
      action: AUDIT_ACTIONS.LOGIN_FAILURE,
      actorId: input.actorId ?? null,
      targetId: input.actorId ?? null,
      result: 'failure',
      reason: input.reason,
      loginIdentifier: input.loginIdentifier,
    });
  }

  async recordLoginRateLimited(input: LoginRateLimitedAuditInput): Promise<void> {
    await this.writeAuthAuditLog(input, {
      action: AUDIT_ACTIONS.LOGIN_RATE_LIMITED,
      actorId: input.actorId ?? null,
      targetId: input.actorId ?? null,
      result: 'rate_limited',
      reason: input.reason,
      loginIdentifier: input.loginIdentifier,
      retryAfterSeconds: input.retryAfterSeconds,
    });
  }

  async recordLogout(input: LogoutAuditInput): Promise<void> {
    await this.writeAuthAuditLog(input, {
      action: AUDIT_ACTIONS.LOGOUT,
      actorId: input.actorId,
      targetId: input.actorId,
      result: 'logout',
    });
  }

  async recordPermissionDenied(input: PermissionDeniedAuditInput): Promise<void> {
    await this.auditLogWriter.write({
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: AUDIT_ACTIONS.PERMISSION_DENIED,
      targetTable: input.targetTable ?? AUDIT_TARGET_TABLES.PERMISSIONS,
      targetId: input.targetId ?? input.permissionCode,
      relatedType: AUDIT_RELATED_TYPES.PERMISSION,
      relatedId: input.permissionCode,
      beforeData: null,
      afterData: this.compact({
        result: 'denied',
        permission_code: input.permissionCode,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        reason: input.reason,
        metadata: input.metadata,
      }),
      requestId: input.requestContext.requestId,
      ipAddress: input.requestContext.ipAddress,
      userAgent: input.requestContext.userAgent,
    });
  }

  private async writeAuthAuditLog(
    input: AuditEventInput,
    event: {
      action: string;
      actorId: string | null;
      targetId: string | null;
      result: string;
      reason?: string;
      loginIdentifier?: string;
      retryAfterSeconds?: number;
    },
  ): Promise<void> {
    await this.auditLogWriter.write({
      workspaceId: input.workspaceId,
      actorId: event.actorId,
      action: event.action,
      targetTable: AUDIT_TARGET_TABLES.USERS,
      targetId: event.targetId,
      relatedType: AUDIT_RELATED_TYPES.AUTH,
      relatedId: event.targetId,
      beforeData: null,
      afterData: this.compact({
        result: event.result,
        reason: event.reason,
        login_identifier: event.loginIdentifier,
        retry_after_seconds: event.retryAfterSeconds,
        idempotency_key: input.requestContext.idempotencyKey,
        metadata: input.metadata,
      }),
      requestId: input.requestContext.requestId,
      ipAddress: input.requestContext.ipAddress,
      userAgent: input.requestContext.userAgent,
    });
  }

  private compact(value: Record<string, AuditJsonValue | undefined>): AuditJsonValue {
    return Object.fromEntries(
      Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
    ) as { [key: string]: AuditJsonValue };
  }
}
