'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useChat } from 'ai/react';
import { v4 as uuidv4 } from 'uuid';
import { Sidebar } from '@/components/Sidebar';
import { ChatInput } from '@/components/ChatInput';
import { storage } from '@/lib/storage';
import { Chat, Message, Model, Settings, AIResponseVersion, MessageWithVersions, SetMessagesAction, SetChatsAction, ensureMessage, hasVersions, convertAIMessage, convertToAIMessage, ensureChat, setStateAction } from '@/types/chat';
import { useRouter } from 'next/navigation';
import { providers } from '@/lib/providers';
import { toast } from 'sonner';
import { MarkdownContent } from '@/components/MarkdownContent';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw, ArrowLeft, ArrowRight, Undo2, History, ChevronDown, Eye, FileText, Globe, User, X, Sparkles, CornerDownLeft, Laptop, Settings as SettingsIcon } from 'lucide-react';
import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Add this new component for the thinking animation
const ThinkingAnimation = () => (
  <div className="flex items-center space-x-2 p-2">
    <div className="flex space-x-1.5">
      <span className="h-2.5 w-2.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1000ms' }}></span>
      <span className="h-2.5 w-2.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms', animationDuration: '1000ms' }}></span>
      <span className="h-2.5 w-2.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '600ms', animationDuration: '1000ms' }}></span>
    </div>
    <span className="text-gray-300 text-sm">AI is thinking</span>
  </div>
);

// Add a component for animated streaming content
const StreamingContent = ({ content }: { content: string }) => {
  const contentLines = content.split('\n');

  return (
    <div className="streaming-content">
      {contentLines.map((line, index) => (
        <div
          key={index}
          className="streaming-line animate-fade-in"
          style={{
            animationDelay: `${Math.min(index * 30, 300)}ms`,
            minHeight: line.trim() === '' ? '0.6em' : 'auto'
          }}
        >
          {line.trim() === '' ? <br /> : <MarkdownContent content={line} />}
        </div>
      ))}
    </div>
  );
};

// Update the hero section with a large prompt box
const HeroSection = ({
  onSendMessage,
  models,
  selectedModelId,
  onSelectModel
}: {
  onSendMessage: (message: string) => void;
  models: Model[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}) => {
  const [input, setInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeProviders, setActiveProviders] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const router = useRouter();

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

  // Filter and sort models based on active providers
  const availableModels = React.useMemo(() => {
    // Use a Map to ensure unique models by ID
    const modelMap = new Map<string, Model>();

    // Add hardcoded models from providers first
    providers.forEach(provider => {
      if (activeProviders[provider.id]) {
        provider.getModels(apiKeys[provider.id] || '').forEach(aiModel => {
          modelMap.set(aiModel.id, {
            id: aiModel.id,
            name: aiModel.name,
            provider: aiModel.provider,
            description: aiModel.description || '',
            isFavorite: false,
            isCustom: false
          } as Model);
        });
      }
    });

    // Add custom models, potentially overwriting provider models if they have the same ID
    models.filter(model => activeProviders[model.provider]).forEach(model => {
      modelMap.set(model.id, model);
    });

    // Convert Map back to array and sort
    return Array.from(modelMap.values()).sort((a, b) => {
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      return a.name.localeCompare(b.name);
    });
  }, [models, activeProviders, apiKeys]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Find selected model from available models
  const selectedModel = availableModels.find((m) => m.id === selectedModelId);
  
  // Check if we have any active providers
  const hasActiveProviders = Object.values(activeProviders).some(isActive => isActive);

  // Get provider icon
  const getProviderIcon = React.useCallback((provider: string | undefined) => {
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

  // Memoize the dropdown content
  const dropdownContent = React.useMemo(() => {
    return (
      <div className="space-y-1">
        {availableModels.map((model) => (
          <button
            key={model.id}
            onClick={() => {
              onSelectModel(model.id);
              setIsDropdownOpen(false);
            }}
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
  }, [availableModels, selectedModelId, onSelectModel, getProviderIcon]);

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-white mb-8">How can I help you?</h1>
      <div className="w-full max-w-[900px]">
        <div className="flex flex-col items-center mb-0 w-full">
          <div className={`flex flex-col rounded-[24px] bg-[#202222] border border-[#343636] shadow-[0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden w-[600px] min-w-fit max-w-full transition-all duration-200 mb-8 mx-auto relative ${!hasActiveProviders ? 'cursor-not-allowed' : ''}`}>
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
            
            <div className={`flex px-4 py-1 relative ${!hasActiveProviders ? 'pointer-events-none' : ''}`}>
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
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
                }}
                placeholder="Ask anything..."
                className={`w-full min-h-[42px] max-h-[420px] bg-transparent text-white text-[15px] placeholder:text-[#8C9191] focus:outline-none resize-none overflow-y-auto py-3 pr-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:bg-[#4A5252] ${!hasActiveProviders ? 'opacity-40 text-zinc-500 placeholder:text-zinc-600 relative z-0 cursor-not-allowed' : ''}`}
                disabled={!hasActiveProviders}
                rows={1}
              />
            </div>

            <div className={`flex items-center justify-between px-4 pb-4 h-12 ${!hasActiveProviders ? 'pointer-events-none' : ''}`}>
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
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
                disabled={!input.trim() || !hasActiveProviders}
                onClick={handleSubmit}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(-90deg)' }}>
                  <path d="M5 12h14m0 0l-7-7m7 7l-7 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [settings, setSettings] = useState<Settings>({
    models: [],
    defaultModelId: 'gemini-2.0-flash',
  });
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  // Add a ref to track the last selected chat ID to prevent race conditions
  const lastSelectedChatRef = useRef<string>('');

  // No need for activeModel state since it's causing circular dependencies

  // Simple ref to store current model info without tracking dependencies
  const currentModelInfoRef = useRef({
    model: null as any,
    apiKey: null as string | null
  });

  // Add a ref to track if we've navigated to settings before
  const hasNavigatedToSettings = useRef(false);
  const reloadKeys = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);

  // Add this before the return statement
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const savedChats = storage.getChats();
    const savedSettings = storage.getSettings();
    const savedApiKeys = storage.getApiKeys();

    console.log('[Home] Loaded API keys from storage:', {
      keys: Object.keys(savedApiKeys),
      count: Object.keys(savedApiKeys).length,
      raw: JSON.stringify(savedApiKeys).substring(0, 100) + '...'
    });

    if (savedSettings) {
      setSettings(savedSettings);
    }

    // Get API keys from both sources to ensure consistency
    const directApiKeys = localStorage.getItem('apiKeys');
    console.log('[Home] Direct localStorage API keys:', {
      exists: !!directApiKeys,
      raw: directApiKeys ? directApiKeys.substring(0, 100) + '...' : 'null'
    });

    // Use direct localStorage API keys if they exist, otherwise use storage module
    if (directApiKeys) {
      try {
        const parsedApiKeys = JSON.parse(directApiKeys);
        setApiKeys(parsedApiKeys);
        console.log('[Home] Using direct localStorage API keys:', Object.keys(parsedApiKeys));

        // Make sure the API keys are not empty objects
        for (const provider in parsedApiKeys) {
          if (!parsedApiKeys[provider] || parsedApiKeys[provider].trim() === '') {
            console.warn(`[Home] Empty API key found for provider: ${provider}`);
            delete parsedApiKeys[provider]; // Remove empty keys
          }
        }

        // Ensure storage is synced
        storage.saveApiKeys(parsedApiKeys);
      } catch (error) {
        console.error('[Home] Error parsing API keys from localStorage:', error);
        if (Object.keys(savedApiKeys).length > 0) {
          setApiKeys(savedApiKeys);
        }
      }
    } else if (Object.keys(savedApiKeys).length > 0) {
      setApiKeys(savedApiKeys);
      console.log('[Home] Using storage API keys');
    } else {
      console.log('[Home] No API keys found in either storage or localStorage');
      // Add some test API keys for development
      const testApiKeys = {
        "google": "test-google-api-key",
        "mistral": "test-mistral-api-key"
      };
      console.log('[Home] Added test API keys for development');
      setApiKeys(testApiKeys);
      storage.saveApiKeys(testApiKeys);
      localStorage.setItem('apiKeys', JSON.stringify(testApiKeys));
    }

    setChats(savedChats);

    // Clear messages initially to prevent any stale data
    setMessages([]);

    // Add this code to handle the initial loading of the selected chat
    // and restore chat messages from localStorage
    if (savedChats.length > 0) {
      // Check if there was a previously selected chat in localStorage
      const lastSelectedChatId = localStorage.getItem('lastSelectedChatId');
      if (lastSelectedChatId && savedChats.some(chat => chat.id === lastSelectedChatId)) {
        console.log('[Home] Restoring last selected chat:', lastSelectedChatId);
        // Update ref to match the selected chat
        lastSelectedChatRef.current = lastSelectedChatId;
        setSelectedChatId(lastSelectedChatId);
        const lastSelectedChat = savedChats.find(chat => chat.id === lastSelectedChatId);
        if (lastSelectedChat?.messages) {
          // Restore messages from the saved chat
          setUIMessages(lastSelectedChat.messages);
          // Set messages with a slight delay to ensure loading is complete
          setTimeout(() => {
            setMessages(lastSelectedChat.messages);
          }, 10);
        }
      } else {
        // If no last selected chat or it doesn't exist anymore, select the first chat
        console.log('[Home] Setting first chat as selected');
        // Update ref to match the selected chat
        lastSelectedChatRef.current = savedChats[0].id;
        setSelectedChatId(savedChats[0].id);
        if (savedChats[0]?.messages) {
          setUIMessages(savedChats[0].messages);
          // Set messages with a slight delay to ensure loading is complete
          setTimeout(() => {
            setMessages(savedChats[0].messages);
          }, 10);
        }
      }
    }
  }, []);

  // After apiKeys are loaded, let's also make a reference copy available globally
  // This is a workaround for potential state update timing issues
  useEffect(() => {
    // Check both the current state and localStorage for API keys
    const storedApiKeys = localStorage.getItem('apiKeys');
    const hasStoredKeys = storedApiKeys && Object.keys(JSON.parse(storedApiKeys)).length > 0;

    if (Object.keys(apiKeys).length > 0) {
      console.log('[Home] apiKeys updated in state:', Object.keys(apiKeys));
      console.log('[Home] API keys content:', JSON.stringify(apiKeys).substring(0, 100) + '...');
      // Save to localStorage directly again to ensure consistency
      localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
    } else if (hasStoredKeys) {
      // If apiKeys state is empty but localStorage has keys, use those instead
      console.log('[Home] No API keys in state, but found in localStorage. Loading from storage.');
      try {
        const parsedKeys = JSON.parse(storedApiKeys as string);
        setApiKeys(parsedKeys);  // Update the state with localStorage values
      } catch (e) {
        console.error('[Home] Error parsing API keys from localStorage:', e);
      }
    } else {
      // Only show error if both state and localStorage are empty
      console.log('[Home] No API keys found in state or localStorage. Adding a prompt to add API keys.');
      toast.error('No API keys found. Please add API keys in settings to use the chat.');
    }
  }, []); // Remove apiKeys from dependencies to prevent infinite loop

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);

  // This is the key issue - we need to ensure we look for the model in all available models
  // First determine which model ID we're using
  const currentModelId = selectedChat?.modelId || settings.defaultModelId;

  // Look for this model in settings.models first
  let selectedModel = settings.models.find(m => m.id === currentModelId);

  // If we can't find it there, we need to get it from the providers
  if (!selectedModel) {
    console.log('[Home] Model not found in settings, checking providers', {
      currentModelId,
      availableApiKeys: Object.keys(apiKeys)
    });

    // Load all provider models
    const providerModels: Model[] = [];
    for (const provider of Object.keys(apiKeys)) {
      if (apiKeys[provider]) {
        console.log(`[Home] Processing provider: ${provider} with API key length: ${apiKeys[provider].length}`);
        const providerObj = providers.find(p => p.id === provider);
        if (providerObj) {
          try {
            console.log(`[Home] Getting models for provider: ${provider}`);
            const models = providerObj.getModels(apiKeys[provider]);
            console.log(`[Home] Provider ${provider} returned ${models.length} models`, {
              modelIds: models.map(m => m.id)
            });

            // Convert AIModel to Model
            const modelsConverted = models.map(m => ({
              id: m.id,
              name: m.name,
              provider: m.provider,
              description: m.description || '',
              baseUrl: m.baseUrl,
              isFavorite: false,
              isCustom: false,
              apiKey: apiKeys[m.provider],
            } as Model));

            providerModels.push(...modelsConverted);
          } catch (error) {
            console.error(`[Home] Error getting models for provider ${provider}:`, error);
          }
        } else {
          console.log(`[Home] Provider object not found for ${provider}`);
        }
      }
    }

    console.log('[Home] All provider models:', {
      count: providerModels.length,
      modelIds: providerModels.map(m => m.id)
    });

    // Try to find our model in provider models
    selectedModel = providerModels.find(m => m.id === currentModelId);
    if (selectedModel) {
      console.log('[Home] Found model in provider models:', selectedModel.id);
    } else {
      console.log('[Home] Model not found in provider models:', currentModelId);
    }
  }

  // Now construct the model with API key
  let selectedModelWithApiKey = selectedModel ? {
    ...selectedModel,
    apiKey: apiKeys[selectedModel.provider]
  } : null;

  console.log('[Home] Initial selectedModelWithApiKey:', {
    exists: !!selectedModelWithApiKey,
    id: selectedModelWithApiKey?.id,
    provider: selectedModelWithApiKey?.provider,
    hasApiKey: !!selectedModelWithApiKey?.apiKey
  });

  // If we don't have a model with API key but we have API keys available,
  // try to find a model that works with those keys
  if (!selectedModelWithApiKey || !selectedModelWithApiKey.apiKey) {
    // If we have API keys but no model selected, pick a model from a provider we have a key for
    if (Object.keys(apiKeys).length > 0) {
      console.log('[Home] Trying to find a suitable model for available API keys');

      // Try to find a provider we have a key for
      const availableProvider = Object.keys(apiKeys).find(provider => !!apiKeys[provider]);

      if (availableProvider) {
        console.log(`[Home] Found available provider: ${availableProvider}`);
        const providerObj = providers.find(p => p.id === availableProvider);

        if (providerObj) {
          try {
            // Get the first model from this provider
            const providerModels = providerObj.getModels(apiKeys[availableProvider]);
            if (providerModels.length > 0) {
              const firstModel = providerModels[0];
              selectedModelWithApiKey = {
                id: firstModel.id,
                name: firstModel.name,
                provider: firstModel.provider,
                description: firstModel.description || '',
                apiKey: apiKeys[availableProvider],
                isFavorite: false,
                isCustom: false
              };

              console.log('[Home] Using fallback model:', selectedModelWithApiKey.id);

              // Remove the direct state update here
              // const newSettings = {
              //   ...settings,
              //   defaultModelId: firstModel.id
              // };
              // setSettings(newSettings);
              // storage.saveSettings(newSettings);
            }
          } catch (error) {
            console.error(`[Home] Error getting models for fallback provider:`, error);
          }
        }
      }
    }
  }

  console.log('[Home] Final selectedModelWithApiKey:', {
    exists: !!selectedModelWithApiKey,
    id: selectedModelWithApiKey?.id,
    provider: selectedModelWithApiKey?.provider,
    hasApiKey: !!selectedModelWithApiKey?.apiKey
  });

  // Function to get model info for the chat API - doesn't cause state updates
  const getChatModelInfo = () => {
    // Return the model info directly from the selectedModelWithApiKey
    // This is more reliable than using the ref
    if (selectedModelWithApiKey?.apiKey) {
      console.log('[Home] getChatModelInfo returning from selectedModelWithApiKey:', {
        modelId: selectedModelWithApiKey.id,
        provider: selectedModelWithApiKey.provider,
        hasApiKey: true
      });

      return {
        model: {
          id: selectedModelWithApiKey.id,
          provider: selectedModelWithApiKey.provider,
          name: selectedModelWithApiKey.name || selectedModelWithApiKey.id
        },
        apiKey: selectedModelWithApiKey.apiKey
      };
    }

    // Fallback to the ref approach
    const modelInfo = currentModelInfoRef.current;
    if (modelInfo.model && modelInfo.apiKey) {
      console.log('[Home] getChatModelInfo returning from ref:', {
        modelId: modelInfo.model.id,
        provider: modelInfo.model.provider,
        hasApiKey: !!modelInfo.apiKey
      });

      return {
        model: {
          id: modelInfo.model.id,
          provider: modelInfo.model.provider,
          name: modelInfo.model.name
        },
        apiKey: modelInfo.apiKey
      };
    }

    console.warn('[Home] getChatModelInfo: No model info available!');
    return { model: null, apiKey: null };
  };

  // Simplified useChat for more compatibility with Vercel AI SDK
  const chatParams = {
    api: '/api/chat',
    // Unique ID to prevent useChat instances from conflicting - don't change with model, only with chat
    id: selectedChatId ? `chat-${selectedChatId}` : 'chat-new',
    // Load initial messages if we have a selected chat
    initialMessages: selectedChat?.messages || [],
    // Set stream protocol to text mode for better compatibility
    streamProtocol: 'text',
    // Fix key for proper handling with the older AI SDK version we're using
    sendExtraMessageFields: false,
    // Send the model and API key to the backend on each request
    body: {
      model: selectedModelWithApiKey ? {
        id: selectedModelWithApiKey.id,
        provider: selectedModelWithApiKey.provider,
        name: selectedModelWithApiKey.name || selectedModelWithApiKey.id
      } : null,
      apiKey: selectedModelWithApiKey?.apiKey || null
    },
    onResponse: (response: Response) => {
      console.log('[Home] Response received:', {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });

      // Show error toast if response is not OK
      if (!response.ok) {
        response.text().then((text: string) => {
          try {
            const error = JSON.parse(text);
            const userMessage = error.error === 'context_length_exceeded'
              ? 'Message is too long for the AI model to process'
              : 'Unable to generate AI response. Please try again';
            toast.error(userMessage);
          } catch (e) {
            let userMessage = 'Unable to connect to AI service';
            if (response.status === 401) {
              userMessage = 'Invalid API key. Please check your settings';
            } else if (response.status === 429) {
              userMessage = 'Too many requests. Please wait a moment and try again';
            } else if (response.status >= 500) {
              userMessage = 'AI service is temporarily unavailable. Please try again later';
            }
            toast.error(userMessage);
          }
        });
      }
    },
    onFinish: (message: { id: string; content: string; role: string }) => {
      console.log('[Home] AI response completed');
      if (selectedChatId) {
        // When the AI is done generating, save the response to the chat
        const localMessage = {
          id: message.id,
          content: message.content,
          role: message.role as 'assistant',
          createdAt: new Date(),
        };

        const updatedChats = chats.map((chat) =>
          chat.id === selectedChatId
            ? {
                ...chat,
                messages: [...chat.messages, localMessage],
                updatedAt: new Date(),
              }
            : chat
        );
        setChats(updatedChats);
        storage.saveChats(updatedChats);
      }
    },
    onError: (error: Error) => {
      console.error('[Home] Error:', error);
      let userMessage = 'Failed to communicate with AI service';
      if (error.message.includes('network')) {
        userMessage = 'Network connection issue. Please check your internet connection';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out. Please try again';
      }
      toast.error(userMessage);
    }
  };

  // Log the parameters we're using for useChat to help debug
  console.log('[Home] useChat parameters:', {
    id: chatParams.id,
    initialMessageCount: chatParams.initialMessages.length,
    modelId: chatParams.body.model?.id,
    provider: chatParams.body.model?.provider,
    hasApiKey: !!chatParams.body.apiKey
  });

  const { input, handleInputChange, handleSubmit, isLoading, setMessages: useChatSetMessages } = useChat(chatParams);

  // Store previous messages to handle model switching
  const [uiMessages, setUIMessages] = useState<any[]>([]);

  // Update UI messages whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setUIMessages(messages);
    }
  }, [messages]);

  // Update chat messages when selectedChat changes
  useEffect(() => {
    // Update ref to match current selection
    lastSelectedChatRef.current = selectedChatId;

    if (selectedChatId !== '') {
      const selectedChat = chats.find((chat) => chat.id === selectedChatId);
      if (selectedChat) {
        console.log('[Home] Loading messages for selected chat:', selectedChatId);

        // Check if messages already match the selected chat's messages
        const messagesMatch = messages.length === selectedChat.messages.length &&
                              (messages.length === 0 || messages[0].id === selectedChat.messages[0]?.id);

        if (!messagesMatch) {
          // First clear existing messages
          useChatSetMessages([]);
          // Then set the correct messages with a slight delay
          setTimeout(() => {
            // Only update if the selected chat hasn't changed during the timeout
            if (lastSelectedChatRef.current === selectedChatId) {
              useChatSetMessages(selectedChat.messages || []);
            }
          }, 10);
        }
      }
    } else {
      // Only clear messages if we actually have a change in selectedChatId
      if (messages.length > 0) {
        console.log('[Home] No chat selected, clearing messages');
        useChatSetMessages([]);
        setMessages([]);
      }
    }
  }, [selectedChatId, chats]); // Remove messages and useChatSetMessages from dependencies

  // Update body params when model changes
  useEffect(() => {
    console.log('[Home] Selected model changed, updating chat parameters');

    // When model changes, ensure we keep the current UI messages
    if (uiMessages.length > 0) {
      console.log('[Home] Preserving current UI messages after model change');
      useChatSetMessages(uiMessages);
    }
  }, [selectedModelWithApiKey, uiMessages, useChatSetMessages]); // Add useChatSetMessages to dependencies

  const handleNewChat = useCallback(() => {
    // Batch state updates to prevent cascading effects
    const updates = () => {
      setUIMessages([]);
      setMessages([]);
      setSelectedChatId('');
    };
    updates();
    localStorage.removeItem('lastSelectedChatId');
  }, []); // Empty dependency array since we don't use any external values

  const handleSelectChat = (chatId: string) => {
    // Update the ref immediately to prevent race conditions
    lastSelectedChatRef.current = chatId;

    // First, clear all message states
    setMessages([]);
    setUIMessages([]);
    useChatSetMessages([]);

    // Then set the selected chat ID
    setSelectedChatId(chatId);

    // Save the selected chat ID to localStorage for persistence
    localStorage.setItem('lastSelectedChatId', chatId);

    // Find the selected chat and update messages state
    const selectedChat = chats.find((chat) => chat.id === chatId);
    if (selectedChat) {
      // Set messages with a slight delay to ensure proper clearing first
      setTimeout(() => {
        // Only update if the selected chat hasn't changed during the timeout
        if (lastSelectedChatRef.current === chatId) {
          const chatMessages = selectedChat.messages || [];
          setMessages(chatMessages);
          setUIMessages(chatMessages);
          useChatSetMessages(chatMessages);
        }
      }, 50);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    // Remove the chat from our chats array
    const updatedChats = chats.filter((chat) => chat.id !== chatId);
    setChats(updatedChats);
    storage.saveChats(updatedChats);

    // If we're deleting the currently selected chat
    if (selectedChatId === chatId) {
      // Clear messages from UI immediately
      useChatSetMessages([]);
      setUIMessages([]);

      // If there are other chats, select the first one
      if (updatedChats.length > 0) {
        const newSelectedId = updatedChats[0].id;
        setSelectedChatId(newSelectedId);
        localStorage.setItem('lastSelectedChatId', newSelectedId);

        // Load the messages for the newly selected chat
        const newSelectedChat = updatedChats.find(chat => chat.id === newSelectedId);
        if (newSelectedChat) {
          useChatSetMessages(newSelectedChat.messages || []);
          setUIMessages(newSelectedChat.messages || []);
        }
      } else {
        // If no chats remain, set to empty string and clear localStorage
        setSelectedChatId('');
        localStorage.removeItem('lastSelectedChatId');
      }
    }
  };

  const handleEditChat = (chatId: string | null) => {
    if (chatId) {
      const chat = chats.find((c) => c.id === chatId);
      if (chat) {
        setEditingChatId(chatId);
        setEditingTitle(chat.title);
      }
    } else {
      setEditingChatId(null);
    }
  };

  const handleSaveTitle = (chatId: string) => {
    const updatedChats = chats.map((chat) =>
      chat.id === chatId
        ? { ...chat, title: editingTitle || 'Untitled Chat' }
        : chat
    );
    setChats(updatedChats);
    storage.saveChats(updatedChats);
    setEditingChatId(null);
  };

  // Update useEffect for chat synchronization
  useEffect(() => {
    // Only run this effect if we have a selectedChatId
    if (selectedChatId === '') {
      setMessages([]);
      setUIMessages([]);
      useChatSetMessages([]);
      return;
    }

    // If the selected chat exists in our chats list, make sure messages are synced
    const selectedChat = chats.find(chat => chat.id === selectedChatId);
    if (selectedChat) {
      const chatMessages = selectedChat.messages || [];

      // Compare message arrays to avoid unnecessary updates
      const messagesAreDifferent = JSON.stringify(messages.map(m => m.id)) !==
                                   JSON.stringify(chatMessages.map(m => m.id));

      if (messagesAreDifferent) {
        console.log('[Home] Syncing messages with selected chat');
        setMessages(chatMessages);
        setUIMessages(chatMessages);
        useChatSetMessages(chatMessages);
      }
      return;
    }

    // If we get here, the selected chat doesn't exist in our chats list
    console.log('[Home] Selected chat no longer exists, resetting state');

    // If there are other chats, select the first one
    if (chats.length > 0) {
      const newSelectedId = chats[0].id;
      console.log('[Home] Selecting first available chat:', newSelectedId);
      setSelectedChatId(newSelectedId);
      localStorage.setItem('lastSelectedChatId', newSelectedId);

      // Load the messages for the newly selected chat
      const newSelectedChat = chats.find(chat => chat.id === newSelectedId);
      if (newSelectedChat?.messages) {
        const newMessages = newSelectedChat.messages;
        setMessages(newMessages);
        setUIMessages(newMessages);
        useChatSetMessages(newMessages);
      }
    } else {
      // If no chats remain, clear everything
      console.log('[Home] No chats available, clearing selection');
      setSelectedChatId('');
      localStorage.removeItem('lastSelectedChatId');
      setMessages([]);
      setUIMessages([]);
      useChatSetMessages([]);
    }
  }, [chats, selectedChatId, useChatSetMessages]); // Add useChatSetMessages to dependencies

  // Update handleSendMessage to be more resilient
  const handleSendMessage = async (message: string, targetMessageId?: string) => {
    console.log('[Home] handleSendMessage called', {
      messageLength: message.length,
      hasSelectedModelWithApiKey: !!selectedModelWithApiKey,
      modelId: selectedModelWithApiKey?.id,
      provider: selectedModelWithApiKey?.provider
    });

    // Prevent sending empty messages
    if (!message.trim()) {
      console.log('[Home] Attempt to send empty message prevented');
      return;
    }

    // If we don't have a valid model with API key, redirect to settings immediately
    if (!selectedModelWithApiKey?.apiKey) {
      console.log('[Home] No API key for model, redirecting to settings');
      toast.error('Please add an API key in settings to continue chatting');
      router.push('/settings');
      return;
    }

    try {
      // Create the user message
      const userMessage = {
        id: uuidv4(),
        content: message,
        role: 'user' as const,
        createdAt: new Date(),
      };

      let newChatId = selectedChatId;
      let currentMessages: Message[] = [];
      let isNewChat = false;
      let newChat: Chat | null = null;

      // Create a new chat if needed
      if (selectedChatId === '') {
        console.log('[Home] No chat selected, creating new chat');
        const chatId = uuidv4();
        newChatId = chatId;
        isNewChat = true;

        // Create new chat with the message
        newChat = {
          id: chatId,
          title: generateChatTitle(message),
          messages: [userMessage],
          createdAt: new Date(),
          updatedAt: new Date(),
          modelId: selectedModelWithApiKey.id,
        };

        // Add the new chat to the list and update state immediately
        setChats(prevChats => {
          const updatedChats = [newChat!, ...prevChats];
          // Save to storage
          storage.saveChats(updatedChats);
          return updatedChats;
        });

        // Set the selected chat ID immediately
        setSelectedChatId(chatId);
        localStorage.setItem('lastSelectedChatId', chatId);
        currentMessages = [userMessage];
      } else {
        // Add to the existing chat
        console.log('[Home] Adding user message to existing chat', { chatId: newChatId });

        // Get the existing chat's messages and add the new user message
        const existingChat = chats.find(chat => chat.id === newChatId);
        if (!existingChat) {
          throw new Error(`Chat with ID ${newChatId} not found`);
        }

        currentMessages = [...existingChat.messages, userMessage];

        // Update the chat with the new message
        setChats(prevChats => {
          const updatedChats = prevChats.map((chat) =>
            chat.id === newChatId
              ? {
                  ...chat,
                  messages: currentMessages,
                  updatedAt: new Date(),
                }
              : chat
          );

          // Save to storage
          storage.saveChats(updatedChats);
          return updatedChats;
        });
      }

      // Update the UI with the user message
      setMessages(currentMessages);

      // Add a loading message that will be updated with actual content
      const aiMessageId = uuidv4();
      const loadingMessage = {
        id: aiMessageId,
        content: '',
        role: 'assistant' as const,
        createdAt: new Date(),
        isLoading: true,
      };

      // Show the loading message in the UI
      const messagesWithLoadingIndicator = [...currentMessages, loadingMessage];
      setMessages(messagesWithLoadingIndicator);

      // Update the chat in storage with the loading state
      setChats(prevChats => {
        const updatedChats = prevChats.map((chat) =>
          chat.id === newChatId
            ? {
                ...chat,
                messages: messagesWithLoadingIndicator,
                updatedAt: new Date(),
              }
            : chat
        );
        storage.saveChats(updatedChats);
        return updatedChats;
      });

      // Force a delay to ensure the thinking animation is visible
      await new Promise(resolve => setTimeout(resolve, 1000));

      // If this is a new chat, update it again to ensure it exists
      if (isNewChat && newChat) {
        // Create a function to update the chat with loading message
        const updateChatWithLoading = () => {
          setChats(prevChats => {
            // Try to find the chat in the current state
            const chatExists = prevChats.some(chat => chat.id === newChatId);

            if (!chatExists) {
              // If chat doesn't exist, add it
              const updatedNewChat = {
                ...newChat!,
                messages: messagesWithLoadingIndicator
              };
              const updatedChats = [updatedNewChat, ...prevChats.filter(chat => chat.id !== newChatId)];
              storage.saveChats(updatedChats);
              return updatedChats;
            } else {
              // If chat exists, update it
              const updatedChats = prevChats.map(chat =>
                chat.id === newChatId ? {
                  ...chat,
                  messages: messagesWithLoadingIndicator
                } : chat
              );
              storage.saveChats(updatedChats);
              return updatedChats;
            }
          });
        };

        // Update the chat immediately
        updateChatWithLoading();

        // And also after a short delay to ensure it's updated
        setTimeout(updateChatWithLoading, 100);
      }

      // Send message to AI using the API directly
      console.log('[Home] Sending message to API');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...currentMessages.map(m => ({
              content: m.content,
              role: m.role,
            }))
          ],
          model: {
            id: selectedModelWithApiKey.id,
            provider: selectedModelWithApiKey.provider,
          },
          apiKey: selectedModelWithApiKey.apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let aiMessageContent = '';

      // Stream the response
      let hasStartedStreaming = false;
      const thinkingStartTime = Date.now();
      const minThinkingTime = 2000; // Minimum time to show thinking animation (2 seconds)

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode the chunk
        const text = new TextDecoder().decode(value);
        aiMessageContent += text;

        // For the first chunk, make sure thinking animation has been visible for at least minThinkingTime
        if (!hasStartedStreaming) {
          hasStartedStreaming = true;
          const timeElapsed = Date.now() - thinkingStartTime;
          if (timeElapsed < minThinkingTime) {
            await new Promise(resolve => setTimeout(resolve, minThinkingTime - timeElapsed));
          }
        }

        // Keep showing thinking animation until we have enough content
        const shouldShowThinking = !hasStartedStreaming || aiMessageContent.length < 10;

        // Update the UI with the streaming content
        const updatedMessages = messagesWithLoadingIndicator.map(m =>
          m.id === aiMessageId
            ? {
                ...m,
                content: shouldShowThinking ? '' : aiMessageContent,
                isLoading: true
              }
            : m
        );

        setMessages(updatedMessages);

        // Update the chat in storage with the current state
        setChats(prevChats => {
          const updatedChats = prevChats.map((chat) =>
            chat.id === newChatId
              ? {
                  ...chat,
                  messages: updatedMessages,
                  updatedAt: new Date(),
                }
              : chat
          );
          storage.saveChats(updatedChats);
          return updatedChats;
        });
      }

      // After streaming is complete, save the final message
      const finalAiMessage = {
        id: aiMessageId,
        content: aiMessageContent,
        role: 'assistant' as const,
        createdAt: new Date(),
        isLoading: false,
        versions: [{
          id: uuidv4(),
          content: aiMessageContent,
          createdAt: new Date()
        }],
        currentVersionIndex: 0
      };

      // Update UI with the complete message
      const finalMessages = [...currentMessages, finalAiMessage];
      setMessages(finalMessages);

      // Update the chat in storage
      setChats(prevChats => {
        const updatedChats = prevChats.map((chat) =>
          chat.id === newChatId
            ? {
                ...chat,
                messages: finalMessages,
                updatedAt: new Date(),
              }
            : chat
        );
        storage.saveChats(updatedChats);
        return updatedChats;
      });

    } catch (error) {
      console.error('[Home] Error in handleSendMessage:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const generateChatTitle = (message: string): string => {
    // Extract first sentence if it exists
    const firstSentence = message.split(/[.!?]/)[0];

    // Use first sentence if it's different from the full message,
    // otherwise use the full message
    return firstSentence !== message ? firstSentence : message;
  };

  // Add a navigation listener to detect when we're returning from settings page
  useEffect(() => {
    // Load API keys on first render AND when returning from settings
    const loadApiKeysFromStorage = () => {
      try {
        console.log('[Home] Loading API keys from storage after navigation');
        const storedApiKeys = localStorage.getItem('apiKeys');
        if (storedApiKeys) {
          const parsedKeys = JSON.parse(storedApiKeys);
          if (Object.keys(parsedKeys).length > 0) {
            console.log('[Home] Found API keys in localStorage:', Object.keys(parsedKeys));
            setApiKeys(parsedKeys);
          }
        }
      } catch (error) {
        console.error('[Home] Error loading API keys from storage:', error);
      }
    };

    // Function to handle path change
    const handlePathChange = () => {
      if (reloadKeys.current) {
        console.log('[Home] Detected return from settings page');
        loadApiKeysFromStorage();
        reloadKeys.current = false;
      }
    };

    // Check if we need to reload on initial render
    handlePathChange();

    // Set up event listener for path changes
    window.addEventListener('popstate', handlePathChange);
    return () => {
      window.removeEventListener('popstate', handlePathChange);
    };
  }, []);

  // Set flag to reload when navigating away to settings
  const navigateToSettings = () => {
    // Log when we start navigation
    console.log('[Home] Starting navigation to settings at', new Date().toISOString());

    // Important: Prefetch the route in advance
    router.prefetch('/settings');

    // Set flag to reload API keys when we return
    reloadKeys.current = true;

    // Remove the toast notification
    hasNavigatedToSettings.current = true;

    // Navigate immediately - don't wait for any more operations
    router.push('/settings');

    // Log that navigation has been triggered
    console.log('[Home] Navigation push method called');
  };

  // Update the version navigation code
  const handleVersionNavigation = (message: Message) => {
    if (!hasVersions(message)) return;

    const nextIndex = (message.currentVersionIndex + 1) % message.versions.length;

    const updatedChats = chats.map(chat => ensureChat({
      ...chat,
      messages: chat.messages.map(m => {
        if (m.id === message.id) {
          return ensureMessage({
            ...m,
            content: message.versions[nextIndex].content,
            currentVersionIndex: nextIndex
          });
        }
        return m;
      })
    }));

    setChats(updatedChats);
  };

  // Update the streaming response handling in handleSendMessage
  const handleStreamingResponse = async (
    response: ReadableStream,
    selectedChat: Chat,
    userMessage: Message,
    selectedModel: Model
  ) => {
    const reader = response.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';

    const newMessage = ensureMessage({
      id: uuidv4(),
      role: 'assistant',
      content: '',
      isLoading: true
    });

    setMessages([...messages, newMessage]);

    // Start tracking time for thinking animation
    const thinkingStartTime = Date.now();
    const minThinkingTime = 2000; // Minimum time to show thinking animation (2 seconds)
    let hasStartedStreaming = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        accumulatedContent += chunk;

        // For the first chunk, make sure thinking animation has been visible for at least minThinkingTime
        if (!hasStartedStreaming) {
          hasStartedStreaming = true;
          const timeElapsed = Date.now() - thinkingStartTime;
          if (timeElapsed < minThinkingTime) {
            await new Promise(resolve => setTimeout(resolve, minThinkingTime - timeElapsed));
          }
        }

        // Keep the thinking animation visible for initial content
        const shouldShowThinking = !hasStartedStreaming || accumulatedContent.length < 10;

        const updatedMessages = messages.map((m, i) =>
          i === messages.length - 1 ? {
            ...m,
            content: shouldShowThinking ? '' : accumulatedContent,
            isLoading: true
          } : m
        );
        setMessages(updatedMessages);
      }

      const finalMessages = messages.map((m, i) =>
        i === messages.length - 1 ? { ...m, isLoading: false } : m
      );
      setMessages(finalMessages);

      const newVersionedMessage = ensureMessage({
        id: newMessage.id,
        role: 'assistant',
        content: accumulatedContent,
        versions: [{
          id: uuidv4(),
          content: accumulatedContent,
          createdAt: new Date()
        }],
        currentVersionIndex: 0
      });

      const updatedChats = chats.map(chat => {
        if (chat.id === selectedChat.id) {
          return ensureChat({
            ...chat,
            messages: [...chat.messages, newVersionedMessage],
            updatedAt: new Date()
          });
        }
        return chat;
      });

      setChats(updatedChats);
      localStorage.setItem('chats', JSON.stringify(updatedChats));
    } catch (error) {
      console.error('Error reading stream:', error);
    }
  };

  const handleRewrite = async (message: Message, userMessage: Message) => {
    if (!selectedModelWithApiKey) {
      toast.error('Please select a model first');
      return;
    }

    // Initialize versions array if it doesn't exist
    const updatedMessage = {
      ...message,
      versions: message.versions || [{
        id: uuidv4(),
        content: message.content,
        createdAt: new Date()
      }],
      currentVersionIndex: (message.versions?.length || 0)
    };

    // Update the message in the UI immediately to show it's being rewritten
    const updatedMessages = messages.map(m =>
      m.id === message.id ? { ...updatedMessage, isLoading: true, content: '' } : m
    );
    setMessages(updatedMessages);

    // Start tracking time for thinking animation
    const thinkingStartTime = Date.now();
    const minThinkingTime = 2000; // Minimum time to show thinking animation (2 seconds)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: userMessage.content }
          ],
          model: {
            id: selectedModelWithApiKey.id,
            provider: selectedModelWithApiKey.provider,
          },
          apiKey: selectedModelWithApiKey.apiKey
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';
      let hasStartedStreaming = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        accumulatedContent += chunk;

        // For the first chunk, make sure thinking animation has been visible for at least minThinkingTime
        if (!hasStartedStreaming) {
          hasStartedStreaming = true;
          const timeElapsed = Date.now() - thinkingStartTime;
          if (timeElapsed < minThinkingTime) {
            await new Promise(resolve => setTimeout(resolve, minThinkingTime - timeElapsed));
          }
        }

        // Keep the thinking animation visible for initial content
        const shouldShowThinking = !hasStartedStreaming || accumulatedContent.length < 10;

        // Update the message content as it streams in
        const streamingMessages = messages.map(m =>
          m.id === message.id ? {
            ...updatedMessage,
            content: shouldShowThinking ? '' : accumulatedContent,
            isLoading: true
          } : m
        );
        setMessages(streamingMessages);
      }

      // Create the new version with the complete content
      const newVersion = {
        id: uuidv4(),
        content: accumulatedContent,
        createdAt: new Date()
      };

      // Update the message with the new version
      const finalMessage = {
        ...updatedMessage,
        content: accumulatedContent,
        versions: [...(updatedMessage.versions || []), newVersion],
        currentVersionIndex: (updatedMessage.versions?.length || 0),
        isLoading: false
      };

      // Update messages in state
      const finalMessages = messages.map(m =>
        m.id === message.id ? finalMessage : m
      );
      setMessages(finalMessages);

      // Update the chat in storage
      const updatedChats = chats.map(chat => ({
        ...chat,
        messages: chat.messages.map(m =>
          m.id === message.id ? finalMessage : m
        )
      }));
      setChats(updatedChats);
      storage.saveChats(updatedChats);

    } catch (error) {
      console.error('Error in handleRewrite:', error);
      toast.error('Failed to rewrite message');

      // Reset the message to its original state
      const resetMessages = messages.map(m =>
        m.id === message.id ? { ...message, isLoading: false } : m
      );
      setMessages(resetMessages);
    }
  };

  // Add this function before the return statement
  const handleVersionSelect = (message: Message, versionIndex: number) => {
    if (!hasVersions(message)) return;

    // Create updated message with new version content
    const updatedMessage = {
      ...message,
      content: message.versions[versionIndex].content,
      currentVersionIndex: versionIndex
    };

    // Update messages in UI
    const updatedMessages = messages.map(m =>
      m.id === message.id ? updatedMessage : m
    );
    setMessages(updatedMessages);

    // Update chats in storage
    const updatedChats = chats.map(chat => ({
      ...chat,
      messages: chat.messages.map(m =>
        m.id === message.id ? updatedMessage : m
      )
    }));

    setChats(updatedChats);
    storage.saveChats(updatedChats);
  };

  // Update the click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openDropdownId]);

  // Add a new useEffect to handle setting the default model when necessary
  useEffect(() => {
    // If we have a selectedModelWithApiKey but it's not the default in settings
    if (selectedModelWithApiKey && 
        selectedModelWithApiKey.id !== settings.defaultModelId &&
        !selectedChatId) { // Only update if no chat is selected
      console.log('[Home] Updating default model in settings:', selectedModelWithApiKey.id);
      const newSettings = {
        ...settings,
        defaultModelId: selectedModelWithApiKey.id
      };
      setSettings(newSettings);
      storage.saveSettings(newSettings);
    }
  }, [apiKeys, settings.defaultModelId, selectedModelWithApiKey?.id, selectedChatId]);

  // Add this memoized value to avoid re-calculating models on every render
  const availableModelsFromProviders = React.useMemo(() => {
    if (settings.models.length > 0) {
      return settings.models;
    }
    
    // Only calculate this if we don't have models in settings
    return providers.flatMap(p => {
      try {
        return p.getModels('').map(m => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          description: m.description || '',
          isFavorite: false,
          isCustom: false
        } as Model));
      } catch (e) {
        console.error(`Error getting models for provider ${p.id}:`, e);
        return [];
      }
    });
  }, [settings.models]);

  // Redirect to /new if there are no chats
  useEffect(() => {
    const savedChats = storage.getChats();
    if (savedChats.length === 0) {
      router.push('/new');
    }
  }, [router]);

  // Keep URL in sync with selected chat
  useEffect(() => {
    if (selectedChatId) {
      window.history.pushState({}, '', `/chat/${selectedChatId}`);
    } else {
      window.history.pushState({}, '', '/');
    }
  }, [selectedChatId]);

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <div className="flex h-screen overflow-hidden bg-[#202222] text-white">
        <Sidebar
          chats={chats}
          selectedChatId={selectedChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onOpenSettings={navigateToSettings}
          onDeleteChat={handleDeleteChat}
          onEditChat={handleEditChat}
          editingChatId={editingChatId}
          editingTitle={editingTitle}
          onEditingTitleChange={setEditingTitle}
          onSaveTitle={handleSaveTitle}
          isCollapsed={isCollapsed}
          onCollapsedChange={setIsCollapsed}
        />

        {/* Collapsed sidebar overlay for empty state */}
        {isCollapsed && (selectedChatId === '' || messages.length === 0) && (
          <div className="absolute inset-0 bg-[#191A1A] z-20 flex items-center justify-center">
            <div className="w-full max-w-3xl px-4">
              <HeroSection
                onSendMessage={(message) => handleSendMessage(message)}
                models={availableModelsFromProviders}
                selectedModelId={selectedChat?.modelId || settings.defaultModelId}
                onSelectModel={(modelId) => {
                  if (selectedChatId) {
                    const updatedChats = chats.map((chat) =>
                      chat.id === selectedChatId
                        ? { ...chat, modelId }
                        : chat
                    );
                    setChats(updatedChats);
                    storage.saveChats(updatedChats);
                  } else {
                    const newSettings = {
                      ...settings,
                      defaultModelId: modelId
                    };
                    setSettings(newSettings);
                    storage.saveSettings(newSettings);
                  }
                }}
              />
            </div>
          </div>
        )}

        <div className={cn(
          "flex-1 flex justify-center items-center bg-[#202222] transition-all duration-300",
          isCollapsed
            ? "ml-0"
            : "ml-0 pt-3"
        )}>
          <main className={cn(
            "w-full h-full flex flex-col bg-[#191A1A] relative overflow-clip",
            isCollapsed
              ? ""
              : "rounded-tl-lg border-l border-t border-[#2C2C2D]"
          )}>
            {/* Only show regular content when we're not showing the overlay */}
            {!isCollapsed || (selectedChatId !== '' && messages.length > 0) ? (
              <div className={cn(
                "flex-1 overflow-y-auto overscroll-none",
                isCollapsed
                  ? "p-4 pb-28"
                  : "p-4 pt-6 pb-28"
              )}>
                {selectedChatId === '' || messages.length === 0 ? (
                  <div className="h-full flex flex-col">
                    <HeroSection
                      onSendMessage={(message) => handleSendMessage(message)}
                      models={availableModelsFromProviders}
                      selectedModelId={selectedChat?.modelId || settings.defaultModelId}
                      onSelectModel={(modelId) => {
                        if (selectedChatId) {
                          const updatedChats = chats.map((chat) =>
                            chat.id === selectedChatId
                              ? { ...chat, modelId }
                              : chat
                          );
                          setChats(updatedChats);
                          storage.saveChats(updatedChats);
                        } else {
                          const newSettings = {
                            ...settings,
                            defaultModelId: modelId
                          };
                          setSettings(newSettings);
                          storage.saveSettings(newSettings);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <div key={message.id} className="flex flex-col space-y-2 mb-4">
                        <div className={`flex items-start ${message.role === 'user' ? 'justify-end' : ''} group`}>
                          <div className={`${message.role === 'user' ? 'ml-12' : 'mr-12'} relative group pb-10 px-2`}>
                            {message.role === 'assistant' && message.isLoading && message.content === '' ? (
                              <div className="inline-block p-3 rounded-lg bg-[#0D0D0D] border border-[#121212]">
                                <ThinkingAnimation />
                              </div>
                            ) : (
                              <div className={`prose prose-invert inline-block px-4 py-3 rounded-lg transition-all duration-200 ${
                                message.role === 'user'
                                  ? 'bg-[#0C1020] border border-[#0E1B48] group-hover:border-[#1A2F7D]'
                                  : 'bg-[#0D0D0D] border border-[#121212] group-hover:border-[#202020]'
                              }`}>
                                <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                  {message.role === 'assistant' && message.isLoading ? (
                                    <StreamingContent content={message.content} />
                                  ) : (
                                    <MarkdownContent content={message.content} />
                                  )}
                                </div>
                              </div>
                            )}
                            {message.role === 'assistant' && !message.isLoading && (
                              <div className={`absolute ${hasVersions(message) && message.versions.length > 1 ? 'left-2' : 'left-3'} mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                                <div className="inline-flex items-center space-x-2">
                                  {hasVersions(message) && message.versions.length > 1 && (
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenDropdownId(openDropdownId === message.id ? null : message.id);
                                        }}
                                        className="flex items-center space-x-1 px-2 py-1 bg-[#0D0D0D] rounded text-gray-400 hover:text-gray-200 border border-[#121212] group-hover:border-[#202020]"
                                      >
                                        <History className="h-4 w-4" />
                                        <span className="text-sm">
                                          {(message.currentVersionIndex || 0) + 1}/{message.versions?.length}
                                        </span>
                                        <ChevronDown className="h-3 w-3 ml-0.5" />
                                      </button>
                                      {openDropdownId === message.id && (
                                        <div
                                          className="absolute left-0 mt-1 w-40 bg-[#0D0D0D] rounded-lg shadow-lg border border-[#121212] z-10 backdrop-blur-xl"
                                        >
                                          <div className="py-1">
                                            {message.versions.map((version, index) => (
                                              <button
                                                key={version.id}
                                                onClick={() => {
                                                  handleVersionSelect(message, index);
                                                  setOpenDropdownId(null);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors ${
                                                  index === message.currentVersionIndex
                                                    ? 'bg-gray-800/50'
                                                    : 'hover:bg-gray-800/50'
                                                }`}
                                              >
                                                Version {index + 1}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => {
                                      const button = document.getElementById(`copy-button-${message.id}`);
                                      if (button) {
                                        const icon = button.querySelector('svg');
                                        if (icon) {
                                          icon.innerHTML = '<path d="M20 6L9 17l-5-5"/>';
                                          icon.setAttribute('stroke-width', '3');
                                        }
                                        setTimeout(() => {
                                          if (icon) {
                                            icon.innerHTML = '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"></path>';
                                            icon.setAttribute('stroke-width', '2');
                                          }
                                        }, 500);
                                      }
                                      navigator.clipboard.writeText(message.content);
                                      toast.success('Copied to clipboard');
                                    }}
                                    id={`copy-button-${message.id}`}
                                    className="text-gray-400 hover:text-gray-200"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRewrite(message, messages[index - 1])}
                                    className="text-gray-400 hover:text-gray-200"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </button>
                                  <span className="text-sm text-gray-400 whitespace-nowrap">
                                    Rewrite with {selectedModel?.name}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ) : null}
            <ChatInput
              models={settings.models}
              selectedModelId={selectedChat?.modelId || settings.defaultModelId}
              onSendMessage={handleSendMessage}
              onSelectModel={(modelId) => {
                if (selectedChatId) {
                  const updatedChats = chats.map((chat) =>
                    chat.id === selectedChatId
                      ? { ...chat, modelId }
                      : chat
                  );
                  setChats(updatedChats);
                  storage.saveChats(updatedChats);
                } else {
                  const newSettings = {
                    ...settings,
                    defaultModelId: modelId
                  };
                  setSettings(newSettings);
                  storage.saveSettings(newSettings);
                }
              }}
              isLoading={isLoading}
              isLargePromptVisible={selectedChatId === '' || messages.length === 0}
            />
          </main>
        </div>
      </div>
    </Suspense>
  );
}