import { Injectable } from '@nestjs/common';

import { AuditLogService } from '../../audit/services/audit-log.service';
import { PermissionDeniedAuditInput } from '../../audit/audit-log.types';

@Injectable()
export class SecurityAuditService {
  constructor(private readonly auditLogService: AuditLogService) {}

  async recordPermissionDenied(input: PermissionDeniedAuditInput): Promise<void> {
    await this.auditLogService.recordPermissionDenied(input);
  }
}
