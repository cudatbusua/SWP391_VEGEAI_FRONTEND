import type { User, LoginFormData, RegisterFormData, ForgotPasswordFormData, ActionResult } from '../types';

interface BackendAuthUser {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthResponse extends BackendAuthUser {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
}

interface ApiResponse<T> {
  success: boolean;
  code?: number;
  message?: string;
  data?: T;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
let accessToken: string | null = null;

// Keep the short-lived access token in memory; the backend owns the HttpOnly refresh cookie.
function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function hashPassword(password: string): Promise<string> {
  // The BE DTO validates passwords as exactly 64 hexadecimal characters. Hash the
  // raw password in the browser before sending it; never put the raw value in a request.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// All auth endpoints return the BE's ApiResponse envelope. Keep HTTP errors and
// network failures explicit so the forms can show the actual backend reason.
async function request<T>(
  path: string,
  body?: unknown,
  authenticated = false
): Promise<ActionResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(authenticated && accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });

    let result: ApiResponse<T>;
    try {
      result = await response.json() as ApiResponse<T>;
    } catch {
      return { success: false, error: `Máy chủ trả về phản hồi không hợp lệ (${response.status}).` };
    }

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.message || `Yêu cầu thất bại (${response.status}${result.code ? `, mã ${result.code}` : ''}).`
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi kết nối không xác định.';
    return { success: false, error: `Không thể kết nối đến máy chủ ${API_BASE_URL}: ${message}` };
  }
}

function mapUser(authUser: BackendAuthUser): User {
  const role = authUser.role.toUpperCase();
  return {
    id: authUser.userId,
    name: authUser.fullName,
    emailOrPhone: authUser.email,
    role: role === 'ADMIN' ? 'admin' : 'user'
  };
}

function saveAuthResponse(response: AuthResponse): User {
  setAccessToken(response.accessToken);
  return mapUser(response);
}

export const authService = {
  async restoreSession(): Promise<ActionResult<User>> {
    // The access token is memory-only, so after reload ask BE to issue a new one
    // using its HttpOnly refresh cookie rather than reading a token from localStorage.
    const result = await request<AuthResponse>('/api/auth/refresh');
    if (!result.success || !result.data) {
      setAccessToken(null);
      return { success: false, error: result.error || 'Không tìm thấy phiên đăng nhập.' };
    }

    return { success: true, data: saveAuthResponse(result.data) };
  },

  async login(formData: LoginFormData): Promise<ActionResult<User>> {
    // The FE identifier field is sent using the BE DTO's usernameOrEmail property.
    // BE fixes the refresh-cookie lifetime at one day; rememberMe cannot change it.
    const result = await request<AuthResponse>('/api/auth/login', {
      usernameOrEmail: formData.emailOrPhone.trim(),
      password: await hashPassword(formData.password)
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Đăng nhập không thành công.' };
    }

    return { success: true, data: saveAuthResponse(result.data) };
  },

  async register(formData: RegisterFormData): Promise<ActionResult<void>> {
    // Registration creates a PENDING_VERIFICATION account. The BE sends OTP
    // asynchronously and does not include the OTP in the HTTP response.
    return request<void>('/api/auth/register', {
      username: formData.username.trim(),
      email: formData.emailOrPhone.trim(),
      password: await hashPassword(formData.password),
      confirmPassword: await hashPassword(formData.confirmPassword),
      fullName: formData.fullName.trim()
    });
  },

  async verifyEmail(email: string, otp: string): Promise<ActionResult<void>> {
    // BE requires the same registered email and the exact six-digit OTP from email
    // (or its DEV/FALLBACK log when SMTP delivery is unavailable).
    return request<void>('/api/auth/verify-email', { email: email.trim(), otp: otp.trim() });
  },

  async resendOtp(email: string): Promise<ActionResult<void>> {
    // BE applies a 30-second resend cooldown and returns an error while it is active.
    return request<void>('/api/auth/resend-otp', { email: email.trim() });
  },

  async forgotPassword(formData: ForgotPasswordFormData): Promise<ActionResult<void>> {
    return request<void>('/api/auth/forgot-password', { email: formData.emailOrPhone.trim() });
  },

  async resetPassword(formData: ForgotPasswordFormData & { confirmPassword: string }): Promise<ActionResult<void>> {
    if (!formData.otp || !formData.newPassword) {
      return { success: false, error: 'Vui lòng nhập OTP và mật khẩu mới.' };
    }

    return request<void>('/api/auth/reset-password', {
      email: formData.emailOrPhone.trim(),
      otp: formData.otp.trim(),
      newPassword: await hashPassword(formData.newPassword),
      confirmNewPassword: await hashPassword(formData.confirmPassword)
    });
  },

  async logout(): Promise<ActionResult<void>> {
    // Send the in-memory access token and refresh cookie so BE can invalidate both.
    const result = await request<void>('/api/auth/logout', undefined, true);
    setAccessToken(null);
    return result;
  }
};
