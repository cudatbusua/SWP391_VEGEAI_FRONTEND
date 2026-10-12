import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { User, LoginFormData, RegisterFormData, ActionResult } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isPreviewSession: boolean;
  isLoading: boolean;
  login: (data: LoginFormData) => Promise<ActionResult<User>>;
  register: (data: RegisterFormData) => Promise<ActionResult<void>>;
  logout: () => Promise<ActionResult<void>>;
  startPreviewSession: (role?: 'user' | 'admin') => void;
  endPreviewSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// These sample identities exist only in FE state and never create backend credentials.
const previewUsers: Record<'user' | 'admin', User> = {
  user: {
    id: 'fe-preview-user',
    name: 'VEGEAI Demo User',
    emailOrPhone: 'demo@vegeai.local',
    role: 'user'
  },
  admin: {
    id: 'fe-preview-admin',
    name: 'VEGEAI Demo Admin',
    emailOrPhone: 'admin@vegeai.local',
    role: 'admin'
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isPreviewSession, setIsPreviewSession] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const authOperationRef = useRef(0);

  useEffect(() => {
    // Rehydrate the user from BE via the HttpOnly refresh cookie on page load.
    const operation = ++authOperationRef.current;
    void authService.restoreSession().then((result) => {
      if (authOperationRef.current === operation) {
        setUser(result.success ? result.data ?? null : null);
        setIsPreviewSession(false);
        setIsLoading(false);
      }
    });
  }, []);

  const login = async (data: LoginFormData): Promise<ActionResult<User>> => {
    authOperationRef.current += 1;
    setIsLoading(true);
    try {
      const res = await authService.login(data);
      if (res.success && res.data) {
        setUser(res.data);
        setIsPreviewSession(false);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterFormData): Promise<ActionResult<void>> => {
    authOperationRef.current += 1;
    setIsLoading(true);
    try {
      return await authService.register(data);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<ActionResult<void>> => {
    authOperationRef.current += 1;
    if (isPreviewSession) {
      // A preview has no BE credentials, so leave the backend logout endpoint untouched.
      setUser(null);
      setIsPreviewSession(false);
      return { success: true };
    }

    const result = await authService.logout();
    setUser(null);
    setIsPreviewSession(false);
    return result;
  };

  const startPreviewSession = (role: 'user' | 'admin' = 'user') => {
    // Compile-time guard: a preview role can never replace or impersonate a real BE login.
    if (!import.meta.env.DEV || isLoading || (user && !isPreviewSession)) return;
    setUser(previewUsers[role]);
    setIsPreviewSession(true);
  };

  const endPreviewSession = () => {
    if (!import.meta.env.DEV || !isPreviewSession) return;
    setUser(null);
    setIsPreviewSession(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isPreviewSession,
        isLoading,
        login,
        register,
        logout,
        startPreviewSession,
        endPreviewSession
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
