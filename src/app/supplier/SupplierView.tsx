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
  allMaterialNames = [],
}: {
  profile: any;
  facilities: any[];
  materials: any[];
  allMaterialNames?: string[];
}) {
  const supabase = createClient();

  const [materials, setMaterials] = useState<any[]>(initialMaterials);
  const [activeTab, setActiveTab] = useState<'materials' | 'add'>('materials');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState('');

  // Add material form state
  const [newMatFacilityId, setNewMatFacilityId] = useState(facilities[0]?.id || '');
  const [newMatName, setNewMatName] = useState('');
  const [newMatIsImport, setNewMatIsImport] = useState(true);
  const [newMatPricePerTon, setNewMatPricePerTon] = useState('');
  const [newMatPricePerCy, setNewMatPricePerCy] = useState('');
  const [newMat10wLoad, setNewMat10wLoad] = useState('');
  const [newMatSdLoad, setNewMatSdLoad] = useState('');
  const [newMatStock, setNewMatStock] = useState('in_stock');
  const [addingMaterial, setAddingMaterial] = useState(false);

  //        Stock status
  const updateStockStatus = async (materialId: string, status: string) => {
    setSavingId(materialId);
    const { error } = await supabase.from('materials').update({ stock_status: status }).eq('id', materialId);
    if (!error) setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, stock_status: status } : m));
    else alert('Failed to update stock status');
    setSavingId(null);
  };

  //        Price editing
  const startEditPrice = (mat: any) => {
    setEditingPriceId(mat.id);
    setEditPriceVal(mat.is_import ? (mat.price_per_ton || '') : (mat.price_per_cy || ''));
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

  //        Add material
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
      stock_status: newMatStock,
    }]).select().single();
    if (data && !error) {
      setMaterials([...materials, data]);
      setNewMatName(''); setNewMatPricePerTon(''); setNewMatPricePerCy('');
      setNewMat10wLoad(''); setNewMatSdLoad(''); setNewMatStock('in_stock');
      setActiveTab('materials');
    } else alert('Failed to add material: ' + error?.message);
    setAddingMaterial(false);
  };

  //        Delete material
  const deleteMaterial = async (materialId: string) => {
    if (!confirm('Remove this material from your supply list?')) return;
    const { error } = await supabase.from('materials').delete().eq('id', materialId);
    if (!error) setMaterials(prev => prev.filter(m => m.id !== materialId));
    else alert('Failed to remove material');
  };

  // Group materials by facility
  const materialsByFacility = facilities.map(fac => ({
    facility: fac,
    materials: materials.filter(m => m.facility_id === fac.id),
  })).filter(g => g.materials.length > 0);

  const initials = (profile.company_name || 'SP').substring(0, 2).toUpperCase();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0b1120] text-slate-300 font-sans">

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold text-white tracking-wide">AggLink<span className="text-orange-500">.</span></span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button onClick={() => setActiveTab('materials')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'materials' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-cubes w-4 text-center"></i>
            <span>My Materials</span>
          </button>
          <button onClick={() => setActiveTab('add')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'add' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-plus w-4 text-center"></i>
            <span>Add Material</span>
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-sm">{initials}</div>
            <div className="ml-3">
              <p className="text-sm font-semibold text-white truncate">{profile.company_name || 'Supplier'}</p>
              <p className="text-xs text-orange-400 font-medium">Supplier</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">

        {/* Header */}
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <span className="md:hidden text-base font-bold text-white">AggLink<span className="text-orange-500">.</span></span>
            <h1 className="text-lg font-semibold text-white">
              {activeTab === 'materials' ? 'My Materials' : 'Add Material'}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            {activeTab === 'materials' && (
              <button onClick={() => setActiveTab('add')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-orange-500/20 transition-all">
                + Add Material
              </button>
            )}
            <div className="md:hidden"><LogoutButton /></div>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">

          {/*        MY MATERIALS TAB        */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              {materialsByFacility.length === 0 ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                  <i className="fa-solid fa-cubes text-4xl text-slate-600 mb-3"></i>
                  <p className="text-slate-400 text-sm">No materials added yet.</p>
                  <button onClick={() => setActiveTab('add')} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all">
                    Add Your First Material
                  </button>
                </div>
              ) : materialsByFacility.map(({ facility, materials: facMats }) => (
                <div key={facility.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                  {/* Facility header */}
                  <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50 flex items-center space-x-3">
                    <i className="fa-solid fa-location-dot text-orange-500"></i>
                    <div>
                      <h2 className="text-sm font-semibold text-white">{facility.name}</h2>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${facility.type === 'pit' ? 'text-orange-400' : facility.type === 'dump' ? 'text-blue-400' : 'text-emerald-400'}`}>
                        {facility.type}
                      </span>
                    </div>
                    <span className="ml-auto text-xs text-slate-500">{facMats.length} material{facMats.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Material rows */}
                  <div className="divide-y divide-slate-700/50">
                    {facMats.map((mat: any) => (
                      <div key={mat.id} className="flex items-center justify-between gap-3 py-3 px-4">

                        {/* Left: name + badge */}
                        <div className="flex flex-col min-w-0 flex-shrink-0 w-1/3">
                          <span className="text-sm font-medium text-white truncate">{mat.name}</span>
                          <span className={`text-[10px] font-bold uppercase mt-0.5 ${mat.is_import ? 'text-orange-400' : 'text-blue-400'}`}>
                            {mat.is_import ? 'Import' : 'Export'}
                          </span>
                        </div>

                        {/* Center: stock status */}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {STATUS_OPTIONS.map(opt => (
                            <button key={opt.value} onClick={() => updateStockStatus(mat.id, opt.value)}
                              disabled={savingId === mat.id}
                              className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-all disabled:opacity-50 ${mat.stock_status === opt.value ? opt.color : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500'}`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {/* Right: price + edit + delete */}
                        <div className="flex items-center space-x-2 flex-shrink-0 justify-end w-1/4">
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
                          <button onClick={() => deleteMaterial(mat.id)} className="text-slate-600 hover:text-red-500 transition-colors ml-1">
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/*        ADD MATERIAL TAB        */}
          {activeTab === 'add' && (
            <div className="max-w-2xl">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-5">Add Material to Supply List</h2>
                <form onSubmit={addMaterial} className="space-y-4">

                  {/* Facility */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Facility</label>
                    <select value={newMatFacilityId} onChange={e => setNewMatFacilityId(e.target.value)} required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 appearance-none">
                      {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>

                  {/* Import / Export toggle */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                    <div className="inline-flex relative bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <span className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md transition-all duration-200 ${newMatIsImport ? 'left-0.5 bg-orange-500/20 border border-orange-500/40' : 'left-[calc(50%+2px)] bg-blue-500/20 border border-blue-500/40'}`} />
                      <button type="button" onClick={() => setNewMatIsImport(true)}
                        className={`relative z-10 px-6 py-1.5 text-xs font-semibold rounded-md transition-colors ${newMatIsImport ? 'text-orange-400' : 'text-slate-500'}`}>
                        Import
                      </button>
                      <button type="button" onClick={() => setNewMatIsImport(false)}
                        className={`relative z-10 px-6 py-1.5 text-xs font-semibold rounded-md transition-colors ${!newMatIsImport ? 'text-blue-400' : 'text-slate-500'}`}>
                        Export
                      </button>
                    </div>
                  </div>

                  {/* Material name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Material</label>
                    <select value={newMatName} onChange={e => setNewMatName(e.target.value)} required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 appearance-none">
                      <option value="">-- Select Material --</option>
                      {allMaterialNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {newMatIsImport ? (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Price per Ton ($)</label>
                        <input type="number" step="0.01" value={newMatPricePerTon} onChange={e => setNewMatPricePerTon(e.target.value)}
                          placeholder="0.00" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Price per CY ($)</label>
                          <input type="number" step="0.01" value={newMatPricePerCy} onChange={e => setNewMatPricePerCy(e.target.value)}
                            placeholder="0.00" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">10-Wheeler Load Price ($) <span className="text-slate-500 font-normal">optional</span></label>
                          <input type="number" step="0.01" value={newMat10wLoad} onChange={e => setNewMat10wLoad(e.target.value)}
                            placeholder="0.00" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Side Dump Load Price ($) <span className="text-slate-500 font-normal">optional</span></label>
                          <input type="number" step="0.01" value={newMatSdLoad} onChange={e => setNewMatSdLoad(e.target.value)}
                            placeholder="0.00" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Stock status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Initial Stock Status</label>
                    <div className="flex space-x-2">
                      {STATUS_OPTIONS.map(opt => (
                        <button type="button" key={opt.value} onClick={() => setNewMatStock(opt.value)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${newMatStock === opt.value ? opt.color : 'bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex space-x-3 pt-2">
                    <button type="button" onClick={() => setActiveTab('materials')}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all">
                      Cancel
                    </button>
                    <button type="submit" disabled={addingMaterial || !newMatName || !newMatFacilityId}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-2 rounded-lg text-sm font-semibold transition-all">
                      {addingMaterial ? 'Adding...' : 'Add Material'}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800">
          <div className="flex items-center justify-around px-2 py-2">
            <button onClick={() => setActiveTab('materials')}
              className={`flex flex-col items-center space-y-1 px-6 py-1.5 rounded-lg transition-all ${activeTab === 'materials' ? 'text-orange-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-cubes text-lg"></i>
              <span className="text-[10px] font-medium">Materials</span>
            </button>
            <button onClick={() => setActiveTab('add')}
              className={`flex flex-col items-center space-y-1 px-6 py-1.5 rounded-lg transition-all ${activeTab === 'add' ? 'text-orange-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-plus text-lg"></i>
              <span className="text-[10px] font-medium">Add</span>
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
