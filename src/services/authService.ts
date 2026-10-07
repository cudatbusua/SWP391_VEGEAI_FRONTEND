import type { User, LoginFormData, RegisterFormData, ForgotPasswordFormData, ActionResult } from '../types';

const STORAGE_KEY = 'vegeai_auth_user';

export const authService = {
  getCurrentUser(): User | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async login(formData: LoginFormData): Promise<ActionResult<User>> {
    await new Promise((res) => setTimeout(res, 600));

    // Mock verification
    if (!formData.emailOrPhone) {
      return { success: false, error: 'Vui lòng nhập Email hoặc Số điện thoại.' };
    }
    if (!formData.password || formData.password.length < 6) {
      return { success: false, error: 'Mật khẩu không chính xác.' };
    }

    const user: User = {
      id: 'usr_' + Date.now(),
      name: formData.emailOrPhone.includes('@') 
        ? formData.emailOrPhone.split('@')[0] 
        : 'Thành viên VEGEAI',
      emailOrPhone: formData.emailOrPhone,
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    };

    if (formData.rememberMe) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }

    return { success: true, data: user };
  },

  async register(formData: RegisterFormData): Promise<ActionResult<User>> {
    await new Promise((res) => setTimeout(res, 700));

    const user: User = {
      id: 'usr_' + Date.now(),
      name: formData.fullName || 'Người dùng mới',
      emailOrPhone: formData.emailOrPhone,
      role: 'user'
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return { success: true, data: user };
  },

  async forgotPassword(formData: ForgotPasswordFormData): Promise<ActionResult<{ message: string; otp?: string }>> {
    await new Promise((res) => setTimeout(res, 600));

    // Generate mock OTP
    const mockOtp = '889922';
    return {
      success: true,
      data: {
        message: `Mã xác thực đã được gửi tới ${formData.emailOrPhone}. (Mã thử nghiệm: ${mockOtp})`,
        otp: mockOtp
      }
    };
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
