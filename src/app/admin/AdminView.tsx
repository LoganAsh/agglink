/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import LogoutButton from '@/components/LogoutButton';

type Tab = 'overview' | 'users' | 'projects' | 'facilities' | 'materials' | 'quotes' | 'requests' | 'categories' | 'trucks';
type Role = 'contractor' | 'supplier' | 'admin';

function roleBadgeClasses(role: string, facilityType?: string) {
  if (role === 'admin')      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
  if (role === 'contractor') return 'bg-red-500/20 text-red-400 border border-red-500/30';
  if (role === 'supplier') {
    if (facilityType === 'dump') return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    if (facilityType === 'both') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
  }
  return 'bg-slate-600/50 text-slate-400';
}

function roleLabel(role: string, facilityType?: string) {
  if (role === 'admin')      return 'Admin';
  if (role === 'contractor') return 'Contractor';
  if (role === 'supplier') {
    if (facilityType === 'dump') return 'Supplier (Dump)';
    if (facilityType === 'both') return 'Supplier (Pit & Dump)';
    return 'Supplier (Pit)';
  }
  return role;
}

export default function AdminView({
  adminName,
  profiles: initialProfiles,
  projects,
  estimates,
  quotes,
  facilities: initialFacilities,
  materials,
  signupRequests: initialRequests,
  categories: initialCategories,
  categoryMap: initialCategoryMap,
  truckTypes: initialTruckTypes,
  allMaterialNames,
  suppliers,
}: {
  adminName: string;
  profiles: any[];
  projects: any[];
  estimates: any[];
  quotes: any[];
  facilities: any[];
  materials: any[];
  signupRequests: any[];
  categories: any[];
  categoryMap: any[];
  truckTypes: any[];
  allMaterialNames: string[];
  suppliers: any[];
}) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [profiles, setProfiles] = useState<any[]>(initialProfiles);
  const [facilities, setFacilities] = useState<any[]>(initialFacilities);
  const [assigningFacilityId, setAssigningFacilityId] = useState<string | null>(null);
  const [signupRequests, setSignupRequests] = useState<any[]>(initialRequests);
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [categoryMap, setCategoryMap] = useState<any[]>(initialCategoryMap);
  const [truckTypes, setTruckTypes] = useState<any[]>(initialTruckTypes);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  const assignFacility = async (facilityId: string, ownerId: string | null) => {
    setAssigningFacilityId(facilityId);
    const { error } = await supabase.from('facilities').update({ owner_id: ownerId }).eq('id', facilityId);
    if (!error) {
      setFacilities(prev => prev.map(f => f.id === facilityId ? { ...f, owner_id: ownerId } : f));
    } else alert('Failed to update facility owner');
    setAssigningFacilityId(null);
  };

  const [newFacName, setNewFacName] = useState('');
  const [newFacAddress, setNewFacAddress] = useState('');
  const [newFacType, setNewFacType] = useState<'pit'|'dump'|'both'>('pit');
  const [newFacLat, setNewFacLat] = useState('');
  const [newFacLon, setNewFacLon] = useState('');
  const [newFacOwner, setNewFacOwner] = useState('');
  const [savingFacility, setSavingFacility] = useState(false);

  const createFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFacility(true);
    const { data, error } = await supabase.from('facilities').insert([{
      name: newFacName.trim(),
      address: newFacAddress.trim(),
      type: newFacType,
      latitude: newFacLat ? parseFloat(newFacLat) : null,
      longitude: newFacLon ? parseFloat(newFacLon) : null,
      owner_id: newFacOwner || null,
    }]).select().single();
    if (data && !error) {
      setFacilities([...facilities, data]);
      setNewFacName(''); setNewFacAddress(''); setNewFacLat(''); setNewFacLon(''); setNewFacOwner('');
    } else alert('Failed to create facility: ' + error?.message);
    setSavingFacility(false);
  };

  // Category management state
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'import' | 'export'>('import');
  const [savingCat, setSavingCat] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [assigningMat, setAssigningMat] = useState(false);

  // Truck type management state
  const [newTruckName, setNewTruckName] = useState('');
  const [savingTruck, setSavingTruck] = useState(false);

  const pendingCount = signupRequests.filter(r => r.status === 'pending').length;

  const getFacilityType = (profileId: string) => facilities.find(f => f.owner_id === profileId)?.type;

  const handleRoleChange = async (profileId: string, newRole: Role) => {
    setSavingRoleId(profileId);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
    if (!error) setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
    else alert('Failed to update role: ' + error.message);
    setSavingRoleId(null);
    setEditingRoleId(null);
  };

  const handleRequest = async (req: any, action: 'approve' | 'reject') => {
    setProcessingId(req.id); setActionError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setActionError('Not authenticated'); setProcessingId(null); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setActionError('No active session'); setProcessingId(null); return; }
      console.log('Auth token present:', !!session?.access_token, 'token prefix:', session?.access_token?.substring(0, 20));
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/approve-signup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ requestId: req.id, email: req.email, fullName: req.full_name, companyName: req.company_name, role: req.requested_role, action }),
      });
      const rawBody = await res.text();
      let data: any = {};
      try { data = rawBody ? JSON.parse(rawBody) : {}; } catch { /* non-JSON body */ }
      console.log('approve-signup response:', res.status, res.statusText, 'body:', rawBody);
      if (!res.ok) {
        const msg = data.error || data.message || data.msg || data.details || rawBody || res.statusText || 'Unknown error';
        setActionError(`HTTP ${res.status}: ${msg}`);
      }
      else {
        setSignupRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() } : r));
        if (action === 'approve' && data.tempPassword) alert(`Account created for ${req.email}.\n\nA password reset email has been sent.\n\nTemp password (if needed): ${data.tempPassword}`);
      }
    } catch (e: any) { setActionError(e.message); }
    setProcessingId(null);
  };

  // Category management
  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setSavingCat(true);
    const { data, error } = await supabase.from('material_categories').insert([{ name: newCatName.trim(), type: newCatType }]).select().single();
    if (data && !error) { setCategories([...categories, data]); setNewCatName(''); }
    else alert('Failed to create category: ' + error?.message);
    setSavingCat(false);
  };

  const deleteCategory = async (catId: string) => {
    if (!confirm('Delete this category? All material assignments will also be removed.')) return;
    const { error } = await supabase.from('material_categories').delete().eq('id', catId);
    if (!error) { setCategories(categories.filter(c => c.id !== catId)); setCategoryMap(categoryMap.filter(m => m.category_id !== catId)); if (selectedCatId === catId) setSelectedCatId(null); }
    else alert('Failed to delete: ' + error.message);
  };

  const toggleMaterialAssignment = async (catId: string, matName: string) => {
    setAssigningMat(true);
    const existing = categoryMap.find(m => m.category_id === catId && m.material_name === matName);
    if (existing) {
      const { error } = await supabase.from('material_category_map').delete().eq('id', existing.id);
      if (!error) setCategoryMap(categoryMap.filter(m => m.id !== existing.id));
      else alert('Failed to remove assignment');
    } else {
      const { data, error } = await supabase.from('material_category_map').insert([{ category_id: catId, material_name: matName }]).select().single();
      if (data && !error) setCategoryMap([...categoryMap, data]);
      else alert('Failed to assign material');
    }
    setAssigningMat(false);
  };

  // Truck type management
  const createTruckType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTruckName.trim()) return;
    setSavingTruck(true);
    const { data, error } = await supabase.from('truck_types').insert([{ name: newTruckName.trim() }]).select().single();
    if (data && !error) { setTruckTypes([...truckTypes, data]); setNewTruckName(''); }
    else alert('Failed to create truck type: ' + error?.message);
    setSavingTruck(false);
  };

  const toggleTruckActive = async (truck: any) => {
    const { error } = await supabase.from('truck_types').update({ active: !truck.active }).eq('id', truck.id);
    if (!error) setTruckTypes(truckTypes.map(t => t.id === truck.id ? { ...t, active: !t.active } : t));
    else alert('Failed to update truck type');
  };

  const deleteTruckType = async (truckId: string) => {
    if (!confirm('Delete this truck type?')) return;
    const { error } = await supabase.from('truck_types').delete().eq('id', truckId);
    if (!error) setTruckTypes(truckTypes.filter(t => t.id !== truckId));
    else alert('Failed to delete truck type');
  };

  const selectedCat = categories.find(c => c.id === selectedCatId);
  const assignedMaterials = selectedCatId ? categoryMap.filter(m => m.category_id === selectedCatId).map(m => m.material_name) : [];
  const availableForCat = selectedCat ? allMaterialNames.filter(m => {
    const importMats = materials.filter(mat => mat.is_import).map(mat => mat.name);
    const exportMats = materials.filter(mat => !mat.is_import).map(mat => mat.name);
    return selectedCat.type === 'import' ? importMats.includes(m) : exportMats.includes(m);
  }) : [];

  const stats = useMemo(() => {
    const totalEstValue = estimates.reduce((sum, e) => sum + (e.total_price * e.quantity), 0);
    const avgEstPrice   = estimates.length > 0 ? estimates.reduce((sum, e) => sum + e.total_price, 0) / estimates.length : 0;
    const quoteConversionRate = quotes.length > 0 ? (quotes.filter(q => q.status === 'accepted').length / quotes.length) * 100 : 0;
    const facilityUsage: Record<string, number> = {};
    estimates.forEach(e => { if (e.facility_id) facilityUsage[e.facility_id] = (facilityUsage[e.facility_id] || 0) + 1; });
    const materialFreq: Record<string, { count: number; avgPrice: number; totalPrice: number }> = {};
    estimates.forEach(e => {
      if (!materialFreq[e.material_name]) materialFreq[e.material_name] = { count: 0, avgPrice: 0, totalPrice: 0 };
      materialFreq[e.material_name].count++;
      materialFreq[e.material_name].totalPrice += e.total_price;
    });
    Object.keys(materialFreq).forEach(k => { materialFreq[k].avgPrice = materialFreq[k].totalPrice / materialFreq[k].count; });
    const topMaterials  = Object.entries(materialFreq).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
    const topFacilities = facilities.map(f => ({ ...f, usageCount: facilityUsage[f.id] || 0 })).sort((a, b) => b.usageCount - a.usageCount).slice(0, 8);
    return {
      totalUsers: profiles.length, contractors: profiles.filter(p => p.role === 'contractor').length, suppliers: profiles.filter(p => p.role === 'supplier').length,
      totalProjects: projects.length, totalEstimates: estimates.length, totalQuotes: quotes.length,
      pendingQuotes: quotes.filter(q => q.status === 'pending').length, acceptedQuotes: quotes.filter(q => q.status === 'accepted').length,
      totalFacilities: facilities.length, pits: facilities.filter(f => f.type === 'pit').length, dumps: facilities.filter(f => f.type === 'dump').length, both: facilities.filter(f => f.type === 'both').length,
      totalMaterials: materials.length, totalEstValue, avgEstPrice, quoteConversionRate, topMaterials, topFacilities,
    };
  }, [profiles, projects, estimates, quotes, facilities, materials]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview',    label: 'Overview',    icon: 'fa-chart-pie' },
    { id: 'requests',    label: 'Requests',    icon: 'fa-user-clock' },
    { id: 'users',       label: 'Users',       icon: 'fa-users' },
    { id: 'projects',    label: 'Projects',    icon: 'fa-folder' },
    { id: 'facilities',  label: 'Facilities',  icon: 'fa-location-dot' },
    { id: 'materials',   label: 'Materials',   icon: 'fa-cubes' },
    { id: 'categories',  label: 'Categories',  icon: 'fa-tags' },
    { id: 'trucks',      label: 'Truck Types', icon: 'fa-truck' },
    { id: 'quotes',      label: 'Quotes',      icon: 'fa-file-invoice-dollar' },
  ];

  const fmtCurrency = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0b1120] text-slate-300 font-sans">
      <aside className="w-60 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 space-x-2">
          <span className="text-xl font-bold text-white tracking-wide">AggLink<span className="text-orange-500">.</span></span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 bg-orange-500/10 border border-orange-500/30 rounded px-1.5 py-0.5">Admin</span>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-orange-500/10 text-orange-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <div className="flex items-center space-x-3">
                <i className={`fa-solid ${t.icon} w-4 text-center`}></i>
                <span>{t.label}</span>
              </div>
              {t.id === 'requests' && pendingCount > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-xs">{adminName.substring(0, 2).toUpperCase()}</div>
            <div className="ml-2.5"><p className="text-xs font-semibold text-white">{adminName}</p><p className="text-[10px] text-purple-400 font-medium">Administrator</p></div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10 flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-white capitalize">
              {activeTab === 'overview' ? 'Admin Overview' : activeTab === 'requests' ? 'Access Requests' : activeTab === 'trucks' ? 'Truck Types' : activeTab}
            </h1>
            <p className="text-xs text-slate-500">AggLink platform administration</p>
          </div>
          <a href="/dashboard" className="text-xs text-slate-400 hover:text-orange-400 transition-colors border border-slate-700 hover:border-orange-500/40 px-3 py-1.5 rounded-lg">&larr; Contractor View</a>
        </header>

        <div className="p-6 space-y-6">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Users</p><h3 className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</h3><p className="text-xs text-slate-500 mt-2">{stats.contractors} contractors | {stats.suppliers} suppliers</p></div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Projects</p><h3 className="text-2xl font-bold text-white mt-1">{stats.totalProjects}</h3><p className="text-xs text-slate-500 mt-2">{stats.totalEstimates} estimates generated</p></div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Est. Platform Value</p><h3 className="text-2xl font-bold text-emerald-400 mt-1">{fmtCurrency(stats.totalEstValue)}</h3><p className="text-xs text-slate-500 mt-2">across all project estimates</p></div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Avg Price / Unit</p><h3 className="text-2xl font-bold text-orange-400 mt-1">{fmtCurrency(stats.avgEstPrice)}</h3><p className="text-xs text-slate-500 mt-2">blended material + freight</p></div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Facilities</p><h3 className="text-2xl font-bold text-white mt-1">{stats.totalFacilities}</h3><p className="text-xs text-slate-500 mt-2">{stats.pits} pits | {stats.dumps} dumps | {stats.both} both</p></div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Materials Listed</p><h3 className="text-2xl font-bold text-white mt-1">{stats.totalMaterials}</h3><p className="text-xs text-slate-500 mt-2">across all facilities</p></div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Quote Requests</p><h3 className="text-2xl font-bold text-white mt-1">{stats.totalQuotes}</h3><p className="text-xs text-slate-500 mt-2">{stats.pendingQuotes} pending | {stats.acceptedQuotes} accepted</p></div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Access</p><h3 className={`text-2xl font-bold mt-1 ${pendingCount > 0 ? 'text-orange-400' : 'text-slate-500'}`}>{pendingCount}</h3><p className="text-xs text-slate-500 mt-2">signup requests awaiting review</p></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50"><h2 className="text-sm font-semibold text-white">Top Requested Materials</h2></div>
                  <div className="p-4 space-y-3">
                    {stats.topMaterials.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No data yet.</p>}
                    {stats.topMaterials.map(([name, data]) => {
                      const maxCount = stats.topMaterials[0]?.[1].count || 1;
                      const pct = (data.count / maxCount) * 100;
                      return (<div key={name}><div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-300 font-medium truncate max-w-[60%]">{name}</span><div className="flex items-center space-x-3"><span className="text-xs text-slate-500">{data.count}x</span><span className="text-xs font-semibold text-orange-400">{fmtCurrency(data.avgPrice)}/unit</span></div></div><div className="h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }}></div></div></div>);
                    })}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50"><h2 className="text-sm font-semibold text-white">Most Used Facilities</h2></div>
                  <div className="p-4 space-y-3">
                    {stats.topFacilities.filter(f => f.usageCount > 0).length === 0 && <p className="text-slate-500 text-sm text-center py-4">No estimate data yet.</p>}
                    {stats.topFacilities.filter(f => f.usageCount > 0).map((fac) => {
                      const maxCount = stats.topFacilities[0]?.usageCount || 1;
                      const pct = (fac.usageCount / maxCount) * 100;
                      const typeColor = fac.type === 'pit' ? 'text-orange-400' : fac.type === 'dump' ? 'text-blue-400' : 'text-emerald-400';
                      const barColor  = fac.type === 'pit' ? 'bg-orange-500' : fac.type === 'dump' ? 'bg-blue-500' : 'bg-emerald-500';
                      return (<div key={fac.id}><div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-300 font-medium truncate max-w-[65%]">{fac.name}</span><div className="flex items-center space-x-2"><span className={`text-[10px] uppercase font-bold ${typeColor}`}>{fac.type}</span><span className="text-xs text-slate-500">{fac.usageCount}x</span></div></div><div className="h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }}></div></div></div>);
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {actionError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">{actionError}</div>}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Pending Requests</h2>
                  {pendingCount > 0 && <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full border border-orange-500/30">{pendingCount} pending</span>}
                </div>
                <div className="divide-y divide-slate-700/50">
                  {signupRequests.filter(r => r.status === 'pending').length === 0 && <p className="px-5 py-8 text-center text-slate-500 text-sm">No pending requests.</p>}
                  {signupRequests.filter(r => r.status === 'pending').map(req => (
                    <div key={req.id} className="px-5 py-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-white text-sm">{req.full_name}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${req.requested_role === 'contractor' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>{req.requested_role}</span>
                          </div>
                          <p className="text-xs text-slate-400">{req.email}</p>
                          <p className="text-xs text-slate-400">{req.company_name}</p>
                          {req.notes && <p className="text-xs text-slate-500 italic mt-1">&ldquo;{req.notes}&rdquo;</p>}
                          <p className="text-xs text-slate-600 mt-1">Submitted {fmtDate(req.created_at)}</p>
                        </div>
                        <div className="flex space-x-2 md:flex-shrink-0">
                          <button onClick={() => handleRequest(req, 'reject')} disabled={processingId === req.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-600 text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-all disabled:opacity-40">{processingId === req.id ? '...' : 'Reject'}</button>
                          <button onClick={() => handleRequest(req, 'approve')} disabled={processingId === req.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all disabled:opacity-40">{processingId === req.id ? 'Processing...' : 'Approve'}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {signupRequests.filter(r => r.status !== 'pending').length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50"><h2 className="text-sm font-semibold text-white">Reviewed</h2></div>
                  <div className="divide-y divide-slate-700/50">
                    {signupRequests.filter(r => r.status !== 'pending').map(req => (
                      <div key={req.id} className="px-5 py-3 flex items-center justify-between">
                        <div><div className="flex items-center space-x-2"><span className="text-sm text-slate-300 font-medium">{req.full_name}</span><span className="text-xs text-slate-500">{req.company_name}</span></div><p className="text-xs text-slate-500">{req.email}</p></div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{req.status}</span>
                          {req.reviewed_at && <span className="text-xs text-slate-600">{fmtDate(req.reviewed_at)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* USERS */}
          {activeTab === 'users' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">All Users ({profiles.length})</h2>
                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span><span>Admin</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span><span>Contractor</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span><span>Supplier</span></span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-800/80 uppercase tracking-wider">
                    <tr><th className="px-5 py-3">Company</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Projects</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3">Change Role</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {profiles.map(p => {
                      const userProjects = projects.filter(pr => pr.contractor_id === p.id).length;
                      const facType = getFacilityType(p.id);
                      const isEditing = editingRoleId === p.id;
                      const isSaving  = savingRoleId === p.id;
                      return (
                        <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-5 py-3 font-medium text-white">{p.company_name || '-'}</td>
                          <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${roleBadgeClasses(p.role, facType)}`}>{roleLabel(p.role, facType)}</span></td>
                          <td className="px-5 py-3 text-slate-400">{userProjects}</td>
                          <td className="px-5 py-3 text-slate-400">{p.created_at ? fmtDate(p.created_at) : '-'}</td>
                          <td className="px-5 py-3">
                            {isEditing ? (
                              <div className="flex items-center space-x-2">
                                <select defaultValue={p.role} disabled={isSaving} onChange={(e) => handleRoleChange(p.id, e.target.value as Role)} className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500 disabled:opacity-50">
                                  <option value="contractor">Contractor</option><option value="supplier">Supplier</option><option value="admin">Admin</option>
                                </select>
                                <button onClick={() => setEditingRoleId(null)} disabled={isSaving} className="text-slate-500 hover:text-slate-300 text-xs transition-colors">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setEditingRoleId(p.id)} className="text-xs text-slate-500 hover:text-orange-400 transition-colors border border-slate-700 hover:border-orange-500/40 px-2 py-1 rounded-md">{isSaving ? 'Saving...' : 'Change'}</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROJECTS */}
          {activeTab === 'projects' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50"><h2 className="text-sm font-semibold text-white">All Projects ({projects.length})</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-800/80 uppercase tracking-wider"><tr><th className="px-5 py-3">Project</th><th className="px-5 py-3">Contractor</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Estimates</th><th className="px-5 py-3 text-right">Est. Value</th><th className="px-5 py-3">Created</th></tr></thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {projects.map(p => {
                      const projEstimates = estimates.filter(e => e.project_id === p.id);
                      const projValue = projEstimates.reduce((sum, e) => sum + (e.total_price * e.quantity), 0);
                      const contractor = profiles.find(pr => pr.id === p.contractor_id);
                      const statusColor = p.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : p.status === 'completed' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-600/50 text-slate-400';
                      return (
                        <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-5 py-3"><div className="font-medium text-white">{p.name}</div><div className="text-xs text-slate-500 truncate max-w-[200px]">{p.address}</div></td>
                          <td className="px-5 py-3 text-slate-400">{contractor?.company_name || '-'}</td>
                          <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${statusColor}`}>{p.status}</span></td>
                          <td className="px-5 py-3 text-slate-400">{projEstimates.length}</td>
                          <td className="px-5 py-3 text-right font-semibold text-emerald-400">{projValue > 0 ? fmtCurrency(projValue) : '-'}</td>
                          <td className="px-5 py-3 text-slate-400">{fmtDate(p.created_at)}</td>
                        </tr>
                      );
                    })}
                    {projects.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No projects yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FACILITIES */}
          {activeTab === 'facilities' && (
            <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">All Facilities ({facilities.length})</h2>
                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span><span>Pit ({stats.pits})</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span><span>Dump ({stats.dumps})</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span><span>Both ({stats.both})</span></span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-800/80 uppercase tracking-wider"><tr><th className="px-5 py-3">Facility</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Owner</th><th className="px-5 py-3">Materials</th><th className="px-5 py-3">Est. Uses</th><th className="px-5 py-3">Added</th></tr></thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {facilities.map(f => {
                      const facMaterials = materials.filter(m => m.facility_id === f.id).length;
                      const facEstimates = estimates.filter(e => e.facility_id === f.id).length;
                      const typeColor = f.type === 'pit' ? 'bg-orange-500/20 text-orange-400' : f.type === 'dump' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400';
                      return (<tr key={f.id} className="hover:bg-slate-700/30 transition-colors"><td className="px-5 py-3 font-medium text-white">{f.name}</td><td className="px-5 py-3"><span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${typeColor}`}>{f.type}</span></td><td className="px-5 py-3">
  <select
    value={f.owner_id || ''}
    disabled={assigningFacilityId === f.id}
    onChange={(e) => assignFacility(f.id, e.target.value || null)}
    className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
  >
    <option value="">-- Unassigned --</option>
    {suppliers.map(s => (
      <option key={s.id} value={s.id}>{s.company_name}</option>
    ))}
  </select>
  {assigningFacilityId === f.id && <span className="ml-2 text-xs text-slate-400">Saving...</span>}
</td><td className="px-5 py-3 text-slate-400">{facMaterials}</td><td className="px-5 py-3"><span className={`font-semibold ${facEstimates > 0 ? 'text-orange-400' : 'text-slate-500'}`}>{facEstimates}</span></td><td className="px-5 py-3 text-slate-400">{f.created_at ? fmtDate(f.created_at) : '-'}</td></tr>);
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Add New Facility</h3>
              <form onSubmit={createFacility} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Name</label>
                  <input
                    type="text" required value={newFacName} onChange={e => setNewFacName(e.target.value)}
                    placeholder="e.g., North Pit"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Address</label>
                  <input
                    type="text" value={newFacAddress} onChange={e => setNewFacAddress(e.target.value)}
                    placeholder="Street, City"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Type</label>
                  <div className="flex space-x-2">
                    {(['pit','dump','both'] as const).map(t => {
                      const active = newFacType === t;
                      const color =
                        t === 'pit'  ? (active ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'border-slate-700 text-slate-400 hover:text-white') :
                        t === 'dump' ? (active ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'       : 'border-slate-700 text-slate-400 hover:text-white') :
                                       (active ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'border-slate-700 text-slate-400 hover:text-white');
                      return (
                        <button key={t} type="button" onClick={() => setNewFacType(t)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all ${color}`}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Latitude (optional)</label>
                  <input
                    type="number" step="any" value={newFacLat} onChange={e => setNewFacLat(e.target.value)}
                    placeholder="40.7608"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Longitude (optional)</label>
                  <input
                    type="number" step="any" value={newFacLon} onChange={e => setNewFacLon(e.target.value)}
                    placeholder="-111.8910"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Owner</label>
                  <select
                    value={newFacOwner} onChange={e => setNewFacOwner(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.company_name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <button type="submit" disabled={savingFacility || !newFacName.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">
                    {savingFacility ? 'Creating...' : 'Create Facility'}
                  </button>
                </div>
              </form>
            </div>
            </div>
          )}

          {/* MATERIALS */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Materials</p><h3 className="text-2xl font-bold text-white mt-1">{materials.length}</h3></div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Import Materials</p><h3 className="text-2xl font-bold text-white mt-1">{materials.filter(m => m.is_import).length}</h3></div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Export Materials</p><h3 className="text-2xl font-bold text-white mt-1">{materials.filter(m => !m.is_import).length}</h3></div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Avg Price / Ton</p><h3 className="text-2xl font-bold text-white mt-1">{fmtCurrency(materials.filter(m => m.price_per_ton).reduce((s, m) => s + m.price_per_ton, 0) / (materials.filter(m => m.price_per_ton).length || 1))}</h3></div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50"><h2 className="text-sm font-semibold text-white">Material Catalog</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-800/80 uppercase tracking-wider"><tr><th className="px-5 py-3">Material</th><th className="px-5 py-3">Facility</th><th className="px-5 py-3">Type</th><th className="px-5 py-3 text-right">Price / Ton</th><th className="px-5 py-3">Est. Requests</th></tr></thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {materials.map(m => {
                        const fac = facilities.find(f => f.id === m.facility_id);
                        const reqCount = estimates.filter(e => e.material_name === m.name && e.facility_id === m.facility_id).length;
                        return (<tr key={m.id} className="hover:bg-slate-700/30 transition-colors"><td className="px-5 py-3 font-medium text-white">{m.name}</td><td className="px-5 py-3 text-slate-400 truncate max-w-[180px]">{fac?.name || '-'}</td><td className="px-5 py-3"><span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${m.is_import ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>{m.is_import ? 'Import' : 'Export'}</span></td><td className="px-5 py-3 text-right font-semibold text-slate-300">{m.price_per_ton ? fmtCurrency(m.price_per_ton) : '-'}</td><td className="px-5 py-3"><span className={`font-semibold ${reqCount > 0 ? 'text-orange-400' : 'text-slate-500'}`}>{reqCount}</span></td></tr>);
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: category list + create */}
              <div className="space-y-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50"><h2 className="text-sm font-semibold text-white">Material Categories ({categories.length})</h2></div>
                  <div className="divide-y divide-slate-700/50">
                    {categories.length === 0 && <p className="px-5 py-6 text-center text-slate-500 text-sm">No categories yet.</p>}
                    {categories.map(c => (
                      <div key={c.id} onClick={() => setSelectedCatId(selectedCatId === c.id ? null : c.id)}
                        className={`px-5 py-3 flex items-center justify-between cursor-pointer transition-colors ${selectedCatId === c.id ? 'bg-orange-500/10' : 'hover:bg-slate-700/30'}`}>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${c.type === 'import' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>{c.type}</span>
                          <span className="text-sm text-white font-medium">{c.name}</span>
                          <span className="text-xs text-slate-500">{categoryMap.filter(m => m.category_id === c.id).length} materials</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteCategory(c.id); }} className="text-slate-600 hover:text-red-500 transition-colors text-xs"><i className="fa-solid fa-trash"></i></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Create category */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Create Category</h3>
                  <form onSubmit={createCategory} className="space-y-3">
                    <input type="text" required value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g., Gravel"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                    <div className="flex space-x-2">
                      <button type="button" onClick={() => setNewCatType('import')} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${newCatType === 'import' ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}>Import</button>
                      <button type="button" onClick={() => setNewCatType('export')} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${newCatType === 'export' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}>Export</button>
                    </div>
                    <button type="submit" disabled={savingCat} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">{savingCat ? 'Creating...' : '+ Create Category'}</button>
                  </form>
                </div>
              </div>

              {/* Right: assign materials to selected category */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50">
                  <h2 className="text-sm font-semibold text-white">{selectedCat ? `Assign Materials to "${selectedCat.name}"` : 'Select a category to assign materials'}</h2>
                </div>
                {!selectedCat ? (
                  <p className="px-5 py-8 text-center text-slate-500 text-sm">Click a category on the left to manage its materials.</p>
                ) : availableForCat.length === 0 ? (
                  <p className="px-5 py-8 text-center text-slate-500 text-sm">No {selectedCat.type} materials found in the database.</p>
                ) : (
                  <div className="p-4 grid grid-cols-1 gap-1.5 max-h-[500px] overflow-y-auto">
                    {availableForCat.map(mat => {
                      const isAssigned = assignedMaterials.includes(mat);
                      return (
                        <button key={mat} onClick={() => toggleMaterialAssignment(selectedCatId!, mat)} disabled={assigningMat}
                          className={`flex items-center space-x-3 px-3 py-2 rounded-lg border text-left transition-all disabled:opacity-50 ${isAssigned ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'}`}>
                          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${isAssigned ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                            {isAssigned && <i className="fa-solid fa-check text-white" style={{ fontSize: '9px' }}></i>}
                          </span>
                          <span className="text-sm">{mat}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TRUCKS */}
          {activeTab === 'trucks' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50"><h2 className="text-sm font-semibold text-white">Truck Types ({truckTypes.length})</h2></div>
                <div className="divide-y divide-slate-700/50">
                  {truckTypes.length === 0 && <p className="px-5 py-6 text-center text-slate-500 text-sm">No truck types yet.</p>}
                  {truckTypes.map(t => (
                    <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <i className="fa-solid fa-truck text-slate-500 text-sm"></i>
                        <span className={`text-sm font-medium ${t.active ? 'text-white' : 'text-slate-500 line-through'}`}>{t.name}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${t.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/50 text-slate-500'}`}>{t.active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => toggleTruckActive(t)} className="text-xs text-slate-400 hover:text-orange-400 border border-slate-700 hover:border-orange-500/40 px-2 py-1 rounded-md transition-all">{t.active ? 'Disable' : 'Enable'}</button>
                        <button onClick={() => deleteTruckType(t.id)} className="text-slate-600 hover:text-red-500 transition-colors text-xs"><i className="fa-solid fa-trash"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Add Truck Type</h3>
                <form onSubmit={createTruckType} className="space-y-3">
                  <input type="text" required value={newTruckName} onChange={(e) => setNewTruckName(e.target.value)} placeholder="e.g., Transfer Truck"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                  <button type="submit" disabled={savingTruck} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">{savingTruck ? 'Adding...' : '+ Add Truck Type'}</button>
                </form>
                <p className="text-xs text-slate-500 mt-4">Truck types marked as inactive will not appear in the contractor requirement form but historical data is preserved.</p>
              </div>
            </div>
          )}

          {/* QUOTES */}
          {activeTab === 'quotes' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Requests</p><h3 className="text-2xl font-bold text-white mt-1">{quotes.length}</h3></div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending</p><h3 className="text-2xl font-bold text-orange-400 mt-1">{quotes.filter(q => q.status === 'pending').length}</h3></div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Responded</p><h3 className="text-2xl font-bold text-blue-400 mt-1">{quotes.filter(q => q.status === 'responded').length}</h3></div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Accepted</p><h3 className="text-2xl font-bold text-emerald-400 mt-1">{quotes.filter(q => q.status === 'accepted').length}</h3></div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50"><h2 className="text-sm font-semibold text-white">All Quote Requests ({quotes.length})</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-800/80 uppercase tracking-wider"><tr><th className="px-5 py-3">Material</th><th className="px-5 py-3">Facility</th><th className="px-5 py-3">Contractor</th><th className="px-5 py-3 text-right">Qty</th><th className="px-5 py-3 text-right">Offered Price</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th></tr></thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {quotes.map(q => {
                        const fac = facilities.find(f => f.id === q.facility_id);
                        const contractor = profiles.find(p => p.id === q.contractor_id);
                        const statusColor = q.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : q.status === 'pending' ? 'bg-orange-500/20 text-orange-400' : q.status === 'declined' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400';
                        return (<tr key={q.id} className="hover:bg-slate-700/30 transition-colors"><td className="px-5 py-3 font-medium text-white">{q.material_name}</td><td className="px-5 py-3 text-slate-400 truncate max-w-[150px]">{fac?.name || '-'}</td><td className="px-5 py-3 text-slate-400">{contractor?.company_name || '-'}</td><td className="px-5 py-3 text-right text-slate-400">{q.quantity?.toLocaleString()}</td><td className="px-5 py-3 text-right font-semibold text-emerald-400">{q.offered_price ? fmtCurrency(q.offered_price) : '-'}</td><td className="px-5 py-3"><span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${statusColor}`}>{q.status}</span></td><td className="px-5 py-3 text-slate-400">{fmtDate(q.created_at)}</td></tr>);
                      })}
                      {quotes.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">No quote requests yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
