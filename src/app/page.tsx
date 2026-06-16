import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import LandingPage from './LandingPage';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If authenticated, redirect to their dashboard
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'admin') redirect('/admin');
    if (profile?.role === 'supplier') redirect('/supplier');
    if (profile?.role === 'trucking') redirect('/trucking');
    redirect('/dashboard');
  }

  return <LandingPage />;
}
