import { createRouteSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createRouteSupabase();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const supabase = await createRouteSupabase();
  await supabase.auth.signOut();
  const url = new URL(req.url);
  return NextResponse.redirect(new URL('/login', url.origin));
}
