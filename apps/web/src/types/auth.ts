export interface CurrentUser {
  id: string;
  email: string;
  name?: string | null;
  [key: string]: unknown;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  access_token?: string;
  accessToken?: string;
  user?: CurrentUser;
  [key: string]: unknown;
}
