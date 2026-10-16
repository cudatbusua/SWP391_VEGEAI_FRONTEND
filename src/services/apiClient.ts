import type { ApiResponse, AuthResponse } from '../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const SESSION_KEY = 'vegeai_session';
export const AUTH_EXPIRED_EVENT = 'vegeai:auth-expired';
let accessToken: string | null = null;
let expiresAt = 0;
let sessionVersion = 0;
let refreshRequest: Promise<AuthResponse> | null = null;

export class ApiError extends Error {
  status: number;
  code?: number;
  constructor(message: string, status = 0, code?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
export function hasSession(): boolean {
  return localStorage.getItem(SESSION_KEY) === 'true' || sessionStorage.getItem(SESSION_KEY) === 'true';
}
export function setSession(auth: AuthResponse, rememberMe?: boolean): void {
  accessToken = auth.accessToken;
  expiresAt = Date.now() + auth.expiresInSeconds * 1000;
  if (rememberMe !== undefined) {
    sessionVersion++;
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    (rememberMe ? localStorage : sessionStorage).setItem(SESSION_KEY, 'true');
  }
}
export function clearSession(): void {
  sessionVersion++;
  accessToken = null;
  expiresAt = 0;
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('vegeai_auth_user');
}
function expireSession(): void {
  clearSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}
type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: 'required' | 'optional' | 'none';
  signal?: AbortSignal;
  timeoutMs?: number;
};
async function send<T>(path: string, options: RequestOptions, token: string | null): Promise<ApiResponse<T>> {
  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const isForm = options.body instanceof FormData;
  if (options.body !== undefined && !isForm) headers.set('Content-Type', 'application/json');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, options.timeoutMs ?? 20000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET', headers, credentials: 'include',
      body: options.body === undefined ? undefined : isForm ? options.body as FormData : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as ApiResponse<T> | null;
    if (!response.ok || payload?.success === false) {
      throw new ApiError(payload?.message || `Yêu cầu thất bại (HTTP ${response.status}).`, response.status, payload?.code);
    }
    if (!payload || payload.success !== true) throw new ApiError('Máy chủ trả về dữ liệu không hợp lệ. Kiểm tra cấu hình API.', response.status);
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError(options.signal?.aborted ? 'Yêu cầu đã bị hủy.' : 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    throw new ApiError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend và kết nối mạng.');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}
export async function refreshSession(): Promise<AuthResponse> {
  if (!refreshRequest) {
    const version = sessionVersion;
    refreshRequest = (async () => {
      try {
        const response = await send<AuthResponse>('/auth/refresh', { method: 'POST' }, null);
        if (!response.data?.accessToken) throw new ApiError('Phiên đăng nhập không hợp lệ.', 401);
        if (version !== sessionVersion) throw new ApiError('Phiên đăng nhập đã thay đổi.', 401);
        setSession(response.data);
        return response.data;
      } catch (error) {
        if (version === sessionVersion && error instanceof ApiError && [400, 401, 403].includes(error.status)) expireSession();
        throw error;
      } finally { refreshRequest = null; }
    })();
  }
  return refreshRequest;
}
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const auth = options.auth ?? 'required';
  const version = sessionVersion;
  if (auth === 'required' && !hasSession()) throw new ApiError('Vui lòng đăng nhập để tiếp tục.', 401);
  if (path !== '/auth/logout' && auth !== 'none' && hasSession() && (!accessToken || Date.now() >= expiresAt - 10000)) await refreshSession();
  if (auth !== 'none' && version !== sessionVersion) throw new ApiError('Phiên đăng nhập đã thay đổi.', 401);
  if (auth === 'required' && !accessToken) throw new ApiError('Vui lòng đăng nhập để tiếp tục.', 401);
  const token = auth === 'none' ? null : accessToken;
  try { return await send<T>(path, options, token); }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || auth === 'none' || !token || path === '/auth/logout') throw error;
    if (version !== sessionVersion) throw error;
    if (accessToken === token) await refreshSession();
    if (version !== sessionVersion || !accessToken) throw new ApiError('Phiên đăng nhập đã thay đổi.', 401);
    try { return await send<T>(path, options, accessToken); }
    catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401 && version === sessionVersion) expireSession();
      throw retryError;
    }
  }
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
}
