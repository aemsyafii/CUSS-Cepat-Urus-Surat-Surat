import { createRouteSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get('bucket');
    const path = searchParams.get('path');

    if (!bucket || !path) {
      return NextResponse.json({ error: 'bucket and path required' }, { status: 400 });
    }

    // Validasi bucket yang diizinkan
    if (!['dokumen_lampiran', 'arsip_surat', 'templates_surat'].includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
    }

    const { data, error } = await supabase.storage.from(bucket).download(path);

    if (error || !data) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const arrayBuffer = await data.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('File serve error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
