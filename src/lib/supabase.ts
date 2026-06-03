import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  // Surfaces a clear message during local dev if .env is missing.
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — see .env.example');
}

export const supabase = createClient(url, key);

export function photoUrl(path: string): string {
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

export function brandUrl(path: string): string {
  return supabase.storage.from('brand').getPublicUrl(path).data.publicUrl;
}
