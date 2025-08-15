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
      <main className="min-h-screen bg-gray-50">
        <ChatRoom roomId={id} />
      </main>
    </SocketProvider>
  );
}
