// ===== Supabase Storage Service — Upload, Download & Delete Media =====
import { supabase, isSupabaseConfigured, getCurrentUser } from './supabaseClient';

/**
 * Upload a File object to a Supabase Storage bucket.
 * Files are stored under: {userId}/{timestamp}_{filename}
 *
 * @param {string} bucket - Bucket name (images, videos, audio, pdfs, files, voice-recordings)
 * @param {File|Blob} file - The file or blob to upload
 * @param {string} userId - The authenticated user's ID
 * @param {string} [customName] - Optional custom filename (defaults to file.name)
 * @returns {Promise<{path: string, url: string}>} The storage path and public URL
 */
export async function uploadFile(bucket, file, userId, customName = null) {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured');
  }

  const timestamp = Date.now();
  const safeName = (customName || file.name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100);
  const filePath = `${userId}/${timestamp}_${safeName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (error) {
    console.error(`Storage upload error (${bucket}):`, error);
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: urlData.publicUrl,
  };
}

/**
 * Upload a base64 data URI to Supabase Storage.
 * Converts base64 to a Blob before uploading.
 *
 * @param {string} bucket - Bucket name
 * @param {string} base64Data - The base64 data URI (e.g., "data:image/png;base64,...")
 * @param {string} fileName - Name for the uploaded file
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<{path: string, url: string}>}
 */
export async function uploadBase64(bucket, base64Data, fileName, userId) {
  const blob = base64ToBlob(base64Data);
  return uploadFile(bucket, blob, userId, fileName);
}

/**
 * Upload a recorded audio blob (from MediaRecorder) to Supabase Storage.
 *
 * @param {Blob} audioBlob - The audio blob from MediaRecorder
 * @param {string} userId - The authenticated user's ID
 * @param {string} [mimeType] - MIME type of the recording
 * @returns {Promise<{path: string, url: string}>}
 */
export async function uploadVoiceRecording(audioBlob, userId, mimeType = 'audio/webm') {
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
  const fileName = `voice_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
  const file = new File([audioBlob], fileName, { type: mimeType });
  return uploadFile('voice-recordings', file, userId, fileName);
}

/**
 * Delete a file from Supabase Storage.
 *
 * @param {string} bucket - Bucket name
 * @param {string} path - The storage path of the file
 */
export async function deleteFile(bucket, path) {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.error(`Storage delete error (${bucket}):`, error);
}

/**
 * Delete multiple files from a Supabase Storage bucket.
 *
 * @param {string} bucket - Bucket name
 * @param {string[]} paths - Array of storage paths
 */
export async function deleteFiles(bucket, paths) {
  if (!isSupabaseConfigured() || !supabase || paths.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) console.error(`Storage bulk delete error (${bucket}):`, error);
}

/**
 * Get the public URL for a stored file.
 *
 * @param {string} bucket - Bucket name
 * @param {string} path - The storage path
 * @returns {string} The public URL
 */
export function getPublicUrl(bucket, path) {
  if (!isSupabaseConfigured() || !supabase) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload multiple files to their appropriate Supabase Storage buckets.
 * Automatically determines the correct bucket based on file category.
 *
 * @param {Array<{file?: File, data?: string, name: string, category: string}>} files
 * @param {string} userId
 * @returns {Promise<Array<{name: string, url: string, path: string, size: number, category: string, mime_type: string}>>}
 */
export async function uploadMemoryFiles(files, userId) {
  if (!isSupabaseConfigured() || files.length === 0) return [];

  const bucketMap = {
    image: 'images',
    video: 'videos',
    audio: 'audio',
    pdf: 'pdfs',
    document: 'files',
    zip: 'files',
  };

  const results = [];

  for (const fileItem of files) {
    const bucket = bucketMap[fileItem.category] || 'files';
    try {
      let uploadResult;
      if (fileItem.file instanceof File || fileItem.file instanceof Blob) {
        uploadResult = await uploadFile(bucket, fileItem.file, userId, fileItem.name);
      } else if (fileItem.data && fileItem.data.startsWith('data:')) {
        uploadResult = await uploadBase64(bucket, fileItem.data, fileItem.name, userId);
      } else {
        continue; // Skip files we can't handle
      }

      results.push({
        name: fileItem.name,
        url: uploadResult.url,
        path: uploadResult.path,
        size: fileItem.size || 0,
        category: fileItem.category,
        mime_type: fileItem.type || fileItem.mime_type || '',
      });
    } catch (err) {
      console.error(`Failed to upload ${fileItem.name}:`, err);
    }
  }

  return results;
}

// ===== UTILITY =====

/**
 * Convert a base64 data URI to a Blob.
 */
function base64ToBlob(base64Data) {
  const [header, data] = base64Data.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}
