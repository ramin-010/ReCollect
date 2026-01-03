'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { authApi } from '@/lib/api/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setIsLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      // Only check if not already authenticated to avoid redundant calls
      // (though simple persistence might need check on reload always)
      // Since store resets on reload, !isAuthenticated is always true initially.
      
      try {
        const response = await authApi.getMe();
        if (response.success && response.data?.user) {
          setUser(response.data.user);
        } else {
          // Explicitly clear if check fails (e.g. token expired)
          setUser(null);
        }
      } catch (error) {
        // Silent fail - just means not logged in
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [setUser, setIsLoading]);

  return <>{children}</>;
}
