import { createAdminClient, createRouteSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/username dan password wajib diisi.' }, { status: 400 });
    }

    // Admin client hanya untuk lookup data — tidak set cookie
    const adminSupabase = createAdminClient();

    // Cari user berdasarkan email, username, atau NIK
    const { data: user } = await adminSupabase
      .from('Users')
      .select('id, nik, nama, role, username, email, auth_id, status')
      .or(`email.eq.${identifier},username.eq.${identifier},nik.eq.${identifier}`)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
    }

    if (user.status === 'Nonaktif') {
      return NextResponse.json({ error: 'Akun Anda dinonaktifkan. Hubungi admin.' }, { status: 403 });
    }

    // Bangun email Supabase Auth:
    // Admin  → admin_USERNAME@cuss.internal
    // Warga  → NIK@cuss.internal
    const authEmail = user.role === 'admin'
      ? `admin_${user.username}@cuss.internal`
      : `${user.nik}@cuss.internal`;

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

    return NextResponse.json({
      role: user.role,
      redirectUrl: user.role === 'admin' ? '/adm/dashboard' : '/cuss/pengajuan',
    });

  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    return NextResponse.json({ error: 'Terjadi kendala teknis.' }, { status: 500 });
  }
}
