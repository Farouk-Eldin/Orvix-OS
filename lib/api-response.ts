import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";

export function apiSuccess<T>(data: T, message = "تم بنجاح", status = 200) {
  const body: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
    errors: null,
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status });
}

export function apiError(
  message: string,
  errors: Record<string, string[]> | string[] = [],
  status = 400
) {
  const body: ApiErrorResponse = {
    success: false,
    message,
    data: null,
    errors,
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status });
}

export const apiErrors = {
  unauthorized: () => apiError("لازم تسجّل دخول الأول", [], 401),
  noWorkspace: () => apiError("لسه محتاج تكمّل بيانات النشاط", [], 403),
  notFound: (what = "العنصر") => apiError(`${what} مش موجود`, [], 404),
  rateLimited: () => apiError("طلبات كتير أوي، حاول تاني بعد شوية", [], 429),
  serverError: () => apiError("حصل خطأ غير متوقع، حاول تاني", [], 500),
};
