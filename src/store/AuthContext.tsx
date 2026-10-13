import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, LoginFormData, RegisterFormData, ActionResult } from '../types';
import { authService } from '../services/authService';
import { AUTH_EXPIRED_EVENT, errorMessage } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginFormData) => Promise<ActionResult<User>>;
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
      .catch(error => { if (active) setSessionError(errorMessage(error)); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired); };
  }, [restoreAttempt]);

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
