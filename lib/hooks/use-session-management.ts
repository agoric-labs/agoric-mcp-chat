import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useSessionManagement() {
  const router = useRouter();

  const startNewChat = useCallback(() => {
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      const params = new URLSearchParams(currentUrl.search);
      const queryString = params.toString();
      const fullPath = queryString ? `/?${queryString}` : '/';
      router.push(fullPath);
    }
  }, [router]);

  return { startNewChat };
}

