import { io, Socket } from 'socket.io-client';
import { getFirebaseIdToken } from '@/lib/firebase/firebaseClient';

let socket: Socket | null = null;

export const getSocket = async (): Promise<Socket> => {
  if (socket) return socket;

  const token = await getFirebaseIdToken();
  if (!token) throw new Error('Cannot connect to chat: Not authenticated');

  socket = io(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000', {
    auth: { token },
    transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
