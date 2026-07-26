'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userApi } from '@/lib/api';

export interface Child {
  id: string;
  name: string;
  gender: 'boy' | 'girl';
  birth_date?: string;
  grade?: string;
  created_at?: string;
}

interface ChildContextType {
  currentChildId: string | null;
  currentChild: Child | null;
  children: Child[];
  isLoading: boolean;
  setCurrentChild: (child: Child) => void;
  loadChildren: () => Promise<void>;
  refreshChildren: () => Promise<void>;
}

const ChildContext = createContext<ChildContextType | null>(null);

const CURRENT_CHILD_KEY = 'wxcl_current_child_id';

export function ChildProvider({ children }: { children: React.ReactNode }) {
  const [currentChildId, setCurrentChildId] = useState<string | null>(null);
  const [currentChild, setCurrentChild] = useState<Child | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载孩子列表
  const loadChildren = useCallback(async () => {
    try {
      const res = await userApi.getChildren();
      const list: Child[] = res || [];
      setChildren(list);

      // 如果没有当前孩子，设置第一个
      if (list.length > 0) {
        const storedId = localStorage.getItem(CURRENT_CHILD_KEY);
        const storedChild = list.find(c => c.id === storedId);

        if (storedChild) {
          setCurrentChildId(storedId);
          setCurrentChild(storedChild);
        } else {
          // 默认选择第一个孩子
          setCurrentChildId(list[0].id);
          setCurrentChild(list[0]);
          localStorage.setItem(CURRENT_CHILD_KEY, list[0].id);
        }
      } else {
        setCurrentChildId(null);
        setCurrentChild(null);
      }
    } catch (e) {
      console.error('加载孩子列表失败', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 刷新孩子列表（用于添加/删除后）
  const refreshChildren = useCallback(async () => {
    await loadChildren();
  }, [loadChildren]);

  // 切换当前孩子
  const setCurrentChild = useCallback((child: Child) => {
    setCurrentChildId(child.id);
    setCurrentChild(child);
    localStorage.setItem(CURRENT_CHILD_KEY, child.id);
  }, []);

  // 初始化加载
  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  return (
    <ChildContext.Provider
      value={{
        currentChildId,
        currentChild,
        children,
        isLoading,
        setCurrentChild,
        loadChildren,
        refreshChildren,
      }}
    >
      {children}
    </ChildContext.Provider>
  );
}

export function useChild() {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error('useChild must be used within ChildProvider');
  return ctx;
}
