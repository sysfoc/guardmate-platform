/**
 * route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/mate/verify-abn
 * Mate only — verifies ABN with ABR API and updates user profile.
 */

import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import PlatformSettings from '@/models/PlatformSettings.model';
import { UserRole } from '@/types/enums';
import { ABNStatus, AustralianState } from '@/types/abr.types';
import { validateABNFormat, verifyABN, cleanABN } from '@/lib/services/abrLookup';
import { sendABNVerified, sendABNVerificationFailed } from '@/lib/email/emailTriggers';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }

    const { user } = authResult;
    
    // Only Mate accounts can verify ABN
    if (user.role !== UserRole.MATE) {
      return createApiResponse(false, null, 'Only Mate accounts can verify ABN.', 403);
    }

    // Parse request body
    const body = await request.json();
    const { abn, abnState } = body;

    // Validate required fields
    if (!abn || typeof abn !== 'string') {
      return createApiResponse(false, null, 'ABN is required.', 400);
    }

    if (!abnState || !Object.values(AustralianState).includes(abnState)) {
      return createApiResponse(false, null, 'Valid Australian state is required.', 400);
    }

    // Clean ABN (remove spaces)
    const cleanAbn = cleanABN(abn);

    // Validate ABN format
    if (!validateABNFormat(cleanAbn)) {
      return createApiResponse(false, null, 'Invalid ABN format. ABN must be 11 digits.', 400);
    }

    await connectDB();

    // Get platform settings for ABR configuration
    const platformSettings = await PlatformSettings.findOne().lean();
    const abrGuid = platformSettings?.abrGuid || null;
    const abrVerificationEnabled = platformSettings?.abrVerificationEnabled ?? false;

    // If ABR verification is disabled, skip lookup and mark as verified
    if (!abrVerificationEnabled) {
      const updatedUser = await User.findOneAndUpdate(
        { uid: user.uid },
        {
          $set: {
            abn: cleanAbn,
            abnVerified: true,
            abnStatus: ABNStatus.VERIFIED,
            abnBusinessName: null,
            abnGstRegistered: null,
            abnVerifiedAt: new Date(),
            abnState,
          },
        },
        { new: true }
      ).lean();

      // Send notification email (async, don't block)
      try {
        await sendABNVerified(user.email, `${user.firstName} ${user.lastName}`, null);
      } catch {
        // Email failures are not critical
      }

      return createApiResponse(
        true,
        {
          abn: cleanAbn,
          abnVerified: true,
          abnStatus: ABNStatus.VERIFIED,
          abnBusinessName: null,
          abnGstRegistered: null,
          abnVerifiedAt: updatedUser?.abnVerifiedAt,
          abnState,
          warning: 'Live ABR verification is disabled. ABN marked as verified without government verification.',
        },
        'ABN verified (verification disabled).',
        200
      );
    }

    // If ABR verification is enabled but no GUID configured
    if (!abrGuid) {
      return createApiResponse(
        false,
        null,
        'ABR verification is enabled but no GUID is configured. Please contact support.',
        500
      );
    }

    // Call ABR API to verify ABN
    const verificationResult = await verifyABN(cleanAbn, abrGuid);

    // Handle ABR service unavailable
    if (verificationResult.error === 'ABR service unavailable') {
      // Save as pending verification
      const updatedUser = await User.findOneAndUpdate(
        { uid: user.uid },
        {
          $set: {
            abn: cleanAbn,
            abnVerified: false,
            abnStatus: ABNStatus.PENDING_VERIFICATION,
            abnBusinessName: null,
            abnGstRegistered: null,
            abnVerifiedAt: null,
            abnState,
          },
        },
        { new: true }
      ).lean();

      return createApiResponse(
        true,
        {
          abn: cleanAbn,
          abnVerified: false,
          abnStatus: ABNStatus.PENDING_VERIFICATION,
          abnState,
          message: 'ABR service is temporarily unavailable. Your ABN has been saved and will be verified shortly.',
        },
        'ABN saved for pending verification.',
        200
      );
    }

    // Check if ABN is inactive or cancelled
    if (!verificationResult.isActive) {
      const status = verificationResult.abnStatus?.toLowerCase() || '';
      
      // Update user with invalid/cancelled status
      await User.findOneAndUpdate(
        { uid: user.uid },
        {
          $set: {
            abn: cleanAbn,
            abnVerified: false,
            abnStatus: status.includes('cancel') ? ABNStatus.CANCELLED : ABNStatus.INVALID,
            abnBusinessName: verificationResult.businessName,
            abnGstRegistered: verificationResult.gstRegistered,
            abnVerifiedAt: null,
            abnState,
          },
        }
      );

      // Send failure notification
      try {
        await sendABNVerificationFailed(
          user.email,
          `${user.firstName} ${user.lastName}`,
          status.includes('cancel') ? 'ABN has been cancelled' : 'ABN is not active'
        );
      } catch {
        // Email failures are not critical
      }

      return createApiResponse(
        false,
        null,
        'This ABN is no longer active. Please check your ABN status at abr.business.gov.au',
        400
      );
    }

    // Check if state matches
    if (verificationResult.state && verificationResult.state.toUpperCase() !== abnState.toUpperCase()) {
      return createApiResponse(
        false,
        null,
        `The ABN provided is registered in ${verificationResult.state}, but you selected ${abnState}. Please ensure your ABN and state match.`,
        400
      );
    }

    // ABN is valid and active - update user
    const updatedUser = await User.findOneAndUpdate(
      { uid: user.uid },
      {
        $set: {
          abn: cleanAbn,
          abnVerified: true,
          abnStatus: ABNStatus.VERIFIED,
          abnBusinessName: verificationResult.businessName,
          abnGstRegistered: verificationResult.gstRegistered,
          abnVerifiedAt: new Date(),
          abnState,
        },
      },
      { new: true }
    ).lean();

    // Send success notification
    try {
      await sendABNVerified(
        user.email,
        `${user.firstName} ${user.lastName}`,
        verificationResult.businessName || null
      );
    } catch {
      // Email failures are not critical
    }

    // Log verification attempt (optional, could be added to AdminActivity)
    console.log(`[ABN Verification] User ${user.uid} verified ABN ${cleanAbn}: ${verificationResult.businessName || 'Unknown Business'}`);

    return createApiResponse(
      true,
      {
        abn: cleanAbn,
        abnVerified: true,
        abnStatus: ABNStatus.VERIFIED,
        abnBusinessName: verificationResult.businessName,
        abnGstRegistered: verificationResult.gstRegistered,
        abnVerifiedAt: updatedUser?.abnVerifiedAt,
        abnState,
        entityType: verificationResult.entityType,
      },
      'ABN verified successfully.',
      200
    );

  } catch (error) {
    console.error('[ABN Verification] Error:', error);
    return createApiResponse(false, null, 'Failed to verify ABN. Please try again later.', 500);
  }
}
