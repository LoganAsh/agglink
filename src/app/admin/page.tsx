export const dynamic = 'force-dynamic';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminView from './AdminView';

export default async function AdminPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  const [
    { data: allProfiles },
    { data: allProjects },
    { data: allEstimates },
    { data: allQuotes },
    { data: allFacilities },
    { data: allMaterials },
    { data: allRequests },
  ] = await Promise.all([
    supabase.from('profiles').select('id, role, company_name, created_at'),
    supabase.from('projects').select('id, name, address, status, created_at, contractor_id'),
    supabase.from('project_estimates').select('id, project_id, facility_id, material_name, quantity, truck_fleet, base_price, freight_price, total_price, created_at'),
    supabase.from('quote_requests').select('id, contractor_id, facility_id, material_name, quantity, status, offered_price, created_at'),
    supabase.from('facilities').select('id, name, type, created_at'),
    supabase.from('materials').select('id, facility_id, name, price_per_ton, is_import'),
    supabase.from('signup_requests').select('*').order('created_at', { ascending: false }),
  ]);

  return (
    <AdminView
      adminName={user.email?.split('@')[0] || 'Admin'}
      profiles={allProfiles || []}
      projects={allProjects || []}
      estimates={allEstimates || []}
      quotes={allQuotes || []}
      facilities={allFacilities || []}
      materials={allMaterials || []}
      signupRequests={allRequests || []}
    />
  );
}
