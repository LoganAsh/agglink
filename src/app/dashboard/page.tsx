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

  // 1. Get user profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, company_name')
    .eq('id', user.id)
    .single()

  // 2. Fetch live data for the dashboard
  const { count: pitsCount } = await supabase
    .from('facilities')
    .select('*', { count: 'exact', head: true })
    .in('type', ['pit', 'both'])

  const { count: dumpsCount } = await supabase
    .from('facilities')
    .select('*', { count: 'exact', head: true })
    .in('type', ['dump', 'both'])

  // Fetch 3 random/recent materials
  const { data: recentMaterials } = await supabase
    .from('materials')
    .select('name, price_per_ton, price_per_cy, is_import, facility:facilities(name)')
    .limit(3)

  if (error || !profile) {
    return <ContractorView />
  }

  if (profile.role === 'supplier') {
    return <SupplierView />
  }

  // Default to contractor
  return (
    <ContractorView 
      profileName={user.email?.split('@')[0]}
      companyName={profile.company_name}
      pitsCount={pitsCount || 0}
      dumpsCount={dumpsCount || 0}
      recentMaterials={(recentMaterials as any) || []}
    />
  )
}
