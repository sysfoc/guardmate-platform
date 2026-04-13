import connectDB from '@/lib/mongodb';
import Dispute from '@/models/Dispute.model';
import User from '@/models/User.model';
import PlatformSettings from '@/models/PlatformSettings.model';
import { sendDisputeDeadlineWarning } from '@/lib/email/emailTriggers';

/**
 * checkDisputeDeadlines()
 * Checks for OPEN disputes nearing their 48-hour response deadline.
 * Sends an email warning to the admin if a deadline is within 6 hours.
 */
export async function checkDisputeDeadlines(): Promise<void> {
  try {
    await connectDB();
    
    const settings = await PlatformSettings.findOne().lean();
    const warningHours = settings?.disputeDeadlineWarningHours || 6;
    
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + warningHours * 60 * 60 * 1000);

    // Find disputes that are OPEN, haven't been responded to, 
    // are past their warning threshold but not past deadline
    // and where we haven't already sent a warning.
    const urgentDisputes = await Dispute.find({
      status: 'OPEN',
      respondedAt: null,
      disputeDeadline: { $lte: warningThreshold, $gt: now },
      deadlineWarningSentAt: null,
    }).lean();

    if (urgentDisputes.length === 0) return;

    // We'll need admin emails. For simplicity, just find all active ADMIN users.
    const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('email').lean();
    if (admins.length === 0) return;
    const adminEmails = admins.map(a => a.email);

    for (const dispute of urgentDisputes) {
      const hoursLeft = Math.max(1, Math.round((new Date(dispute.disputeDeadline).getTime() - now.getTime()) / (1000 * 60 * 60)));
      
      console.log(`[Dispute Deadline] Sending warning for Dispute ID: ${dispute._id}, hours left: ${hoursLeft}`);
      
      try {
        // Send to all admins (or just a primary system email if configured)
        for (const adminEmail of adminEmails) {
          await sendDisputeDeadlineWarning(
            adminEmail,
            dispute.jobTitle,
            hoursLeft,
            dispute._id.toString()
          );
        }

        // Mark as sent
        await Dispute.updateOne(
          { _id: dispute._id },
          { $set: { deadlineWarningSentAt: new Date() } }
        );
      } catch (err) {
        console.error(`[Dispute Deadline] Failed to send warning for Dispute ID: ${dispute._id}`, err);
      }
    }
    
    // Check for ignored UNRESOLVED disputes > 72 hours old
    const escalationThreshold = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const ignoredDisputes = await Dispute.find({
      status: { $in: ['OPEN', 'UNDER_REVIEW'] },
      createdAt: { $lte: escalationThreshold },
      // To prevent spamming, we'd need another flag or just log it. For now, we just log a critical error.
    }).select('_id jobId status').lean();
    
    if (ignoredDisputes.length > 0) {
      console.error(`[Dispute Escalation] Found ${ignoredDisputes.length} disputes older than 72 hours needing admin action.`);
    }

  } catch (error) {
    console.error('checkDisputeDeadlines Critical Error:', error);
  }
}
