'use client';

import { useEffect } from 'react';

export default function RouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Remove the clip-overflow class from html when in these routes
    document.documentElement.classList.remove('clip-overflow');
    document.documentElement.classList.add('allow-overflow');

    // Cleanup function to restore classes when component unmounts
    return () => {
      document.documentElement.classList.add('clip-overflow');
      document.documentElement.classList.remove('allow-overflow');
    };
  }, []);

  return <div className="min-h-screen bg-background">{children}</div>;
} 