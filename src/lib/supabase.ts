import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — see .env.example');
}

// persistSession + autoRefreshToken keep photographers signed in on this device
// across visits, so they only sign in once.
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function photoUrl(path: string): string {
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

export function brandUrl(path: string): string {
  return supabase.storage.from('brand').getPublicUrl(path).data.publicUrl;
}
