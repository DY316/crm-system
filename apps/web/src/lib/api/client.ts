import { clearStoredToken, readStoredToken } from "../auth/token";

const REQUEST_ID_HEADER = "x-request-id";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type UnauthorizedHandler = () => void;

interface ApiEnvelope<TData> {
  success?: boolean;
  data?: TData;
  error?: {
    code?: string;
    message?: string;
  } | null;
  request_id?: string;
}

export interface ApiClientResult<TData> {
  data: TData;
  requestId: string;
}

export interface ApiClientOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuth?: boolean;
  skipUnauthorizedHandler?: boolean;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string;

  constructor(message: string, options: { status: number; code: string; requestId: string }) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

class ApiClient {
  private unauthorizedHandler: UnauthorizedHandler | null = null;

  setUnauthorizedHandler(handler: UnauthorizedHandler): void {
    this.unauthorizedHandler = handler;
  }

  async request<TData>(
    path: string,
    options: ApiClientOptions = {},
  ): Promise<ApiClientResult<TData>> {
    const { body, skipAuth, skipUnauthorizedHandler, ...fetchOptions } = options;
    const headers = new Headers(options.headers);
    const token = skipAuth ? null : readStoredToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const init: RequestInit = {
      ...fetchOptions,
      headers,
    };

    if (body !== undefined) {
      headers.set("Content-Type", "application/json");
      init.body = JSON.stringify(body);
    }

    const response = await fetch(resolveUrl(path), init);
    const payload = await parsePayload<TData>(response);
    const requestId = response.headers.get(REQUEST_ID_HEADER) || payload.request_id || "";

    if (!response.ok || payload.success === false) {
      const error = new ApiClientError(
        payload.error?.message || response.statusText || "请求失败",
        {
          status: response.status,
          code: payload.error?.code || `HTTP_${response.status}`,
          requestId,
        },
      );

      if (error.isUnauthorized && !skipUnauthorizedHandler) {
        clearStoredToken();
        this.unauthorizedHandler?.();
      }

      throw error;
    }

    return {
      data: (payload.success === true ? payload.data : payload) as TData,
      requestId,
    };
  }
}

function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function parsePayload<TData>(response: Response): Promise<ApiEnvelope<TData>> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return {
      success: response.ok,
      data: undefined as TData,
      error: response.ok ? null : { message: response.statusText },
    };
  }

  try {
    return (await response.json()) as ApiEnvelope<TData>;
  } catch {
    return {
      success: false,
      error: { message: "响应解析失败" },
    };
  }
}

export const apiClient = new ApiClient();
