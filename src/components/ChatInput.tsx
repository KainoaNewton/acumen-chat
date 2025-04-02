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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ChatInput] Submit triggered', { 
      selectedModelId, 
      messageLength: message.length,
      hasApiKey: !!selectedModelApiKey
    });
    
    if (!selectedModelId) {
      console.log('[ChatInput] No model selected, showing error');
      toast.error('Please select a model first');
      return;
    }
    
    if (!selectedModelApiKey) {
      console.log('[ChatInput] No API key for selected model provider:', selectedModel?.provider);
      toast.error(`Please add an API key for ${selectedModel?.provider} in settings`);
      return;
    }

    if (message.trim()) {
      try {
        const messageToSend = message.trim();
        console.log('[ChatInput] Sending message to parent component with model:', selectedModelId);
        // Clear message input immediately to prevent double submissions
        setMessage('');
        // Then send the message
        onSendMessage(messageToSend);
      } catch (error) {
        console.error('[ChatInput] Error sending message:', error);
        toast.error('Failed to send message');
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
      <div className="relative flex items-center gap-2 rounded-xl border border-[#202020] bg-black backdrop-blur shadow-sm">
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-12 px-4 gap-2 text-sm font-medium text-white hover:bg-[#141414] min-w-[180px] justify-start rounded-l-xl border-r border-[#202020]"
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
            className="w-[300px] p-2 bg-black border border-[#202020] max-h-[400px] overflow-y-auto rounded-xl shadow-lg"
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
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isLoading ? "AI is thinking..." : "Type your message..."}
            className="flex-1 min-h-[48px] max-h-[400px] bg-transparent border-0 focus:ring-0 resize-none py-3.5 px-4 text-sm text-white placeholder:text-gray-500 pr-10"
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          
          {message.trim() && !isLoading && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute right-3 top-3 h-6 w-6 text-gray-500 hover:text-white"
              onClick={() => setMessage('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="h-12 w-12 flex items-center justify-center text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : (
          <Button 
            type="submit" 
            variant="ghost" 
            size="icon" 
            className="h-12 w-12 text-gray-500 hover:text-[#1A2F7D] hover:bg-[#0D0D0D] transition-colors"
            disabled={isLoading || !message.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {isLoading && (
        <div className="mt-2 text-xs text-gray-500 text-center animate-pulse">
          AI is generating a response...
        </div>
      )}
    </form>
  );
} 