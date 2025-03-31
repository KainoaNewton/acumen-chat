'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import { v4 as uuidv4 } from 'uuid';
import { Sidebar } from '@/components/Sidebar';
import { ChatInput } from '@/components/ChatInput';
import { storage } from '@/lib/storage';
import { Chat, Message, Model, Settings } from '@/types/chat';
import { useRouter } from 'next/navigation';
import { providers } from '@/lib/providers';
import { toast } from 'sonner';
import { MarkdownContent } from '@/components/MarkdownContent';

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
  
  // No need for activeModel state since it's causing circular dependencies
  
  // Simple ref to store current model info without tracking dependencies
  const currentModelInfoRef = useRef({
    model: null as any,
    apiKey: null as string | null
  });

  // Add a ref to track if we've navigated to settings before
  const hasNavigatedToSettings = useRef(false);
  const reloadKeys = useRef(false);

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

    // Add this code to handle the initial loading of the selected chat
    // and restore chat messages from localStorage
    if (savedChats.length > 0) {
      // Check if there was a previously selected chat in localStorage
      const lastSelectedChatId = localStorage.getItem('lastSelectedChatId');
      if (lastSelectedChatId && savedChats.some(chat => chat.id === lastSelectedChatId)) {
        console.log('[Home] Restoring last selected chat:', lastSelectedChatId);
        setSelectedChatId(lastSelectedChatId);
        const lastSelectedChat = savedChats.find(chat => chat.id === lastSelectedChatId);
        if (lastSelectedChat?.messages) {
          // Restore messages from the saved chat
          setUIMessages(lastSelectedChat.messages);
        }
      } else {
        // If no last selected chat or it doesn't exist anymore, select the first chat
        console.log('[Home] Setting first chat as selected');
        setSelectedChatId(savedChats[0].id);
        if (savedChats[0]?.messages) {
          setUIMessages(savedChats[0].messages);
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
  }, [apiKeys]);

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
              
              // Also update settings with this as the default model
              const newSettings = {
                ...settings,
                defaultModelId: firstModel.id
              };
              setSettings(newSettings);
              storage.saveSettings(newSettings);
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
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat(chatParams);
  
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
    if (selectedChatId !== '') {
      const selectedChat = chats.find((chat) => chat.id === selectedChatId);
      if (selectedChat) {
        console.log('[Home] Loading messages for selected chat:', selectedChatId);
        setMessages(selectedChat.messages || []);
      }
    } else {
      console.log('[Home] No chat selected, clearing messages');
      setMessages([]);
    }
  }, [selectedChatId, chats, setMessages]);

  // Update body params when model changes
  useEffect(() => {
    console.log('[Home] Selected model changed, updating chat parameters');
    
    // When model changes, ensure we keep the current UI messages
    if (uiMessages.length > 0) {
      console.log('[Home] Preserving current UI messages after model change');
      setMessages(uiMessages);
    }
  }, [selectedModelWithApiKey, setMessages, uiMessages]);

  const handleNewChat = () => {
    // Reset UI messages when creating a new chat
    setUIMessages([]);
    
    const newChat: Chat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      modelId: settings.defaultModelId,
    };
    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    storage.saveChats(updatedChats);
    setSelectedChatId(newChat.id);
    // Save selected chat ID to localStorage for persistence
    localStorage.setItem('lastSelectedChatId', newChat.id);
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    // Save the selected chat ID to localStorage for persistence
    localStorage.setItem('lastSelectedChatId', chatId);
    const selectedChat = chats.find((chat) => chat.id === chatId);
    if (selectedChat) {
      // When selecting a chat, reset UI messages to avoid stale state
      setUIMessages(selectedChat.messages || []);
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
      setMessages([]);
      setUIMessages([]);
      
      // If there are other chats, select the first one
      if (updatedChats.length > 0) {
        const newSelectedId = updatedChats[0].id;
        setSelectedChatId(newSelectedId);
        localStorage.setItem('lastSelectedChatId', newSelectedId);
        
        // Load the messages for the newly selected chat
        const newSelectedChat = updatedChats.find(chat => chat.id === newSelectedId);
        if (newSelectedChat) {
          setMessages(newSelectedChat.messages || []);
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

  const handleSendMessage = async (message: string) => {
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
      const chatMessage = {
        id: uuidv4(),
        content: message,
        role: 'user' as const,
        createdAt: new Date(),
      };
      
      let newChatId = selectedChatId;
      let newlyCreatedChat = false;
      let currentMessages = [];
      let newChatObject: Chat | null = null; // Store a reference to the newly created chat
      
      // Create a new chat if needed
      if (selectedChatId === '') {
        console.log('[Home] No chat selected, creating new chat');
        const chatId = uuidv4();
        newChatId = chatId;
        newlyCreatedChat = true;
        
        // Create new chat with the message
        const newChat: Chat = {
          id: chatId,
          title: generateChatTitle(message),
          messages: [chatMessage], // Include the message directly in the new chat
          createdAt: new Date(),
          updatedAt: new Date(),
          modelId: selectedModelWithApiKey.id,
        };
        
        // Store reference to the newly created chat
        newChatObject = newChat;
        
        // Add the new chat to the list
        const updatedChats = [newChat, ...chats];
        setChats(updatedChats);
        storage.saveChats(updatedChats);
        
        // Set the selected chat ID immediately
        setSelectedChatId(chatId);
        
        // Set the current messages for UI update
        currentMessages = [chatMessage];
        
        console.log('[Home] New chat created with ID:', chatId, 'and message:', message);
        
        // Add a small delay to let state update
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        // Add to the existing chat
        console.log('[Home] Adding user message to existing chat', { chatId: newChatId });
        
        // Get the existing chat's messages
        const existingChat = chats.find(chat => chat.id === newChatId);
        if (!existingChat) {
          throw new Error(`Chat with ID ${newChatId} not found`);
        }
        
        const updatedMessages = [...existingChat.messages, chatMessage];
        currentMessages = updatedMessages;
        
        // Update the chat with the new message
        const updatedChats = chats.map((chat) =>
          chat.id === newChatId
            ? {
                ...chat,
                messages: updatedMessages,
                updatedAt: new Date(),
              }
            : chat
        );
        
        setChats(updatedChats);
        storage.saveChats(updatedChats);
        console.log('[Home] User message saved to localStorage');
      }

      // Update the UI with the user message
      setMessages([...currentMessages]);
      // Also update our UI message tracking state
      setUIMessages([...currentMessages]);
      
      // Add a loading message that will be updated with actual content
      const aiMessageId = uuidv4();
      const loadingMessage = {
        id: aiMessageId,
        content: '',
        role: 'assistant' as const,
        createdAt: new Date(),
        isLoading: true, // This property helps us track loading state per message
      };
      
      // Show the loading message in the UI
      const messagesWithLoadingIndicator = [...currentMessages, loadingMessage];
      setMessages(messagesWithLoadingIndicator);
      setUIMessages(messagesWithLoadingIndicator);
      
      // Send message to AI using the API directly
      console.log('[Home] Sending message to API directly');
      
      // Get previous messages from the chat if this is not a new chat
      const previousMessages = newlyCreatedChat ? [] : 
        chats.find(chat => chat.id === newChatId)?.messages.slice(0, -1) || [];
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...previousMessages,
            {
              content: message,
              role: 'user',
            }
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
      
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      let aiMessageContent = '';
      
      // Stream the response
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          // Decode the chunk
          const text = new TextDecoder().decode(value);
          aiMessageContent += text;
          
          // Update the AI message in the UI, keeping the isLoading flag
          const updatedAiMessages = messagesWithLoadingIndicator.map(m => 
            m.id === aiMessageId 
              ? { ...m, content: aiMessageContent, isLoading: true } 
              : m
          );
          setMessages(updatedAiMessages);
          setUIMessages(updatedAiMessages);
        }
        
        // Save the completed AI response to localStorage with isLoading set to false
        const finalAiMessage = {
          id: aiMessageId,
          content: aiMessageContent,
          role: 'assistant' as const,
          createdAt: new Date(),
          isLoading: false, // Message is complete, no longer loading
        };
        
        // Update UI to show the complete message without loading state
        const finalMessages = messagesWithLoadingIndicator.map(m => 
          m.id === aiMessageId ? finalAiMessage : m
        );
        setMessages(finalMessages);
        setUIMessages(finalMessages);
        
        // Get the current chat list again to ensure we have the latest state
        const currentChats = [...chats];
        
        // Find the chat we're working with - first try to use our direct reference
        let chatToUpdate = newlyCreatedChat && newChatObject ? 
          newChatObject : currentChats.find(chat => chat.id === newChatId);
        
        if (chatToUpdate) {
          // Update the chat with both the user message and AI response
          const updatedChats = currentChats.map((chat) =>
            chat.id === newChatId
              ? {
                  ...chat,
                  messages: [...(newlyCreatedChat ? [chatMessage] : chat.messages), {
                    id: aiMessageId,
                    content: aiMessageContent,
                    role: 'assistant' as const,
                    createdAt: finalAiMessage.createdAt
                  }],
                  updatedAt: new Date(),
                }
              : chat
          );
          
          // For newly created chats, we may need to add the chat if it's not found in currentChats
          if (newlyCreatedChat && !currentChats.some(chat => chat.id === newChatId) && newChatObject) {
            // Add the AI message to the new chat
            const updatedNewChat = {
              ...newChatObject,
              messages: [...newChatObject.messages, {
                id: aiMessageId,
                content: aiMessageContent,
                role: 'assistant' as const,
                createdAt: finalAiMessage.createdAt
              }],
              updatedAt: new Date()
            };
            
            // Add to the beginning of the chat list
            updatedChats.unshift(updatedNewChat);
          }
          
          // Update state and storage
          setChats(updatedChats);
          storage.saveChats(updatedChats);
          
          // Ensure the last selected chat ID is persisted
          localStorage.setItem('lastSelectedChatId', newChatId);
          
          console.log('[Home] AI response completed and saved to chat:', newChatId);
        } else {
          console.error('[Home] Could not find chat to update:', newChatId);
        }
      } catch (error) {
        console.error('[Home] Error streaming response:', error);
        toast.error('Error streaming AI response');
      }
      
    } catch (error) {
      console.error('[Home] Error in handleSendMessage:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const generateChatTitle = (message: string): string => {
    // If message is short enough, use it directly
    if (message.length <= 30) {
      return message;
    }
    
    // Otherwise extract first sentence or truncate
    const firstSentence = message.split(/[.!?]/)[0];
    if (firstSentence.length <= 30) {
      return firstSentence;
    }
    
    // Truncate with ellipsis if still too long
    return message.substring(0, 27) + '...';
  };

  // Add this useEffect to ensure chat state is always synchronized
  useEffect(() => {
    // If we have a selectedChatId but it's not in the current chats list
    // This can happen after deleting a chat or if localStorage has an outdated ID
    if (selectedChatId !== '' && !chats.some(chat => chat.id === selectedChatId)) {
      console.log('[Home] Selected chat no longer exists, resetting state');
      // Clear UI
      setMessages([]);
      setUIMessages([]);
      
      // If there are other chats, select the first one
      if (chats.length > 0) {
        const newSelectedId = chats[0].id;
        console.log('[Home] Selecting first available chat:', newSelectedId);
        setSelectedChatId(newSelectedId);
        localStorage.setItem('lastSelectedChatId', newSelectedId);
        
        // Load the messages for the newly selected chat
        const newSelectedChat = chats.find(chat => chat.id === newSelectedId);
        if (newSelectedChat) {
          setMessages(newSelectedChat.messages || []);
          setUIMessages(newSelectedChat.messages || []);
        }
      } else {
        // If no chats remain, set to empty string and clear localStorage
        console.log('[Home] No chats available, clearing selection');
        setSelectedChatId('');
        localStorage.removeItem('lastSelectedChatId');
      }
    }
  }, [chats, selectedChatId]);

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

  return (
    <div className="flex h-screen bg-background text-foreground">
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
      />
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {selectedChatId === '' ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <h2 className="text-2xl font-semibold mb-2">No chat selected</h2>
              <p className="text-muted-foreground mb-4">Create a new chat or select an existing one to get started.</p>
              <button 
                onClick={handleNewChat} 
                className="px-4 py-2 bg-primary/80 text-primary-foreground rounded-md hover:bg-primary transition"
              >
                New Chat
              </button>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-lg backdrop-blur ${
                    message.role === 'user'
                      ? 'bg-primary/10 text-primary-foreground border border-primary/20'
                      : 'bg-secondary/10 text-secondary-foreground border border-secondary/20'
                  } shadow-xs transition-all`}
                >
                  {/* Show loading animation for AI messages that are still generating */}
                  {message.role === 'assistant' && (message as any).isLoading && (
                    <div className="mt-2">
                      {message.content && (
                        <div className="mb-2">
                          <MarkdownContent content={message.content} />
                          <span className="inline-block w-[2px] h-[16px] bg-zinc-400 ml-1 align-middle animate-pulse" />
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-xs text-zinc-400 animate-pulse">AI is typing...</span>
                      </div>
                    </div>
                  )}
                  {message.role === 'assistant' && !(message as any).isLoading && (
                    <MarkdownContent content={message.content} />
                  )}
                  {message.role === 'user' && (
                    <MarkdownContent content={message.content} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <ChatInput
          models={settings.models}
          selectedModelId={selectedChat?.modelId || settings.defaultModelId}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onSelectModel={(modelId) => {
            console.log('[Home] Model selected:', modelId);
            const newChat = selectedChatId === '';
            
            if (newChat) {
              console.log('[Home] Creating new chat with selected model');
              const chat: Chat = {
                id: uuidv4(),
                title: 'New Chat',
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                modelId: modelId,
              };
              const updatedChats = [chat, ...chats];
              setChats(updatedChats);
              storage.saveChats(updatedChats);
              setSelectedChatId(chat.id);
              localStorage.setItem('lastSelectedChatId', chat.id);
              
              // Reset UI messages for new chat
              setUIMessages([]);
              setMessages([]);
            } else {
              console.log('[Home] Updating existing chat with new model');
              
              // Save current UI state (including any unsaved messages)
              // Use the most up-to-date source - either our uiMessages or the current messages
              const currentUIMessages = uiMessages.length > messages.length ? uiMessages : messages;
              console.log('[Home] Preserving messages:', currentUIMessages.length);
              
              // Update the selectedChat's modelId but keep the messages in storage
              const updatedChats = chats.map((chat) =>
                chat.id === selectedChatId
                  ? { ...chat, modelId }
                  : chat
              );
              setChats(updatedChats);
              storage.saveChats(updatedChats);
              
              // Explicitly preserve the UI state by setting messages again
              setMessages(currentUIMessages);
            }

            // Update default model
            const newSettings = {
              ...settings,
              defaultModelId: modelId,
            };
            setSettings(newSettings);
            storage.saveSettings(newSettings);
          }}
        />
      </main>
    </div>
  );
}