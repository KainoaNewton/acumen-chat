import { redirect } from 'next/navigation';

export default async function ChatPage({ params }: { params: { id: string } }) {
  // Since we're just redirecting and setting localStorage, we can do this on the client
  // using a small script
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              localStorage.setItem('lastSelectedChatId', '${params.id}');
              window.location.href = '/';
            } catch (e) {
              window.location.href = '/';
            }
          `
        }}
      />
      <div className="flex h-screen items-center justify-center bg-[#202222]">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-white"></div>
          <div className="h-2 w-2 animate-pulse rounded-full bg-white" style={{ animationDelay: '0.2s' }}></div>
          <div className="h-2 w-2 animate-pulse rounded-full bg-white" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </>
  );
} 