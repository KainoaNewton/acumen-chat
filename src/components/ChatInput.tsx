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
import { useRouter } from 'next/navigation';

interface ChatInputProps {
  models: Model[];
  selectedModelId: string;
  onSendMessage: (message: string) => void;
  onSelectModel: (modelId: string) => void;
  isLoading?: boolean;
}

export function ChatInput({
  models,
  selectedModelId,
  onSendMessage,
  onSelectModel,
  isLoading = false,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      console.log('[ChatInput] Enter key pressed (without shift)');
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Sort models by provider and name
  const sortedModels = [...allModels].sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    return a.name.localeCompare(b.name);
  });

  const getProviderIcon = (provider: string) => {
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
        return '🤖';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="relative flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/90">
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-9 px-3 gap-2 text-sm font-medium text-zinc-400 min-w-[150px] justify-start"
              onClick={(e) => {
                e.preventDefault();
                setIsDropdownOpen(true);
              }}
              disabled={isLoading}
            >
              {selectedModel ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg" role="img" aria-label="provider icon">
                    {getProviderIcon(selectedModel.provider)}
                  </span>
                  <span className="truncate">{selectedModel.name}</span>
                </div>
              ) : (
                'Select Model'
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-[300px] p-2 bg-zinc-900 border border-zinc-800 max-h-[400px] overflow-y-auto"
            align="start"
            side="top"
            sideOffset={8}
          >
            <div className="space-y-1">
              {sortedModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-colors ${
                    model.id === selectedModelId
                      ? 'bg-zinc-800/80 border-zinc-700'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl" role="img" aria-label="provider icon">
                      {getProviderIcon(model.provider)}
                    </span>
                    <span className="font-medium text-zinc-100">{model.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {model.provider === 'google' && (
                      <>
                        <div className="rounded-md bg-zinc-800 p-1">
                          <Eye className="w-3 h-3 text-zinc-400" />
                        </div>
                        <div className="rounded-md bg-zinc-800 p-1">
                          <FileText className="w-3 h-3 text-zinc-400" />
                        </div>
                        <div className="rounded-md bg-zinc-800 p-1">
                          <Globe className="w-3 h-3 text-zinc-400" />
                        </div>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-zinc-800" />

        <div className="relative flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isLoading ? "AI is thinking..." : "Type your message..."}
            className="flex-1 min-h-[44px] max-h-[400px] bg-transparent border-0 focus:ring-0 resize-none py-3 text-sm text-zinc-100 placeholder:text-zinc-500 pr-8"
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          
          {message.trim() && !isLoading && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute right-2 top-2 h-6 w-6 text-zinc-400 hover:text-zinc-100"
              onClick={() => setMessage('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="h-9 w-9 flex items-center justify-center text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : (
          <Button 
            type="submit" 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-zinc-400 hover:text-zinc-100"
            disabled={isLoading || !message.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {isLoading && (
        <div className="mt-2 text-xs text-zinc-500 text-center animate-pulse">
          AI is generating a response...
        </div>
      )}
    </form>
  );
} 