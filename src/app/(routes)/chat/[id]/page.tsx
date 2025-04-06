'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';

export default function ChatPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  useEffect(() => {
    // Check if the chat exists
    const chats = storage.getChats();
    const chat = chats.find(c => c.id === params.id);
    
    if (!chat) {
      // If chat doesn't exist, redirect to home
      router.push('/');
      return;
    }
    
    // Store this as the last selected chat
    localStorage.setItem('lastSelectedChatId', params.id);
  }, [params.id, router]);

  // Redirect to home page which will handle the chat display
  useEffect(() => {
    router.push('/');
  }, [router]);

  return null; // This page acts as a router only
} 