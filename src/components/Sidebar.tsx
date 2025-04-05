import { Button } from '@/components/ui/button';
import { Settings, Plus, Pencil, Trash2, Check, PanelLeft } from 'lucide-react';
import { Chat } from '@/types/chat';
import { cn } from '@/lib/utils';
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
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

// Helper function to format chat titles with different truncation lengths
const formatChatTitle = (title: string, showButtons: boolean = false): string => {
  // When buttons are shown, we need to truncate to make room
  // Otherwise, allow almost full width (much longer text)
  const maxLength = showButtons ? 16 : 50;
  if (title.length <= maxLength) {
    return title;
  }
  return title.substring(0, maxLength - 3) + '...';
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
  isCollapsed,
  onCollapsedChange,
}: SidebarProps) {

  return (
    <>
      {/* Animated toggle button that transitions between states */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => onCollapsedChange(!isCollapsed)}
          className={cn(
            "p-2 rounded-lg text-white hover:bg-[#2d2f2f] transition-all duration-300",
            isCollapsed
              ? "bg-[#202222]"
              : "bg-transparent transform translate-x-[180px]"
          )}
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      </div>

      <div className={cn(
        "h-full bg-[#202222] flex flex-col transition-all duration-300",
        isCollapsed ? "w-0 opacity-0" : "w-64 opacity-100"
      )}>
        {/* Title section without duplicate toggle button */}
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-white text-2xl font-semibold">acumen</h1>
          <div className="w-5 h-5"></div> {/* Spacer to maintain layout */}
        </div>

        <div className="p-3 flex justify-center">
          <Button
            onClick={onNewChat}
            className="w-[232px] h-[40px] rounded-full flex items-center justify-between px-3 bg-[#191A1A] border border-[#2F3031] hover:border-[#24B2C6] hover:bg-[#191A1A] text-[#8C9191]"
            variant="secondary"
          >
            New Conversation
            <Plus className="w-4 h-4 text-[#8C9191]" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                'group flex items-center gap-2 w-full rounded-md mb-1',
                selectedChatId === chat.id
                  ? 'bg-[#2d2f2f]'
                  : 'hover:bg-[#22292A]'
              )}
            >
              {editingChatId === chat.id ? (
                <div className="relative w-full">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => onEditingTitleChange(e.target.value)}
                    className="w-full text-left px-3 py-2 text-white bg-transparent border-0 focus:outline-none pr-20"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onSaveTitle(chat.id);
                      } else if (e.key === 'Escape') {
                        onEditChat(null);
                      }
                    }}
                    onBlur={() => onSaveTitle(chat.id)}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSaveTitle(chat.id)}
                      className="h-8 w-8 text-white"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full">
                  <button
                    onClick={() => {
                      // Only call onSelectChat if this isn't already the selected chat
                      if (selectedChatId !== chat.id) {
                        onSelectChat(chat.id);
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-white truncate pr-16"
                  >
                    <span className="group-hover:hidden">{formatChatTitle(chat.title, false)}</span>
                    <span className="hidden group-hover:inline">{formatChatTitle(chat.title, true)}</span>
                  </button>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditChat(chat.id);
                      }}
                      className="h-7 w-7 text-white"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="h-7 w-7 text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4">
          <Link href="/settings" prefetch={true}>
            <Button
              variant="ghost"
              className="w-full flex justify-between items-center text-left text-white bg-[#2D2F2F] hover:bg-[#2D2F2F] group"
              onClick={(e) => {
                e.preventDefault();
                console.time('SettingsButtonClick-to-NavigationStart');
                console.log('[Sidebar] Settings button clicked at', new Date().toISOString());
                onOpenSettings();
              }}
            >
              <span>Settings</span>
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}