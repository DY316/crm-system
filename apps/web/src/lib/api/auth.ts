import type { CurrentUser, LoginCredentials, LoginResponse } from "../../types/auth";
import { apiClient, type ApiClientResult } from "./client";

export const authApi = {
  login(credentials: LoginCredentials): Promise<ApiClientResult<LoginResponse>> {
    return apiClient.request<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: credentials,
      skipAuth: true,
      skipUnauthorizedHandler: true,
    });
  },

  me(): Promise<ApiClientResult<CurrentUser>> {
    return apiClient.request<CurrentUser>("/api/v1/auth/me", {
      method: "GET",
    });
  },

  logout(): Promise<ApiClientResult<Record<string, never>>> {
    return apiClient.request<Record<string, never>>("/api/v1/auth/logout", {
      method: "POST",
    });
  },
};
