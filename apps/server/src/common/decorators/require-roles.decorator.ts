import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ROLES_KEY = 'require_roles';

export const RequireRoles = (...roles: string[]) => SetMetadata(REQUIRE_ROLES_KEY, roles);
