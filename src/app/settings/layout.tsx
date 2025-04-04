'use client';

import { useEffect } from 'react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use useEffect to manage class toggling when component mounts/unmounts
  useEffect(() => {
    // Remove the clip-overflow class from html when in the settings page
    document.documentElement.classList.remove('clip-overflow');
    document.documentElement.classList.add('allow-overflow');

    // Cleanup function to restore classes when component unmounts
    return () => {
      document.documentElement.classList.add('clip-overflow');
      document.documentElement.classList.remove('allow-overflow');
    };
  }, []);

  return children;
} 