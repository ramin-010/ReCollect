'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { authApi } from '@/lib/api/auth';

function hasAuthHint(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check both cookie (legacy) and localStorage (modern cross-domain reliable)
  const cookieHint = document.cookie.includes('auth_hint=1');
  const lsHint = localStorage.getItem('auth_hint') === '1';
  
  return cookieHint || lsHint;
}

function clearAuthHint() {
  if (typeof window === 'undefined') return;
  
  // Clear Cookie
  document.cookie = 'auth_hint=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.re-collect.in';
  document.cookie = 'auth_hint=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  
  // Clear LocalStorage
  localStorage.removeItem('auth_hint');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setIsLoading } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      // FAST PATH: No auth_hint means no token exists.
      // Skip the API call entirely — instant redirect to welcome.
      if (!hasAuthHint()) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // SLOW PATH: auth_hint exists, validate with the backend.
      try {
        const response = await authApi.getMe();
        if (response.success && response.data?.user) {
          setUser(response.data.user);
        } else {
          setUser(null);
          clearAuthHint();
        }
      } catch (error) {
        // Token was invalid/expired — clear the stale hint
        setUser(null);
        clearAuthHint();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [setUser, setIsLoading]);

  return <>{children}</>;
}
