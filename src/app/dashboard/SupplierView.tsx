"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import LogoutButton from '@/components/LogoutButton';



export default function SupplierView({ 
  profileName = "Black Rock Pit", 
  companyName = "Geneva Rock",
  totalVolume = 0,
  pendingQuotes = 0,
  topMaterial = "UDOT Spec Road Base",
  materials = []
}: { profileName?: string, companyName?: string, totalVolume?: number, pendingQuotes?: number, topMaterial?: string, materials?: any[] }) {

  const supabase = createClient();
  const [mats, setMats] = useState<any[]>(materials);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number | string>("");
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = (mat: any) => {
    setEditingId(mat.id);
    setEditPrice(mat.is_import ? mat.price_per_ton : mat.price_per_cy);
  };

  const savePrice = async (mat: any) => {
    setIsSaving(true);
    const priceField = mat.is_import ? 'price_per_ton' : 'price_per_cy';
    const numPrice = parseFloat(editPrice as string);

    const { error } = await supabase
      .from('materials')
      .update({ [priceField]: numPrice })
      .eq('id', mat.id);

    if (!error) {
      setMats(mats.map(m => m.id === mat.id ? { ...m, [priceField]: numPrice } : m));
      setEditingId(null);
    } else {
      alert("Error updating price. RLS might be blocking it if you don't own this facility!");
      console.error(error);
    }
    setIsSaving(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0b1120] text-slate-300 font-sans">
      

    {/*  Sidebar  */}
    <aside className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-700">
            <i className="fa-solid fa-route text-orange-500 text-2xl mr-3"></i>
            <span className="text-xl font-bold text-white tracking-wide">AggLink<span className="text-orange-500">.</span></span>
            <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 uppercase tracking-widest">Supplier</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
            <a href="#" className="flex items-center px-4 py-3 bg-orange-500/10 text-orange-500 rounded-lg font-medium">
                <i className="fa-solid fa-warehouse w-6"></i> Inventory & Pricing
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors">
                <i className="fa-solid fa-handshake w-6"></i> Project Quotes
                <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">3</span>
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors">
                <i className="fa-solid fa-chart-pie w-6"></i> Market Analytics
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors">
                <i className="fa-solid fa-truck-ramp-box w-6"></i> Scale House Log
            </a>
        </nav>
        <div className="p-4 border-t border-slate-700">
            <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-blue-200 font-bold border border-blue-700">
                    GR
                </div>
                <div className="ml-3">
                    <p className="text-sm font-semibold text-white">{profileName}</p>
                    <p className="text-xs text-slate-400">{companyName}</p>
                </div>
            </div>
        </div>
        <LogoutButton />
    </aside>

    {/*  Main Content  */}
    <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/*  Top Header  */}
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-8 sticky top-0 z-10">
            <div className="relative w-96">
                <i className="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"></i>
                <input type="text" placeholder="Search materials, contractors, or projects..." className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
            <div className="flex items-center space-x-6">
                <button className="text-slate-400 hover:text-white relative">
                    <i className="fa-solid fa-bell text-lg"></i>
                </button>
                <button className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                    <i className="fa-solid fa-download mr-2"></i> Export Report
                </button>
            </div>
        </header>

        {/*  Dashboard Content  */}
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white">Live Catalog Management</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage public pricing, stock levels, and project-specific contractor rates.</p>
                </div>
                <div className="flex space-x-3">
                    <button className="px-4 py-2 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-lg text-sm font-semibold hover:bg-orange-500/20 transition-colors">
                        <i className="fa-solid fa-sliders mr-2"></i> Bulk Adjust Prices
                    </button>
                    <button className="bg-orange-500 hover:bg-orange-500Hover text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-orange-500/20 transition-all">
                        <i className="fa-solid fa-plus mr-2"></i> Add Material
                    </button>
                </div>
            </div>

            {/*  KPI Cards  */}
            <div className="grid grid-cols-4 gap-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Today&apos;s Volume</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{totalVolume.toLocaleString()}<span className="text-sm font-normal text-slate-400"> Tons</span></h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <i className="fa-solid fa-scale-balanced text-lg"></i>
                        </div>
                    </div>
                </div>
                
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm border-l-4 border-l-brand">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Quotes</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{pendingQuotes} <span className="text-sm font-normal text-orange-500">Requests</span></h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <i className="fa-solid fa-hand-holding-dollar text-lg"></i>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Top Moving Mat.</p>
                            <h3 className="text-xl font-bold text-white mt-2">{topMaterial}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <i className="fa-solid fa-layer-group text-lg"></i>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Market Position</p>
                            <h3 className="text-3xl font-bold text-emerald-400 mt-1">-1.2%</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <i className="fa-solid fa-bullseye text-lg"></i>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">Slightly below avg market rate</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/*  Left Col: Main Material Catalog  */}
                <div className="col-span-2 space-y-6">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-white"><i className="fa-solid fa-boxes-stacked text-orange-500 mr-2"></i> Primary Aggregate Inventory</h2>
                            <div className="flex space-x-2">
                                <span className="px-2 py-1 bg-slate-700 text-xs rounded text-slate-300">Last Synced: Just now</span>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-700">
                                    <tr>
                                        <th className="px-5 py-4">Material Name</th>
                                        <th className="px-5 py-4">Stock Level</th>
                                        <th className="px-5 py-4 text-right">Public Rate ($/T)</th>
                                        <th className="px-5 py-4 text-center">Status</th>
                                        <th className="px-5 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                      {mats && mats.length > 0 ? mats.map((mat: any, idx: number) => (
                                          <tr key={idx} className="hover:bg-slate-800 transition-colors">
                                              <td className="px-5 py-4 font-medium text-white">{mat.name}</td>
                                              <td className="px-5 py-4">
                                                  <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                                                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                                                  </div>
                                                  <span className="text-[10px] text-slate-400">In Stock</span>
                                              </td>
                                              <td className="px-5 py-4 text-right">
                                                  <div className="flex items-center justify-end">
                                                      {editingId === mat.id ? (
                                                          <div className="flex items-center space-x-2">
                                                              <span className="text-white">$</span>
                                                              <input 
                                                                  type="number" 
                                                                  value={editPrice}
                                                                  onChange={(e) => setEditPrice(e.target.value)}
                                                                  className="w-20 bg-slate-900 border border-orange-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
                                                                  step="0.01"
                                                              />
                                                              <button disabled={isSaving} onClick={() => savePrice(mat)} className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50">
                                                                  <i className="fa-solid fa-check"></i>
                                                              </button>
                                                              <button disabled={isSaving} onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300 disabled:opacity-50">
                                                                  <i className="fa-solid fa-xmark"></i>
                                                              </button>
                                                          </div>
                                                      ) : (
                                                          <>
                                                              <span className="font-bold text-white">${(mat.is_import ? mat.price_per_ton : mat.price_per_cy).toFixed(2)}</span>
                                                              <button onClick={() => startEditing(mat)} className="text-slate-500 hover:text-white ml-3 text-xs focus:outline-none">
                                                                  <i className="fa-solid fa-pen"></i>
                                                              </button>
                                                          </>
                                                      )}
                                                  </div>
                                              </td>
                                              <td className="px-5 py-4 text-center">
                                                  <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20">Active</span>
                                              </td>
                                              <td className="px-5 py-4 text-right">
                                                  <button className="text-orange-500 hover:text-orange-600 text-xs font-semibold uppercase tracking-wide">
                                                      <i className="fa-solid fa-tags mr-1"></i> Special Pricing
                                                  </button>
                                              </td>
                                          </tr>
                                      )) : (
                                          <tr>
                                              <td colSpan={5} className="px-5 py-8 text-center text-slate-500 italic">No materials found for your facility.</td>
                                          </tr>
                                      )}
                                  </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/*  Right Col: Project Specific Requests  */}
                <div className="col-span-1 space-y-6">
                    {/*  Project Request Widget  */}
                    <div className="bg-slate-800 border-2 border-orange-500/50 rounded-xl shadow-lg shadow-orange-500/10 overflow-hidden">
                        <div className="bg-orange-500/10 p-4 border-b border-orange-500/20 flex justify-between items-center">
                            <h3 className="text-orange-500 font-bold"><i className="fa-solid fa-bolt mr-2"></i> Quote Requests</h3>
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                            </span>
                        </div>
                        
                        <div className="p-5 space-y-4">
                            {/*  Request 1  */}
                            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-white font-semibold">Ash Excavation</h4>
                                    <span className="text-xs text-slate-400">10 mins ago</span>
                                </div>
                                <p className="text-sm text-slate-300">Project Alpha: <span className="font-bold text-white">1,500 Tons</span></p>
                                <p className="text-sm text-slate-400 mt-1">Material: UDOT Spec Road Base</p>
                                <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <span className="text-xs text-slate-500 mr-2">Set Price:</span>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white text-sm">$</span>
                                            <input type="text" value="9.50" className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 pl-5 text-sm text-white focus:border-orange-500 focus:outline-none" />
                                        </div>
                                    </div>
                                    <button className="bg-orange-500 hover:bg-orange-500Hover text-white px-3 py-1.5 rounded text-xs font-bold transition-colors">
                                        Send Quote
                                    </button>
                                </div>
                            </div>

                            {/*  Request 2  */}
                            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 opacity-75">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-white font-semibold">Salt Lake Utilities</h4>
                                    <span className="text-xs text-slate-400">2 hours ago</span>
                                </div>
                                <p className="text-sm text-slate-300">City Water Main: <span className="font-bold text-white">800 Tons</span></p>
                                <p className="text-sm text-slate-400 mt-1">Material: Bedding Sand</p>
                                <div className="mt-4 pt-3 border-t border-slate-700 flex justify-end">
                                    <button className="text-slate-400 hover:text-white text-xs font-semibold mr-4">Decline</button>
                                    <button className="text-orange-500 hover:text-orange-500Hover text-xs font-bold transition-colors">
                                        Review Request <i className="fa-solid fa-arrow-right ml-1"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </main>


    </div>
  );
}
