/**
 * Vercel Blob storage operations
 * Handles uploading and managing CSV files for Facebook catalog
 */

import { put, del, list } from '@vercel/blob';
import { StorageError } from '@/lib/utils/errors';
import { logInfo, logError } from '@/lib/utils/logger';

/**
 * Result of fetching the CSV from Blob storage
 */
export interface CSVFetchResult {
  /** The CSV content */
  content: string;
  /** The blob URL */
  url: string;
  /** When the blob was uploaded */
  uploadedAt: Date;
}

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
    // allowOverwrite: true to replace existing file, the behavior needed for a single updated catalog
    const blob = await put(filename, csvContent, {
      contentType: 'text/csv; charset=utf-8',
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 3600,
      allowOverwrite: true,
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

/**
 * Fetch the CSV content from Vercel Blob storage
 * Uses the list function to find the catalog file and then fetches its content
 *
 * @param filename - Optional filename (default: facebook-catalog.csv)
 * @returns CSV content, URL, and upload timestamp, or null if not found
 * @throws StorageError if the fetch fails (but not if file doesn't exist)
 *
 * @example
 * const result = await getCSV();
 * if (result) {
 *   console.log(result.content); // CSV content
 *   console.log(result.url); // https://xxx.public.blob.vercel-storage.com/facebook-catalog.csv
 * }
 */
export async function getCSV(
  filename: string = CATALOG_FILENAME
): Promise<CSVFetchResult | null> {
  logInfo('Fetching CSV from Blob storage', { filename });

  try {
    // List blobs to find the catalog file
    const { blobs } = await list({
      prefix: filename,
      limit: 1,
    });

    // Check if the file exists
    if (blobs.length === 0) {
      logInfo('CSV not found in Blob storage', { filename });
      return null;
    }

    const blob = blobs[0];

    // Verify we have an exact match (prefix might match partial names)
    if (blob.pathname !== filename) {
      logInfo('CSV not found in Blob storage (partial match only)', {
        filename,
        foundPathname: blob.pathname,
      });
      return null;
    }

    // Fetch the actual CSV content from the blob URL
    let response: Response;
    try {
      response = await fetch(blob.url);
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown network error';
      logError('Network error fetching blob content', {
        error: errorMessage,
        url: blob.url,
      });
      throw new StorageError(
        `Network error fetching blob content: ${errorMessage}`,
        'BLOB_NETWORK_ERROR',
        fetchError instanceof Error ? fetchError : undefined
      );
    }

    if (!response.ok) {
      throw new StorageError(
        `Failed to fetch blob content: ${response.status} ${response.statusText}`,
        'BLOB_FETCH_ERROR'
      );
    }

    const content = await response.text();

    logInfo('CSV fetched successfully', {
      url: blob.url,
      size: content.length,
      uploadedAt: blob.uploadedAt.toISOString(),
    });

    return {
      content,
      url: blob.url,
      uploadedAt: blob.uploadedAt,
    };
  } catch (error) {
    // Re-throw StorageErrors as-is (already properly formatted)
    if (error instanceof StorageError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Failed to fetch CSV from Blob storage', {
      error: errorMessage,
      filename,
    });

    throw new StorageError(
      `Failed to fetch CSV from Blob storage: ${errorMessage}`,
      'BLOB_FETCH_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}
