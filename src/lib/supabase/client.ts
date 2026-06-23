import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — uses Supabase Auth session cookies
export const createBrowserSupabase = () => {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
};
