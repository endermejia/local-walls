import { SupabaseClient } from '@supabase/supabase-js';

export async function uploadRouteAscentPhoto(
  supabase: SupabaseClient,
  file: File,
  userId: string,
): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from('ascents')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading ascent photo:', error);
    throw error;
  }

  return filePath;
}
