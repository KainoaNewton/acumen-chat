import { Chat, Settings } from '@/types/chat';

const CHATS_KEY = 'acumen-chats';
const SETTINGS_KEY = 'acumen-settings';
const API_KEYS_KEY = 'apiKeys';

const DEFAULT_MODEL_ID = 'gemini-2.0-flash';

// Add memory caching to reduce localStorage reads
let settingsCache: Settings | null = null;
let apiKeysCache: Record<string, string> | null = null;

export const storage = {
  getChats: (): Chat[] => {
    if (typeof window === 'undefined') return [];
    console.time('localStorage-getChats');
    const chats = localStorage.getItem(CHATS_KEY);
    const result = chats ? JSON.parse(chats) : [];
    console.timeEnd('localStorage-getChats');
    return result;
  },

  saveChats: (chats: Chat[]) => {
    if (typeof window === 'undefined') return;
    console.time('localStorage-saveChats');
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    console.timeEnd('localStorage-saveChats');
  },

  getSettings: (): Settings => {
    if (typeof window === 'undefined') return { defaultModelId: DEFAULT_MODEL_ID, models: [] };
    
    // Use cached settings if available to avoid localStorage read
    if (settingsCache) {
      console.log('[Storage] Using cached settings with', settingsCache.models?.length || 0, 'models');
      return settingsCache;
    }
    
    console.time('localStorage-getSettings');
    const settings = localStorage.getItem(SETTINGS_KEY);
    const result = settings ? JSON.parse(settings) : { defaultModelId: DEFAULT_MODEL_ID, models: [] };
    console.timeEnd('localStorage-getSettings');
    console.log('[Storage] getSettings retrieved', result.models?.length || 0, 'models');
    
    // Cache the result
    settingsCache = result;
    return result;
  },

  saveSettings: (settings: Settings) => {
    if (typeof window === 'undefined') return;
    console.time('localStorage-saveSettings');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    console.timeEnd('localStorage-saveSettings');
    
    // Update cache
    settingsCache = settings;
  },

  getApiKeys: (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    
    // Use cached API keys if available
    if (apiKeysCache) {
      console.log('[Storage] Using cached API keys');
      return apiKeysCache;
    }
    
    console.time('localStorage-getApiKeys');
    const apiKeys = localStorage.getItem(API_KEYS_KEY);
    const result = apiKeys ? JSON.parse(apiKeys) : {};
    console.timeEnd('localStorage-getApiKeys');
    
    // Cache the result
    apiKeysCache = result;
    return result;
  },

  saveApiKeys: (apiKeys: Record<string, string>) => {
    if (typeof window === 'undefined') return;
    console.time('localStorage-saveApiKeys');
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(apiKeys));
    console.timeEnd('localStorage-saveApiKeys');
    
    // Update cache
    apiKeysCache = apiKeys;
  },

  clearHistory: () => {
    if (typeof window === 'undefined') return;
    console.time('localStorage-clearHistory');
    localStorage.removeItem(CHATS_KEY);
    console.timeEnd('localStorage-clearHistory');
  },
}; 