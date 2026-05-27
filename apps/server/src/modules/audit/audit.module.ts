import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogWriterService } from './services/audit-log-writer.service';
import { AuditRequestContextService } from './services/audit-request-context.service';

@Module({
  imports: [PrismaModule],
  providers: [AuditLogService, AuditLogWriterService, AuditRequestContextService],
  exports: [AuditLogService, AuditLogWriterService, AuditRequestContextService],
})
export class AuditModule {}
