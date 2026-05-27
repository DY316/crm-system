export const DATA_SCOPE_CODES = {
  ALL: "data_scope:all",
  TEAM: "data_scope:team",
  OWN: "data_scope:own",
} as const;

export type DataScopeCode = (typeof DATA_SCOPE_CODES)[keyof typeof DATA_SCOPE_CODES];

export const DATA_SCOPE_CODE_LIST = Object.values(DATA_SCOPE_CODES);
