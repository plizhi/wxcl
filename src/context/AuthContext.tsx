'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, userApi } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (phone: string, activationCode?: string, password?: string, parentRole?: string) => Promise<void>;
  logout: () => void;
  fetchUserInfo: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const isLoggedIn = !!token;

  const login = useCallback(async (phone: string, activationCode?: string, password?: string, parentRole?: string) => {
    const data = await authApi.login(phone, activationCode, password, parentRole);
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);
    setToken(data.token);
    try {
      const userData = await userApi.getCurrentUser();
      setUser(userData);
    } catch (e) {
      console.error('获取用户信息失败', e);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setToken(null);
    setUser(null);
  }, []);

  const fetchUserInfo = useCallback(async () => {
    if (!token) return;
    try {
      const data = await userApi.getCurrentUser();
      setUser(data);
    } catch (error) {
      console.error('获取用户信息失败', error);
    }
  }, [token]);

  const updateUser = useCallback(async (data: Partial<User>) => {
    await userApi.updateUser(data);
    await fetchUserInfo();
  }, [fetchUserInfo]);

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn, isLoading, login, logout, fetchUserInfo, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
