import pg from "pg";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const prismaDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(prismaDir, "../../..");
const { Pool } = pg;

try {
  process.loadEnvFile(join(repoRoot, ".env"));
} catch {
  // Environment variables may be injected directly by CI or the shell.
}

const requiredEnv = ["DATABASE_URL", "SEED_ADMIN_EMAIL"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Missing required verification environment variables: ${missingEnv.join(", ")}`);
}

const foundationTables = [
  "users",
  "workspaces",
  "workspace_members",
  "roles",
  "permissions",
  "role_permissions",
  "user_roles",
  "audit_logs",
];

const defaultPermissionCodes = [
  "auth:me",
  "auth:logout",
  "audit_log:view",
  "system:health",
  "data_scope:all",
  "data_scope:team",
  "data_scope:own",
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function pass(actual, expected) {
  return actual === expected;
}

try {
  const tableResult = await pool.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `,
  );
  const tableNames = tableResult.rows.map((row) => row.table_name);
  const allowedTables = [...foundationTables, "_prisma_migrations"];
  const missingTables = foundationTables.filter((tableName) => !tableNames.includes(tableName));
  const unexpectedTables = tableNames.filter((tableName) => !allowedTables.includes(tableName));

  const verificationResult = await pool.query(
    `
      WITH default_workspace AS (
        SELECT id
        FROM workspaces
        WHERE slug = 'default'
          AND name = 'Default Workspace'
          AND deleted_at IS NULL
      ),
      default_admin AS (
        SELECT id
        FROM users
        WHERE email = $1
          AND password_hash LIKE 'pbkdf2_sha256$%'
          AND deleted_at IS NULL
      ),
      super_admin_role AS (
        SELECT r.id, r.workspace_id
        FROM roles r
        JOIN default_workspace w ON w.id = r.workspace_id
        WHERE r.code = 'super_admin'
          AND r.is_system = true
          AND r.deleted_at IS NULL
      ),
      default_permissions AS (
        SELECT id, code
        FROM permissions
        WHERE code = ANY($2::text[])
      )
      SELECT
        (SELECT count(*)::int FROM default_workspace) AS default_workspace_count,
        (SELECT count(*)::int FROM default_admin) AS default_admin_count,
        (SELECT count(*)::int FROM super_admin_role) AS super_admin_role_count,
        (SELECT count(*)::int FROM default_permissions) AS default_permission_count,
        (
          SELECT count(*)::int
          FROM role_permissions rp
          JOIN super_admin_role r ON r.id = rp.role_id
          JOIN default_permissions p ON p.id = rp.permission_id
        ) AS super_admin_permission_count,
        (
          SELECT count(*)::int
          FROM user_roles ur
          JOIN default_admin u ON u.id = ur.user_id
          JOIN super_admin_role r ON r.id = ur.role_id AND r.workspace_id = ur.workspace_id
        ) AS default_admin_super_admin_binding_count,
        (
          SELECT count(*)::int
          FROM workspace_members wm
          JOIN default_workspace w ON w.id = wm.workspace_id
          JOIN default_admin u ON u.id = wm.user_id
          WHERE wm.deleted_at IS NULL
        ) AS default_admin_workspace_member_count
    `,
    [process.env.SEED_ADMIN_EMAIL, defaultPermissionCodes],
  );

  const counts = verificationResult.rows[0];
  const checks = {
    foundationTablesExist: missingTables.length === 0,
    noUnexpectedTables: unexpectedTables.length === 0,
    defaultWorkspaceExists: pass(counts.default_workspace_count, 1),
    defaultAdminExists: pass(counts.default_admin_count, 1),
    superAdminRoleExists: pass(counts.super_admin_role_count, 1),
    defaultPermissionsExist: pass(counts.default_permission_count, defaultPermissionCodes.length),
    superAdminHasAllDefaultPermissions: pass(
      counts.super_admin_permission_count,
      defaultPermissionCodes.length,
    ),
    defaultAdminHasSuperAdmin: pass(counts.default_admin_super_admin_binding_count, 1),
    defaultAdminIsWorkspaceMember: pass(counts.default_admin_workspace_member_count, 1),
  };

  const ok = Object.values(checks).every(Boolean);
  const summary = {
    ok,
    checks,
    details: {
      foundationTables,
      missingTables,
      unexpectedTables,
      defaultPermissionCodes,
      counts,
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!ok) {
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}
