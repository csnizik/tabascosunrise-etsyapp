/**
 * Vercel Blob storage operations
 * Handles uploading and managing CSV files for Facebook catalog
 */

import { put, del } from '@vercel/blob';
import { StorageError } from '@/lib/utils/errors';
import { logInfo, logError } from '@/lib/utils/logger';

/**
 * Default filename for the Facebook catalog CSV
 */
const CATALOG_FILENAME = 'facebook-catalog.csv';

/**
 * Upload CSV content to Vercel Blob storage
 * Replaces any existing file with the same name
 *
 * @param csvContent - The CSV string content to upload
 * @param filename - Optional filename (default: facebook-catalog.csv)
 * @returns The public URL of the uploaded file
 * @throws StorageError if the upload fails
 *
 * @example
 * const url = await uploadCSV(csvContent);
 * // Returns: https://xxx.public.blob.vercel-storage.com/facebook-catalog.csv
 */
export async function uploadCSV(
  csvContent: string,
  filename: string = CATALOG_FILENAME
): Promise<string> {
  if (!csvContent || typeof csvContent !== 'string') {
    throw new StorageError('CSV content must be a non-empty string', 'INVALID_CSV_CONTENT');
  }

  logInfo('Uploading CSV to Blob storage', { filename, contentLength: csvContent.length });

  try {
    // Upload to Blob storage with public access
    // Using 'addRandomSuffix: false' to keep a consistent URL
    const blob = await put(filename, csvContent, {
      contentType: 'text/csv; charset=utf-8',
      access: 'public',
      addRandomSuffix: false,
    });

    logInfo('CSV uploaded successfully', {
      url: blob.url,
      size: csvContent.length,
    });

    return blob.url;
  } catch (error) {
    logError('Failed to upload CSV to Blob storage', {
      error: error instanceof Error ? error.message : 'Unknown error',
      filename,
    });

    throw new StorageError(
      `Failed to upload CSV to Blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BLOB_UPLOAD_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Delete a file from Vercel Blob storage
 *
 * @param url - The URL of the blob to delete
 * @throws StorageError if the deletion fails
 *
 * @example
 * await deleteBlob('https://xxx.public.blob.vercel-storage.com/facebook-catalog.csv');
 */
export async function deleteBlob(url: string): Promise<void> {
  if (!url || typeof url !== 'string') {
    throw new StorageError('Blob URL must be a non-empty string', 'INVALID_BLOB_URL');
  }

  logInfo('Deleting blob from storage', { url });

  try {
    await del(url);
    logInfo('Blob deleted successfully', { url });
  } catch (error) {
    logError('Failed to delete blob from storage', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url,
    });

    throw new StorageError(
      `Failed to delete blob: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BLOB_DELETE_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}
