import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// 1. Service Role client — bypass RLS (admin-only operations)
export const createAdminClient = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

// 2. Cookie-based client — digunakan di Server Components DAN Route Handlers
//    (keduanya identik, cukup satu fungsi)
export const createSupabaseClient = async () => {
  const cookieStore = await cookies();
  return createSSRServerClient<Database>(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
};

// Alias untuk kompatibilitas kode yang sudah ada
/** @deprecated Gunakan createSupabaseClient() */
export const createServerSupabase = createSupabaseClient;
/** @deprecated Gunakan createSupabaseClient() */
export const createRouteSupabase = createSupabaseClient;
