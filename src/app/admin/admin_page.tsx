export const dynamic = 'force-dynamic';
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

  // ── Fetch all admin data server-side ──────────────────────────────────────

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, role, company_name, created_at');

  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, name, address, status, created_at, contractor_id');

  const { data: allEstimates } = await supabase
    .from('project_estimates')
    .select('id, project_id, facility_id, material_name, quantity, truck_fleet, base_price, freight_price, total_price, created_at');

  const { data: allQuotes } = await supabase
    .from('quote_requests')
    .select('id, contractor_id, facility_id, material_name, quantity, status, offered_price, created_at');

  const { data: allFacilities } = await supabase
    .from('facilities')
    .select('id, name, type, created_at');

  const { data: allMaterials } = await supabase
    .from('materials')
    .select('id, facility_id, name, price_per_ton, is_import');

  return (
    <AdminView
      adminName={user.email?.split('@')[0] || 'Admin'}
      profiles={allProfiles || []}
      projects={allProjects || []}
      estimates={allEstimates || []}
      quotes={allQuotes || []}
      facilities={allFacilities || []}
      materials={allMaterials || []}
    />
  );
}
