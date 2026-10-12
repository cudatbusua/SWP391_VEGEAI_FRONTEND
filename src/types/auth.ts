export interface User {
  id: string;
  name: string;
  emailOrPhone: string;
  role: 'guest' | 'user' | 'admin';
  avatar?: string;
}

export interface LoginFormData {
  emailOrPhone: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterFormData {
  username: string;
  fullName: string;
  emailOrPhone: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

export interface ForgotPasswordFormData {
  emailOrPhone: string;
  otp?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface ValidationErrors {
  [key: string]: string;
}
