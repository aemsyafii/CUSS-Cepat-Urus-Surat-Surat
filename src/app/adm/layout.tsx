import { createServerSupabase, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import MobileAdminHeader from './MobileAdminHeader';
import { AdminDataProvider } from './AdminDataContext';
import ErrorBoundary from '@/components/ErrorBoundary';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Cek role dari metadata middleware — tapi verify ke DB juga
  const adminSupabase = createAdminClient();

  const { data: user } = await adminSupabase
    .from('Users')
    .select('id, username, nama, foto, role')
    .eq('auth_id', authUser.id)
    .single();

  if (!user || user.role !== 'admin') {
    const { data: warga } = await adminSupabase
      .from('Users')
      .select('id')
      .eq('auth_id', authUser.id)
      .eq('role', 'warga')
      .maybeSingle();

    if (warga) redirect('/cuss/pengajuan');
    redirect('/login');
  }

  return (
    <AdminDataProvider>
      <div className="flex h-screen bg-[#f8faf9] text-gray-800 font-sans">
        <AdminSidebar user={user} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MobileAdminHeader user={user} />
          <main className="flex-1 overflow-auto relative">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </AdminDataProvider>
  );
}
