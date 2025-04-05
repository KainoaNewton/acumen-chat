'use client';

import { Suspense } from 'react';
import Link from 'next/link';

// Component that safely uses useSearchParams inside Suspense
function SearchParamsComponent() {
  // This component doesn't actually need to do anything
  // It's just a placeholder to satisfy Next.js requirements
  return null;
}

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-3 text-2xl">Page Not Found</p>
        <div className="mt-6">
          <Link href="/" className="text-blue-500 hover:text-blue-700">
            Return Home
          </Link>
        </div>
        
        {/* Wrap any components that might use useSearchParams in Suspense */}
        <Suspense fallback={<div>Loading...</div>}>
          <SearchParamsComponent />
        </Suspense>
      </main>
    </div>
  );
} 