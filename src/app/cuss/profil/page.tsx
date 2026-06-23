import { createServerSupabase, createAdminClient } from '@/lib/supabase/server';
import ClientProfil from '@/components/profil/ClientProfil';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabase = await createServerSupabase();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const adminSupabase = createAdminClient();

  const { data: userRaw } = await adminSupabase
    .from('Users')
    .select('*')
    .eq('auth_id', authUser.id)
    .single();

  if (!userRaw) {
    redirect('/login');
  }

  return <ClientProfil user={userRaw} />;
}
