# CRM System

## Backend Foundation

### Requirements

- Node.js 20+
- pnpm 9+

### Install

```powershell
pnpm.cmd install
```

### Environment

Copy `.env.example` to `.env` if local overrides are needed.

Server-related variables:

- `NODE_ENV`: runtime environment, defaults to `development`
- `SERVER_HOST`: bind host, defaults to `0.0.0.0`
- `SERVER_PORT`: server port, defaults to `3000`
- `SERVER_CORS_ORIGINS`: comma-separated CORS origins

### Start Backend

```powershell
pnpm.cmd server:dev
```

The backend listens on `http://localhost:3000` by default. If port `3000` is already in use locally, set `SERVER_PORT` to another port before starting.

### Health Check

```powershell
Invoke-WebRequest http://localhost:3000/api/v1/system/health
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

### Verification

```powershell
pnpm.cmd server:typecheck
pnpm.cmd server:build
pnpm.cmd server:test
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
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "error message",
    "details": {}
  },
  "request_id": "req_xxx"
}
```

### UTC Time Rule

Backend services should store, compare, and return timestamps in UTC. API timestamps should use ISO 8601 UTC strings, for example `2026-05-27T05:30:00.000Z`. Local time zones belong in presentation logic and should not be persisted in backend domain records.
