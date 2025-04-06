'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewConversationPage() {
  // Use a ref to safely manage our timer logic without triggering warnings
  const hasLoggedRender = useRef(false);
  
  console.log('[NewConversation] Page component started rendering at', new Date().toISOString());
  
  // Only try to end the timer on first render, and only if it exists
  if (!hasLoggedRender.current) {
    hasLoggedRender.current = true;
    try {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        console.log('[NewConversation] Page loaded from navigation');
      }
    } catch (e) {
      // Timer may not exist, which is fine
    }
  }

  // Log when page first renders
  useEffect(() => {
    console.log('[NewConversation] Component mounted at', new Date().toISOString());
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent/10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">New Conversation</h1>
        </div>

        {/* Add your new conversation UI components here */}
        <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-6 backdrop-blur">
          <p className="text-lg text-secondary-foreground">Start a new conversation with AI</p>
          {/* Add more UI components as needed */}
        </div>
      </div>
    </div>
  );
} 