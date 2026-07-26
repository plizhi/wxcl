'use client';

import { AuthProvider } from '@/context/AuthContext';
import { ChildProvider } from '@/context/ChildContext';
import { ToastProvider } from '@/components/ui/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ChildProvider>
        <ToastProvider>{children}</ToastProvider>
      </ChildProvider>
    </AuthProvider>
  );
}
