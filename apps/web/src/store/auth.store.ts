import { create } from "zustand";

import { authApi } from "../lib/api/auth";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearStoredToken, readStoredToken, writeStoredToken } from "../lib/auth/token";
import type { CurrentUser, LoginCredentials, LoginResponse } from "../types/auth";

type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous" | "error";

interface AuthState {
  token: string | null;
  user: CurrentUser | null;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initialToken,
  user: null,
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
        throw new Error("登录响应缺少 token");
      }

      writeStoredToken(token);
      const user = extractUser(result.data) ?? (await authApi.me()).data;

      set({
        token,
        user,
        status: "authenticated",
        initialized: true,
        lastError: null,
        lastRequestId: result.requestId,
      });
    } catch (error) {
      clearStoredToken();
      set({
        token: null,
        user: null,
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
        token: null,
        user: null,
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

      set({
        token,
        user: result.data,
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
      token: null,
      user: null,
      status: "anonymous",
      initialized: true,
      lastError: message ?? null,
    });
  },

  handleUnauthorized() {
    get().clearSession("登录已失效，请重新登录");
  },
}));

apiClient.setUnauthorizedHandler(() => {
  useAuthStore.getState().handleUnauthorized();
});

function extractToken(payload: LoginResponse): string | null {
  return payload.token ?? payload.access_token ?? payload.accessToken ?? null;
}

function extractUser(payload: LoginResponse): CurrentUser | null {
  return payload.user ?? null;
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.requestId ? `${error.message}（request_id: ${error.requestId}）` : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "请求失败";
}
