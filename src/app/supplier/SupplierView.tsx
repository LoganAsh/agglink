/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import LogoutButton from '@/components/LogoutButton';

const STATUS_OPTIONS = [
  { value: 'in_stock', label: 'In Stock', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { value: 'low', label: 'Low', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  { value: 'out_of_stock', label: 'Out', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
];

const UNSELECTED = 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300';

export default function SupplierView({
  profile,
  facilities,
  materials: initialMaterials,
}: {
  profile: { role: string; company_name: string | null };
  facilities: Array<{ id: string; name: string; type: string }>;
  materials: Array<{
    id: string;
    name: string;
    price_per_ton: number | null;
    price_per_cy: number | null;
    is_import: boolean;
    stock_status: string | null;
    facility_id: string;
  }>;
}) {
  const supabase = createClient();
  const [materials, setMaterials] = useState(initialMaterials);
  const [savingId, setSavingId] = useState<string | null>(null);

  const companyName = profile.company_name || 'Supplier';

  const updateStatus = async (materialId: string, value: string) => {
    setSavingId(materialId);
    const prev = materials;
    setMaterials(mats => mats.map(m => m.id === materialId ? { ...m, stock_status: value } : m));
    const { error } = await supabase
      .from('materials')
      .update({ stock_status: value })
      .eq('id', materialId);
    if (error) {
      setMaterials(prev);
      alert(`Failed to update stock status: ${error.message}`);
    }
    setSavingId(null);
  };

  const materialsByFacility = facilities.map(fac => ({
    facility: fac,
    mats: materials.filter(m => m.facility_id === fac.id),
  }));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0b1120] text-slate-300 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold text-white tracking-wide">AggLink<span className="text-orange-500">.</span></span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="#" className="flex items-center px-4 py-3 bg-orange-500/10 text-orange-500 rounded-lg font-medium">
            <i className="fa-solid fa-boxes-stacked mr-3 w-4"></i>My Materials
          </a>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border-2 border-slate-500">
              {companyName.substring(0, 2).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-semibold text-white">{companyName}</p>
              <p className="text-xs text-slate-400 capitalize">{profile.role}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-white">{companyName}</h2>
            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded text-[10px] font-bold uppercase tracking-wider">Supplier</span>
          </div>
          <div className="md:hidden"><LogoutButton /></div>
        </header>

        <div className="p-4 md:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">My Materials</h1>
            <p className="text-sm text-slate-400 mt-1">Update stock availability so contractors see real-time status on their estimates.</p>
          </div>

          {materialsByFacility.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              No facilities linked to your account yet. Contact an admin to get set up.
            </div>
          )}

          {materialsByFacility.map(({ facility, mats }) => (
            <section key={facility.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{facility.name}</h3>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">{facility.type} facility</p>
                </div>
                <span className="text-xs text-slate-500">{mats.length} material{mats.length === 1 ? '' : 's'}</span>
              </div>

              {mats.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-500">No materials listed at this facility.</div>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {mats.map(mat => {
                    const price = mat.is_import
                      ? (mat.price_per_ton != null ? `$${Number(mat.price_per_ton).toFixed(2)}/ton` : '—')
                      : (mat.price_per_cy != null ? `$${Number(mat.price_per_cy).toFixed(2)}/cy` : '—');
                    const current = mat.stock_status || 'in_stock';
                    const isSaving = savingId === mat.id;
                    return (
                      <li key={mat.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-white truncate">{mat.name}</span>
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${mat.is_import ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                              {mat.is_import ? 'Import' : 'Export'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{price}</p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="inline-flex rounded-lg overflow-hidden border border-slate-700">
                            {STATUS_OPTIONS.map((opt, i) => {
                              const selected = current === opt.value;
                              const base = 'px-3 py-1.5 text-xs font-semibold border-r last:border-r-0 border-slate-700 transition-colors disabled:opacity-50';
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => !selected && updateStatus(mat.id, opt.value)}
                                  disabled={isSaving}
                                  className={`${base} ${selected ? opt.color : UNSELECTED}`}
                                  title={opt.label}
                                  style={{ borderRightWidth: i === STATUS_OPTIONS.length - 1 ? 0 : 1 }}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                          {isSaving && (
                            <span className="text-xs text-slate-500 flex items-center">
                              <i className="fa-solid fa-spinner fa-spin mr-1.5"></i>Saving
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
