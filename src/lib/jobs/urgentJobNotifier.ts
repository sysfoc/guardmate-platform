import connectDB from '@/lib/mongodb';
import Job from '@/models/Job.model';
import User from '@/models/User.model';
import PlatformSettings from '@/models/PlatformSettings.model';
import { calculateDistance } from '@/lib/utils/haversine';
import { sendEmail } from '@/lib/email/sendEmail';
import { NotificationEventType } from '@/types/email.types';
import { UserRole, UserStatus, LicenseStatus } from '@/types/enums';

export async function notifyNearbyGuards(jobId: string) {
  try {
    await connectDB();

    const job = await Job.findOne({ jobId }).lean();
    if (!job || !job.isUrgent) {
      return;
    }

    if (!job.coordinates) {
      console.warn(`Job ${jobId} is marked as urgent but has no coordinates.`);
      return;
    }

    const platformSettings = await PlatformSettings.findOne().lean();
    const radiusMiles = platformSettings?.urgentJobNotificationRadiusMiles || 200;

    // Find all active, licensed Mates
    const activeGuards = await User.find({
      role: UserRole.MATE,
      status: UserStatus.ACTIVE,
      licenseStatus: LicenseStatus.VALID,
      coordinates: { $ne: null }
    }).lean();

    for (const guard of activeGuards) {
      if (!guard.coordinates || !guard.email) continue;

      const distance = calculateDistance(
        job.coordinates.lat,
        job.coordinates.lng,
        guard.coordinates.lat,
        guard.coordinates.lng
      );

      if (distance <= radiusMiles) {
        // Send email
        await sendEmail({
          to: guard.email,
          notificationType: NotificationEventType.URGENT_JOB_NEARBY,
          variables: {
            guardName: guard.firstName,
            jobName: job.title,
            distance: distance,
            location: job.location,
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/mate/jobs/${job.jobId}`,
          },
        });
      }
    }

    console.log(`Urgent job ${jobId} notifications sent to nearby guards.`);
  } catch (error) {
    console.error('Error sending urgent job notifications:', error);
  }
}
