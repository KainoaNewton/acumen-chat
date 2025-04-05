'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Suspense } from 'react';
import React from 'react';

// Component that safely uses useSearchParams inside Suspense
function SearchParamsTracker({ onParamsChange }: { onParamsChange: (params: URLSearchParams) => void }) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    onParamsChange(searchParams);
  }, [searchParams, onParamsChange]);
  
  return null;
}

export function NavigationEventsTracker() {
  const pathname = usePathname();
  const [currentSearchParams, setCurrentSearchParams] = React.useState<URLSearchParams | null>(null);

  useEffect(() => {
    if (currentSearchParams === null) return;
    
    const url = `${pathname}${currentSearchParams ? `?${currentSearchParams}` : ''}`;
    console.log(`[Router] Navigation changed to ${url} at ${new Date().toISOString()}`);
    
    // Track navigation complete
    if (pathname === '/settings') {
      console.log('[Router] Settings page navigation completed');
    }
  }, [pathname, currentSearchParams]);

  return (
    <Suspense fallback={null}>
      <SearchParamsTracker onParamsChange={setCurrentSearchParams} />
    </Suspense>
  );
} 