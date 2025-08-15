import { Server } from "socket.io";
import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { NextApiResponseWithSocket } from "@/app/types";
import connectDB from "@/app/lib/mongodb";
import { Room } from "@/app/lib/models/Room";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (!res.socket.server.io) {
    const path = "/api/socket";
    const httpServer = res.socket.server as unknown as NetServer;
    const io = new Server(httpServer, {
      path: path,
      addTrailingSlash: false,
      cors: {
        origin:
          process.env.NODE_ENV === "production"
            ? ["https://chatroom-puce-kappa.vercel.app"]
            : ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      // Track user data for active users
      let currentRoomId: string | null = null;
      let userData: {
        userId: string;
        userName: string;
        userEmoji: string;
      } | null = null;

      socket.on("join-room", async (roomId, user) => {
        socket.join(roomId);
        currentRoomId = roomId;
        userData = user;

        // Update active users in the room
        if (userData) {
          try {
            await connectDB();
            const room = await Room.findById(roomId);
            if (room) {
              // Add user to activeUsers map
              room.activeUsers.set(userData.userId, {
                ...userData,
                lastActive: new Date(),
              });
              await room.save();

              // Emit updated active users count to all clients in the room
              const activeUserCount = room.activeUsers.size;
              io.to(roomId).emit("active-users-update", {
                count: activeUserCount,
                users: Array.from(room.activeUsers.values()),
              });
            }
          } catch (error) {
            console.error("Error updating active users:", error);
          }
        }
      });

      socket.on("leave-room", async (roomId) => {
        socket.leave(roomId);

        // Remove user from active users
        if (userData && roomId) {
          try {
            await connectDB();
            const room = await Room.findById(roomId);
            if (room && room.activeUsers.has(userData.userId)) {
              room.activeUsers.delete(userData.userId);
              await room.save();

              // Emit updated active users count
              io.to(roomId).emit("active-users-update", {
                count: room.activeUsers.size,
                users: Array.from(room.activeUsers.values()),
              });
            }
          } catch (error) {
            console.error("Error updating active users:", error);
          }
        }

        currentRoomId = null;
        userData = null;
      });

      socket.on("send-message", (message) => {
        io.to(message.roomId).emit("new-message", message);
      });

      socket.on("user-activity", async (data) => {
        io.to(data.roomId).emit("user-active", {
          userId: data.userId,
          userName: data.userName,
          userEmoji: data.userEmoji,
        });

        // Update user's last active timestamp
        try {
          await connectDB();
          const room = await Room.findById(data.roomId);
          if (room && room.activeUsers.has(data.userId)) {
            const userData = room.activeUsers.get(data.userId);
            room.activeUsers.set(data.userId, {
              ...userData,
              lastActive: new Date(),
            });
            await room.save();
          }
        } catch (error) {
          console.error("Error updating user activity:", error);
        }
      });

      // Handle disconnections
      socket.on("disconnect", async () => {
        if (currentRoomId && userData) {
          try {
            await connectDB();
            const room = await Room.findById(currentRoomId);
            if (room && room.activeUsers.has(userData.userId)) {
              room.activeUsers.delete(userData.userId);
              await room.save();

              // Emit updated active users count
              io.to(currentRoomId).emit("active-users-update", {
                count: room.activeUsers.size,
                users: Array.from(room.activeUsers.values()),
              });
            }
          } catch (error) {
            console.error("Error handling disconnect:", error);
          }
        }
      });
    });

    res.socket.server.io = io;
  }
  res.end();
};

export default ioHandler;
