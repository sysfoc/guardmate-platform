import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse, getClientIp, getDeviceInfo } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import AdminActivity from '@/models/AdminActivity.model';
import { UserRole, LicenseStatus, VerificationStatus, CertificateStatus } from '@/types/enums';
import { AdminActionType } from '@/types/admin.types';
import { sendLicenseApproved, sendLicenseRejected } from '@/lib/email/emailTriggers';

// Valid fields and their allowed values
const VALID_FIELDS: Record<string, string[]> = {
  licenseStatus: Object.values(LicenseStatus),
  companyLicenseStatus: Object.values(LicenseStatus),
  idVerificationStatus: Object.values(VerificationStatus),
  firstAidCertificateStatus: Object.values(CertificateStatus),
  constructionWhiteCardStatus: Object.values(CertificateStatus),
  workingWithChildrenCheckStatus: Object.values(CertificateStatus),
  victorianBusinessLicenceStatus: Object.values(CertificateStatus),
};

/**
 * PATCH /api/admin/users/[uid]/verify
 * Admin updates a user's verification/license status.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const auth = await verifyAndGetUser(request);
  if (!auth || auth.user.role !== UserRole.ADMIN) {
    return createApiResponse(false, null, 'Unauthorized — Admin access required.', 403);
  }

  try {
    await connectDB();
    const { uid } = await params;
    const body = await request.json() as {
      field: string;
      value: string;
      notes?: string;
    };

    const { field, value, notes } = body;

    // Validate field
    if (!field || !VALID_FIELDS[field]) {
      return createApiResponse(
        false, null,
        `Invalid field: ${field}. Must be one of: ${Object.keys(VALID_FIELDS).join(', ')}`,
        400
      );
    }

    // Validate value
    if (!VALID_FIELDS[field].includes(value)) {
      return createApiResponse(
        false, null,
        `Invalid value "${value}" for field "${field}". Allowed: ${VALID_FIELDS[field].join(', ')}`,
        400
      );
    }

    const targetUser = await User.findOne({ uid });
    if (!targetUser) {
      return createApiResponse(false, null, 'User not found.', 404);
    }

    // Build update data
    const updateData: Record<string, any> = {
      [field]: value,
      updatedAt: new Date().toISOString(),
    };

    // Set timestamps and related fields based on what's being verified
    const now = new Date();

    if (field === 'licenseStatus' && value === LicenseStatus.VALID) {
      updateData.licenseVerifiedAt = now;
    }

    if (field === 'companyLicenseStatus' && value === LicenseStatus.VALID) {
      updateData.isCompanyVerified = true;
      updateData.companyVerifiedAt = now;
    } else if (field === 'companyLicenseStatus' && value !== LicenseStatus.VALID) {
      updateData.isCompanyVerified = false;
    }

    if (field === 'idVerificationStatus' && value === VerificationStatus.VERIFIED) {
      updateData.idVerifiedAt = now;
    }

    if (field === 'firstAidCertificateStatus' && value === CertificateStatus.VALID) {
      updateData.firstAidVerifiedAt = now;
      updateData.firstAidVerifiedBy = auth.user.uid;
    }

    if (field === 'constructionWhiteCardStatus' && value === CertificateStatus.VALID) {
      updateData.constructionWhiteCardVerifiedAt = now;
    }

    if (field === 'workingWithChildrenCheckStatus' && value === CertificateStatus.VALID) {
      updateData.workingWithChildrenCheckVerifiedAt = now;
    }

    if (field === 'victorianBusinessLicenceStatus' && value === CertificateStatus.VALID) {
      updateData.victorianBusinessLicenceVerifiedAt = now;
    }

    // Apply update
    const updatedUser = await User.findOneAndUpdate(
      { uid },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Determine the correct action type
    const actionTypeMap: Record<string, AdminActionType> = {
      licenseStatus: AdminActionType.VERIFY_LICENSE,
      companyLicenseStatus: AdminActionType.VERIFY_LICENSE,
      idVerificationStatus: AdminActionType.VERIFY_LICENSE,
      firstAidCertificateStatus: AdminActionType.VERIFY_FIRST_AID,
      constructionWhiteCardStatus: AdminActionType.VERIFY_WHITE_CARD,
      workingWithChildrenCheckStatus: AdminActionType.VERIFY_CHILDREN_CHECK,
      victorianBusinessLicenceStatus: AdminActionType.VERIFY_VICTORIAN_LICENCE,
    };

    // Log admin activity
    const deviceInfo = getDeviceInfo(request);
    await AdminActivity.create({
      adminUid: auth.user.uid,
      adminName: `${auth.user.firstName} ${auth.user.lastName}`,
      actionType: actionTypeMap[field] || AdminActionType.VERIFY_LICENSE,
      targetType: 'USER',
      targetId: targetUser.uid,
      targetName: `${targetUser.firstName} ${targetUser.lastName}`,
      targetRole: targetUser.role,
      details: `${field} set to ${value}${notes ? ` — ${notes}` : ''}`,
      ipAddress: getClientIp(request),
      userAgent: deviceInfo.userAgent,
    });

    // Send Emails if it's a structural license verification change
    if (field === 'licenseStatus' || field === 'companyLicenseStatus' || field === 'idVerificationStatus') {
      const emailRef = targetUser.email;
      const fName = targetUser.firstName;
      
      const licNumRaw = field === 'companyLicenseStatus' ? targetUser.companyLicenseNumber : targetUser.licenseNumber;
      const licNum = licNumRaw ? `*${licNumRaw.slice(-4)}` : 'Document';

      if (value === LicenseStatus.VALID || value === VerificationStatus.VERIFIED) {
        await sendLicenseApproved(emailRef, fName, licNum);
      } else if (value === VerificationStatus.REJECTED) {
        await sendLicenseRejected(emailRef, fName, licNum, notes || 'Failed to meet criteria');
      }
    }

    return createApiResponse(
      true,
      {
        ...updatedUser!.toObject(),
        _id: String(updatedUser!._id),
        fullName: `${updatedUser!.firstName} ${updatedUser!.lastName}`,
      },
      `Verification status updated: ${field} → ${value}`,
      200
    );
  } catch (error: unknown) {
    console.error('PATCH /api/admin/users/[uid]/verify error:', error);
    return createApiResponse(false, null, 'Failed to update verification status.', 500);
  }
}
