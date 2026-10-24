import { NextResponse } from 'next/server';
import type { ApiResponse } from './types';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ data, error: null }, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function fail(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json<ApiResponse<never>>({ data: null, error: { code, message, ...(details === undefined ? {} : { details }) } }, { status, headers: { 'Cache-Control': 'no-store' } });
}
