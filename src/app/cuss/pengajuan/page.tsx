import ClientForm from './ClientForm';
import { redirect } from 'next/navigation';
import { createServerSupabase, createAdminClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createServerSupabase();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const adminSupabase = createAdminClient();

  const { data: user } = await adminSupabase
    .from('Users')
    .select('*')
    .eq('auth_id', authUser.id)
    .single();

  if (!user || user.role !== 'warga') {
    await supabase.auth.signOut();
    redirect('/login');
  }

  return <ClientForm user={user} />;
}
