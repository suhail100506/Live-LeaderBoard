import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        callback(null, true);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join room for specific assessment leaderboard
    socket.on('join:assessment', (assessmentId: string) => {
      socket.join(`assessment:${assessmentId}`);
      console.log(`[Socket.IO] ${socket.id} joined assessment:${assessmentId}`);
    });

    // Join student specific private room for personal score and feedback updates
    socket.on('join:student', (studentId: string) => {
      socket.join(`student:${studentId}`);
      console.log(`[Socket.IO] ${socket.id} joined student:${studentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('[Socket.IO] Socket.IO has not been initialized');
  }
  return io;
};
