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
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
        <ChatRoom roomId={id} />
      </main>
    </SocketProvider>
  );
}
