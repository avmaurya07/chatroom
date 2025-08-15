import RoomList from "./components/RoomList";
import { SocketProvider } from "./contexts/SocketContext";

export default function Home() {
  return (
    <SocketProvider>
      <main className="min-h-screen bg-gray-50">
        <RoomList />
      </main>
    </SocketProvider>
  );
}
