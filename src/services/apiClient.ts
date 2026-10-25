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
  if (!error) return 'Có lỗi xảy ra. Vui lòng thử lại.';

  const msg = error instanceof Error ? error.message : String(error);
  const code = error instanceof ApiError ? error.code : undefined;
  const status = error instanceof ApiError ? error.status : undefined;

  // 1. Authentication credentials & login rate limit (Ưu tiên kiểm tra trước status 401)
  if (code === 1101 || /invalid credentials|invalid username/i.test(msg)) {
    return 'Tên đăng nhập, email hoặc mật khẩu không chính xác.';
  }
  if (code === 1102 || /too many|attempts exceeded/i.test(msg)) {
    return 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.';
  }

  // 2. Account status
  if (code === 1200 || /pending email verification/i.test(msg)) {
    return 'Tài khoản chưa được kích hoạt email. Vui lòng kiểm tra hộp thư của bạn.';
  }
  if (code === 1205 || code === 1204 || /locked|disabled/i.test(msg)) {
    return 'Tài khoản tạm thời bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ quản trị viên.';
  }

  // 3. Session & Token errors
  if (
    code === 1201 ||
    code === 1202 ||
    code === 1203 ||
    code === 1207 ||
    code === 1208 ||
    code === 1209 ||
    status === 401 ||
    /revoked|token.*expired|invalid.*token|token.*invalid|unauthorized/i.test(msg)
  ) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }

  // 4. Registration conflicts
  if (code === 1300 || /username.*already.*taken/i.test(msg)) {
    return 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.';
  }
  if (code === 1301 || /email.*already.*registered/i.test(msg)) {
    return 'Địa chỉ email này đã được đăng ký tài khoản.';
  }
  if (code === 1302 || /phone.*already.*in use/i.test(msg)) {
    return 'Số điện thoại này đã được sử dụng.';
  }
  if (code === 1304 || /current password is incorrect/i.test(msg)) {
    return 'Mật khẩu hiện tại không chính xác.';
  }
  if (code === 1305 || /new password cannot be the same/i.test(msg)) {
    return 'Mật khẩu mới không được trùng với mật khẩu cũ.';
  }

  // 5. OTP verification
  if (code === 1210 || /invalid otp/i.test(msg)) {
    return 'Mã xác thực OTP không chính xác. Vui lòng kiểm tra lại.';
  }
  if (code === 1211 || /otp.*expired/i.test(msg)) {
    return 'Mã xác thực OTP đã hết hạn. Vui lòng yêu cầu mã mới.';
  }
  if (code === 1212 || /otp.*already.*used/i.test(msg)) {
    return 'Mã xác thực OTP này đã được sử dụng.';
  }
  if (code === 1213 || /wait before requesting/i.test(msg)) {
    return 'Vui lòng chờ một chút trước khi yêu cầu mã OTP mới.';
  }

  // 6. Rate limits & Quotas
  if (code === 1400 || code === 1401 || /too many/i.test(msg)) {
    return 'Bạn đã thao tác quá nhanh hoặc sai quá nhiều lần. Vui lòng thử lại sau ít phút.';
  }
  if (code === 1402 || /guest trial limit/i.test(msg)) {
    return 'Bạn đã sử dụng hết lượt dùng thử miễn phí. Vui lòng đăng ký hoặc đăng nhập để tiếp tục.';
  }

  // 7. Permissions & Resources
  if (code === 1600 || status === 403 || /permission|forbidden/i.test(msg)) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  if (code === 1500 || code === 1501 || status === 404) {
    return 'Không tìm thấy dữ liệu yêu cầu.';
  }

  // 8. AI service
  if (code === 1706 || /ai.*not configured/i.test(msg)) {
    return 'Dịch vụ AI đang được cập nhật cấu hình. Vui lòng liên hệ quản trị viên hoặc thử lại sau.';
  }

  // 9. Server errors
  if (status === 500 || status === 502 || status === 503 || status === 504 || /internal server|database.*violation|malformed/i.test(msg)) {
    return 'Hệ thống đang bận. Vui lòng thử lại sau ít phút.';
  }

  // 10. Natural Vietnamese sentences
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(msg)) {
    return msg;
  }

  return 'Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại.';
}
