/**
 * fileValidation.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared file upload validation for dispute evidence uploads.
 * Validates MIME type, file extension, and file size to prevent abuse.
 */

import path from 'path';

// Allowed image, document, and video types
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Videos
  'video/mp4',
  'video/quicktime',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx',
  '.mp4', '.mov',
]);

// 10 MB per file
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a single uploaded file for type, extension, and size.
 */
export function validateUploadedFile(file: File): FileValidationResult {
  // 1. Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds the maximum size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
    };
  }

  // 2. Check MIME type (client-reported, first layer of defense)
  const mimeType = file.type?.toLowerCase() || '';
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: `File "${file.name}" has an unsupported type (${mimeType}). Allowed: images, PDFs, Word docs, and MP4/MOV videos.`,
    };
  }

  // 3. Check file extension (second layer — prevents spoofed MIME with bad extension)
  const ext = path.extname(file.name).toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File "${file.name}" has an unsupported extension (${ext || 'none'}). Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}.`,
    };
  }

  return { valid: true };
}

/**
 * Validates an array of uploaded files.
 * Returns the first validation error found, or { valid: true } if all pass.
 */
export function validateUploadedFiles(files: File[], maxCount: number = 5): FileValidationResult {
  if (files.length > maxCount) {
    return {
      valid: false,
      error: `Maximum ${maxCount} evidence files allowed.`,
    };
  }

  for (const file of files) {
    if (!file || typeof file === 'string') continue;
    const result = validateUploadedFile(file);
    if (!result.valid) return result;
  }

  return { valid: true };
}
