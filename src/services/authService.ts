import type { User, LoginFormData, RegisterFormData, ForgotPasswordFormData, ActionResult } from '../types';
import type { AuthResponse, UserProfile } from '../types/api';
import { apiRequest, clearSession, errorMessage, hasSession, refreshSession, setSession } from './apiClient';
import { hashPassword } from '../utils/password';

export function toUser(profile: AuthResponse | UserProfile): User {
  return { id: profile.userId, name: profile.fullName || profile.username, username: profile.username,
    emailOrPhone: profile.email, role: profile.role === 'ADMIN' ? 'admin' : 'user' };
}
async function action<T>(callback: () => Promise<T>): Promise<ActionResult<T>> {
  try { return { success: true, data: await callback() }; }
  catch (error) { return { success: false, error: errorMessage(error) }; }
}
export const authService = {
  async getCurrentUser(): Promise<User | null> {
    if (!hasSession()) return null;
    await refreshSession();
    const response = await apiRequest<UserProfile>('/users/me');
    if (!response.data) throw new Error('Không thể tải hồ sơ người dùng.');
    return toUser(response.data);
  },
  login(form: LoginFormData): Promise<ActionResult<User>> {
    return action(async () => {
      const response = await apiRequest<AuthResponse>('/auth/login', { method: 'POST', auth: 'none',
        body: { usernameOrEmail: form.emailOrPhone.trim(), password: await hashPassword(form.password) } });
      if (!response.data?.accessToken) throw new Error('Máy chủ không trả về phiên đăng nhập.');
      setSession(response.data, form.rememberMe);
      return toUser(response.data);
    });
  },
  register(form: RegisterFormData): Promise<ActionResult<void>> {
    return action(async () => {
      await apiRequest('/auth/register', { method: 'POST', auth: 'none', body: {
        username: form.username.trim(), email: form.emailOrPhone.trim(), fullName: form.fullName.trim(),
        password: await hashPassword(form.password), confirmPassword: await hashPassword(form.confirmPassword),
      } });
    });
  },
  verifyEmail(email: string, otp: string): Promise<ActionResult<void>> {
    return action(async () => { await apiRequest('/auth/verify-email', { method: 'POST', auth: 'none', body: { email: email.trim(), otp } }); });
  },
  resendOtp(email: string): Promise<ActionResult<void>> {
    return action(async () => { await apiRequest('/auth/resend-otp', { method: 'POST', auth: 'none', body: { email: email.trim() } }); });
  },
  forgotPassword(form: ForgotPasswordFormData): Promise<ActionResult<{ message: string }>> {
    return action(async () => {
      await apiRequest('/auth/forgot-password', { method: 'POST', auth: 'none', body: { email: form.emailOrPhone.trim() } });
      return { message: 'Nếu email có tài khoản đang hoạt động, mã xác thực đã được gửi. Vui lòng kiểm tra hộp thư.' };
    });
  },
  resetPassword(email: string, otp: string, newPassword: string, confirmPassword: string): Promise<ActionResult<void>> {
    return action(async () => { await apiRequest('/auth/reset-password', { method: 'POST', auth: 'none', body: {
      email: email.trim(), otp, newPassword: await hashPassword(newPassword), confirmNewPassword: await hashPassword(confirmPassword),
    } }); });
  },
  logout(): Promise<ActionResult<void>> {
    return action(async () => {
      await apiRequest('/auth/logout', { method: 'POST', auth: 'optional' });
      clearSession();
    });
  },
};
