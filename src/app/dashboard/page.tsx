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

  if (error || !profile) {
    // Fallback if no profile is found
    return <ContractorView />
  }

  if (profile.role === 'supplier') {
    return <SupplierView />
  }

  // Default to contractor
  return <ContractorView />
}
