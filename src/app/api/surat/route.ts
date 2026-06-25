import { createAdminClient, createRouteSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { buildFilePath } from '@/lib/storage/path';

function generateNoPengajuan(): string {
  const date = new Date();
  const tzOffset = (date.getTimezoneOffset() + 420) * 60000;
  const localDate = new Date(date.getTime() + tzOffset);
  const dateStr = localDate.toISOString().slice(2, 10).replace(/-/g, '');
  const mapLetter = (digit: string) => {
    const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G', '8': 'H', '9': 'I', '0': 'J' };
    return map[digit] || digit;
  };
  const prefix = mapLetter(dateStr[0]) + dateStr[1] + mapLetter(dateStr[2]) + dateStr[3] + mapLetter(dateStr[4]) + dateStr[5];
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
}

export async function POST(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Tidak ada sesi valid.' }, { status: 401 });
    }

    const { id, jenisSurat, keperluan, isMewakili, subjek, dokumenLampiran } = await req.json();
    const adminSupabase = createAdminClient();

    const { data: user } = await adminSupabase
      .from('Users')
      .select('id, nik, nama, alamat, rt, rw, jenis_kelamin, role')
      .eq('auth_id', authUser.id)
      .single();

    if (!user || user.role !== 'warga') {
      return NextResponse.json({ error: 'Data warga tidak ditemukan.' }, { status: 404 });
    }

    const noPengajuan = generateNoPengajuan();

    const finalSubjek = isMewakili && subjek ? subjek : {
      nama: user.nama,
      nik: user.nik,
      alamat: user.alamat,
      rt: user.rt,
      rw: user.rw,
      hubungan: 'Diri Sendiri',
      jenis_kelamin: user.jenis_kelamin,
    };

    const { data: newSurat, error } = await adminSupabase
      .from('Surat')
      .insert([{
        id: id || undefined,
        no_pengajuan: noPengajuan,
        pemohon_id: user.id,
        jenis_surat: jenisSurat,
        keperluan: keperluan,
        subjek: finalSubjek,
        is_mewakili: !!isMewakili,
        nama_subjek: isMewakili && subjek ? subjek.nama : null,
        nik_subjek: isMewakili && subjek ? subjek.nik : null,
        hubungan_subjek: isMewakili && subjek ? subjek.hubungan : null,
        jenis_kelamin_subjek: isMewakili && subjek ? subjek.jenis_kelamin : null,
        alamat_subjek: isMewakili && subjek ? subjek.alamat : null,
        rt_subjek: isMewakili && subjek ? subjek.rt : null,
        rw_subjek: isMewakili && subjek ? subjek.rw : null,
        status: 'Masuk',
        dokumen_lampiran: dokumenLampiran || [],
      }])
      .select('id, no_pengajuan')
      .single();

    if (error) {
      console.error('Save Surat error:', error);
      return NextResponse.json({ error: 'Gagal mengirim pengajuan.' }, { status: 500 });
    }

    // Insert RiwayatStatus
    await adminSupabase.from('RiwayatStatus').insert([{
      surat_id: newSurat.id,
      status: 'Masuk',
      dibuat_oleh: user.id,
    }]);

    return NextResponse.json({ success: true, pengajuanId: newSurat.id });
  } catch (error: any) {
    console.error('Pengajuan Surat error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createRouteSupabase();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Tidak ada sesi valid.' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data: user } = await adminSupabase
      .from('Users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Data tidak ditemukan.' }, { status: 404 });
    }

    const { data: listSurat, error } = await adminSupabase
      .from('Surat')
      .select('id, no_pengajuan, jenis_surat, status, keperluan, subjek, created_at, is_mewakili, nama_subjek, tanggal_diproses, tanggal_ditolak, tanggal_disetujui, response_admin')
      .eq('pemohon_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 });
    }

    return NextResponse.json({ data: listSurat });
  } catch (error: any) {
    console.error('Get Surat error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
