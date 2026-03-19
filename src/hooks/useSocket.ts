'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket/socketClient';

/**
 * useSocket Custom Hook
 * Connects the Socket.io instance on mount and handles reconnection.
 * Should be used at the top-level layout layout to maintain a single session connection.
 */
export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const socketInstance = await getSocket();
        
        if (!mounted) return;

        setSocket(socketInstance);
        setIsConnected(socketInstance.connected);

        socketInstance.on('connect', () => {
          if (mounted) setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
          if (mounted) setIsConnected(false);
        });

      } catch (err) {
        console.error('Socket initialization failed:', err);
      }
    };

    init();

    return () => {
      mounted = false;
      disconnectSocket();
    };
  }, []);

  return { socket, isConnected };
}
