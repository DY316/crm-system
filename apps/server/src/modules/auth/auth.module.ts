import { Module } from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { RbacModule } from '../rbac/rbac.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from './jwt.module';
import { LoginRateLimiterService } from './services/login-rate-limiter.service';
import { PasswordHashService } from './services/password-hash.service';

@Module({
  imports: [PrismaModule, RbacModule, JwtModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordHashService, LoginRateLimiterService, JwtAuthGuard, RoleGuard, PermissionsGuard],
  exports: [AuthService, JwtModule, RoleGuard, PermissionsGuard],
})
export class AuthModule {}
