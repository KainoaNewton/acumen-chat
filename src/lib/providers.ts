import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import MistralClient from '@mistralai/mistralai';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  description?: string;
  isCustom?: boolean;
  baseUrl?: string; // For OpenAI compatible models
}

export interface Provider {
  id: string;
  name: string;
  validateApiKey: (apiKey: string, baseUrl?: string) => Promise<boolean>;
  getModels: (apiKey: string) => AIModel[];
  isCompatible?: boolean;
}

export const providers: Provider[] = [
  {
    id: 'google',
    name: 'Google AI',
    validateApiKey: async (apiKey: string) => {
      try {
        console.log('[Provider] Validating Google AI API key');
        // Test a minimal request to validate the key
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: "Hello" }
                ]
              }
            ],
            generationConfig: {
              maxOutputTokens: 1,
            },
          })
        });
        
        const isValid = response.ok;
        console.log('[Provider] Google AI API key validation result:', { 
          isValid, 
          status: response.status,
          statusText: response.statusText 
        });
        
        return isValid;
      } catch (error) {
        console.error('[Provider] Error validating Google AI API key:', error);
        return false;
      }
    },
    getModels: (apiKey: string) => {
      return [
        {
          id: 'gemini-2.5-pro-exp-03-25',
          name: 'Gemini 2.5 Pro',
          provider: 'google',
          description: "Google's most advanced model, excelling at complex reasoning and problem-solving.",
          apiKey,
        },
        {
          id: 'gemini-2.0-flash',
          name: 'Gemini 2.0 Flash',
          provider: 'google',
          description: "Google's flagship model, known for speed and accuracy.",
          apiKey,
        },
        {
          id: 'gemini-2.0-flash-lite',
          name: 'Gemini 2.0 Flash Lite',
          provider: 'google',
          description: "Similar to 2.0 Flash, but even faster.",
          apiKey,
        }
      ];
    },
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    validateApiKey: async (apiKey: string) => {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    getModels: (apiKey: string) => {
      return [
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          provider: 'anthropic',
          description: 'Most powerful model with exceptional understanding and analysis capabilities.',
          apiKey,
        },
        {
          id: 'claude-3-sonnet-20240229',
          name: 'Claude 3 Sonnet',
          provider: 'anthropic',
          description: 'Balanced model offering strong performance and faster responses.',
          apiKey,
        },
        {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          provider: 'anthropic',
          description: 'Fast and efficient model perfect for quick interactions.',
          apiKey,
        },
      ];
    },
  },
  {
    id: 'openai',
    name: 'OpenAI',
    validateApiKey: async (apiKey: string) => {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    getModels: (apiKey: string) => {
      return [
        {
          id: 'GPT-4o',
          name: 'GPT-4o',
          provider: 'openai',
          description: "OpenAI's flagship non-reasoning model.",
          apiKey,
        },
        {
          id: 'GPT-4o-mini',
          name: 'GPT-4o mini',
          provider: 'openai',
          description: "Like gpt-4o, but faster.",
          apiKey,
        },
        {
          id: 'o3-mini',
          name: 'o3-mini',
          provider: 'openai',
          description: 'A small, fast, super smart reasoning model.',
          apiKey,
        },
        {
          id: 'o1',
          name: 'o1',
          provider: 'openai',
          description: 'One of the best reasoning models out there.',
          apiKey,
        },
        {
          id: 'o1-pro',
          name: 'o1-pro',
          provider: 'openai',
          description: 'o1 on steroids!',
          apiKey,
        },
        {
          id: 'gpt-4.5-preview',
          name: 'GPT-4.5',
          provider: 'openai',
          description: 'The best model for writing.',
          apiKey,
        }
      ];
    },
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    validateApiKey: async (apiKey: string) => {
      try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'mistral-tiny',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
          }),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    getModels: (apiKey: string) => {
      return [
        {
          id: 'mistral-large-latest',
          name: 'Mistral Large',
          provider: 'mistral',
          description: "Mistral's flagship with state of the art reasoning.",
          apiKey,
        },
        {
          id: 'mistral-small-latest',
          name: 'Mistral Small',
          provider: 'mistral',
          description: "A powerful small sized model combining efficiency with remarkable capabilities.",
          apiKey,
        },
        {
          id: 'pixtral-large-latest',
          name: 'Pixtral Large',
          provider: 'mistral',
          description: "Mistral's frontier-class multimodal model.",
          apiKey,
        },
        {
          id: 'codestral-latest',
          name: 'Codestral',
          provider: 'mistral',
          description: "Purpose-built for code generation and understanding, optimized for developer workflows.",
          apiKey,
        }
      ];
    },
  },
  {
    id: 'xai',
    name: 'xAI',
    validateApiKey: async (apiKey: string) => {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    getModels: (apiKey: string) => {
      return [
        {
          id: 'grok-2',
          name: 'Grok 2',
          provider: 'xai',
          description: 'xAI\'s latest model with advanced reasoning capabilities.',
          apiKey,
        },
        {
          id: 'grok-1.5',
          name: 'Grok 1.5',
          provider: 'xai',
          description: 'Balanced model offering strong performance.',
          apiKey,
        }
      ];
    },
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    validateApiKey: async (apiKey: string) => {
      try {
        const response = await fetch('https://api.perplexity.ai/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    getModels: (apiKey: string) => {
      return [
        {
          id: 'pplx-7b-online',
          name: 'Perplexity 7B Online',
          provider: 'perplexity',
          description: 'Online model with real-time knowledge access.',
          apiKey,
        },
        {
          id: 'pplx-70b-online',
          name: 'Perplexity 70B Online',
          provider: 'perplexity',
          description: 'Most capable online model with advanced reasoning.',
          apiKey,
        },
        {
          id: 'pplx-7b-chat',
          name: 'Perplexity 7B Chat',
          provider: 'perplexity',
          description: 'Fast and efficient chat model.',
          apiKey,
        }
      ];
    },
  },
  {
    id: 'openai-compatible',
    name: 'OpenAI Compatible',
    isCompatible: true,
    validateApiKey: async (apiKey: string, baseUrl?: string) => {
      if (!baseUrl) return false;
      try {
        const response = await fetch(`${baseUrl}/v1/models`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    getModels: () => [], // Compatible models are added manually
  },
]; 