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

export default function SupplierView({
  profile,
  facilities,
  materials: initialMaterials,
  allMaterialNames,
}: {
  profile: { role: string; company_name: string | null };
  facilities: Array<{ id: string; name: string; type: string }>;
  materials: any[];
  allMaterialNames: string[];
}) {
  const supabase = createClient();

  const [materials, setMaterials] = useState<any[]>(initialMaterials);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMatFacilityId, setNewMatFacilityId] = useState('');
  const [newMatName, setNewMatName] = useState('');
  const [newMatIsImport, setNewMatIsImport] = useState(true);
  const [newMatPricePerTon, setNewMatPricePerTon] = useState('');
  const [newMatPricePerCy, setNewMatPricePerCy] = useState('');
  const [newMat10wLoad, setNewMat10wLoad] = useState('');
  const [newMatSdLoad, setNewMatSdLoad] = useState('');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState<string>('');

  const companyName = profile.company_name || 'Supplier';

  const updateStockStatus = async (materialId: string, status: string) => {
    setSavingId(materialId);
    await supabase.from('materials').update({ stock_status: status }).eq('id', materialId);
    setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, stock_status: status } : m));
    setSavingId(null);
  };

  const startEditPrice = (mat: any) => {
    setEditingPriceId(mat.id);
    setEditPriceVal(String(mat.is_import ? (mat.price_per_ton ?? '') : (mat.price_per_cy ?? '')));
  };

  const savePrice = async (mat: any) => {
    const val = parseFloat(editPriceVal);
    if (isNaN(val)) return;
    const update = mat.is_import ? { price_per_ton: val } : { price_per_cy: val };
    const { error } = await supabase.from('materials').update(update).eq('id', mat.id);
    if (!error) setMaterials(prev => prev.map(m => m.id === mat.id ? { ...m, ...update } : m));
    else alert('Failed to update price');
    setEditingPriceId(null);
  };

  const addMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatFacilityId || !newMatName) return;
    setAddingMaterial(true);
    const { data, error } = await supabase.from('materials').insert([{
      facility_id: newMatFacilityId,
      name: newMatName,
      is_import: newMatIsImport,
      price_per_ton: newMatIsImport ? (parseFloat(newMatPricePerTon) || 0) : 0,
      price_per_cy: !newMatIsImport ? (parseFloat(newMatPricePerCy) || 0) : 0,
      price_10w_load: parseFloat(newMat10wLoad) || 0,
      price_sd_load: parseFloat(newMatSdLoad) || 0,
      stock_status: 'in_stock',
    }]).select().single();
    if (data && !error) {
      setMaterials([...materials, data]);
      setNewMatName(''); setNewMatPricePerTon(''); setNewMatPricePerCy(''); setNewMat10wLoad(''); setNewMatSdLoad('');
      setShowAddForm(false);
    } else alert('Failed to add material: ' + error?.message);
    setAddingMaterial(false);
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
          {/* SECTION 1: My Materials */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-white">My Materials</h1>
                <p className="text-xs text-slate-400 mt-0.5">Manage pricing, stock status, and supply list.</p>
              </div>
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition-all"
              >
                {showAddForm ? 'Cancel' : '+ Add Material'}
              </button>
            </div>

            {materialsByFacility.length === 0 && (
              <div className="px-6 py-10 text-center text-slate-400">
                No facilities linked to your account yet. Contact an admin to get set up.
              </div>
            )}

            {materialsByFacility.length > 0 && materials.length === 0 && (
              <div className="px-6 py-10 text-center">
                <p className="text-slate-400 mb-3">No materials listed yet.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  + Add your first material
                </button>
              </div>
            )}

            {materialsByFacility.map(({ facility, mats }) => (
              mats.length === 0 ? null : (
                <div key={facility.id} className="border-b border-slate-800 last:border-b-0">
                  <div className="px-6 py-3 bg-slate-800/40 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{facility.name}</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{facility.type} facility</p>
                    </div>
                    <span className="text-xs text-slate-500">{mats.length} material{mats.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {mats.map(mat => (
                      <div key={mat.id} className="flex items-center justify-between gap-3 py-3 px-4">

                        {/* Left: name + badge */}
                        <div className="flex flex-col min-w-0 flex-shrink-0 w-1/3">
                          <span className="text-sm font-medium text-white truncate">{mat.name}</span>
                          <span className={`text-[10px] font-bold uppercase mt-0.5 ${mat.is_import ? 'text-orange-400' : 'text-blue-400'}`}>
                            {mat.is_import ? 'Import' : 'Export'}
                          </span>
                        </div>

                        {/* Center: stock status segmented control */}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {STATUS_OPTIONS.map(opt => (
                            <button key={opt.value} onClick={() => updateStockStatus(mat.id, opt.value)}
                              disabled={savingId === mat.id}
                              className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-all disabled:opacity-50 ${mat.stock_status === opt.value ? opt.color : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {/* Right: price + edit */}
                        <div className="flex items-center space-x-1 flex-shrink-0 justify-end w-1/4">
                          {editingPriceId === mat.id ? (
                            <div className="flex items-center space-x-1">
                              <input type="number" value={editPriceVal} onChange={e => setEditPriceVal(e.target.value)}
                                className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500" />
                              <button onClick={() => savePrice(mat)} className="text-emerald-400 hover:text-emerald-300 text-xs"><i className="fa-solid fa-check"></i></button>
                              <button onClick={() => setEditingPriceId(null)} className="text-slate-500 hover:text-slate-300 text-xs"><i className="fa-solid fa-xmark"></i></button>
                            </div>
                          ) : (
                            <button onClick={() => startEditPrice(mat)} className="flex items-center space-x-1 text-right group">
                              <span className="text-sm font-semibold text-white">${mat.is_import ? (mat.price_per_ton || 0).toFixed(2) : (mat.price_per_cy || 0).toFixed(2)}</span>
                              <span className="text-[10px] text-slate-500">{mat.is_import ? '/ton' : '/cy'}</span>
                              <i className="fa-solid fa-pen text-[10px] text-slate-600 group-hover:text-orange-400 transition-colors ml-1"></i>
                            </button>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </section>

          {/* SECTION 2: Add Material form */}
          {showAddForm && (
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Add Material to Supply List</h2>
              <form onSubmit={addMaterial} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Facility</label>
                  <select
                    required value={newMatFacilityId} onChange={e => setNewMatFacilityId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Facility --</option>
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Type</label>
                  <div className="flex space-x-2">
                    <button type="button" onClick={() => setNewMatIsImport(true)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${newMatIsImport ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
                      Import
                    </button>
                    <button type="button" onClick={() => setNewMatIsImport(false)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${!newMatIsImport ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
                      Export
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Material</label>
                  <select
                    required value={newMatName} onChange={e => setNewMatName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- Select Material --</option>
                    {allMaterialNames.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {newMatIsImport ? (
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Price per Ton ($)</label>
                    <input
                      type="number" step="any" value={newMatPricePerTon} onChange={e => setNewMatPricePerTon(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Price per CY ($)</label>
                      <input
                        type="number" step="any" value={newMatPricePerCy} onChange={e => setNewMatPricePerCy(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div />
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">10-Wheeler Load Price ($, optional)</label>
                      <input
                        type="number" step="any" value={newMat10wLoad} onChange={e => setNewMat10wLoad(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Side Dump Load Price ($, optional)</label>
                      <input
                        type="number" step="any" value={newMatSdLoad} onChange={e => setNewMatSdLoad(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2 flex space-x-2 pt-2">
                  <button type="button" onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-semibold transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={addingMaterial || !newMatFacilityId || !newMatName}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">
                    {addingMaterial ? 'Adding...' : 'Add Material'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
