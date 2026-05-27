export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'auth.login_success',
  LOGIN_FAILURE: 'auth.login_failure',
  LOGIN_RATE_LIMITED: 'auth.login_rate_limited',
  LOGOUT: 'auth.logout',
  PERMISSION_DENIED: 'security.permission_denied',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_TARGET_TABLES = {
  USERS: 'users',
  PERMISSIONS: 'permissions',
} as const;

export type AuditTargetTable =
  (typeof AUDIT_TARGET_TABLES)[keyof typeof AUDIT_TARGET_TABLES];

export const AUDIT_RELATED_TYPES = {
  AUTH: 'auth',
  PERMISSION: 'permission',
} as const;

export type AuditRelatedType =
  (typeof AUDIT_RELATED_TYPES)[keyof typeof AUDIT_RELATED_TYPES];
