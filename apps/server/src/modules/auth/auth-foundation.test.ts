import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { test } from 'node:test';

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { REQUIRE_ROLES_KEY } from '../../common/decorators/require-roles.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { AuthenticatedRequest, AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AuthSessionService } from './services/auth-session.service';
import { JwtTokenService } from './services/jwt-token.service';
import { LoginRateLimiterService } from './services/login-rate-limiter.service';
import { PasswordHashService } from './services/password-hash.service';

function createStoredPassword(password: string): string {
  const iterations = 1_000;
  const salt = 'test-salt';
  const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');

  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

function createContext(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    getClass: () => Object,
    getHandler: () => createContext,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function createReflector(key: string, values: string[]): Reflector {
  return {
    getAllAndOverride: (metadataKey: string) => (metadataKey === key ? values : undefined),
  } as unknown as Reflector;
}

const authenticatedUser: AuthenticatedUser = {
  user: {
    id: 'user-1',
    email: 'admin@example.com',
    display_name: 'Admin',
    status: 'active',
  },
  workspace: {
    id: 'workspace-1',
    name: 'Default Workspace',
    slug: 'default',
    status: 'active',
  },
  roles: [
    {
      id: 'role-1',
      code: 'super_admin',
      name: 'Super Admin',
      is_system: true,
    },
  ],
  permissions: ['auth:me', 'auth:logout', 'data_scope:all'],
  data_scope: [{ code: 'data_scope:all', scope: 'all' }],
};

test('PasswordHashService verifies PBKDF2-SHA256 hashes', () => {
  const service = new PasswordHashService();
  const storedPassword = createStoredPassword('correct-password');

  assert.equal(service.verify('correct-password', storedPassword), true);
  assert.equal(service.verify('wrong-password', storedPassword), false);
  assert.equal(service.verify('correct-password', 'plain-text'), false);
});

test('JwtTokenService signs, verifies, and expires access tokens', async () => {
  process.env.JWT_ACCESS_TOKEN_TTL_SECONDS = '1';
  const service = new JwtTokenService();
  const signed = service.signAccessToken({
    userId: 'user-1',
    email: 'admin@example.com',
    workspaceId: 'workspace-1',
  });

  assert.equal(service.verifyAccessToken(signed.token).sub, 'user-1');

  await new Promise((resolve) => setTimeout(resolve, 1_200));
  assert.throws(() => service.verifyAccessToken(signed.token), /Access token expired/);
});

test('AuthSessionService revokes a token session', () => {
  const service = new AuthSessionService();

  service.create('token-1', 'user-1', new Date(Date.now() + 60_000));

  assert.equal(service.validate('token-1', 'user-1'), true);
  service.revoke('token-1');
  assert.equal(service.validate('token-1', 'user-1'), false);
});

test('LoginRateLimiterService blocks repeated failures by IP and email', () => {
  process.env.LOGIN_RATE_LIMIT_MAX = '2';
  process.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS = '60';
  const service = new LoginRateLimiterService();

  service.assertAllowed('127.0.0.1', 'admin@example.com');
  service.recordFailure('127.0.0.1', 'admin@example.com');
  service.recordFailure('127.0.0.1', 'admin@example.com');

  assert.throws(
    () => service.assertAllowed('127.0.0.1', 'admin@example.com'),
    /Too many login attempts/,
  );
});

test('PermissionsGuard requires all decorated permissions', () => {
  const guard = new PermissionsGuard(createReflector(REQUIRE_PERMISSIONS_KEY, ['auth:me']));

  assert.equal(guard.canActivate(createContext({ user: authenticatedUser })), true);

  const deniedGuard = new PermissionsGuard(
    createReflector(REQUIRE_PERMISSIONS_KEY, ['missing:permission']),
  );

  assert.throws(() => deniedGuard.canActivate(createContext({ user: authenticatedUser })));
});

test('RoleGuard accepts any decorated role match', () => {
  const guard = new RoleGuard(createReflector(REQUIRE_ROLES_KEY, ['super_admin']));

  assert.equal(guard.canActivate(createContext({ user: authenticatedUser })), true);

  const deniedGuard = new RoleGuard(createReflector(REQUIRE_ROLES_KEY, ['operator']));

  assert.throws(() => deniedGuard.canActivate(createContext({ user: authenticatedUser })));
});
