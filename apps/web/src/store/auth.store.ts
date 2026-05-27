import { create } from "zustand";

import { authApi } from "../lib/api/auth";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearStoredToken, readStoredToken, writeStoredToken } from "../lib/auth/token";
import type {
  AuthSessionPayload,
  CurrentUser,
  DataScope,
  LoginCredentials,
  LoginResponse,
  Workspace,
} from "../types/auth";

type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous" | "error";
type UnknownRecord = Record<string, unknown>;

interface AuthSessionState {
  token: string | null;
  user: CurrentUser | null;
  workspace: Workspace | null;
  roles: string[];
  permissions: string[];
  data_scope: DataScope | null;
}

interface AuthState extends AuthSessionState {
  status: AuthStatus;
  initialized: boolean;
  lastError: string | null;
  lastRequestId: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
  clearSession: (message?: string) => void;
  handleUnauthorized: () => void;
}

const initialToken = readStoredToken();

const emptySession: AuthSessionState = {
  token: null,
  user: null,
  workspace: null,
  roles: [],
  permissions: [],
  data_scope: null,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...emptySession,
  token: initialToken,
  status: initialToken ? "idle" : "anonymous",
  initialized: !initialToken,
  lastError: null,
  lastRequestId: null,

  async login(credentials) {
    set({ status: "loading", lastError: null, lastRequestId: null });

    try {
      const result = await authApi.login(credentials);
      const token = extractToken(result.data);

      if (!token) {
        throw new Error("Login response did not include a token.");
      }

      writeStoredToken(token);

      const payload = hasSessionPayload(result.data) ? result.data : (await authApi.me()).data;
      const session = normalizeSession(payload, token);

      set({
        ...session,
        status: "authenticated",
        initialized: true,
        lastError: null,
        lastRequestId: result.requestId,
      });
    } catch (error) {
      clearStoredToken();
      set({
        ...emptySession,
        status: "anonymous",
        initialized: true,
        lastError: formatErrorMessage(error),
        lastRequestId: error instanceof ApiClientError ? error.requestId : null,
      });
      throw error;
    }
  },

  async loadCurrentUser() {
    const token = get().token ?? readStoredToken();

    if (!token) {
      set({
        ...emptySession,
        status: "anonymous",
        initialized: true,
        lastError: null,
        lastRequestId: null,
      });
      return;
    }

    set({ token, status: "loading", initialized: false, lastError: null });

    try {
      const result = await authApi.me();
      const session = normalizeSession(result.data, token);

      set({
        ...session,
        status: "authenticated",
        initialized: true,
        lastError: null,
        lastRequestId: result.requestId,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.isUnauthorized) {
        get().handleUnauthorized();
        return;
      }

      set({
        status: "error",
        initialized: true,
        lastError: formatErrorMessage(error),
        lastRequestId: error instanceof ApiClientError ? error.requestId : null,
      });
    }
  },

  async logout() {
    const hasToken = Boolean(get().token ?? readStoredToken());
    set({ status: "loading", lastError: null });

    try {
      if (hasToken) {
        const result = await authApi.logout();
        set({ lastRequestId: result.requestId });
      }
    } finally {
      get().clearSession();
    }
  },

  clearSession(message) {
    clearStoredToken();
    set({
      ...emptySession,
      status: "anonymous",
      initialized: true,
      lastError: message ?? null,
      lastRequestId: null,
    });
  },

  handleUnauthorized() {
    get().clearSession("Session expired. Please sign in again.");
  },
}));

apiClient.setUnauthorizedHandler(() => {
  useAuthStore.getState().handleUnauthorized();
});

function normalizeSession(payload: AuthSessionPayload, token: string): AuthSessionState {
  const user = normalizeUser(payload.user ?? payload);

  if (!user) {
    throw new Error("Current user is missing from the auth response.");
  }

  const permissions = normalizeStringList(payload.permissions);

  return {
    token,
    user,
    workspace: normalizeWorkspace(payload.workspace),
    roles: normalizeStringList(payload.roles),
    permissions,
    data_scope: normalizeDataScope(payload, permissions),
  };
}

function hasSessionPayload(payload: LoginResponse): boolean {
  return Boolean(payload.user || payload.workspace || payload.roles || payload.permissions || payload.data_scope);
}

function extractToken(payload: LoginResponse): string | null {
  return payload.token ?? payload.access_token ?? payload.accessToken ?? null;
}

function normalizeUser(value: unknown): CurrentUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = pickString(value, ["id", "user_id", "userId"]);
  const email = pickString(value, ["email"]);

  if (!id || !email) {
    return null;
  }

  return {
    ...value,
    id,
    email,
    name: pickOptionalString(value, ["name"]),
    display_name: pickOptionalString(value, ["display_name", "displayName"]),
  };
}

function normalizeWorkspace(value: unknown): Workspace | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = pickString(value, ["id", "workspace_id", "workspaceId"]);
  const name = pickString(value, ["name"]);

  if (!id || !name) {
    return null;
  }

  return {
    ...value,
    id,
    name,
    slug: pickOptionalString(value, ["slug"]),
  };
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === "string" && item.length > 0) {
      return [item];
    }

    if (!isRecord(item)) {
      return [];
    }

    const code = pickString(item, ["code", "name"]);
    return code ? [code] : [];
  });
}

function normalizeDataScope(source: AuthSessionPayload, permissions: string[]): DataScope | null {
  const explicit = pickUnknownString(source.data_scope) ?? pickUnknownString(source.dataScope);

  if (explicit) {
    return explicit;
  }

  return permissions.find((permission) => permission.startsWith("data_scope:")) ?? null;
}

function pickString(source: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function pickOptionalString(source: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}

function pickUnknownString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.requestId ? `${error.message} (request_id: ${error.requestId})` : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed.";
}
