import { createServerSupabase, createAdminClient } from '@/lib/supabase/server';
import ClientLayout from './ClientLayout';
import { redirect } from 'next/navigation';
import { TrackingProvider } from './trackingContext';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const adminSupabase = createAdminClient();
  const { data: user } = await adminSupabase
    .from('Users')
    .select('id, nik, nama, foto, status, role')
    .eq('auth_id', authUser.id)
    .single();

  if (!user || user.role !== 'warga') {
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <TrackingProvider>
      <ClientLayout user={user}>{children}</ClientLayout>
    </TrackingProvider>
  );
}
