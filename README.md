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

### UTC Time Rule

Backend services should store, compare, and return timestamps in UTC. API timestamps should use ISO 8601 UTC strings, for example `2026-05-27T05:30:00.000Z`. Local time zones belong in presentation logic and should not be persisted in backend domain records.
