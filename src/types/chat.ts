import { Message as AIMessage } from 'ai';
import { Dispatch, SetStateAction } from 'react';

export interface AIResponseVersion {
  id: string;
  content: string;
  createdAt: Date;
}

export interface BaseMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system' | 'data' | 'function' | 'tool';
  createdAt: Date;
  isLoading?: boolean;
}

export interface Message extends BaseMessage {
  versions?: AIResponseVersion[];
  currentVersionIndex?: number;
}

export interface MessageWithVersions extends BaseMessage {
  versions: AIResponseVersion[];
  currentVersionIndex: number;
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
  description?: string;
  baseUrl?: string;
  isFavorite: boolean;
  isCustom: boolean;
  apiKey?: string;
}

export interface Settings {
  models: Model[];
  defaultModelId: string;
}

export type SetMessagesAction = SetStateAction<Message[]>;
export type SetChatsAction = SetStateAction<Chat[]>;

// Type guard to check if a message has versions
export function hasVersions(message: Message): message is MessageWithVersions {
  return Array.isArray(message.versions) && message.versions.length > 0;
}

// Helper to ensure Message type compatibility with AI SDK
export function ensureMessage(message: Partial<Message> & Pick<Message, 'id' | 'role' | 'content'>): Message {
  return {
    ...message,
    createdAt: message.createdAt || new Date(),
  } as Message;
}

// Helper to convert AI SDK message to our Message type
export function convertAIMessage(message: AIMessage): Message {
  return ensureMessage({
    ...message,
    createdAt: new Date(),
  });
}

// Helper to convert our Message type to AI SDK message
export function convertToAIMessage(message: Message): AIMessage {
  const { versions, currentVersionIndex, ...rest } = message;
  return rest;
}

// Helper to ensure Chat type compatibility
export function ensureChat(chat: Partial<Chat> & Pick<Chat, 'id' | 'title' | 'modelId'>): Chat {
  return {
    ...chat,
    messages: chat.messages || [],
    createdAt: chat.createdAt || new Date(),
    updatedAt: chat.updatedAt || new Date(),
  } as Chat;
}

// Helper to ensure proper typing for React's setState
export function setStateAction<T>(updater: (prev: T) => T): SetStateAction<T> {
  return updater;
} 