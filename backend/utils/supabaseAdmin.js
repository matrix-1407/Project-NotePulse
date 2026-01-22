import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    'Missing Supabase environment variables. Backend persistence will not work until configured.'
  );
}

// Admin client using service role key (for backend use only)
export const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceRoleKey || ''
);
