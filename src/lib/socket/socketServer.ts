import { Server, Socket } from 'socket.io';
import connectDB from '@/lib/mongodb';
import { verifyFirebaseToken } from '@/lib/firebase/firebaseAdmin';
import User from '@/models/User.model';
import Conversation from '@/models/Conversation.model';
import Message from '@/models/Message.model';
import { UserStatus } from '@/types/enums';

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(uid: string): boolean {
  const now = Date.now();
  let record = rateLimits.get(uid);
  if (!record || now > record.resetAt) {
    rateLimits.set(uid, { count: 1, resetAt: now + 10000 });
    return true;
  }
  if (record.count >= 10) return false;
  record.count++;
  return true;
}

export function initSocketServer(io: Server) {
  // Middleware: Authentication & Active Account Check
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));

      const decoded = await verifyFirebaseToken(token);
      if (!decoded) return next(new Error('Unauthorized'));

      await connectDB();
      const user = await User.findOne({ uid: decoded.uid }).lean();
      
      if (!user || user.status !== UserStatus.ACTIVE) {
        return next(new Error('Account not active'));
      }

      // Store verified user object
      socket.data.user = user;
      next();
    } catch (err) {
      console.error('Socket Auth Error:', err);
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    socket.on('join-conversation', async (conversationId: string) => {
      try {
        if (!conversationId) return;
        const conv = await Conversation.findById(conversationId).lean();
        if (!conv) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const isParticipant = conv.participants.some(p => p.uid === user.uid);
        if (!isParticipant) {
          socket.emit('error', { message: 'Unauthorized access to conversation' });
          return;
        }

        socket.join(conversationId);
        socket.emit('joined', { conversationId });
      } catch (err) {
        console.error('Join Error:', err);
      }
    });

    socket.on('send-message', async (data: { conversationId: string; text: string }) => {
      try {
        if (!checkRateLimit(user.uid)) {
          socket.emit('error', { message: 'Rate limit exceeded. Try again later.' });
          return;
        }

        const { conversationId, text } = data;
        const cleanText = text?.trim();
        
        if (!cleanText || cleanText.length === 0 || cleanText.length > 1000) {
          socket.emit('error', { message: 'Invalid message length' });
          return;
        }

        const conv = await Conversation.findById(conversationId);
        if (!conv) return;

        const isParticipant = conv.participants.some(p => p.uid === user.uid);
        if (!isParticipant) return;

        const otherParticipant = conv.participants.find(p => p.uid !== user.uid);
        
        const newMessage = await Message.create({
          conversationId,
          senderId: user.uid,
          senderName: user.role === 'BOSS' ? (user.companyName || `${user.firstName} ${user.lastName}`) : `${user.firstName} ${user.lastName}`,
          senderPhoto: user.profilePhoto || user.companyLogo || null,
          senderRole: user.role,
          text: cleanText,
          isRead: false,
        });

        // Update conversation metadata
        conv.lastMessage = cleanText;
        conv.lastMessageAt = newMessage.createdAt;
        if (otherParticipant) {
          const currentUnread = conv.unreadCounts?.[otherParticipant.uid] || 0;
          const newCounts = { ...conv.unreadCounts, [otherParticipant.uid]: currentUnread + 1 };
          conv.set('unreadCounts', newCounts);
          conv.markModified('unreadCounts');
        }
        await conv.save();

        io.to(conversationId).emit('new-message', newMessage.toObject());
      } catch (err) {
        console.error('Send Message Error:', err);
      }
    });

    socket.on('typing-start', async ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      const conv = await Conversation.findById(conversationId).lean();
      if (!conv) return;
      
      const isParticipant = conv.participants.some(p => p.uid === user.uid);
      if (!isParticipant) return;

      socket.to(conversationId).emit('user-typing', {
        userId: user.uid,
        userName: user.role === 'BOSS' ? (user.companyName || user.firstName) : user.firstName
      });
    });

    socket.on('typing-stop', async ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      socket.to(conversationId).emit('user-stopped-typing', { userId: user.uid });
    });

    socket.on('messages-read', async ({ conversationId }: { conversationId: string }) => {
      try {
        if (!conversationId) return;
        const conv = await Conversation.findById(conversationId);
        if (!conv) return;

        const isParticipant = conv.participants.some(p => p.uid === user.uid);
        if (!isParticipant) return;

        // Mark all messages from the OTHER user as read
        await Message.updateMany(
          { conversationId, senderId: { $ne: user.uid }, isRead: false },
          { $set: { isRead: true, readAt: new Date() } }
        );

        // Reset our unread count
        const newCounts = { ...conv.unreadCounts, [user.uid]: 0 };
        conv.set('unreadCounts', newCounts);
        conv.markModified('unreadCounts');
        await conv.save();

        // Notify the room so sender UI updates read receipts
        io.to(conversationId).emit('messages-read-update', {
          conversationId,
          readByUserId: user.uid,
          readAt: new Date(),
        });
      } catch (err) {
        console.error('Messages Read Error:', err);
      }
    });

    // ── Shift Tracking Room Events ──────────────────────────────────────────
    socket.on('join-shift-room', async (jobId: string) => {
      try {
        if (!jobId) return;

        // Import models lazily to avoid circular deps
        const Job = (await import('@/models/Job.model')).default;
        const Bid = (await import('@/models/Bid.model')).default;

        const job = await Job.findOne({ jobId }).lean();
        if (!job) {
          socket.emit('error', { message: 'Job not found' });
          return;
        }

        // Verify user is participant (Boss who owns the job or Mate with accepted bid)
        const isBoss = user.role === 'BOSS' && job.postedBy === user.uid;
        const isGuard = user.role === 'MATE' && await Bid.exists({
          jobId,
          guardUid: user.uid,
          status: 'ACCEPTED',
        });

        if (!isBoss && !isGuard) {
          socket.emit('error', { message: 'Unauthorized access to shift room' });
          return;
        }

        const roomName = `shift-${jobId}`;
        socket.join(roomName);
        socket.emit('joined-shift', { jobId, room: roomName });
      } catch (err) {
        console.error('Join Shift Room Error:', err);
      }
    });

    socket.on('leave-shift-room', (jobId: string) => {
      if (!jobId) return;
      socket.leave(`shift-${jobId}`);
    });

    socket.on('guard-location-update', (data: { jobId: string; lat: number; lng: number; timestamp: string; guardName: string }) => {
      if (!data?.jobId) return;
      io.to(`shift-${data.jobId}`).emit('guard-location-update', data);
    });

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Socket disconnected: ${user.uid}`);
      }
    });
  });
}
