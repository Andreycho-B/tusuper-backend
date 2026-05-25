import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Allowed image MIME types for user-facing uploads.
 * Note: this is a first-line filter based on the client-provided mimetype.
 * The CloudinaryService performs an additional check before persisting.
 */
const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/**
 * Builds Multer options for image uploads with a size cap and MIME filter.
 * Without these, multer accepts unlimited file sizes and any content type,
 * exposing the backend to DoS via huge uploads and to malicious payloads.
 *
 * @param maxSizeBytes maximum file size accepted, in bytes
 */
export function imageUploadOptions(maxSizeBytes: number): MulterOptions {
  return {
    limits: {
      fileSize: maxSizeBytes,
      files: 1,
    },
    fileFilter: (_req, file, cb) => {
      if (
        (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)
      ) {
        cb(null, true);
        return;
      }
      cb(
        new BadRequestException(
          `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(
            ', ',
          )}`,
        ),
        false,
      );
    },
  };
}

export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const PRODUCT_IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
