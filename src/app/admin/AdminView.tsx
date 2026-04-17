/* eslint-disable @typescript-eslint/no-explicit-any */
“use client”;
import React, { useState, useMemo } from ‘react’;
import LogoutButton from ‘@/components/LogoutButton’;

type Tab = ‘overview’ | ‘users’ | ‘projects’ | ‘facilities’ | ‘materials’ | ‘quotes’;

export default function AdminView({
adminName,
profiles,
projects,
estimates,
quotes,
facilities,
materials,
}: {
adminName: string;
profiles: any[];
projects: any[];
estimates: any[];
quotes: any[];
facilities: any[];
materials: any[];
}) {
const [activeTab, setActiveTab] = useState<Tab>(‘overview’);

const stats = useMemo(() => {
const totalEstValue = estimates.reduce((sum, e) => sum + (e.total_price * e.quantity), 0);
const avgEstPrice = estimates.length > 0
? estimates.reduce((sum, e) => sum + e.total_price, 0) / estimates.length
: 0;
const quoteConversionRate = quotes.length > 0
? (quotes.filter(q => q.status === ‘accepted’).length / quotes.length) * 100
: 0;

```
const facilityUsage: Record<string, number> = {};
estimates.forEach(e => {
  if (e.facility_id) facilityUsage[e.facility_id] = (facilityUsage[e.facility_id] || 0) + 1;
});

const materialFreq: Record<string, { count: number; avgPrice: number; totalPrice: number }> = {};
estimates.forEach(e => {
  if (!materialFreq[e.material_name]) materialFreq[e.material_name] = { count: 0, avgPrice: 0, totalPrice: 0 };
  materialFreq[e.material_name].count++;
  materialFreq[e.material_name].totalPrice += e.total_price;
});
Object.keys(materialFreq).forEach(k => {
  materialFreq[k].avgPrice = materialFreq[k].totalPrice / materialFreq[k].count;
});

const topMaterials = Object.entries(materialFreq)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 8);

const topFacilities = facilities
  .map(f => ({ ...f, usageCount: facilityUsage[f.id] || 0 }))
  .sort((a, b) => b.usageCount - a.usageCount)
  .slice(0, 8);

return {
  totalUsers: profiles.length,
  contractors: profiles.filter(p => p.role === 'contractor').length,
  suppliers: profiles.filter(p => p.role === 'supplier').length,
  totalProjects: projects.length,
  totalEstimates: estimates.length,
  totalQuotes: quotes.length,
  pendingQuotes: quotes.filter(q => q.status === 'pending').length,
  acceptedQuotes: quotes.filter(q => q.status === 'accepted').length,
  totalFacilities: facilities.length,
  pits: facilities.filter(f => f.type === 'pit').length,
  dumps: facilities.filter(f => f.type === 'dump').length,
  both: facilities.filter(f => f.type === 'both').length,
  totalMaterials: materials.length,
  totalEstValue,
  avgEstPrice,
  quoteConversionRate,
  topMaterials,
  topFacilities,
};
```

}, [profiles, projects, estimates, quotes, facilities, materials]);

const tabs: { id: Tab; label: string; icon: string }[] = [
{ id: ‘overview’,   label: ‘Overview’,   icon: ‘fa-chart-pie’ },
{ id: ‘users’,      label: ‘Users’,      icon: ‘fa-users’ },
{ id: ‘projects’,   label: ‘Projects’,   icon: ‘fa-folder’ },
{ id: ‘facilities’, label: ‘Facilities’, icon: ‘fa-location-dot’ },
{ id: ‘materials’,  label: ‘Materials’,  icon: ‘fa-cubes’ },
{ id: ‘quotes’,     label: ‘Quotes’,     icon: ‘fa-file-invoice-dollar’ },
];

const fmtCurrency = (n: number) =>
‘$’ + n.toLocaleString(‘en-US’, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) =>
new Date(d).toLocaleDateString(‘en-US’, { month: ‘short’, day: ‘numeric’, year: ‘numeric’ });

return (
<div className="flex h-screen w-full overflow-hidden bg-[#0b1120] text-slate-300 font-sans">

```
  {/* Sidebar */}
  <aside className="w-60 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col flex-shrink-0">
    <div className="h-16 flex items-center px-6 border-b border-slate-800 space-x-2">
      <span className="text-xl font-bold text-white tracking-wide">AggLink<span className="text-orange-500">.</span></span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 bg-orange-500/10 border border-orange-500/30 rounded px-1.5 py-0.5">Admin</span>
    </div>
    <nav className="flex-1 px-3 py-5 space-y-0.5">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-orange-500/10 text-orange-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <i className={`fa-solid ${t.icon} w-4 text-center`}></i>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
    <div className="p-4 border-t border-slate-800">
      <div className="flex items-center mb-3">
        <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-xs">
          {adminName.substring(0, 2).toUpperCase()}
        </div>
        <div className="ml-2.5">
          <p className="text-xs font-semibold text-white">{adminName}</p>
          <p className="text-[10px] text-orange-400 font-medium">Administrator</p>
        </div>
      </div>
      <LogoutButton />
    </div>
  </aside>

  {/* Main */}
  <main className="flex-1 flex flex-col h-screen overflow-y-auto">
    <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10 flex-shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-white capitalize">
          {activeTab === 'overview' ? 'Admin Overview' : activeTab}
        </h1>
        <p className="text-xs text-slate-500">AggLink platform administration</p>
      </div>
      <a href="/dashboard" className="text-xs text-slate-400 hover:text-orange-400 transition-colors border border-slate-700 hover:border-orange-500/40 px-3 py-1.5 rounded-lg">
        &larr; Contractor View
      </a>
    </header>

    <div className="p-6 space-y-6">

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Users</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</h3>
              <p className="text-xs text-slate-500 mt-2">{stats.contractors} contractors | {stats.suppliers} suppliers</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Projects</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.totalProjects}</h3>
              <p className="text-xs text-slate-500 mt-2">{stats.totalEstimates} estimates generated</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Est. Platform Value</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{fmtCurrency(stats.totalEstValue)}</h3>
              <p className="text-xs text-slate-500 mt-2">across all project estimates</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Avg Price / Unit</p>
              <h3 className="text-2xl font-bold text-orange-400 mt-1">{fmtCurrency(stats.avgEstPrice)}</h3>
              <p className="text-xs text-slate-500 mt-2">blended material + freight</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Facilities</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.totalFacilities}</h3>
              <p className="text-xs text-slate-500 mt-2">{stats.pits} pits | {stats.dumps} dumps | {stats.both} both</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Materials Listed</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.totalMaterials}</h3>
              <p className="text-xs text-slate-500 mt-2">across all facilities</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Quote Requests</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.totalQuotes}</h3>
              <p className="text-xs text-slate-500 mt-2">{stats.pendingQuotes} pending | {stats.acceptedQuotes} accepted</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Quote Conversion</p>
              <h3 className={`text-2xl font-bold mt-1 ${stats.quoteConversionRate > 30 ? 'text-emerald-400' : 'text-orange-400'}`}>
                {stats.quoteConversionRate.toFixed(1)}%
              </h3>
              <p className="text-xs text-slate-500 mt-2">accepted / total requests</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50">
                <h2 className="text-sm font-semibold text-white">Top Requested Materials</h2>
              </div>
              <div className="p-4 space-y-3">
                {stats.topMaterials.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No data yet.</p>}
                {stats.topMaterials.map(([name, data]) => {
                  const maxCount = stats.topMaterials[0]?.[1].count || 1;
                  const pct = (data.count / maxCount) * 100;
                  return (
                    <div key={name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-300 font-medium truncate max-w-[60%]">{name}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-slate-500">{data.count}x</span>
                          <span className="text-xs font-semibold text-orange-400">{fmtCurrency(data.avgPrice)}/unit</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50">
                <h2 className="text-sm font-semibold text-white">Most Used Facilities</h2>
              </div>
              <div className="p-4 space-y-3">
                {stats.topFacilities.filter(f => f.usageCount > 0).length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">No estimate data yet.</p>
                )}
                {stats.topFacilities.filter(f => f.usageCount > 0).map((fac) => {
                  const maxCount = stats.topFacilities[0]?.usageCount || 1;
                  const pct = (fac.usageCount / maxCount) * 100;
                  const typeColor = fac.type === 'pit' ? 'text-orange-400' : fac.type === 'dump' ? 'text-blue-400' : 'text-emerald-400';
                  const barColor  = fac.type === 'pit' ? 'bg-orange-500' : fac.type === 'dump' ? 'bg-blue-500' : 'bg-emerald-500';
                  return (
                    <div key={fac.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-300 font-medium truncate max-w-[65%]">{fac.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] uppercase font-bold ${typeColor}`}>{fac.type}</span>
                          <span className="text-xs text-slate-500">{fac.usageCount}x</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USERS */}
      {activeTab === 'users' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50">
            <h2 className="text-sm font-semibold text-white">All Users ({profiles.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-800/80 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Projects</th>
                  <th className="px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {profiles.map(p => {
                  const userProjects = projects.filter(pr => pr.contractor_id === p.id).length;
                  const roleColor = p.role === 'admin'
                    ? 'bg-orange-500/20 text-orange-400'
                    : p.role === 'supplier'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-emerald-500/20 text-emerald-400';
                  return (
                    <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-white">{p.company_name || '-'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${roleColor}`}>{p.role}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400">{userProjects}</td>
                      <td className="px-5 py-3 text-slate-400">{p.created_at ? fmtDate(p.created_at) : '-'}</td>
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
          <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50">
            <h2 className="text-sm font-semibold text-white">All Projects ({projects.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-800/80 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Contractor</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Estimates</th>
                  <th className="px-5 py-3 text-right">Est. Value</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {projects.map(p => {
                  const projEstimates = estimates.filter(e => e.project_id === p.id);
                  const projValue = projEstimates.reduce((sum, e) => sum + (e.total_price * e.quantity), 0);
                  const contractor = profiles.find(pr => pr.id === p.contractor_id);
                  const statusColor = p.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : p.status === 'completed'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-600/50 text-slate-400';
                  return (
                    <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-white">{p.name}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{p.address}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-400">{contractor?.company_name || '-'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${statusColor}`}>{p.status}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400">{projEstimates.length}</td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-400">
                        {projValue > 0 ? fmtCurrency(projValue) : '-'}
                      </td>
                      <td className="px-5 py-3 text-slate-400">{fmtDate(p.created_at)}</td>
                    </tr>
                  );
                })}
                {projects.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No projects yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FACILITIES */}
      {activeTab === 'facilities' && (
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
              <thead className="text-xs text-slate-500 bg-slate-800/80 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Facility</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Materials</th>
                  <th className="px-5 py-3">Est. Uses</th>
                  <th className="px-5 py-3">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {facilities.map(f => {
                  const facMaterials = materials.filter(m => m.facility_id === f.id).length;
                  const facEstimates = estimates.filter(e => e.facility_id === f.id).length;
                  const typeColor = f.type === 'pit'
                    ? 'bg-orange-500/20 text-orange-400'
                    : f.type === 'dump'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-emerald-500/20 text-emerald-400';
                  return (
                    <tr key={f.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-white">{f.name}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${typeColor}`}>{f.type}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400">{facMaterials}</td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold ${facEstimates > 0 ? 'text-orange-400' : 'text-slate-500'}`}>{facEstimates}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400">{f.created_at ? fmtDate(f.created_at) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MATERIALS */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Materials</p>
              <h3 className="text-2xl font-bold text-white mt-1">{materials.length}</h3>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Import Materials</p>
              <h3 className="text-2xl font-bold text-white mt-1">{materials.filter(m => m.is_import).length}</h3>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Export Materials</p>
              <h3 className="text-2xl font-bold text-white mt-1">{materials.filter(m => !m.is_import).length}</h3>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Avg Price / Ton</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {fmtCurrency(
                  materials.filter(m => m.price_per_ton).reduce((s, m) => s + m.price_per_ton, 0) /
                  (materials.filter(m => m.price_per_ton).length || 1)
                )}
              </h3>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50">
              <h2 className="text-sm font-semibold text-white">Material Catalog</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-800/80 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Material</th>
                    <th className="px-5 py-3">Facility</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3 text-right">Price / Ton</th>
                    <th className="px-5 py-3">Est. Requests</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {materials.map(m => {
                    const fac = facilities.find(f => f.id === m.facility_id);
                    const reqCount = estimates.filter(e => e.material_name === m.name && e.facility_id === m.facility_id).length;
                    return (
                      <tr key={m.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-3 font-medium text-white">{m.name}</td>
                        <td className="px-5 py-3 text-slate-400 truncate max-w-[180px]">{fac?.name || '-'}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${m.is_import ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {m.is_import ? 'Import' : 'Export'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-300">
                          {m.price_per_ton ? fmtCurrency(m.price_per_ton) : '-'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`font-semibold ${reqCount > 0 ? 'text-orange-400' : 'text-slate-500'}`}>{reqCount}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QUOTES */}
      {activeTab === 'quotes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Requests</p>
              <h3 className="text-2xl font-bold text-white mt-1">{quotes.length}</h3>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending</p>
              <h3 className="text-2xl font-bold text-orange-400 mt-1">{quotes.filter(q => q.status === 'pending').length}</h3>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Responded</p>
              <h3 className="text-2xl font-bold text-blue-400 mt-1">{quotes.filter(q => q.status === 'responded').length}</h3>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Accepted</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{quotes.filter(q => q.status === 'accepted').length}</h3>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50">
              <h2 className="text-sm font-semibold text-white">All Quote Requests ({quotes.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-800/80 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Material</th>
                    <th className="px-5 py-3">Facility</th>
                    <th className="px-5 py-3">Contractor</th>
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3 text-right">Offered Price</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {quotes.map(q => {
                    const fac = facilities.find(f => f.id === q.facility_id);
                    const contractor = profiles.find(p => p.id === q.contractor_id);
                    const statusColor =
                      q.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                      q.status === 'pending'  ? 'bg-orange-500/20 text-orange-400' :
                      q.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400';
                    return (
                      <tr key={q.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-3 font-medium text-white">{q.material_name}</td>
                        <td className="px-5 py-3 text-slate-400 truncate max-w-[150px]">{fac?.name || '-'}</td>
                        <td className="px-5 py-3 text-slate-400">{contractor?.company_name || '-'}</td>
                        <td className="px-5 py-3 text-right text-slate-400">{q.quantity?.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-400">
                          {q.offered_price ? fmtCurrency(q.offered_price) : '-'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${statusColor}`}>{q.status}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-400">{fmtDate(q.created_at)}</td>
                      </tr>
                    );
                  })}
                  {quotes.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">No quote requests yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  </main>
</div>
```

);
}
