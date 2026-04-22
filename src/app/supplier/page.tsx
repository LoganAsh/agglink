import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import SupplierView from './SupplierView';

export const dynamic = 'force-dynamic';

export default async function SupplierPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'supplier') redirect('/dashboard');

  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, name, type')
    .eq('owner_id', user.id);

  const facilityIds = facilities?.map(f => f.id) || [];

  const { data: materials } = await supabase
    .from('materials')
    .select('id, name, price_per_ton, price_per_cy, is_import, stock_status, facility_id')
    .in('facility_id', facilityIds.length > 0 ? facilityIds : ['none'])
    .order('name');

  return (
    <SupplierView
      profile={profile}
      facilities={facilities || []}
      materials={materials || []}
    />
  );
}
