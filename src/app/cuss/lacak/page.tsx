import { createServerSupabase, createAdminClient } from '@/lib/supabase/server';
import ClientLacak from './ClientLacak';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabase = await createServerSupabase();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const adminSupabase = createAdminClient();

  const { data: user } = await adminSupabase
    .from('Users')
    .select('id, nik, nama, role')
    .eq('auth_id', authUser.id)
    .single();

  if (!user || user.role !== 'warga') {
    redirect('/login');
  }

  const { data: listSurat, error } = await adminSupabase
    .from('Surat')
    .select('id, no_pengajuan, jenis_surat, status, keperluan, response_admin, subjek, created_at, dokumen_lampiran, is_mewakili, nama_subjek, tanggal_diproses, tanggal_ditolak, tanggal_disetujui')
    .eq('pemohon_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Gagal load surat:', error);
  }

  return <ClientLacak listSurat={listSurat || []} user={user} />;
}
