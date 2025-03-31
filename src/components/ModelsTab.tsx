import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Model } from '@/types/chat';
import { Plus, Trash2, FileText, Eye, Link2, Loader2, ChevronDown, Key, Check, Pencil, Star } from 'lucide-react';
import { toast } from 'sonner';
import { providers } from '@/lib/providers';
import { storage } from '@/lib/storage';

interface ModelsTabProps {
  models: Model[];
  onAddModel: (model: Model) => void;
  onDeleteModel: (modelId: string) => void;
}

export function ModelsTab({ models: propModels, onAddModel, onDeleteModel }: ModelsTabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelProvider, setNewModelProvider] = useState('');
  const [newModelDescription, setNewModelDescription] = useState('');
  const [newModelBaseUrl, setNewModelBaseUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [activeProviders, setActiveProviders] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [customModels, setCustomModels] = useState<Model[]>(propModels);

  // Load API keys and active providers on mount
  useEffect(() => {
    // Use both direct localStorage and storage module
    const savedApiKeys = localStorage.getItem('apiKeys');
    const storageApiKeys = storage.getApiKeys();
    
    console.log('[ModelsTab] Loading API keys:', {
      localStorage: savedApiKeys ? Object.keys(JSON.parse(savedApiKeys)) : [],
      storage: Object.keys(storageApiKeys)
    });
    
    // Prefer localStorage for consistency with existing code
    if (savedApiKeys) {
      try {
        const parsedApiKeys = JSON.parse(savedApiKeys);
        setApiKeys(parsedApiKeys);
        
        // Ensure storage is in sync
        storage.saveApiKeys(parsedApiKeys);
      } catch (error) {
        console.error('[ModelsTab] Error parsing API keys:', error);
        if (Object.keys(storageApiKeys).length > 0) {
          setApiKeys(storageApiKeys);
        }
      }
    } else if (Object.keys(storageApiKeys).length > 0) {
      setApiKeys(storageApiKeys);
      // Ensure localStorage is in sync
      localStorage.setItem('apiKeys', JSON.stringify(storageApiKeys));
    }

    const savedActiveProviders = localStorage.getItem('activeProviders');
    if (savedActiveProviders) {
      setActiveProviders(JSON.parse(savedActiveProviders));
    }

    // Initialize all sections as open
    const initialOpenSections = providers.reduce((acc, provider) => {
      acc[provider.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setOpenSections(initialOpenSections);
  }, []);

  // Load custom models from localStorage
  useEffect(() => {
    const savedModels = localStorage.getItem('customModels');
    if (savedModels) {
      setCustomModels(JSON.parse(savedModels));
    }
  }, []);

  // Update custom models when prop models change
  useEffect(() => {
    setCustomModels(propModels);
  }, [propModels]);

  const handleApiKeyChange = async (providerId: string, apiKey: string) => {
    console.log('[ModelsTab] Changing API key for provider:', providerId, 'Key exists:', !!apiKey);
    try {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) return;

      // Clean the API key by trimming whitespace
      const cleanedApiKey = apiKey.trim();

      // Update API key state
      const newApiKeys = { ...apiKeys, [providerId]: cleanedApiKey };
      console.log('[ModelsTab] New API keys:', Object.keys(newApiKeys));
      setApiKeys(newApiKeys);
      
      // Make sure we save the API keys in both places consistently
      // Always save FIRST to localStorage for maximum persistence
      localStorage.setItem('apiKeys', JSON.stringify(newApiKeys));
      
      // Then use the storage utility as a backup
      storage.saveApiKeys(newApiKeys);
      
      console.log('[ModelsTab] API keys saved successfully to localStorage and storage utility');

      if (cleanedApiKey) {
        // Validate API key
        console.log('[ModelsTab] Validating API key for', provider.name);
        setIsValidating(true);
        const isValid = await provider.validateApiKey(cleanedApiKey, provider.isCompatible ? newModelBaseUrl : undefined);
        setIsValidating(false);
        
        if (!isValid) {
          console.log('[ModelsTab] API key validation failed');
          throw new Error('Invalid API key');
        }
        
        console.log('[ModelsTab] API key validated successfully');

        // Mark provider as active
        const newActiveProviders = { ...activeProviders, [providerId]: true };
        setActiveProviders(newActiveProviders);
        localStorage.setItem('activeProviders', JSON.stringify(newActiveProviders));

        toast.success(`${provider.name} API key saved and validated`);
      } else {
        // Clear API key (if empty string was provided)
        const newActiveProviders = { ...activeProviders, [providerId]: false };
        setActiveProviders(newActiveProviders);
        localStorage.setItem('activeProviders', JSON.stringify(newActiveProviders));
        toast.success(`${provider.name} API key cleared`);
      }
    } catch (error) {
      console.error('[ModelsTab] Error handling API key:', error);
      // Reset active state on validation failure
      const newActiveProviders = { ...activeProviders, [providerId]: false };
      setActiveProviders(newActiveProviders);
      localStorage.setItem('activeProviders', JSON.stringify(newActiveProviders));
      toast.error('Invalid API key');
      setIsValidating(false);
    }
  };

  const handleAddModel = async () => {
    if (!newModelId || !newModelName || !newModelProvider) {
      toast.error('Please fill in all required fields');
      return;
    }

    const provider = providers.find(p => p.id === newModelProvider);
    if (!provider) {
      toast.error('Invalid provider selected');
      return;
    }

    if (provider.isCompatible && !newModelBaseUrl) {
      toast.error('Base URL is required for OpenAI Compatible models');
      return;
    }

    setIsValidating(true);
    try {
      const apiKey = apiKeys[newModelProvider];
      if (!apiKey) {
        toast.error(`Please add an API key for ${newModelProvider} first`);
        return;
      }

      const isValid = await provider.validateApiKey(apiKey, provider.isCompatible ? newModelBaseUrl : undefined);
      if (!isValid) {
        toast.error('Invalid API key for this provider');
        return;
      }

      const model: Model = {
        id: newModelId,
        name: newModelName,
        provider: newModelProvider,
        description: newModelDescription,
        isFavorite: false,
        isCustom: true,
        apiKey,
        ...(provider.isCompatible && { baseUrl: newModelBaseUrl }),
      };

      onAddModel(model);
      setNewModelId('');
      setNewModelName('');
      setNewModelProvider('');
      setNewModelDescription('');
      setNewModelBaseUrl('');
      setIsOpen(false);
      toast.success('Model added successfully');
    } catch (error) {
      toast.error('Failed to validate model. Please check your API key and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return '✨';
      case 'anthropic':
        return '🧠';
      case 'openai':
        return '🤖';
      default:
        return '🔮';
    }
  };

  const toggleSection = (providerId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  // Get all providers to show, including OpenAI Compatible only if there are compatible models
  const visibleProviders = providers
    .filter(provider => 
      !provider.isCompatible || 
      (provider.isCompatible && customModels.some(m => m.provider === provider.id))
    )
    .sort((a, b) => {
      const aActive = activeProviders[a.id];
      const bActive = activeProviders[b.id];
      if (aActive === bActive) return 0;
      return aActive ? -1 : 1;
    });

  const handleEditModel = (model: Model) => {
    setEditingModel(model);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingModel) return;
    
    const updatedModels = customModels.map(model => 
      model.id === editingModel.id ? editingModel : model
    );
    setCustomModels(updatedModels);
    onAddModel(editingModel);
    setIsEditDialogOpen(false);
    setEditingModel(null);
  };

  const handleDeleteModel = (modelId: string) => {
    const updatedModels = customModels.filter(model => model.id !== modelId);
    setCustomModels(updatedModels);
    onDeleteModel(modelId);
  };

  const handleFavoriteToggle = (modelId: string) => {
    const updatedModels = customModels.map(model => 
      model.id === modelId 
        ? { ...model, isFavorite: !model.isFavorite }
        : model
    );
    setCustomModels(updatedModels);
    const updatedModel = updatedModels.find(model => model.id === modelId);
    if (updatedModel) {
      onAddModel(updatedModel);
    }
  };

  // Combine hardcoded and custom models
  const allModels = useMemo<Model[]>(() => {
    const hardcodedModels = providers.flatMap(provider => 
      provider.getModels(apiKeys[provider.id] || '').map(aiModel => ({
        id: aiModel.id,
        name: aiModel.name,
        provider: aiModel.provider,
        description: aiModel.description,
        baseUrl: aiModel.baseUrl,
        isFavorite: false,
        isCustom: false,
        apiKey: aiModel.apiKey,
      } as Model))
    );
    return [...hardcodedModels, ...customModels];
  }, [providers, apiKeys, customModels]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Models</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Model
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">Add New Model</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Configure your model details below
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-100">Provider</label>
                <Select value={newModelProvider} onValueChange={setNewModelProvider}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 focus:ring-zinc-700 text-zinc-100">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {providers.map(provider => (
                      <SelectItem key={provider.id} value={provider.id} className="text-zinc-100">
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newModelProvider === 'openai-compatible' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-100">Base URL</label>
                  <Input
                    value={newModelBaseUrl}
                    onChange={(e) => setNewModelBaseUrl(e.target.value)}
                    placeholder="e.g. http://localhost:1234"
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-700 text-zinc-100"
                  />
                  <p className="text-xs text-zinc-400">
                    The base URL of your OpenAI-compatible API endpoint
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-100">Model Name</label>
                <Input
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g. Local GPT-4"
                  className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-700 text-zinc-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-100">Model ID</label>
                <Input
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  placeholder={newModelProvider === 'openai-compatible' ? 'e.g. gpt-4' : 'e.g. gemini-pro'}
                  className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-700 text-zinc-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-100">Description</label>
                <Input
                  value={newModelDescription}
                  onChange={(e) => setNewModelDescription(e.target.value)}
                  placeholder="e.g. A powerful language model for general tasks"
                  className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-700 text-zinc-100"
                />
              </div>
            </div>

            <div className="relative mt-6 pt-6 before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-zinc-800/0 before:via-zinc-800/50 before:to-zinc-800/0">
              <div className="text-sm font-medium text-zinc-400 mb-3">Preview</div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl select-none" role="img" aria-label="provider icon">
                    {getProviderIcon(newModelProvider || '🔮')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-zinc-100 truncate">
                        {newModelName || 'Model Name'}
                      </h3>
                      <div className="shrink-0 rounded-md bg-zinc-800/80 px-2 py-1 text-xs text-zinc-400">
                        {newModelId || 'model-id'}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-zinc-400 line-clamp-2">
                      {newModelDescription || 'No description available'}
                    </p>
                    {newModelProvider === 'openai-compatible' && newModelBaseUrl && (
                      <p className="mt-1 text-xs text-zinc-500 truncate">
                        {newModelBaseUrl}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddModel}
                disabled={isValidating}
                className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Add Model'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {visibleProviders.map((provider) => {
          const isActive = activeProviders[provider.id];
          const isOpen = openSections[provider.id];

          return (
            <Collapsible
              key={provider.id}
              open={isOpen}
              onOpenChange={() => toggleSection(provider.id)}
              className={`rounded-lg border backdrop-blur ${
                isActive 
                  ? 'border-primary/20 bg-primary/5' 
                  : 'border-secondary/20 bg-secondary/5'
              } transition-all`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
                    <span className="text-xl" role="img" aria-label="provider icon">
                      {getProviderIcon(provider.id)}
                    </span>
                    <h3 className={`text-lg font-medium ${
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}>
                      {provider.name}
                    </h3>
                    <ChevronDown className={`w-4 h-4 transition-transform ${
                      isOpen ? 'transform rotate-180' : ''
                    } ${isActive ? 'text-primary/60' : 'text-muted-foreground/60'}`} />
                  </CollapsibleTrigger>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={`relative ${isActive ? 'bg-[#00C950] border-[#00C950] hover:bg-[#00C950]/90 text-zinc-100' : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-900/70 text-zinc-500'}`}
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800">
                      <DialogHeader>
                        <DialogTitle className="text-zinc-100">{provider.name} API Key</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                          Enter your API key to enable {provider.name} models
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Input
                            id="apiKey"
                            type="password"
                            placeholder={`Enter your ${provider.name} API key`}
                            value={apiKeys[provider.id] || ''}
                            onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                            className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-700 text-zinc-100"
                          />
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <CollapsibleContent className="px-4 pb-4">
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!isActive && 'opacity-50'}`}>
                  {allModels
                    .filter((model): model is Model => model.provider === provider.id)
                    .map((model: Model) => (
                    <div
                      key={model.id}
                      className="relative group rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-zinc-100 truncate">
                              {model.name}
                            </h3>
                            <div className="shrink-0 rounded-md bg-zinc-800/80 px-2 py-1 text-xs text-zinc-400">
                              {model.id}
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-zinc-400 line-clamp-2">
                            {model.description || 'No description available'}
                          </p>
                          {model.baseUrl && (
                            <p className="mt-1 text-xs text-zinc-500 truncate">
                              {model.baseUrl}
                            </p>
                          )}
                        </div>
                        {model.isCustom && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditModel(model)}
                              className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteModel(model.id)}
                              className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Edit Model</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Edit your custom model
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-zinc-100">Name</label>
              <Input
                value={editingModel?.name || ''}
                onChange={(e) => setEditingModel(prev => ({ ...prev!, name: e.target.value }))}
                className="bg-zinc-900 border-zinc-800 text-zinc-100"
                placeholder="Enter model name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-zinc-100">Description</label>
              <Input
                value={editingModel?.description || ''}
                onChange={(e) => setEditingModel(prev => ({ ...prev!, description: e.target.value }))}
                className="bg-zinc-900 border-zinc-800 text-zinc-100"
                placeholder="Enter model description"
              />
            </div>
            <div className="space-y-2">
              <label className="text-zinc-100">Provider</label>
              <Select
                value={editingModel?.provider || ''}
                onValueChange={(value) => setEditingModel(prev => ({ ...prev!, provider: value as Model['provider'] }))}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="google" className="text-zinc-100">Google</SelectItem>
                  <SelectItem value="anthropic" className="text-zinc-100">Anthropic</SelectItem>
                  <SelectItem value="openai" className="text-zinc-100">OpenAI</SelectItem>
                  <SelectItem value="openai-compatible" className="text-zinc-100">OpenAI Compatible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingModel?.provider === 'openai-compatible' && (
              <div className="space-y-2">
                <label className="text-zinc-100">Base URL</label>
                <Input
                  value={editingModel?.baseUrl || ''}
                  onChange={(e) => setEditingModel(prev => ({ ...prev!, baseUrl: e.target.value }))}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  placeholder="Enter base URL"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 