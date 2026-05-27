import { Request } from 'express';

export type AuthUserProfile = {
  id: string;
  email: string;
  display_name: string;
  status: string;
};

export type AuthWorkspaceProfile = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type AuthRoleProfile = {
  id: string;
  code: string;
  name: string;
  is_system: boolean;
};

export type AuthDataScope = {
  code: string;
  scope: 'all' | 'team' | 'own';
};

export type AuthenticatedUser = {
  user: AuthUserProfile;
  workspace: AuthWorkspaceProfile;
  roles: AuthRoleProfile[];
  permissions: string[];
  data_scope: AuthDataScope[];
};

export type AuthTokenContext = {
  token_id: string;
  user_id: string;
  expires_at: string;
};

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  auth?: AuthTokenContext;
}
