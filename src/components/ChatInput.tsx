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

  // Load active providers and API keys on mount
  useEffect(() => {
    const savedActiveProviders = localStorage.getItem('activeProviders');
    const savedApiKeys = localStorage.getItem('apiKeys');
    
    if (savedActiveProviders) {
      setActiveProviders(JSON.parse(savedActiveProviders));
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
        return '��';
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
            className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
              model.id === selectedModelId
                ? 'bg-[#0D0D0D] border-[#1A2F7D] text-white'
                : 'bg-black border-[#202020] hover:border-[#333333] hover:bg-[#0D0D0D] text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl" role="img" aria-label="provider icon">
                {getProviderIcon(model.provider)}
              </span>
              <span className="font-medium">{model.name}</span>
            </div>
            <div className="flex gap-1">
              {model.provider === 'google' && (
                <>
                  <div className="rounded-md bg-black/50 p-1">
                    <Eye className="w-3 h-3 text-white/70" />
                  </div>
                  <div className="rounded-md bg-black/50 p-1">
                    <FileText className="w-3 h-3 text-white/70" />
                  </div>
                  <div className="rounded-md bg-black/50 p-1">
                    <Globe className="w-3 h-3 text-white/70" />
                  </div>
                </>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }, [sortedModels, selectedModelId, handleModelSelect, getProviderIcon]);

  if (isLargePromptVisible) {
    return null;
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="fixed bottom-4 left-[calc(50%+var(--sidebar-width)/2)] -translate-x-1/2 z-10 w-full max-w-[900px] px-4"
    >
      <div className="flex flex-col items-center">
        <div className="flex items-center h-14 rounded-[20px] bg-[#0d0d0d] border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden w-[600px] min-w-fit max-w-full transition-all duration-200">
          <DropdownMenu open={isDropdownOpen} onOpenChange={handleDropdownOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="h-9 px-3 ml-2 gap-2 text-[15px] font-medium text-white bg-[#0d0d0d] rounded-lg min-w-[140px] justify-start border border-white/10 shrink-0"
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
              className="w-[300px] p-2 bg-black border border-[#202020] max-h-[400px] overflow-y-auto rounded-xl shadow-lg"
              align="start"
              side="top"
              sideOffset={8}
            >
              {dropdownContent}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1 flex items-center min-w-[200px]">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "AI is thinking..." : "Ask anything..."}
              className="w-full h-full bg-transparent text-white text-[15px] placeholder:text-gray-400 focus:outline-none px-4"
              disabled={isLoading}
              style={{ 
                width: message ? `${Math.min(Math.max(message.length * 10, 200), 600)}px` : '200px',
              }}
            />
          </div>

          <button 
            type="submit"
            className="h-9 w-9 mr-2 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            disabled={!message.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12h14m0 0l-7-7m7 7l-7 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
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