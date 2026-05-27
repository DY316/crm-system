import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';
import { CommonModule } from './common/common.module';
import { AuditEventMiddleware } from './common/middleware/audit-event.middleware';
import { IdempotencyKeyMiddleware } from './common/middleware/idempotency-key.middleware';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { SecurityModule } from './modules/security/security.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [appConfig],
      validate: validateEnv,
    }),
    CommonModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    RbacModule,
    AuditModule,
    SecurityModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        RequestContextMiddleware,
        IdempotencyKeyMiddleware,
        AuditEventMiddleware,
        RequestLoggerMiddleware,
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
