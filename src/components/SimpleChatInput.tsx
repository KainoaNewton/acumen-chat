import React, { useState, useRef, useCallback } from 'react';
import { Model } from '@/types/chat';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleChatInputProps {
  models: Model[];
  selectedModelId: string;
  onSendMessage: (message: string) => void;
  onSelectModel: (modelId: string) => void;
  isLoading?: boolean;
}

export function SimpleChatInput({
  models,
  selectedModelId,
  onSendMessage,
  onSelectModel,
  isLoading = false,
}: SimpleChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Memoize the submit handler to prevent unnecessary re-renders
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  }, [message, onSendMessage]);

  // Memoize the key handler to prevent unnecessary re-renders
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        onSendMessage(message.trim());
        setMessage('');
      }
    }
  }, [message, onSendMessage]);

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute bottom-0 inset-x-0 mx-auto z-10 w-full max-w-[900px] px-4 transition-all duration-300 ease-in-out"
    >
      <div className="flex flex-col items-center mb-0 w-full">
        <div className="flex flex-col rounded-t-[20px] bg-[#202222] border-t border-x border-[#343636] shadow-[0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden w-[600px] min-w-fit max-w-full transition-all duration-200 mb-0 mx-auto">
          <div className="flex px-4 py-1 relative min-h-[60px]">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "AI is thinking..." : "Ask anything..."}
              className="w-full min-h-[42px] max-h-[420px] bg-transparent text-white text-[15px] placeholder:text-[#8C9191] focus:outline-none resize-none overflow-y-auto py-3 pr-12 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:bg-[#4A5252]"
              disabled={isLoading}
              rows={1}
            />
            <button
              type="submit"
              className="h-9 w-9 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed absolute bottom-3 right-4"
              disabled={!message.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(-90deg)' }}>
                  <path d="M5 12h14m0 0l-7-7m7 7l-7 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between px-4 py-2 h-12">
            <Button
              variant="ghost"
              className="h-9 px-3 gap-2 text-[15px] font-medium text-white bg-[#202222] rounded-lg min-w-[140px] justify-start border border-[#343636] shrink-0"
              onClick={() => {
                // Just show the first model for simplicity
                if (models.length > 0) {
                  onSelectModel(models[0].id);
                }
              }}
            >
              {selectedModelId ? 'Model Selected' : 'Select Model'}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="mt-2 text-xs text-gray-500 text-center animate-pulse w-full">
            AI is generating a response...
          </div>
        )}
      </div>
    </form>
  );
}

export default React.memo(SimpleChatInput);
