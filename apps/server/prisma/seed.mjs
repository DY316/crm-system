import pg from "pg";
import { dirname, join, resolve } from "node:path";
import { pbkdf2Sync, randomBytes } from "node:crypto";
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

const requiredEnv = ["DATABASE_URL", "SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Missing required seed environment variables: ${missingEnv.join(", ")}`);
}

const permissions = [
  {
    code: "auth:me",
    name: "Read current user",
    description: "Allows reading the current authenticated user profile.",
  },
  {
    code: "auth:logout",
    name: "Logout",
    description: "Allows ending the current authenticated session.",
  },
  {
    code: "audit_log:view",
    name: "View audit logs",
    description: "Allows viewing foundation audit logs.",
  },
  {
    code: "system:health",
    name: "Read system health",
    description: "Allows reading system health checks.",
  },
  {
    code: "data_scope:all",
    name: "Data scope all",
    description: "Allows access to all workspace data in authorized modules.",
  },
  {
    code: "data_scope:team",
    name: "Data scope team",
    description: "Allows access to team-scoped data in authorized modules.",
  },
  {
    code: "data_scope:own",
    name: "Data scope own",
    description: "Allows access to self-owned data in authorized modules.",
  },
];

function hashPassword(password) {
  const iterations = 310000;
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");

  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const permissionValues = permissions
  .map((permission) => {
    return `(${sqlString(permission.code)}, ${sqlString(permission.name)}, ${sqlString(permission.description)})`;
  })
  .join(",\n    ");

const seedSql = `
BEGIN;

SET LOCAL TIME ZONE 'UTC';

WITH workspace_upsert AS (
  INSERT INTO "workspaces" ("name", "slug", "status")
  VALUES ('Default Workspace', 'default', 'active')
  ON CONFLICT ("slug") DO UPDATE
    SET "name" = EXCLUDED."name",
        "status" = EXCLUDED."status",
        "deleted_at" = NULL,
        "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id"
),
admin_upsert AS (
  INSERT INTO "users" ("email", "password_hash", "display_name", "status")
  VALUES (
    ${sqlString(process.env.SEED_ADMIN_EMAIL)},
    ${sqlString(hashPassword(process.env.SEED_ADMIN_PASSWORD))},
    'Super Admin',
    'active'
  )
  ON CONFLICT ("email") DO UPDATE
    SET "password_hash" = EXCLUDED."password_hash",
        "display_name" = EXCLUDED."display_name",
        "status" = EXCLUDED."status",
        "deleted_at" = NULL,
        "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id"
),
role_upsert AS (
  INSERT INTO "roles" ("workspace_id", "code", "name", "description", "is_system")
  SELECT "id", 'super_admin', 'Super Admin', 'Full system administrator for the default workspace.', true
  FROM workspace_upsert
  ON CONFLICT ("workspace_id", "code") DO UPDATE
    SET "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "is_system" = true,
        "deleted_at" = NULL,
        "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id", "workspace_id"
),
permissions_upsert AS (
  INSERT INTO "permissions" ("code", "name", "description")
  VALUES
    ${permissionValues}
  ON CONFLICT ("code") DO UPDATE
    SET "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id"
),
member_upsert AS (
  INSERT INTO "workspace_members" ("workspace_id", "user_id", "status")
  SELECT workspace_upsert."id", admin_upsert."id", 'active'
  FROM workspace_upsert, admin_upsert
  ON CONFLICT ("workspace_id", "user_id") DO UPDATE
    SET "status" = EXCLUDED."status",
        "deleted_at" = NULL,
        "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id"
),
user_role_upsert AS (
  INSERT INTO "user_roles" ("user_id", "role_id", "workspace_id")
  SELECT admin_upsert."id", role_upsert."id", role_upsert."workspace_id"
  FROM admin_upsert, role_upsert
  ON CONFLICT ("user_id", "role_id", "workspace_id") DO NOTHING
  RETURNING "id"
),
role_permissions_insert AS (
  INSERT INTO "role_permissions" ("role_id", "permission_id")
  SELECT role_upsert."id", permissions_upsert."id"
  FROM role_upsert
  CROSS JOIN permissions_upsert
  ON CONFLICT ("role_id", "permission_id") DO NOTHING
  RETURNING "id"
)
SELECT
  (SELECT count(*) FROM permissions_upsert) AS permissions_seeded,
  (SELECT count(*) FROM member_upsert) AS memberships_seeded,
  (SELECT count(*) FROM user_role_upsert) AS user_roles_seeded,
  (SELECT count(*) FROM role_permissions_insert) AS role_permissions_seeded;

COMMIT;
`;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
try {
  await pool.query(seedSql);
} finally {
  await pool.end();
}
