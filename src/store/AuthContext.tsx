import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, LoginFormData, RegisterFormData, ActionResult } from '../types';
import type { LoginInitResponse } from '../types/api';
import { authService } from '../services/authService';
import { AUTH_EXPIRED_EVENT, ApiError, errorMessage } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginFormData) => Promise<ActionResult<User>>;
  loginWithGoogle: (idToken: string, rememberMe?: boolean) => Promise<ActionResult<User>>;
  initLogin: (data: LoginFormData) => Promise<ActionResult<LoginInitResponse>>;

  verifyLoginOtp: (usernameOrEmail: string, otp: string, rememberMe: boolean) => Promise<ActionResult<User>>;
  resendLoginOtp: (usernameOrEmail: string) => Promise<ActionResult<void>>;
  register: (data: RegisterFormData) => Promise<ActionResult<void>>;
  logout: () => Promise<ActionResult<void>>;
  updateUser: (user: User) => void;
  sessionError: string;
  retrySession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionError, setSessionError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setSessionError('');
    const onExpired = () => { setUser(null); setSessionError(''); };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    authService.getCurrentUser()
      .then(saved => { if (active) setUser(saved); })
      .catch(error => {
        // When session is expired, revoked, or unauthorized, quietly clear user without showing scary banners to guests
        if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
          if (active) setUser(null);
          return;
        }
        if (active) setSessionError(errorMessage(error));
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired); };
  }, [restoreAttempt]);

  const initLogin = async (data: LoginFormData): Promise<ActionResult<LoginInitResponse>> => {
    return authService.initLogin(data);
  };

  const verifyLoginOtp = async (usernameOrEmail: string, otp: string, rememberMe: boolean): Promise<ActionResult<User>> => {
    setIsLoading(true);
    const res = await authService.verifyLoginOtp(usernameOrEmail, otp, rememberMe);
    setIsLoading(false);
    if (res.success && res.data) {
      setUser(res.data);
      setSessionError('');
    }
    return res;
  };

  const resendLoginOtp = (usernameOrEmail: string) => authService.resendLoginOtp(usernameOrEmail);

  const login = async (data: LoginFormData): Promise<ActionResult<User>> => {
    setIsLoading(true);
    const res = await authService.login(data);
    setIsLoading(false);
    if (res.success && res.data) {
      setUser(res.data);
      setSessionError('');
    }
    return res;
  };

  const loginWithGoogle = async (idToken: string, rememberMe = true): Promise<ActionResult<User>> => {
    setIsLoading(true);
    const res = await authService.loginWithGoogle(idToken, rememberMe);
    setIsLoading(false);
    if (res.success && res.data) {
      setUser(res.data);
      setSessionError('');
    }
    return res;
  };

  const register = (data: RegisterFormData) => authService.register(data);


  const logout = async () => {
    const result = await authService.logout();
    if (result.success) { setUser(null); setSessionError(''); }
    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        initLogin,

        verifyLoginOtp,
        resendLoginOtp,
        register,
        logout,
        updateUser: setUser,
        sessionError,
        retrySession: () => setRestoreAttempt(value => value + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
