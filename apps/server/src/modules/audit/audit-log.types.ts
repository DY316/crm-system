export type AuditJsonPrimitive = string | number | boolean | null;
export type AuditJsonValue =
  | AuditJsonPrimitive
  | AuditJsonValue[]
  | { [key: string]: AuditJsonValue | undefined };

export interface AuditRequestContext {
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  idempotencyKey?: string;
}

export interface AuditLogWriteInput {
  workspaceId?: string | null;
  actorId?: string | null;
  action: string;
  targetTable: string;
  targetId?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  beforeData?: AuditJsonValue;
  afterData?: AuditJsonValue;
  requestId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditEventInput {
  workspaceId?: string | null;
  actorId?: string | null;
  requestContext: AuditRequestContext;
  metadata?: AuditJsonValue;
}

export interface LoginSuccessAuditInput extends AuditEventInput {
  actorId: string;
}

export interface LoginFailureAuditInput extends AuditEventInput {
  actorId?: string | null;
  loginIdentifier?: string;
  reason?: string;
}

export interface LoginRateLimitedAuditInput extends AuditEventInput {
  loginIdentifier?: string;
  reason?: string;
  retryAfterSeconds?: number;
}

export interface LogoutAuditInput extends AuditEventInput {
  actorId: string;
}

export interface PermissionDeniedAuditInput extends AuditEventInput {
  permissionCode: string;
  targetTable?: string;
  targetId?: string | null;
  resourceType?: string;
  resourceId?: string | null;
  reason?: string;
}
