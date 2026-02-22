'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { authApi } from '@/lib/api/auth';

function hasAuthHintCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('auth_hint=1');
}

function clearAuthHintCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'auth_hint=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.re-collect.in';
    document.cookie = 'auth_hint=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setIsLoading } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      // FAST PATH: No auth_hint cookie means no token exists.
      // Skip the API call entirely — instant redirect to welcome.
      if (!hasAuthHintCookie()) {
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
          clearAuthHintCookie();
        }
      } catch (error) {
        // Token was invalid/expired — clear the stale hint
        setUser(null);
        clearAuthHintCookie();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [setUser, setIsLoading]);

  return <>{children}</>;
}
