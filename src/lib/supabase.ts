import { createClient } from '@supabase/supabase-js';

function sanitizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return 'https://ioslmxuqluwxojyzwbxn.supabase.co';
  let url = rawUrl.trim();
  // Remove trailing slashes
  url = url.replace(/\/+$/, '');
  // Remove /rest/v1 suffix if user pasted the REST endpoint URL
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/rest\/?$/i, '');
  return url;
}

// Default Supabase credentials provided by the user
export const SUPABASE_URL = sanitizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL || 'https://ioslmxuqluwxojyzwbxn.supabase.co'
);

export const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2xteHVxbHV3eG9qeXp3YnhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNzU3MjQsImV4cCI6MjEwMjc1MTcyNH0.7ITyAmAFClup-donJ3YBXgQq54XxZfl1RTGcVyfTfCU'
).trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.includes('supabase.co'));
};

/**
 * Upload an image file (File, Blob, or base64) to a Supabase storage bucket.
 * Returns the public URL if successful, or falls back to data URI.
 */
export async function uploadImageToSupabase(
  bucketName: string,
  filePath: string,
  fileOrBase64: File | Blob | string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    let uploadBody: Blob | File;
    let contentType = 'image/jpeg';

    if (typeof fileOrBase64 === 'string') {
      if (!fileOrBase64.startsWith('data:')) {
        // Already a normal web URL
        return fileOrBase64;
      }
      // Convert base64 data URL to Blob
      const parts = fileOrBase64.split(';base64,');
      contentType = parts[0].split(':')[1] || 'image/jpeg';
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      uploadBody = new Blob([uInt8Array], { type: contentType });
    } else {
      uploadBody = fileOrBase64;
      contentType = fileOrBase64.type || 'image/jpeg';
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uploadBody, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.warn(`[Supabase Storage] Failed to upload image to ${bucketName}/${filePath}:`, error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn('[Supabase Storage Error]', err);
    return null;
  }
}
