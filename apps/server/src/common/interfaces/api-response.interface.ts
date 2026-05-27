export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
  error: null;
  request_id: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  request_id: string;
  error: ApiErrorPayload;
}
