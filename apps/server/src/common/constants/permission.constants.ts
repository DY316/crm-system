import { DATA_SCOPE_CODES } from "./data-scope.constants";

export const FOUNDATION_PERMISSION_CODES = {
  AUTH_ME: "auth:me",
  AUTH_LOGOUT: "auth:logout",
  AUDIT_LOG_VIEW: "audit_log:view",
  SYSTEM_HEALTH: "system:health",
  DATA_SCOPE_ALL: DATA_SCOPE_CODES.ALL,
  DATA_SCOPE_TEAM: DATA_SCOPE_CODES.TEAM,
  DATA_SCOPE_OWN: DATA_SCOPE_CODES.OWN,
} as const;

export type FoundationPermissionCode =
  (typeof FOUNDATION_PERMISSION_CODES)[keyof typeof FOUNDATION_PERMISSION_CODES];

export const FOUNDATION_PERMISSION_CODE_LIST = Object.values(FOUNDATION_PERMISSION_CODES);
