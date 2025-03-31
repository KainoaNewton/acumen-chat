'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function NavigationEventsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = `${pathname}${searchParams ? `?${searchParams}` : ''}`;
    console.log(`[Router] Navigation changed to ${url} at ${new Date().toISOString()}`);
    
    // Track navigation complete
    if (pathname === '/settings') {
      console.log('[Router] Settings page navigation completed');
    }
  }, [pathname, searchParams]);

  // This component doesn't render anything
  return null;
} 