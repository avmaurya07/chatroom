import RoomList from "./components/RoomList";
import { SocketProvider } from "./contexts/SocketContext";

export default function Home() {
  return (
    <SocketProvider>
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
        <RoomList />
      </main>
    </SocketProvider>
  );
}
