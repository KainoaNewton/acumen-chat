import { Button } from '@/components/ui/button';
import { Settings, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Chat } from '@/types/chat';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface SidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onOpenSettings: () => void;
  onDeleteChat: (chatId: string) => void;
  onEditChat: (chatId: string | null) => void;
  editingChatId: string | null;
  editingTitle: string;
  onEditingTitleChange: (title: string) => void;
  onSaveTitle: (chatId: string) => void;
}

export function Sidebar({
  chats,
  selectedChatId,
  onNewChat,
  onSelectChat,
  onOpenSettings,
  onDeleteChat,
  onEditChat,
  editingChatId,
  editingTitle,
  onEditingTitleChange,
  onSaveTitle,
}: SidebarProps) {
  const router = useRouter();

  return (
    <div className="w-64 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="p-4">
        <Button
          onClick={onNewChat}
          className="w-full flex items-center gap-2"
          variant="secondary"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={cn(
              'group flex items-center gap-2 w-full rounded-md mb-1',
              selectedChatId === chat.id
                ? 'bg-zinc-800'
                : 'hover:bg-zinc-800/50'
            )}
          >
            {editingChatId === chat.id ? (
              <div className="flex items-center gap-2 p-2 w-full">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => onEditingTitleChange(e.target.value)}
                  className="flex-1 bg-zinc-700 text-zinc-100 px-2 py-1 rounded border border-zinc-600 focus:outline-none focus:border-zinc-500"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSaveTitle(chat.id)}
                  className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditChat(null)}
                  className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className="flex-1 text-left px-3 py-2 text-zinc-300"
                >
                  {chat.title}
                </button>
                <div className="opacity-0 group-hover:opacity-100 flex pr-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditChat(chat.id)}
                    className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteChat(chat.id)}
                    className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-zinc-800">
        <Link href="/settings" prefetch={true}>
          <Button
            variant="ghost"
            className="w-full justify-start text-left text-zinc-400 hover:text-zinc-100"
            onClick={(e) => {
              e.preventDefault();
              console.time('SettingsButtonClick-to-NavigationStart');
              console.log('[Sidebar] Settings button clicked at', new Date().toISOString());
              onOpenSettings();
            }}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </Link>
      </div>
    </div>
  );
} 