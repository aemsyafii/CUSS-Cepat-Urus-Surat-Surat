import { createAdminClient, createRouteSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { nik, nama, whatsapp, email, password } = await req.json();
    const supabase = createAdminClient();

    // Validasi input
    if (!nik || nik.length !== 16) {
      return NextResponse.json({ error: 'NIK harus 16 digit.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email tidak valid.' }, { status: 400 });
    }

    // Cek NIK sudah terdaftar
    const { data: existingUser } = await supabase
      .from('Users')
      .select('id')
      .eq('nik', nik)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'NIK sudah terdaftar!' }, { status: 400 });
    }

    // Buat auth user via Admin SDK (bukan signUp)
    // admin.createUser → set email_confirm:true langsung, tidak butuh verifikasi email
    const authEmail = `${nik}@cuss.internal`;
    const { data: created, error: authError } = await supabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'warga', nik, nama },
    });

    if (authError || !created.user) {
      console.error('[Register] Auth createUser error:', authError?.message);
      return NextResponse.json(
        { error: authError?.message || 'Gagal membuat akun autentikasi.' },
        { status: 500 }
      );
    }

    // Insert ke tabel Users
    const { error: dbError } = await supabase
      .from('Users')
      .insert([{
        auth_id: created.user.id,
        nik,
        nama,
        email,
        role: 'warga',
        nomor_telepon: whatsapp || null,
      }] as any);

    if (dbError) {
      // Rollback: hapus auth user yang baru dibuat
      await supabase.auth.admin.deleteUser(created.user.id);
      console.error('[Register] DB insert error:', dbError.message);
      return NextResponse.json({ error: 'Gagal menyimpan data pendaftaran.' }, { status: 500 });
    }

    // Auto-login setelah daftar — pakai SSR client agar session cookie tersimpan
    const routeSupabase = await createRouteSupabase();
    const { error: signInError } = await routeSupabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    if (signInError) {
      console.error('[Register] Auto-login error:', signInError.message);
      // Akun berhasil dibuat tapi auto-login gagal — arahkan ke halaman login manual
      return NextResponse.json({ success: true, redirectUrl: '/login' });
    }

    return NextResponse.json({ success: true, redirectUrl: '/cuss/pengajuan' });

  } catch (error: any) {
    console.error('[Register] Unexpected error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
