export const dynamic = 'force-dynamic';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import SupplierView from './SupplierView';

export default async function SupplierPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_name, auto_decline_message')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'supplier') redirect('/dashboard');

  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, name, type, accepts_quote_requests')
    .eq('owner_id', user.id)
    .order('name');

  const facilityIds = facilities?.map((f: any) => f.id) || [];

  const { data: materials } = await supabase
    .from('materials')
    .select('id, name, price_per_ton, price_per_ton_contractor, price_per_ton_customer, price_per_cy, price_per_cy_contractor, price_per_cy_customer, price_10w_load, price_sd_load, is_import, stock_status, auto_decline_below, facility_id')
    .in('facility_id', facilityIds.length > 0 ? facilityIds : ['none'])
    .order('name');

  const { data: contractors } = await supabase
    .from('profiles')
    .select('id, company_name')
    .eq('role', 'contractor')
    .order('company_name');

  const { data: relationships } = await supabase
    .from('supplier_relationships')
    .select('*')
    .eq('supplier_id', user.id);

  const { data: tierRequests } = await supabase
    .from('tier_requests')
    .select('*, contractor:profiles!tier_requests_contractor_id_fkey(company_name)')
    .eq('supplier_id', user.id)
    .order('created_at', { ascending: false });

  // All unique material names for the add material dropdown
  const { data: allMatsRaw } = await supabase
    .from('materials')
    .select('name')
    .order('name');

  const allMaterialNames: string[] = allMatsRaw
    ? Array.from(new Set(allMatsRaw.map((m: any) => m.name))).sort() as string[]
    : [];

  return (
    <SupplierView
      profile={profile}
      profileId={user.id}
      facilities={facilities || []}
      materials={materials || []}
      allMaterialNames={allMaterialNames}
      contractors={contractors || []}
      relationships={relationships || []}
      tierRequests={tierRequests || []}
    />
  );
}
