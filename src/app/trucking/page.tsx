export const dynamic = 'force-dynamic';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import TruckingView from './TruckingView';

export default async function TruckingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'trucking') redirect('/dashboard');

  // Truck types from the existing truck_types table
  const { data: truckTypes } = await supabase
    .from('truck_types')
    .select('*')
    .eq('active', true)
    .order('name');

  // This trucker's existing rates
  const { data: rates } = await supabase
    .from('trucking_company_rates')
    .select('*')
    .eq('trucker_id', user.id);

  // Contractors who have this trucker in their network
  const { data: networkLinks } = await supabase
    .from('contractor_trucking_network')
    .select('*, contractor:profiles!contractor_trucking_network_contractor_id_fkey(id, company_name)')
    .eq('trucker_id', user.id);

  // Job requests sent to this trucker
  const { data: jobRequests } = await supabase
    .from('trucker_job_requests')
    .select('*, contractor:profiles!trucker_job_requests_contractor_id_fkey(company_name), pickup:facilities(name, address), project:projects(name, address)')
    .eq('trucker_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <TruckingView
      profileId={user.id}
      profile={profile}
      truckTypes={truckTypes || []}
      rates={rates || []}
      networkLinks={networkLinks || []}
      jobRequests={jobRequests || []}
    />
  );
}
