"use client";

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button 
      onClick={handleLogout}
      className="mt-4 w-full px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md text-xs font-semibold hover:bg-red-500/20 transition-colors"
    >
      Sign Out
    </button>
  );
}
