import { createAdminClient, createRouteSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const routeSupabase = await createRouteSupabase();
    const { data: { user: authUser } } = await routeSupabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cek role admin dari metadata
    if (authUser.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const { wargaId } = await req.json();

    if (!wargaId) {
      return NextResponse.json({ error: 'wargaId required' }, { status: 400 });
    }

    const { data: warga } = await adminSupabase
      .from('Users')
      .select('auth_id')
      .eq('id', wargaId)
      .eq('role', 'warga')
      .single();

    if (!warga || !warga.auth_id) {
      return NextResponse.json({ error: 'Warga tidak ditemukan.' }, { status: 404 });
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const newPassword = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      warga.auth_id,
      { password: newPassword },
    );

    if (updateError) {
      return NextResponse.json({ error: 'Gagal mereset password' }, { status: 500 });
    }

    return NextResponse.json({ success: true, newPassword });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
