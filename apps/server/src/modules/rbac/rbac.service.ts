import { Injectable } from '@nestjs/common';

import { DATA_SCOPE_CODES } from '../../common/constants/data-scope.constants';
import { AuthDataScope, AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';

const DATA_SCOPE_BY_CODE = new Map<string, AuthDataScope>([
  [DATA_SCOPE_CODES.ALL, { code: DATA_SCOPE_CODES.ALL, scope: 'all' }],
  [DATA_SCOPE_CODES.TEAM, { code: DATA_SCOPE_CODES.TEAM, scope: 'team' }],
  [DATA_SCOPE_CODES.OWN, { code: DATA_SCOPE_CODES.OWN, scope: 'own' }],
]);

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserContext(userId: string, workspaceId?: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!user || user.status !== 'active') {
      return null;
    }

    const workspaceMember = await this.prisma.workspaceMember.findFirst({
      where: {
        user_id: user.id,
        workspace_id: workspaceId,
        status: 'active',
        deleted_at: null,
        workspace: {
          status: 'active',
          deleted_at: null,
        },
      },
      include: {
        workspace: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    if (!workspaceMember) {
      return null;
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        user_id: user.id,
        workspace_id: workspaceMember.workspace_id,
      },
      include: {
        role: {
          include: {
            role_permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    const activeRoles = userRoles
      .map((userRole) => userRole.role)
      .filter((role) => role.deleted_at === null);
    const permissions = Array.from(
      new Set(
        activeRoles.flatMap((role) =>
          role.role_permissions.map((rolePermission) => rolePermission.permission.code),
        ),
      ),
    ).sort();

    return {
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        status: user.status,
      },
      workspace: {
        id: workspaceMember.workspace.id,
        name: workspaceMember.workspace.name,
        slug: workspaceMember.workspace.slug,
        status: workspaceMember.workspace.status,
      },
      roles: activeRoles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        is_system: role.is_system,
      })),
      permissions,
      data_scope: permissions
        .map((permission) => DATA_SCOPE_BY_CODE.get(permission))
        .filter((scope): scope is AuthDataScope => Boolean(scope)),
    };
  }
}
