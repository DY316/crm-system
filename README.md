# CRM System

## Backend Foundation

### Requirements

- Node.js >=20 <25
- pnpm >=9 <10

### Install

```bash
pnpm install
```

#### Windows PowerShell

Default Windows PowerShell may block `pnpm.ps1` because of `ExecutionPolicy`.
Use one of these options before running the install flow:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
pnpm install
```

Or call the command shim directly without changing the execution policy:

```powershell
pnpm.cmd install
```

If you choose the `pnpm.cmd` path, use the same form for later commands, for example `pnpm.cmd server:dev`.

### Environment

Copy `.env.example` to `.env` if local overrides are needed.

Server-related variables:

- `NODE_ENV`: runtime environment, defaults to `development`
- `SERVER_HOST`: bind host, defaults to `0.0.0.0`
- `SERVER_PORT`: server port, defaults to `3000`
- `SERVER_CORS_ORIGINS`: comma-separated CORS origins

### Start Backend

```bash
pnpm server:dev
```

The backend listens on `http://localhost:3000` by default. If port `3000` is already in use locally, set `SERVER_PORT` to another port before starting.

### Health Check

```bash
curl http://localhost:3000/api/v1/system/health
```

Expected response body shape:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  },
  "error": null,
  "request_id": "req_xxx"
}
```

The response header includes `x-request-id`.

### DTO Validation Check

```bash
curl "http://localhost:3000/api/v1/system/ping?limit=10"
curl "http://localhost:3000/api/v1/system/ping?limit=bad"
curl "http://localhost:3000/api/v1/system/ping?extra=1"
```

The invalid examples return the unified error envelope with `VALIDATION_ERROR`.

### Verification

```bash
pnpm server:typecheck
pnpm server:build
pnpm server:test
```

### Docker Compose

```bash
docker compose up --build server
```

The compose service uses `.env.example`-compatible server variables:

- `NODE_ENV`
- `SERVER_HOST`
- `SERVER_PORT`
- `SERVER_CORS_ORIGINS`

Health check after startup:

```bash
curl http://localhost:3000/api/v1/system/health
```

### API Base Path

All formal backend APIs use the `/api/v1` global prefix.

### Response Envelope

Success:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "request_id": "req_xxx"
}
```

Error:

```json
{
  "success": false,
  "request_id": "req_xxx",
  "error": {
    "code": "ERROR_CODE",
    "message": "error message"
  }
}
```

### Audit And Security Foundation

Stage 0 provides backend-only audit/security primitives without adding login APIs,
JWT, RBAC guards, schema changes, migrations, seeds, or frontend pages.

Audit services live under `apps/server/src/modules/audit`:

- `AuditLogWriterService` writes append-only rows to `audit_logs`.
- `AuditLogService` exposes event methods for login success, login failure, login rate limiting, logout, and permission denial.
- `AuditRequestContextService` extracts `request_id`, IP address, User-Agent, and optional `Idempotency-Key` from an Express request.
- `AuditEventMiddleware` observes auth/login, auth/logout, and HTTP 403 responses and calls audit services without implementing auth, JWT, or RBAC logic.

Every audit writer call requires a non-empty `requestId`. The request context
middleware accepts a valid inbound `x-request-id` or generates one, stores it on
`request.requestId`, and sends it back in the `x-request-id` response header.
Audit rows store that value in `audit_logs.request_id` for cross-log correlation.

Audit rows include:

- `workspace_id`
- `actor_id`
- `action`
- `target_table`
- `target_id`
- `related_type`
- `related_id`
- `before_data`
- `after_data`
- `request_id`
- `ip_address`
- `user_agent`
- `created_at`

Security services live under `apps/server/src/modules/security`:

- `SecurityAuditService.recordPermissionDenied(...)` delegates to the audit log service.
- Future permission guards can inject this service directly, while `AuditEventMiddleware` also records 403 responses as a minimal no-RBAC hook.

`Idempotency-Key` foundation lives in `apps/server/src/common`:

- `IdempotencyKeyMiddleware` normalizes the `Idempotency-Key` header and stores it on `request.idempotencyKey`.
- `IdempotencyKeyService` provides key normalization, write-method detection, scoped storage key building, and deterministic payload fingerprinting.
- Stage 0 does not perform durable request de-duplication; future write APIs can use the service as the extension point.

### UTC Time Rule

Backend services should store, compare, and return timestamps in UTC. API timestamps should use ISO 8601 UTC strings, for example `2026-05-27T05:30:00.000Z`. Local time zones belong in presentation logic and should not be persisted in backend domain records.

## Database Scope

Stage 0 creates only the database foundation:

- `users`
- `workspaces`
- `workspace_members`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `audit_logs`

All timestamp columns use PostgreSQL `TIMESTAMPTZ(6)` and are intended to be stored and read as UTC. Soft delete tables use a nullable `deleted_at` column.

## Database Environment

Copy `.env.example` to `.env`, then change the seed administrator password before running seed:

```powershell
Copy-Item .env.example .env
```

Required database and seed variables:

- `DATABASE_URL`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `TZ`
- `PGTZ`

## Start PostgreSQL

```powershell
docker compose up -d postgres
```

The PostgreSQL service is configured with `TZ=UTC` and `PGTZ=UTC`.

## Prisma Commands

Use the Prisma config under `apps/server/prisma`:

```powershell
pnpm.cmd --filter @crm/server db:generate
pnpm.cmd --filter @crm/server db:migrate:deploy
pnpm.cmd --filter @crm/server db:seed
pnpm.cmd --filter @crm/server exec node prisma/verify-foundation.mjs
```

For local migration development after schema changes:

```powershell
pnpm.cmd --filter @crm/server exec prisma migrate dev --name database_foundation --config prisma/prisma.config.cjs
```

Prisma is pinned in `apps/server/package.json` and resolved in `pnpm-lock.yaml`; do not use temporary `npx` Prisma installs for database foundation work.

## No Docker PostgreSQL Acceptance

When Docker is unavailable on Windows, install PostgreSQL locally and validate against `localhost:5432`.

1. Install PostgreSQL 16 or newer from the official Windows installer, include Command Line Tools, and keep the server listening on port `5432`.
2. Open PowerShell and create the role/database with `psql`:

```powershell
psql -U postgres -h localhost -p 5432
```

```sql
CREATE ROLE crm WITH LOGIN PASSWORD 'crm_password';
CREATE DATABASE crm OWNER crm;
\q
```

3. Set local environment variables or write them to `.env`:

```powershell
$env:DATABASE_URL="postgresql://crm:crm_password@localhost:5432/crm?schema=public"
$env:SEED_ADMIN_EMAIL="admin@example.com"
$env:SEED_ADMIN_PASSWORD="change-me-before-seeding"
$env:TZ="UTC"
$env:PGTZ="UTC"
```

4. Install pinned dependencies and run database acceptance:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd --filter @crm/server db:generate
pnpm.cmd --filter @crm/server db:migrate:deploy
pnpm.cmd --filter @crm/server db:seed
pnpm.cmd --filter @crm/server exec node prisma/verify-foundation.mjs
```

5. The verification command must return `"ok": true`. It checks the 8 foundation tables, default workspace, default administrator, `super_admin`, default permissions, role-permission bindings, and administrator role binding.

Manual spot-check queries:

```sql
SELECT slug, name FROM workspaces WHERE slug = 'default';
SELECT email, password_hash LIKE 'pbkdf2_sha256$%' AS password_is_hashed FROM users WHERE email = 'admin@example.com';
SELECT code, is_system FROM roles WHERE code = 'super_admin';
SELECT code FROM permissions ORDER BY code;
SELECT count(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.code = 'super_admin';
SELECT count(*) FROM user_roles ur JOIN users u ON u.id = ur.user_id JOIN roles r ON r.id = ur.role_id WHERE u.email = 'admin@example.com' AND r.code = 'super_admin';
```

## GitHub Actions Database Acceptance

The CI workflow at `.github/workflows/database-foundation.yml` performs the real database acceptance path with a PostgreSQL 16 service. It uses:

- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crm?schema=public`
- `SEED_ADMIN_EMAIL=admin@example.com`
- `SEED_ADMIN_PASSWORD=change-me-before-seeding`
- `TZ=UTC`
- `PGTZ=UTC`

The workflow runs these commands and fails immediately if any step fails:

```bash
pnpm install --frozen-lockfile
pnpm --filter @crm/server db:generate
pnpm --filter @crm/server db:migrate:deploy
pnpm --filter @crm/server db:seed
pnpm --filter @crm/server exec node prisma/verify-foundation.mjs
pnpm server:typecheck
pnpm server:build
```

To view the result in GitHub, open the repository, choose the Actions tab, then select the Database Foundation workflow run for the branch or pull request. The workflow must be PASS before `feature/database-foundation` is allowed to merge toward `develop`.

## Soft Delete Strategy

Soft delete is enabled with `deleted_at` on `users`, `workspaces`, `workspace_members`, and `roles`.

The following tables intentionally do not have `deleted_at`:

- `permissions`: global immutable permission catalog seeded by code; permission changes should be additive migrations or explicit catalog updates.
- `role_permissions`: derived join table between roles and permissions; revocation is represented by deleting the join row, and seed can recreate required system bindings.
- `user_roles`: derived assignment join table; revocation is represented by deleting the join row.
- `audit_logs`: append-only immutable audit trail; deleting or soft deleting audit records would weaken traceability.

## Seed Data

Seed creates:

- Workspace: `Default Workspace` with slug `default`
- Super administrator user from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`
- System role: `super_admin`
- Permissions: `auth:me`, `auth:logout`, `audit_log:view`, `system:health`, `data_scope:all`, `data_scope:team`, `data_scope:own`

The seed password is stored in `users.password_hash` as a PBKDF2-SHA256 hash. The plaintext password is never inserted into the database.
