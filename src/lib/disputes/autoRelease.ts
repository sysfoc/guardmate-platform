import connectDB from '@/lib/mongodb';
import Shift from '@/models/Shift.model';
import Dispute from '@/models/Dispute.model';
import Payment from '@/models/Payment.model';
import Job from '@/models/Job.model';
import User from '@/models/User.model';
import PlatformSettings from '@/models/PlatformSettings.model';
import { releasePayment } from '@/lib/payments/releasePayment';
import { sendShiftAutoApproved } from '@/lib/email/emailTriggers';
import { EscrowPaymentStatus } from '@/types/enums';

// ─── In-Memory Lock ─────────────────────────────────────────────────────────
// Prevents concurrent execution of processAutoReleases() when multiple
// GET /api/jobs requests hit the server simultaneously.
// The releasePayment() transaction provides the true safety net for atomicity,
// but this lock prevents unnecessary duplicate processing.
let isProcessing = false;
let lastRunAt = 0;
const MIN_INTERVAL_MS = 30_000; // Minimum 30 seconds between runs

/**
 * processAutoReleases()
 * Automatically releases escrowed funds for shifts where the checkOutTime 
 * was more than X hours ago (default 48 hours), and no active dispute exists.
 */
export async function processAutoReleases(): Promise<void> {
  // ─── Lock & Debounce ────────────────────────────────────────────────────
  const now = Date.now();
  if (isProcessing || (now - lastRunAt) < MIN_INTERVAL_MS) {
    return; // Skip — already running or ran recently
  }
  isProcessing = true;
  lastRunAt = now;

  try {
    await connectDB();
    
    // Get auto-release window setting (fallback to 48 hours)
    const settings = await PlatformSettings.findOne().lean();
    const autoReleaseWindowHours = settings?.autoReleaseWindowHours || 48;
    
    // Find cutoff time
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - autoReleaseWindowHours);

    // Find all completed shifts that haven't been approved or auto-released and checkout time is past cutoff
    const readyShifts = await Shift.find({
      checkOutTime: { $ne: null, $lte: cutoffDate },
      isApprovedByBoss: false,
    }).lean();

    if (readyShifts.length === 0) return;

    for (const shift of readyShifts) {
      // 1. Check if an OPEN or UNDER_REVIEW dispute exists for this job + guard
      const activeDispute = await Dispute.findOne({
        jobId: shift.jobId,
        guardUid: shift.guardUid,
        status: { $in: ['OPEN', 'UNDER_REVIEW'] }
      }).lean();

      if (activeDispute) {
        // Leave funds frozen.
        continue;
      }

      // 2. Check if a closed dispute has autoReleaseTriggered flag already true
      // (This prevents double-processing if a dispute was resolved)
      const disputeRecord = await Dispute.findOne({ 
        jobId: shift.jobId,
        guardUid: shift.guardUid 
      }).lean();
      if (disputeRecord && disputeRecord.autoReleaseTriggered) {
        continue;
      }

      // 3. Ensure payment is HELD — query by BOTH jobId AND guardUid for multi-guard support
      const payment = await Payment.findOne({ 
        jobId: shift.jobId, 
        guardUid: shift.guardUid 
      }).lean();
      if (!payment || payment.paymentStatus !== EscrowPaymentStatus.HELD) {
        continue;
      }

      // 4. Attempt release via existing logic
      console.log(`[Auto-Release] Triggering release for Job ID: ${shift.jobId}, Guard: ${shift.guardUid}`);
      try {
        const releaseResult = await releasePayment(shift.jobId);
        
        if (releaseResult.success && releaseResult.payment) {
          // Send automatic notification emails
          const boss = await User.findOne({ uid: shift.bossUid }).lean();
          const guard = await User.findOne({ uid: shift.guardUid }).lean();
          
          if (boss && guard) {
            await sendShiftAutoApproved(
              boss.email,
              `${boss.firstName} ${boss.lastName}`,
              guard.email,
              `${guard.firstName} ${guard.lastName}`,
              shift.jobTitle,
              releaseResult.payment.guardPayout,
              releaseResult.payment.currency || 'AUD'
            ).catch(err => console.error('Failed to send auto-approve email', err));
          }

          // Mark autoReleaseTriggered if a dispute document existed
          if (disputeRecord) {
            await Dispute.updateOne(
              { _id: disputeRecord._id },
              { $set: { autoReleaseTriggered: true } }
            );
          }
          
          // Mark shift as approved
          await Shift.updateOne(
            { _id: shift._id },
            { 
              $set: { 
                isApprovedByBoss: true,
                approvedBy: 'SYSTEM_AUTO_RELEASE',
                approvedAt: new Date()
              } 
            }
          );
        } else {
          console.error(`[Auto-Release] Failed for Job ID ${shift.jobId}:`, releaseResult.message);
        }
      } catch (err) {
        console.error(`[Auto-Release] Error releasing payment for Job ID ${shift.jobId}:`, err);
      }
    }
  } catch (error) {
    console.error('processAutoReleases Critical Error:', error);
  } finally {
    // Always release the lock
    isProcessing = false;
  }
}
