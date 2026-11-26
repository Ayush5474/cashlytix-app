/**
 * Supabase connection. The anon key is public by design (row-level security protects the data),
 * so it is safe to keep here. Leave both empty to run the app without cloud sync.
 * Values can also come from EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY at build time.
 */
const FALLBACK = {
  url: '',
  anonKey: '',
};

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK.url;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK.anonKey;
export const syncConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
