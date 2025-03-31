export interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
  isFavorite: boolean;
  isCustom?: boolean;
  baseUrl?: string;
} 