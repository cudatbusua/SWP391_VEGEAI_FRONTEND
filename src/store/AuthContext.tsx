import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, LoginFormData, RegisterFormData, ActionResult } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginFormData) => Promise<ActionResult<User>>;
  register: (data: RegisterFormData) => Promise<ActionResult<User>>;
  logout: () => void;
  switchRole: (role: 'guest' | 'user') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedUser = authService.getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (data: LoginFormData): Promise<ActionResult<User>> => {
    setIsLoading(true);
    const res = await authService.login(data);
    setIsLoading(false);
    if (res.success && res.data) {
      setUser(res.data);
    }
    return res;
  };

  const register = async (data: RegisterFormData): Promise<ActionResult<User>> => {
    setIsLoading(true);
    const res = await authService.register(data);
    setIsLoading(false);
    if (res.success && res.data) {
      setUser(res.data);
    }
    return res;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const switchRole = (role: 'guest' | 'user') => {
    if (role === 'guest') {
      setUser(null);
    } else {
      const demoUser: User = {
        id: 'usr_demo',
        name: 'Dat Thai',
        emailOrPhone: 'datthai@vegeai.vn',
        role: 'user',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
      };
      setUser(demoUser);
    }
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
        switchRole
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
