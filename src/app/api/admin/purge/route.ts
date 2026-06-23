import { createAdminClient, createRouteSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cek role dari JWT metadata
    const role = authUser.user_metadata?.role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    let retention = 30;
    try {
      const body = await req.json();
      if (body.retention) retention = body.retention;
    } catch {}

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retention);

    let totalPurged = 0;

    const purgeBucket = async (bucketName: string) => {
      const { data: files } = await adminSupabase.storage.from(bucketName).list('');
      if (files) {
        const toRemove = files
          .filter(f => f.created_at && new Date(f.created_at) < cutoffDate)
          .map(f => f.name);
        if (toRemove.length > 0) {
          const { error: removeErr } = await adminSupabase.storage.from(bucketName).remove(toRemove);
          if (!removeErr) totalPurged += toRemove.length;
        }
      }
    };

    await purgeBucket('dokumen_lampiran');
    await purgeBucket('arsip_surat');

    return NextResponse.json({ success: true, purgedCount: totalPurged });
  } catch (error: any) {
    console.error('Purge error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
