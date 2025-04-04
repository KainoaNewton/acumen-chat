'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ModelsTab } from '@/components/ModelsTab';
import { storage } from '@/lib/storage';
import { Settings, Model } from '@/types/chat';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function SettingsPage() {
  // Use a ref to safely manage our timer logic without triggering warnings
  const hasLoggedRender = useRef(false);
  
  console.log('[Settings] Page component started rendering at', new Date().toISOString());
  
  // Only try to end the timer on first render, and only if it exists
  if (!hasLoggedRender.current) {
    hasLoggedRender.current = true;
    try {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        console.log('[Settings] Page loaded from navigation');
      }
    } catch (e) {
      // Timer may not exist, which is fine
    }
  }

  const [activeTab, setActiveTab] = useState('models');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    defaultModelId: 'gemini-2.0-flash',
    models: [],
  });

  // Log when settings page first renders (before data loads)
  useEffect(() => {
    // Simpler approach that doesn't depend on timer availability
    console.log('[Settings] Component mounted at', new Date().toISOString());
  }, []);

  // Load settings data with a delay to ensure UI renders first
  useEffect(() => {
    console.log('[Settings] Starting to load settings data at', new Date().toISOString());
    
    // Use requestIdleCallback or setTimeout to delay loading until after the UI is shown
    const timeoutId = setTimeout(() => {
      const startTime = performance.now();
      
      try {
        console.log('[Settings] Reading settings from storage');
        // Use cached storage call
        const savedSettings = storage.getSettings();
        
        // Only update state if we have data
        if (savedSettings) {
          setSettings(savedSettings);
          console.log('[Settings] Settings loaded successfully with', savedSettings.models.length, 'models');
        }
      } catch (error) {
        console.error('[Settings] Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
        const endTime = performance.now();
        console.log(`[Settings] Data loading completed in ${Math.round(endTime - startTime)}ms`);
      }
    }, 50); // Small delay to ensure the UI renders first
    
    return () => clearTimeout(timeoutId);
  }, []);

  const handleAddModel = (model: Model) => {
    const newSettings = {
      ...settings,
      models: [...settings.models, model],
    };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  };

  const handleDeleteModel = (modelId: string) => {
    const newSettings = {
      ...settings,
      models: settings.models.filter((m) => m.id !== modelId),
    };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
    toast.success('Model deleted successfully');
  };

  const handleDeleteAllHistory = () => {
    try {
      // First close the dialog to prevent any state updates from its unmounting
      setIsDeleteDialogOpen(false);
      
      // Clear the history from storage
      storage.clearHistory();
      
      // Clear any local state that might trigger updates
      localStorage.removeItem('lastSelectedChatId');
      
      toast.success('All chat history has been deleted');
    } catch (error) {
      console.error('[Settings] Error deleting history:', error);
      toast.error('Failed to delete chat history');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent/10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
          <TabsList className="bg-[#1C1C1C] mx-auto w-fit backdrop-blur border border-[#2A2A2A] rounded-md p-1.5 flex shadow-lg">
            <TabsTrigger 
              value="models" 
              className="rounded-sm px-6 py-3 text-white/70 data-[state=active]:bg-black data-[state=active]:text-white transition-all duration-300 ease-out border-none relative overflow-hidden"
            >
              <div className="relative z-10">Account</div>
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-sm px-6 py-3 text-white/70 data-[state=active]:bg-black data-[state=active]:text-white transition-all duration-300 ease-out border-none relative overflow-hidden"
            >
              <div className="relative z-10">Password</div>
            </TabsTrigger>
          </TabsList>

          <TabsContent 
            value="models"
            className="transition-all duration-300 ease-out data-[state=inactive]:opacity-0 data-[state=active]:opacity-100"
          >
            {isLoading ? (
              <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-6 backdrop-blur">
                <div className="flex justify-between items-center mb-6">
                  <div className="w-40 h-7 bg-secondary/20 rounded animate-pulse"></div>
                  <div className="w-32 h-9 bg-primary/20 rounded animate-pulse"></div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg border border-secondary/10 p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="w-32 h-6 bg-secondary/20 rounded animate-pulse mb-2"></div>
                        <div className="w-48 h-4 bg-secondary/10 rounded animate-pulse"></div>
                      </div>
                      <div className="w-16 h-8 bg-secondary/20 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-secondary/10 p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="w-36 h-6 bg-secondary/20 rounded animate-pulse mb-2"></div>
                        <div className="w-52 h-4 bg-secondary/10 rounded animate-pulse"></div>
                      </div>
                      <div className="w-16 h-8 bg-secondary/20 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ModelsTab
                models={settings.models}
                onAddModel={handleAddModel}
                onDeleteModel={handleDeleteModel}
              />
            )}
          </TabsContent>

          <TabsContent 
            value="history"
            className="transition-all duration-300 ease-out data-[state=inactive]:opacity-0 data-[state=active]:opacity-100"
          >
            {isLoading ? (
              <div className="space-y-6">
                {/* Cloud Sync Section Skeleton */}
                <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-6 backdrop-blur">
                  <div className="w-36 h-7 bg-secondary/20 rounded animate-pulse mb-4"></div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="w-32 h-5 bg-secondary/20 rounded animate-pulse mb-2"></div>
                        <div className="w-48 h-4 bg-secondary/10 rounded animate-pulse"></div>
                      </div>
                      <div className="w-32 h-9 bg-primary/20 rounded animate-pulse"></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="w-36 h-5 bg-secondary/20 rounded animate-pulse mb-2"></div>
                        <div className="w-48 h-4 bg-secondary/10 rounded animate-pulse"></div>
                      </div>
                      <div className="w-32 h-9 bg-primary/20 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                {/* Import/Export Section Skeleton */}
                <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-6 backdrop-blur">
                  <div className="w-40 h-7 bg-secondary/20 rounded animate-pulse mb-4"></div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="w-32 h-5 bg-secondary/20 rounded animate-pulse mb-2"></div>
                        <div className="w-48 h-4 bg-secondary/10 rounded animate-pulse"></div>
                      </div>
                      <div className="w-20 h-9 bg-primary/20 rounded animate-pulse"></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="w-32 h-5 bg-secondary/20 rounded animate-pulse mb-2"></div>
                        <div className="w-48 h-4 bg-secondary/10 rounded animate-pulse"></div>
                      </div>
                      <div className="w-20 h-9 bg-primary/20 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                {/* Danger Zone Skeleton */}
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 backdrop-blur">
                  <div className="w-32 h-7 bg-destructive/20 rounded animate-pulse mb-4"></div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="w-40 h-5 bg-secondary/20 rounded animate-pulse mb-2"></div>
                        <div className="w-56 h-4 bg-secondary/10 rounded animate-pulse"></div>
                      </div>
                      <div className="w-36 h-9 bg-destructive/20 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cloud Sync Section */}
                <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-6 backdrop-blur">
                  <h2 className="text-xl font-semibold mb-4">Cloud Sync</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">GitHub Sync</h3>
                        <p className="text-sm text-muted-foreground">Sync your chat history with GitHub</p>
                      </div>
                      <Button className="bg-primary/10 text-primary-foreground hover:bg-primary/20 border border-primary/20">
                        Connect GitHub
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">Google Drive Sync</h3>
                        <p className="text-sm text-muted-foreground">Sync your chat history with Google Drive</p>
                      </div>
                      <Button className="bg-primary/10 text-primary-foreground hover:bg-primary/20 border border-primary/20">
                        Connect Google Drive
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Import/Export Section */}
                <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-6 backdrop-blur">
                  <h2 className="text-xl font-semibold mb-4">Import & Export</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">Export History</h3>
                        <p className="text-sm text-muted-foreground">Download your chat history as a JSON file</p>
                      </div>
                      <Button className="bg-primary/10 text-primary-foreground hover:bg-primary/20 border border-primary/20">
                        Export
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">Import History</h3>
                        <p className="text-sm text-muted-foreground">Import chat history from a JSON file</p>
                      </div>
                      <Button className="bg-primary/10 text-primary-foreground hover:bg-primary/20 border border-primary/20">
                        Import
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 backdrop-blur">
                  <h2 className="text-xl font-semibold mb-4 text-destructive">Danger Zone</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">Delete All History</h3>
                        <p className="text-sm text-muted-foreground">Permanently delete all your chat history</p>
                      </div>
                      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20">
                            Delete All History
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-background border-secondary/20">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">Delete All History</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                              This action cannot be undone. This will permanently delete all your chat history from local storage.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-end gap-3 mt-4">
                            <Button
                              variant="outline"
                              onClick={() => setIsDeleteDialogOpen(false)}
                              className="border-secondary/20 text-muted-foreground hover:bg-secondary/10"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleDeleteAllHistory}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete All History
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 