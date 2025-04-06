import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Model } from '@/types/chat';
import { Send, Eye, FileText, Globe, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { providers } from '@/lib/providers';
import React from 'react';
import { useRouter } from 'next/navigation';

interface ChatInputProps {
  models: Model[];
  selectedModelId: string;
  onSendMessage: (message: string) => void;
  onSelectModel: (modelId: string) => void;
  isLoading?: boolean;
  isLargePromptVisible?: boolean;
}

export function ChatInput({
  models,
  selectedModelId,
  onSendMessage,
  onSelectModel,
  isLoading = false,
  isLargePromptVisible = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeProviders, setActiveProviders] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [allModels, setAllModels] = useState<Model[]>([]);
  const router = useRouter();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Initialize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(
        Math.max(textareaRef.current.scrollHeight, 42),
        42 * 10
      );
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message]);

  // Load active providers and API keys on mount
  useEffect(() => {
    const savedActiveProviders = localStorage.getItem('activeProviders');
    const savedApiKeys = localStorage.getItem('apiKeys');

    if (savedActiveProviders) {
      const parsedActiveProviders = JSON.parse(savedActiveProviders);
      setActiveProviders(parsedActiveProviders);
    }
    
    if (savedApiKeys) {
      setApiKeys(JSON.parse(savedApiKeys));
    }
  }, []);

  // Update allModels when dependencies change
  useEffect(() => {
    console.log('[ChatInput] Updating models with', {
      modelCount: models.length,
      activeProviderCount: Object.keys(activeProviders).filter(key => activeProviders[key]).length,
      apiKeysCount: Object.keys(apiKeys).length
    });

    const activeCustomModels = models.filter(model => activeProviders[model.provider]);
    const hardcodedModels = providers.flatMap(provider =>
      activeProviders[provider.id] ? provider.getModels(apiKeys[provider.id] || '').map(aiModel => ({
        id: aiModel.id,
        name: aiModel.name,
        provider: aiModel.provider,
        description: aiModel.description,
        baseUrl: aiModel.baseUrl,
        isFavorite: false,
        isCustom: false,
        apiKey: apiKeys[provider.id],
      } as Model)) : []
    );

    const allModelsCombined = [...hardcodedModels, ...activeCustomModels];
    console.log('[ChatInput] Models loaded:', allModelsCombined.length);
    setAllModels(allModelsCombined);
  }, [models, activeProviders, apiKeys]);

  // Find selected model from all available models
  const selectedModel = allModels.find((m) => m.id === selectedModelId);

  // Directly check if we have an API key for the selected model
  const selectedModelApiKey = selectedModel ? apiKeys[selectedModel.provider] : undefined;

  // Sort models by provider and name - using memoization to prevent recalculation on each render
  const sortedModels = React.useMemo(() => {
    return [...allModels].sort((a, b) => {
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      return a.name.localeCompare(b.name);
    });
  }, [allModels]);

  useEffect(() => {
    if (selectedModelId && !selectedModel) {
      console.log('[ChatInput] Warning: Selected model not found in available models', {
        selectedModelId,
        modelsCount: allModels.length,
        modelIds: allModels.map(m => m.id)
      });
    } else if (selectedModel) {
      console.log('[ChatInput] Selected model:', {
        id: selectedModel.id,
        provider: selectedModel.provider,
        hasApiKey: !!selectedModelApiKey
      });
    }
  }, [selectedModelId, selectedModel, allModels, selectedModelApiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ChatInput] Submit triggered', {
      selectedModelId,
      messageLength: message.length,
      hasApiKey: !!selectedModelApiKey
    });

    if (!selectedModelId) {
      toast.error('Please select a model first');
      return;
    }

    if (!selectedModelApiKey) {
      toast.error(`Please add an API key for ${selectedModel?.provider} in settings`);
      router.push('/settings');
      return;
    }

    if (message.trim()) {
      try {
        const messageToSend = message.trim();
        console.log('[ChatInput] Sending message to parent component with model:', selectedModelId);
        // Clear message input immediately to prevent double submissions
        setMessage('');
        // Then send the message
        await onSendMessage(messageToSend);
      } catch (error) {
        console.error('[ChatInput] Error sending message:', error);
        toast.error('Unable to send message. Please try again');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      console.log('[ChatInput] Enter key pressed (without shift)');
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Memoize the provider icon function to prevent recreation on each render
  const getProviderIcon = React.useCallback((provider: string) => {
    switch (provider) {
      case 'google':
        return '✨';
      case 'anthropic':
        return '🧠';
      case 'openai':
        return '🤖';
      case 'openai-compatible':
        return '🔮';
      case 'mistral':
        return '🌪️';
      case 'xai':
        return '🤖';
      case 'perplexity':
        return '🔍';
      default:
        return '';
    }
  }, []);

  // Prevent dropdown from causing infinite render loops
  const handleDropdownOpenChange = React.useCallback((open: boolean) => {
    setIsDropdownOpen(open);
  }, []);

  // Memoize the model selection handler
  const handleModelSelect = React.useCallback((modelId: string) => {
    onSelectModel(modelId);
    setIsDropdownOpen(false);
  }, [onSelectModel]);

  // Memoize the dropdown content to prevent unnecessary re-renders
  const dropdownContent = React.useMemo(() => {
    return (
      <div className="space-y-1">
        {sortedModels.map((model) => (
          <button
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
              model.id === selectedModelId
                ? 'bg-[#2D2F2F] text-white'
                : 'bg-[#202222] hover:bg-[#22292A] text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl" role="img" aria-label="provider icon">
                {getProviderIcon(model.provider)}
              </span>
              <span className="font-medium">{model.name}</span>
            </div>
          </button>
        ))}
      </div>
    );
  }, [sortedModels, selectedModelId, handleModelSelect, getProviderIcon]);

  const hasActiveProviders = Object.values(activeProviders).some(isActive => isActive);

  if (isLargePromptVisible) {
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute bottom-0 inset-x-0 mx-auto z-10 w-full max-w-[900px] px-4 transition-all duration-300 ease-in-out"
    >
      <div className="flex flex-col items-center mb-0 w-full">
        <div className={`flex flex-col rounded-t-[20px] bg-[#202222] border-t border-x border-[#343636] shadow-[0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden w-[600px] min-w-fit max-w-full transition-all duration-200 mb-0 mx-auto relative ${!hasActiveProviders ? 'cursor-not-allowed' : ''}`}>
          {/* Add a semi-transparent overlay when no providers active */}
          {!hasActiveProviders && (
            <div className="absolute inset-0 bg-black/30 pointer-events-none z-[1]"></div>
          )}
          
          {/* Add the warning message overlay */}
          {!hasActiveProviders && (
            <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto">
                <span className="text-[#FF4545] font-medium">No model provider configure.</span>
                <button 
                  onClick={() => router.push('/settings')} 
                  className="text-white underline hover:text-[#FF4545] transition-colors"
                >
                  Configure providers
                </button>
              </div>
            </div>
          )}
          
          {/* Apply pointer-events-none to inner containers when disabled, ensuring cursor is controlled by parent */}
          <div className={`flex px-4 py-1 relative ${!hasActiveProviders ? 'pointer-events-none' : ''}`}>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                // Auto-resize logic
                e.target.style.height = 'auto';
                const newHeight = Math.min(
                  Math.max(e.target.scrollHeight, 42), // Minimum height
                  42 * 10 // Maximum height (10 lines)
                );
                e.target.style.height = `${newHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
                // Otherwise let the default happen (which is to add a new line)
              }}
              placeholder={isLoading ? "AI is thinking..." : "Ask anything..."}
              className={`w-full min-h-[42px] max-h-[420px] bg-transparent text-white text-[15px] placeholder:text-[#8C9191] focus:outline-none resize-none overflow-y-auto py-3 pr-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:bg-[#4A5252] ${!hasActiveProviders ? 'opacity-40 text-zinc-500 placeholder:text-zinc-600 relative z-0 cursor-not-allowed' : ''}`}
              disabled={isLoading || !hasActiveProviders}
              rows={1}
            />
          </div>

          <div className={`flex items-center justify-between px-4 pb-4 h-12 ${!hasActiveProviders ? 'pointer-events-none' : ''}`}>
            <DropdownMenu open={isDropdownOpen} onOpenChange={handleDropdownOpenChange}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`h-9 px-3 gap-2 text-[15px] font-medium bg-[#202222] rounded-lg min-w-[140px] justify-start border border-[#343636] shrink-0 ${!hasActiveProviders ? 'opacity-40 text-zinc-500 relative z-0 cursor-not-allowed' : 'text-white'}`}
                  disabled={!hasActiveProviders}
                >
                  {selectedModel ? (
                    <div className="flex items-center gap-2">
                      <span className="text-base" role="img" aria-label="provider icon">
                        {getProviderIcon(selectedModel.provider)}
                      </span>
                      <span className="truncate font-medium">{selectedModel.name}</span>
                    </div>
                  ) : (
                    'Select Model'
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[300px] p-2 bg-[#202222] border border-[#343636] max-h-[400px] overflow-y-auto rounded-xl shadow-lg"
                align="start"
                side="top"
                sideOffset={8}
              >
                {dropdownContent}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="submit"
              className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed relative z-0 ${!hasActiveProviders ? 'bg-zinc-500 opacity-40 cursor-not-allowed' : 'bg-white hover:bg-white/90'}`}
              disabled={!message.trim() || isLoading || !hasActiveProviders}
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