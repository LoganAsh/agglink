export const dynamic = 'force-dynamic';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ContractorView from './ContractorView'
import SupplierView from './SupplierView'

export default async function DashboardPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, company_name')
    .eq('id', user.id)
    .single()

  // Redirect admins straight to the admin portal
  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  if (profile?.role === 'supplier') {
    redirect('/supplier')
  }

  const { count: pitsCount } = await supabase
    .from('facilities')
    .select('*', { count: 'exact', head: true })
    .in('type', ['pit', 'both'])

  const { count: dumpsCount } = await supabase
    .from('facilities')
    .select('*', { count: 'exact', head: true })
    .in('type', ['dump', 'both'])

  const { data: allMatsData } = await supabase
    .from('materials')
    .select('name, is_import')
    
  const importMaterials = allMatsData 
    ? Array.from(new Set(allMatsData.filter(m => m.is_import).map(m => m.name))).sort() 
    : []
    
  const exportMaterials = allMatsData
    ? Array.from(new Set(allMatsData.filter(m => !m.is_import).map(m => m.name))).sort()
    : []

  // Contractor's facility network + relationships
  const { data: networkData } = await supabase
    .from('contractor_facility_network')
    .select('facility_id, facility:facilities(id, name, type, latitude, longitude, owner_id, address)')
    .eq('contractor_id', user.id)

  const networkFacilities = networkData?.map((n: any) => n.facility).filter(Boolean) || []

  const { data: allFacilities } = await supabase
    .from('facilities')
    .select('id, name, type, latitude, longitude, owner_id, address')

  const { data: suppliers } = await supabase
    .from('profiles')
    .select('id, company_name')
    .eq('role', 'supplier')

  const { data: relationships } = await supabase
    .from('supplier_relationships')
    .select('*')
    .eq('contractor_id', user.id)

  if (error || !profile) {
    return <ContractorView />
  }

  if (profile.role === 'supplier') {
    const { data: myFacility } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(1)
      .single()

    let myMaterials = []
    const totalVolume = 2840
    let topMaterial = "UDOT Spec Road Base"
    
    if (myFacility) {
      const { data: mats } = await supabase
        .from('materials')
        .select('*')
        .eq('facility_id', myFacility.id)
      
      if (mats) {
        myMaterials = mats
        if (mats.length > 0) topMaterial = mats[0].name
      }
    }

    return (
      <SupplierView 
        profileName={myFacility?.name || "Your Pit"}
        companyName={profile.company_name}
        totalVolume={totalVolume}
        topMaterial={topMaterial}
        materials={(myMaterials as any)}
      />
    )
  }

  return (
    <ContractorView
      profileName={user.email?.split('@')[0]}
      companyName={profile.company_name}
      pitsCount={pitsCount || 0}
      dumpsCount={dumpsCount || 0}
      importMaterials={importMaterials}
      exportMaterials={exportMaterials}
      profileId={user.id}
      networkFacilities={networkFacilities}
      allFacilities={allFacilities || []}
      suppliers={suppliers || []}
      relationships={relationships || []}
    />
  )
}
