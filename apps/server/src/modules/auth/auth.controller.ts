import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '../../common/types/authenticated-user.type';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto, @Req() request: Request): Promise<LoginResult> {
    return this.authService.login(body, {
      ipAddress: this.getClientIp(request),
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('auth:me')
  me(@CurrentUser() currentUser: AuthenticatedUser): AuthenticatedUser {
    return currentUser;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('auth:logout')
  logout(@Req() request: AuthenticatedRequest): { revoked: true } {
    return this.authService.logout(request.auth?.token_id ?? '');
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0]?.trim() || 'unknown';
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0] ?? 'unknown';
    }

    return request.ip ?? request.socket.remoteAddress ?? 'unknown';
  }
}
