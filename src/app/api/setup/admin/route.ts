import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results: Record<string, any> = {};

  try {
    await setupUser({
      supabase,
      authEmail: 'admin_kepaladesa@cuss.internal',
      password: 'admin123',
      usersFilter: { column: 'username', value: 'kepaladesa' },
      usersInsert: {
        nik: '0000000000000000',
        nama: 'Pak Kades',
        role: 'admin',
        username: 'kepaladesa',
        tanggal_lahir: '1990-01-01',
      },
      results,
      key: 'admin',
    });

    await setupUser({
      supabase,
      authEmail: '1234567890123456@cuss.internal',
      password: 'warga123',
      usersFilter: { column: 'nik', value: '1234567890123456' },
      usersInsert: {
        nik: '1234567890123456',
        nama: 'Budi Santoso',
        role: 'warga',
        tanggal_lahir: '1990-01-01',
        nomor_telepon: '081234567890',
        alamat: 'Jl. Merdeka No. 1',
        rt: '001', rw: '001',
        jenis_kelamin: 'Laki-laki',
        agama: 'Islam',
        pekerjaan: 'Pedagang',
      },
      results,
      key: 'warga',
    });

    return NextResponse.json({
      success: true,
      message: 'Setup selesai! Coba login sekarang.',
      credentials: {
        admin: { login: 'kepaladesa', password: 'admin123' },
        warga: { login: '1234567890123456', password: 'warga123' },
      },
      details: results,
    });

  } catch (error: any) {
    console.error('[Setup] Error:', error);
    return NextResponse.json({ error: error.message, details: results }, { status: 500 });
  }
}

// ─── Helper ────────────────────────────────────────────────────────────────────

async function setupUser({
  supabase, authEmail, password, usersFilter, usersInsert, results, key,
}: {
  supabase: any;
  authEmail: string;
  password: string;
  usersFilter: { column: string; value: string };
  usersInsert: Record<string, any>;
  results: Record<string, any>;
  key: string;
}) {
  // 1. Cari existing row di tabel Users
  const { data: userRow } = await supabase
    .from('Users')
    .select('id, auth_id')
    .eq(usersFilter.column, usersFilter.value)
    .maybeSingle();

  const existingAuthId: string | null = userRow?.auth_id ?? null;

  // 2. Hapus auth user yang lama via SDK (ini akan cascade delete row di Users juga)
  if (existingAuthId) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(existingAuthId);
    results[`${key}_auth_delete`] = delErr ? `skip (${delErr.message})` : 'deleted';
  }

  // Hapus semua auth user dengan email ini (jaga-jaga ada duplikat)
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) console.error('List users error:', listError);
  const allUsers = listData?.users || [];
  const dupes = allUsers.filter((u: any) => u.email === authEmail);
  for (const dupe of dupes) {
    if (dupe.id !== existingAuthId) {
      await supabase.auth.admin.deleteUser(dupe.id);
    }
  }

  // Hapus sisa row di Users jika masih ada untuk menghindari konflik NIK/Username
  await supabase
    .from('Users')
    .delete()
    .eq(usersFilter.column, usersFilter.value);

  // 3. Buat auth user baru via SDK
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { ...usersInsert },
  });

  if (createErr) throw new Error(`Buat auth ${key} gagal: ${createErr.message}`);

  const newAuthId = created.user.id;
  results[`${key}_auth`] = `created (id: ${newAuthId})`;

  // 4. Insert row baru di Users dengan auth_id baru
  const { error: insertErr } = await supabase
    .from('Users')
    .insert({ auth_id: newAuthId, ...usersInsert } as any);
    
  if (insertErr) throw new Error(`Insert ${key} ke Users gagal: ${insertErr.message}`);
  results[`${key}_users`] = 'inserted';
}
