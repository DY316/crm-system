import { Injectable, UnauthorizedException } from '@nestjs/common';

import {
  AuthenticatedUser,
  AuthTokenContext,
} from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { LoginDto } from './dto/login.dto';
import { AuthSessionService } from './services/auth-session.service';
import { JwtTokenService } from './services/jwt-token.service';
import { LoginRateLimiterService } from './services/login-rate-limiter.service';
import { PasswordHashService } from './services/password-hash.service';

export type LoginResult = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  expires_at: string;
  user: AuthenticatedUser['user'];
  workspace: AuthenticatedUser['workspace'];
  roles: AuthenticatedUser['roles'];
  permissions: string[];
  data_scope: AuthenticatedUser['data_scope'];
};

export type AuthenticatedAccessToken = {
  user: AuthenticatedUser;
  token: AuthTokenContext;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHashService: PasswordHashService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly authSessionService: AuthSessionService,
    private readonly loginRateLimiterService: LoginRateLimiterService,
    private readonly rbacService: RbacService,
  ) {}

  async login(input: LoginDto, metadata: { ipAddress: string }): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();

    this.loginRateLimiterService.assertAllowed(metadata.ipAddress, email);

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });

    if (!user) {
      this.recordFailedLogin(metadata.ipAddress, email);
      throw this.invalidLogin();
    }

    const passwordMatches = this.passwordHashService.verify(input.password, user.password_hash);

    if (!passwordMatches || user.status !== 'active') {
      this.recordFailedLogin(metadata.ipAddress, email);
      throw this.invalidLogin();
    }

    const currentUser = await this.rbacService.getUserContext(user.id);

    if (!currentUser) {
      this.recordFailedLogin(metadata.ipAddress, email);
      throw this.invalidLogin();
    }

    const token = this.jwtTokenService.signAccessToken({
      userId: user.id,
      email: user.email,
      workspaceId: currentUser.workspace.id,
    });

    this.authSessionService.create(token.claims.jti, user.id, token.expiresAt);
    this.loginRateLimiterService.recordSuccess(metadata.ipAddress, email);

    return {
      access_token: token.token,
      token_type: 'Bearer',
      expires_in: token.expiresIn,
      expires_at: token.expiresAt.toISOString(),
      user: currentUser.user,
      workspace: currentUser.workspace,
      roles: currentUser.roles,
      permissions: currentUser.permissions,
      data_scope: currentUser.data_scope,
    };
  }

  async authenticateAccessToken(accessToken: string): Promise<AuthenticatedAccessToken> {
    const claims = this.jwtTokenService.verifyAccessToken(accessToken);

    if (!this.authSessionService.validate(claims.jti, claims.sub)) {
      throw this.unauthorized();
    }

    const currentUser = await this.rbacService.getUserContext(claims.sub, claims.workspace_id);

    if (!currentUser) {
      this.authSessionService.revoke(claims.jti);
      throw this.unauthorized();
    }

    return {
      user: currentUser,
      token: {
        token_id: claims.jti,
        user_id: claims.sub,
        expires_at: new Date(claims.exp * 1000).toISOString(),
      },
    };
  }

  logout(tokenId: string): { revoked: true } {
    this.authSessionService.revoke(tokenId);
    return { revoked: true };
  }

  private recordFailedLogin(ipAddress: string, email: string): void {
    this.loginRateLimiterService.recordFailure(ipAddress, email);
  }

  private invalidLogin(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'AUTH_UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
}
