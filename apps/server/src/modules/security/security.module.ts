import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { SecurityAuditService } from './services/security-audit.service';

@Module({
  imports: [AuditModule],
  providers: [SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityModule {}
