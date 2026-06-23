import { createServerSupabase, createAdminClient } from '@/lib/supabase/server';
import ClientProfil from '@/components/profil/ClientProfil';
import { redirect } from 'next/navigation';

export default async function AdminProfilePage() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      redirect('/login');
    }

    const adminSupabase = createAdminClient();

    const { data: user, error } = await adminSupabase
      .from('Users')
      .select('*')
      .eq('auth_id', authUser.id)
      .single();

    if (!user || error) {
      return (
        <div className="p-10 text-center">
          <h1 className="text-xl font-bold text-red-600">Terjadi Kesalahan</h1>
          <p className="text-gray-600 mt-2">Data profil tidak ditemukan.</p>
          <a href="/adm/dashboard" className="inline-block mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg">Kembali ke Dashboard</a>
        </div>
      );
    }

    return (
      <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto animate-in fade-in duration-500">
        <div className="max-w-[600px] mx-auto">
          <ClientProfil user={user} title="Informasi Administrator" isAdmin={true} />
        </div>
      </div>
    );
  } catch (err: any) {
    console.error('AdminProfilePage error:', err);
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-bold text-red-600">Terjadi Kesalahan Sistem</h1>
        <p className="text-gray-600 mt-2">{err.message}</p>
        <a href="/adm/dashboard" className="inline-block mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg">Kembali ke Dashboard</a>
      </div>
    );
  }
}
