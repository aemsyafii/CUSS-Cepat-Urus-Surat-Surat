import { createAdminClient, createRouteSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    console.log(`[Auth] POST /api/auth called with identifier: "${identifier}"`);

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/username dan password wajib diisi.' }, { status: 400 });
    }

    // Admin client hanya untuk lookup data — tidak set cookie
    const adminSupabase = createAdminClient();

    // Cari user berdasarkan email atau username
    // Gunakan double quotes "" untuk mengurung identifier agar PostgREST tidak bingung dengan special characters seperti @ atau .
    const { data: user, error: queryError } = await adminSupabase
      .from('Users')
      .select('id, nik, nama, role, username, email, auth_id, status')
      .or(`email.eq."${identifier}",username.eq."${identifier}"`)
      .maybeSingle();

    if (queryError) {
      console.error('[Auth] Database query error:', queryError);
      return NextResponse.json({ error: 'Gagal memverifikasi akun ke database.' }, { status: 500 });
    }

    if (!user) {
      console.log(`[Auth] User not found in database for identifier: "${identifier}"`);
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
    }

    console.log(`[Auth] User found in database: "${user.nama}" (Role: ${user.role}, Username: ${user.username}, Email: ${user.email})`);

    if (user.status === 'Nonaktif') {
      console.log(`[Auth] Login rejected: Account is inactive for user "${user.nama}"`);
      return NextResponse.json({ error: 'Akun Anda dinonaktifkan. Hubungi admin.' }, { status: 403 });
    }

    // Bangun email Supabase Auth:
    // Admin  → admin_USERNAME@cuss.internal
    // Warga  → NIK@cuss.internal
    const authEmail = user.role === 'admin'
      ? `admin_${user.username}@cuss.internal`
      : `${user.nik}@cuss.internal`;

    console.log(`[Auth] Supabase Auth Email constructed: "${authEmail}"`);

    // ─── KRITIS: Gunakan createRouteSupabase (bukan admin client) ───
    // Hanya SSR client yang bisa set-cookie ke browser response.
    // Tanpa ini, session tidak tersimpan dan proxy selalu redirect ke /login.
    const routeSupabase = await createRouteSupabase();
    const { error: signInError } = await routeSupabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    if (signInError) {
      console.error('[Auth] signInWithPassword error:', signInError.message);
      return NextResponse.json({ error: 'Password salah!' }, { status: 401 });
    }

    console.log(`[Auth] Login successful for user: "${user.nama}"`);

    return NextResponse.json({
      role: user.role,
      redirectUrl: user.role === 'admin' ? '/adm/dashboard' : '/cuss/pengajuan',
    });

  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    return NextResponse.json({ error: 'Terjadi kendala teknis.' }, { status: 500 });
  }
}

