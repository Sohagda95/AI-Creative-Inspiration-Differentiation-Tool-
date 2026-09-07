import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdmin(){
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer Supabase's newer server-side secret key. Keep the legacy service-role
  // variable as a compatibility fallback for existing deployments.
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key) throw new Error('Supabase server secret configuration is missing.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
