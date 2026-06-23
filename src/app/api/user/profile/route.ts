import { createAdminClient, createRouteSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createRouteSupabase();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: user, error } = await adminSupabase
      .from('Users')
      .select('id, nik, email, nama, role, username, tanggal_lahir, jenis_kelamin, alamat, rt, rw, agama, pekerjaan, nomor_telepon, foto, titik_maps, status')
      .eq('auth_id', authUser.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ data: { ...user, hasPassword: true } });
  } catch (error: any) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data profil.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const body = await req.json();

    // Verifikasi role dari database untuk pengubahan nama
    const { data: dbUser } = await adminSupabase
      .from('Users')
      .select('role')
      .eq('auth_id', authUser.id)
      .single();

    const isUserAdmin = dbUser?.role === 'admin';

    // Validasi email wajib
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Email wajib diisi dan valid.' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      email: body.email,
      foto: body.foto ?? null,  // null diizinkan (hapus foto)
    };

    // Field-field yang hanya di-update jika ada nilainya (mencegah CHECK constraint violation)
    if (body.alamat)       updatePayload.alamat        = body.alamat;
    if (body.rt)           updatePayload.rt            = body.rt;
    if (body.rw)           updatePayload.rw            = body.rw;
    if (body.whatsapp)     updatePayload.nomor_telepon = body.whatsapp;
    if (body.titikMaps)    updatePayload.titik_maps    = body.titikMaps;
    if (body.jenis_kelamin) updatePayload.jenis_kelamin = body.jenis_kelamin;
    if (body.pekerjaan)    updatePayload.pekerjaan     = body.pekerjaan;
    if (body.agama)        updatePayload.agama         = body.agama;


    // Nama — hanya admin yang diizinkan mengubahnya
    if ('nama' in body && body.nama) {
      if (!isUserAdmin) {
        return NextResponse.json({ error: 'Hanya administrator yang dapat mengubah nama.' }, { status: 403 });
      }
      updatePayload.nama = body.nama;
    }


    // Username opsional — hanya update jika dikirim di body
    if ('username' in body) {
      const newUsername = body.username || null;
      updatePayload.username = newUsername;

      // Validasi unique: cek apakah username sudah dipakai user lain
      if (newUsername) {
        const { data: existing } = await adminSupabase
          .from('Users')
          .select('id')
          .eq('username', newUsername)
          .neq('auth_id', authUser.id)
          .maybeSingle();

        if (existing) {
          return NextResponse.json(
            { error: `Username "${newUsername}" sudah digunakan. Pilih username lain.` },
            { status: 400 }
          );
        }
      }
    }

    // Update password via Supabase Auth jika diisi
    if (body.password && body.password !== '') {
      const { error: pwdError } = await supabase.auth.updateUser({ password: body.password });
      if (pwdError) console.error('Password update error:', pwdError);
    }


    const { data, error } = await adminSupabase
      .from('Users')
      .update(updatePayload as any)
      .eq('auth_id', authUser.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Profile POST error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui profil.' }, { status: 500 });
  }
}
