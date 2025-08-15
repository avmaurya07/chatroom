import { Server } from "socket.io";
import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { NextApiResponseWithSocket } from "@/app/types";

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
    });

    io.on("connection", (socket) => {
      socket.on("join-room", (roomId) => {
        socket.join(roomId);
      });

      socket.on("leave-room", (roomId) => {
        socket.leave(roomId);
      });

      socket.on("send-message", (message) => {
        io.to(message.roomId).emit("new-message", message);
      });

      socket.on("user-activity", (data) => {
        io.to(data.roomId).emit("user-active", {
          userId: data.userId,
          userName: data.userName,
          userEmoji: data.userEmoji,
        });
      });
    });

    res.socket.server.io = io;
  }
  res.end();
};

export default ioHandler;
