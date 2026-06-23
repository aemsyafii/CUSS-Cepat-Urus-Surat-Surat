import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const url = request.nextUrl.clone();

  const isCussRoute = url.pathname.startsWith('/cuss');
  const isAdmRoute = url.pathname.startsWith('/adm');
  const isLoginRoute = url.pathname === '/login' || url.pathname === '/';

  if (!user) {
    if (isCussRoute || isAdmRoute) {
      url.pathname = '/login';
      const response = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value));
      return response;
    }
    return supabaseResponse;
  }

  // Baca role dari JWT metadata — 0 query ke database
  const role = user.user_metadata?.role as string | undefined;

  if (isAdmRoute && role !== 'admin') {
    if (role === 'warga') {
      url.pathname = '/cuss/pengajuan';
      const response = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value));
      return response;
    }
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value));
    return response;
  }

  if (isCussRoute && role !== 'warga') {
    if (role === 'admin') {
      url.pathname = '/adm/dashboard';
      const response = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value));
      return response;
    }
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value));
    return response;
  }

  if (isLoginRoute) {
    if (role === 'admin') {
      url.pathname = '/adm/dashboard';
    } else if (role === 'warga') {
      url.pathname = '/cuss/pengajuan';
    } else {
      return supabaseResponse;
    }
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value));
    return response;
  }

  return supabaseResponse;
}
