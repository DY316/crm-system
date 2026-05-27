import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { isIP } from 'node:net';

import { REQUEST_ID_HEADER } from '../../../common/constants/http-headers';
import { createRequestId } from '../../../common/utils/request-id.util';
import { AuditRequestContext } from '../audit-log.types';

@Injectable()
export class AuditRequestContextService {
  fromRequest(request: Request): AuditRequestContext {
    return {
      requestId: this.resolveRequestId(request),
      ipAddress: this.resolveIpAddress(request),
      userAgent: this.resolveUserAgent(request),
      idempotencyKey: request.idempotencyKey,
    };
  }

  private resolveRequestId(request: Request): string {
    if (request.requestId) {
      return request.requestId;
    }

    const headerRequestId = this.readHeader(request, REQUEST_ID_HEADER);
    const requestId = this.normalizeRequestId(headerRequestId) ?? createRequestId();
    request.requestId = requestId;

    return requestId;
  }

  private resolveIpAddress(request: Request): string | undefined {
    const forwardedFor = this.readHeader(request, 'x-forwarded-for')?.split(',')[0];
    const realIp = this.readHeader(request, 'x-real-ip');
    const remoteAddress = request.ip ?? request.socket.remoteAddress;

    return (
      this.normalizeIpAddress(forwardedFor) ??
      this.normalizeIpAddress(realIp) ??
      this.normalizeIpAddress(remoteAddress)
    );
  }

  private resolveUserAgent(request: Request): string | undefined {
    const userAgent = this.readHeader(request, 'user-agent')?.trim();

    if (!userAgent) {
      return undefined;
    }

    return userAgent.slice(0, 2048);
  }

  private readHeader(request: Request, headerName: string): string | undefined {
    const value = request.headers[headerName.toLowerCase()];
    const rawValue = Array.isArray(value) ? value[0] : value;

    return rawValue?.trim();
  }

  private normalizeRequestId(value: string | undefined): string | undefined {
    if (!value || value.length > 120 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
      return undefined;
    }

    return value;
  }

  private normalizeIpAddress(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    const unwrapped =
      trimmed.startsWith('[') && trimmed.includes(']')
        ? trimmed.slice(1, trimmed.indexOf(']'))
        : trimmed;
    const withoutPort = this.stripIpv4Port(unwrapped);
    const withoutMappedPrefix = withoutPort.startsWith('::ffff:')
      ? withoutPort.slice('::ffff:'.length)
      : withoutPort;

    return isIP(withoutMappedPrefix) ? withoutMappedPrefix : undefined;
  }

  private stripIpv4Port(value: string): string {
    const match = value.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);

    return match?.[1] ?? value;
  }
}
