export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system' | 'data' | 'function' | 'tool';
  createdAt: Date;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  modelId: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  isFavorite: boolean;
  apiKey?: string;
  isCustom?: boolean;
  description?: string;
  baseUrl?: string;
}

export interface Settings {
  defaultModelId: string;
  models: Model[];
} 