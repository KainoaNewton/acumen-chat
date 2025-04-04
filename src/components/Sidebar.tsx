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

// Helper function to format chat titles
const formatChatTitle = (title: string): string => {
  if (title.length <= 18) {
    return title;
  }
  return title.substring(0, 17) + '...';
};

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
    <div className="w-64 h-full bg-black border-r border-[#333333] flex flex-col">
      <div className="p-4">
        <Button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 bg-[#0C1020] border border-[#0E1B48] hover:border-[#1A2F7D] hover:bg-[#0C1020] text-white"
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
              'group flex items-center gap-2 w-full rounded-md mb-1 border',
              selectedChatId === chat.id
                ? 'bg-[#202020] border-transparent text-white'
                : 'border-transparent hover:border-[#202020] text-white'
            )}
          >
            {editingChatId === chat.id ? (
              <div className="flex items-center gap-2 p-2 w-full">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => onEditingTitleChange(e.target.value)}
                  className="flex-1 bg-black text-white px-2 py-1 rounded border border-[#333333] focus:outline-none focus:border-[#444444]"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSaveTitle(chat.id)}
                  className="h-8 w-8 text-white"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditChat(null)}
                  className="h-8 w-8 text-white hover:text-[#C9A4A9]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="relative w-full">
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className="w-full text-left px-3 py-2 text-white truncate pr-20"
                >
                  {chat.title}
                </button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditChat(chat.id)}
                    className="h-8 w-8 text-white"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteChat(chat.id)}
                    className="h-8 w-8 text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-[#333333]">
        <Link href="/settings" prefetch={true}>
          <Button
            variant="ghost"
            className="w-full justify-start text-left text-white hover:bg-[#0D0D0D]"
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