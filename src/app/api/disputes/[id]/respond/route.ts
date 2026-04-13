import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import connectDB from '@/lib/mongodb';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import Dispute from '@/models/Dispute.model';
import User from '@/models/User.model';
import { DisputeStatus, UserRole, UserStatus } from '@/types/enums';
import { sendDisputeResponseReceived, sendDisputeResponseNotification } from '@/lib/email/emailTriggers';
import { validateUploadedFiles } from '@/lib/utils/fileValidation';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAndGetUser(request);
    if (!authResult) {
      return createApiResponse(false, null, 'Unauthorized.', 401);
    }
    const { user } = authResult;

    const formData = await request.formData();
    const description = formData.get('description') as string;

    if (!description || description.length < 30) {
      return createApiResponse(false, null, 'Response description requires minimum 30 characters.', 400);
    }

    await connectDB();

    const dispute = await Dispute.findById(params.id);
    if (!dispute) return createApiResponse(false, null, 'Dispute not found.', 404);

    if (dispute.againstUid !== user.uid) {
      return createApiResponse(false, null, 'You are not authorized to respond to this dispute.', 403);
    }

    if (dispute.status !== DisputeStatus.OPEN) {
      return createApiResponse(false, null, 'Dispute is no longer open for responses.', 400);
    }

    if (dispute.respondedAt) {
      return createApiResponse(false, null, 'A response has already been submitted.', 400);
    }

    const responseEvidenceFiles: Array<{ fileUrl: string, fileName: string, fileType: string, uploadedAt: Date }> = [];
    const files = formData.getAll('evidence').filter(f => f && typeof f !== 'string') as File[];
    
    // Validate files: count, MIME type, extension whitelist, and size limit
    const fileValidation = validateUploadedFiles(files, 5);
    if (!fileValidation.valid) {
      return createApiResponse(false, null, fileValidation.error!, 400);
    }

    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'disputes');
      await mkdir(uploadDir, { recursive: true });

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Use only the validated extension from the original filename
        const ext = path.extname(file.name).toLowerCase();
        const uniqueFileName = `${uuidv4()}${ext}`;
        const filePath = path.join(uploadDir, uniqueFileName);
        
        await writeFile(filePath, buffer);
        
        responseEvidenceFiles.push({
          fileUrl: `/uploads/disputes/${uniqueFileName}`,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          uploadedAt: new Date()
        });
      }
    }

    dispute.respondedByUid = user.uid;
    dispute.respondedAt = new Date();
    dispute.responseDescription = description;
    dispute.responseEvidence = responseEvidenceFiles;
    dispute.status = DisputeStatus.UNDER_REVIEW;

    await dispute.save();

    // Notifications
    const raisedByUser = await User.findOne({ uid: dispute.raisedByUid }).lean();
    if (raisedByUser) {
      await sendDisputeResponseNotification(
        raisedByUser.email,
        `${raisedByUser.firstName} ${raisedByUser.lastName}`,
        `${user.firstName} ${user.lastName}`,
        dispute.jobTitle,
        dispute._id.toString()
      ).catch(console.error);
    }

    const admins = await User.find({ role: UserRole.ADMIN, status: UserStatus.ACTIVE }).select('email').lean();
    for (const admin of admins) {
      await sendDisputeResponseReceived(
        admin.email,
        `${user.firstName} ${user.lastName}`,
        dispute.jobTitle,
        dispute._id.toString()
      ).catch(console.error);
    }

    return createApiResponse(true, dispute.toObject(), 'Response submitted successfully.', 200);
  } catch (error: any) {
    console.error('POST /api/disputes/[id]/respond error:', error);
    return createApiResponse(false, null, error.message || 'Failed to submit response.', 500);
  }
}
