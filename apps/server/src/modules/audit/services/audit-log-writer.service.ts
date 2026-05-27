import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { AuditJsonValue, AuditLogWriteInput } from '../audit-log.types';

type NormalizedAuditLogWriteInput = {
  workspaceId: string | null;
  actorId: string | null;
  action: string;
  targetTable: string;
  targetId: string | null;
  relatedType: string | null;
  relatedId: string | null;
  beforeData: string | null;
  afterData: string | null;
  requestId: string;
  ipAddress: string | null;
  userAgent: string | null;
};

@Injectable()
export class AuditLogWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: AuditLogWriteInput): Promise<void> {
    const entry = this.normalize(input);

    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (
        workspace_id,
        actor_id,
        action,
        target_table,
        target_id,
        related_type,
        related_id,
        before_data,
        after_data,
        request_id,
        ip_address,
        user_agent,
        created_at
      )
      VALUES (
        CAST(${entry.workspaceId} AS uuid),
        CAST(${entry.actorId} AS uuid),
        ${entry.action},
        ${entry.targetTable},
        ${entry.targetId},
        ${entry.relatedType},
        ${entry.relatedId},
        CAST(${entry.beforeData} AS jsonb),
        CAST(${entry.afterData} AS jsonb),
        ${entry.requestId},
        CAST(${entry.ipAddress} AS inet),
        ${entry.userAgent},
        CURRENT_TIMESTAMP
      )
    `;
  }

  private normalize(input: AuditLogWriteInput): NormalizedAuditLogWriteInput {
    return {
      workspaceId: this.normalizeOptionalText(input.workspaceId, 'workspaceId', 36),
      actorId: this.normalizeOptionalText(input.actorId, 'actorId', 36),
      action: this.normalizeRequiredText(input.action, 'action', 120),
      targetTable: this.normalizeRequiredText(input.targetTable, 'targetTable', 120),
      targetId: this.normalizeOptionalText(input.targetId, 'targetId', 120),
      relatedType: this.normalizeOptionalText(input.relatedType, 'relatedType', 120),
      relatedId: this.normalizeOptionalText(input.relatedId, 'relatedId', 120),
      beforeData: this.serializeJson(input.beforeData),
      afterData: this.serializeJson(input.afterData),
      requestId: this.normalizeRequiredText(input.requestId, 'requestId', 120),
      ipAddress: this.normalizeOptionalText(input.ipAddress, 'ipAddress', 64),
      userAgent: this.normalizeOptionalText(input.userAgent, 'userAgent', 2048, true),
    };
  }

  private normalizeRequiredText(value: string, fieldName: string, maxLength: number): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(`audit_logs.${fieldName} is required`);
    }

    if (normalized.length > maxLength) {
      throw new Error(`audit_logs.${fieldName} must be ${maxLength} characters or fewer`);
    }

    return normalized;
  }

  private normalizeOptionalText(
    value: string | null | undefined,
    fieldName: string,
    maxLength: number,
    truncate = false,
  ): string | null {
    const normalized = value?.trim();

    if (!normalized) {
      return null;
    }

    if (normalized.length > maxLength) {
      if (truncate) {
        return normalized.slice(0, maxLength);
      }

      throw new Error(`audit_logs.${fieldName} must be ${maxLength} characters or fewer`);
    }

    return normalized;
  }

  private serializeJson(value: AuditJsonValue | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    return JSON.stringify(value);
  }
}
