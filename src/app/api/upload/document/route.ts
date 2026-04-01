import { NextRequest } from 'next/server';
import { verifyAndGetUser, createApiResponse } from '@/lib/serverAuth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User.model';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Valid document types and their corresponding DB fields
const DOCUMENT_FIELD_MAP: Record<string, string> = {
  license: 'licenseDocument',
  id: 'idDocument',
  companyLicense: 'companyLicenseDocument',
  firstAid: 'firstAidCertificate',
  whiteCard: 'constructionWhiteCard',
  childrenCheck: 'workingWithChildrenCheck',
  victorianBusinessLicence: 'victorianBusinessLicence',
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/upload/document
 * Uploads a document file (PDF, image) and saves it to public/uploads/documents/.
 * Updates the corresponding user field in MongoDB.
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await verifyAndGetUser(request);
    if (!authContext) {
      return createApiResponse(false, null, 'Unauthorized request.', 401);
    }

    const { user } = authContext;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const docType = formData.get('type') as string | null;

    // Validate inputs
    if (!file || !docType) {
      return createApiResponse(false, null, 'File and document type are required.', 400);
    }

    const dbField = DOCUMENT_FIELD_MAP[docType];
    if (!dbField) {
      return createApiResponse(false, null, `Invalid document type: ${docType}. Must be one of: ${Object.keys(DOCUMENT_FIELD_MAP).join(', ')}`, 400);
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return createApiResponse(false, null, 'Invalid file type. Allowed: PDF, PNG, JPG, JPEG, WEBP.', 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return createApiResponse(false, null, 'File size exceeds 10MB limit.', 400);
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename: uid_timestamp_originalname
    const ext = path.extname(file.name) || '.pdf';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${user.uid}_${Date.now()}_${safeName}`;
    const filePath = path.join(uploadsDir, uniqueName);

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Build URL path (served by Next.js from public/)
    const url = `/uploads/documents/${uniqueName}`;

    // Update user's document field in MongoDB
    await connectDB();

    const updateData: Record<string, any> = {
      [dbField]: url,
      updatedAt: new Date().toISOString(),
    };

    // When a document is uploaded, set the corresponding status to PENDING_REVIEW / PENDING
    if (docType === 'license') {
      updateData.licenseStatus = 'PENDING_REVIEW';
    } else if (docType === 'companyLicense') {
      updateData.companyLicenseStatus = 'PENDING_REVIEW';
    } else if (docType === 'id') {
      updateData.idVerificationStatus = 'PENDING';
    } else if (docType === 'firstAid') {
      updateData.firstAidCertificateStatus = 'PENDING_REVIEW';
    } else if (docType === 'whiteCard') {
      updateData.constructionWhiteCardStatus = 'PENDING_REVIEW';
    } else if (docType === 'childrenCheck') {
      updateData.workingWithChildrenCheckStatus = 'PENDING_REVIEW';
    } else if (docType === 'victorianBusinessLicence') {
      updateData.victorianBusinessLicenceStatus = 'PENDING_REVIEW';
    }

    await User.findOneAndUpdate(
      { uid: user.uid },
      { $set: updateData },
      { new: true }
    );

    return createApiResponse(true, { url, field: dbField }, 'Document uploaded successfully.', 200);
  } catch (error: any) {
    console.error('POST /api/upload/document Error:', error);
    return createApiResponse(false, null, 'Failed to upload document.', 500);
  }
}
