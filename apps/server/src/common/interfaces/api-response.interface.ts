export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
  error: null;
  request_id: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: ApiErrorPayload;
  request_id: string;
}
