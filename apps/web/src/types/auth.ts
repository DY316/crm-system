export type DataScope = "data_scope:all" | "data_scope:team" | "data_scope:own" | string;

export interface CurrentUser {
  id: string;
  email: string;
  name?: string | null;
  display_name?: string | null;
  [key: string]: unknown;
}

export interface Workspace {
  id: string;
  name: string;
  slug?: string | null;
  [key: string]: unknown;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSessionPayload {
  user?: CurrentUser;
  workspace?: Workspace | null;
  roles?: unknown[];
  permissions?: unknown[];
  data_scope?: unknown;
  dataScope?: unknown;
  [key: string]: unknown;
}

export interface LoginResponse extends AuthSessionPayload {
  token?: string;
  access_token?: string;
  accessToken?: string;
}
