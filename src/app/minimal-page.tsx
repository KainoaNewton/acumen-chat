'use client';

import React, { useState } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function MinimalPage() {
  const [message, setMessage] = useState('');
  
  return (
    <ErrorBoundary>
      <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
        <h1 className="text-2xl font-bold mb-6">Minimal Chat App</h1>
        
        <div className="w-full max-w-md">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) {
                alert(`Message sent: ${message}`);
                setMessage('');
              }
            }}
            className="flex flex-col gap-4"
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
            
            <button
              type="submit"
              disabled={!message.trim()}
              className="p-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </ErrorBoundary>
  );
}
