export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  errors: null;
  requestId: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  data: null;
  errors: Record<string, string[]> | string[];
  requestId: string;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
