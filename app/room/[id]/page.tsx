import ChatRoom from "@/app/components/ChatRoom";
import { SocketProvider } from "@/app/contexts/SocketContext";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SocketProvider>
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 animate-fade-in flex justify-center">
        <div className="w-full max-w-7xl px-4">
          <ChatRoom roomId={id} />
        </div>
      </main>
    </SocketProvider>
  );
}
