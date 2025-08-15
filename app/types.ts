import { Server as NetServer, Socket as NetSocket } from "net";
import { NextApiResponse } from "next";
import { Server as SocketIOServer } from "socket.io";

export interface NextApiResponseWithSocket extends NextApiResponse {
  socket: NetSocket & {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
}

export interface SocketUser {
  userId: string;
  userName: string;
  userEmoji: string;
  lastActive: string;
}

export interface ActiveUsersUpdate {
  count: number;
  users: SocketUser[];
}
