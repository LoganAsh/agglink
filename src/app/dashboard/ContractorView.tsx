/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from 'react';
import LogoutButton from '@/components/LogoutButton';

export default function ContractorView({ 
  profileName = "Logan Ash", 
  companyName = "Ash Excavation", 
  pitsCount = 14, 
  dumpsCount = 14,
  recentMaterials = []
}: { profileName?: string, companyName?: string, pitsCount?: number, dumpsCount?: number, recentMaterials?: any[] }) {



  const [address, setAddress] = useState("");
  const [qty] = useState(1500);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, qty, jobType: "Import (Delivery)", materials: [] })
      });
      const data = await response.json();
      if (data.success) {
        setResults(data.data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0b1120] text-slate-300 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-slate-800">
              <span className="text-xl font-bold text-white tracking-wide">AggLink<span className="text-orange-500">.</span></span>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
              <a href="#" className="flex items-center px-4 py-3 bg-orange-500/10 text-orange-500 rounded-lg font-medium">
                  Dashboard
              </a>
              <a href="#" className="flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors">
                  Smart Estimator
              </a>
          </nav>
          <div className="p-4 border-t border-slate-800">
              <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border-2 border-slate-500">
                      {profileName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="ml-3">
                      <p className="text-sm font-semibold text-white">{profileName}</p>
                      <p className="text-xs text-slate-400">{companyName}</p>
                  </div>
              </div>
          </div>
          <LogoutButton />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
          {/* Top Header */}
          <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10">
              <form onSubmit={handleSearch} className="relative w-full md:w-96 flex space-x-2">
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter Job Site Address..." 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" 
                  />
                  <button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                    {loading ? 'Routing...' : 'Route'}
                  </button>
              </form>
              <div className="flex items-center space-x-6">
                  <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-orange-500/20 transition-all hidden sm:block">
                      + New Estimate
                  </button>
              </div>
          </header>

          {/* Dashboard Content */}
          <div className="p-4 md:p-8 space-y-6">
              <div className="flex justify-between items-end">
                  <div>
                      <h1 className="text-2xl font-bold text-white">Marketplace Overview</h1>
                      <p className="text-slate-400 text-sm mt-1">Real-time aggregate logistics across the Salt Lake Valley.</p>
                  </div>
                  <div className="flex space-x-2">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">Live DB Connected</span>
                  </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Avg Freight Savings</p>
                      <h3 className="text-3xl font-bold text-white mt-1">14.2%</h3>
                      <p className="text-xs text-emerald-400 mt-3">2.1% from last month</p>
                  </div>
                  
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Network</p>
                      <h3 className="text-3xl font-bold text-white mt-1">{pitsCount + dumpsCount}</h3>
                      <p className="text-xs text-slate-400 mt-3">{pitsCount} Pits | {dumpsCount} Dumps</p>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Est. Value</p>
                      <h3 className="text-3xl font-bold text-white mt-1">$1.4M</h3>
                      <p className="text-xs text-slate-400 mt-3">Across 12 active bids</p>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Market Price</p>
                      <h3 className="text-3xl font-bold text-white mt-1">$10.20<span className="text-sm text-slate-400 font-normal">/ton</span></h3>
                      <p className="text-xs text-slate-400 mt-3">Avg Road Base (SLC Region)</p>
                  </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Col: Live Routing Engine */}
                  <div className="col-span-1 lg:col-span-2 space-y-6">
                      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                          <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                              <h2 className="text-lg font-semibold text-white">Live Routing Preview</h2>
                              <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg text-xs font-medium">Req: 1,500 Tons</span>
                          </div>
                          
                          <div className="h-64 bg-slate-800 w-full relative border-b border-slate-700 flex items-center justify-center">
                              <span className="text-slate-500">[Interactive Map Component Coming Next]</span>
                          </div>

                          {/* Results Table (Static Placeholder for now) */}
                          <div className="p-0 overflow-x-auto w-full">
                              <table className="w-full min-w-[600px] text-sm text-left">
                                  <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-y border-slate-700">
                                      <tr>
                                          <th className="px-5 py-3">Supplier</th>
                                          <th className="px-5 py-3">Truck Fleet</th>
                                          <th className="px-5 py-3 text-right">Base $/T</th>
                                          <th className="px-5 py-3 text-right">Frt $/T</th>
                                          <th className="px-5 py-3 text-right text-orange-500">Total $/T</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-700">
                                    {results.length > 0 ? results.map((res: any, idx: number) => (
                                      <tr key={idx} className={idx === 0 ? "bg-orange-500/5 hover:bg-slate-900 transition-colors" : "hover:bg-slate-900 transition-colors"}>
                                          <td className="px-5 py-4 font-medium text-white">{res.supplier}</td>
                                          <td className="px-5 py-4 text-slate-400">{res.truckFleet}</td>
                                          <td className="px-5 py-4 text-right">${res.basePrice.toFixed(2)}</td>
                                          <td className="px-5 py-4 text-right">${res.frtPerUnit.toFixed(2)}</td>
                                          <td className="px-5 py-4 text-right font-bold text-orange-500">${res.totalPerUnit.toFixed(2)}</td>
                                      </tr>
                                    )) : (
                                      <tr>
                                          <td colSpan={5} className="px-5 py-8 text-center text-slate-500 italic">Enter a job site address and hit Route to run the live logistics engine.</td>
                                      </tr>
                                    )}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>

                  {/* Right Col: Supplier Marketplace */}
                  <div className="col-span-1 space-y-6">
                      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm h-full flex flex-col">
                          <div className="p-5 border-b border-slate-700 flex justify-between items-center">
                              <h2 className="text-lg font-semibold text-white">Live Supplier Feed</h2>
                          </div>
                          
                          <div className="p-5 flex-1 space-y-4">
                              {recentMaterials.length > 0 ? (
                                recentMaterials.map((mat: any, idx: number) => (
                                  <div key={idx} className={`border rounded-lg p-4 ${mat.is_import ? 'border-orange-500/30 bg-orange-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block ${mat.is_import ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-400'}`}>
                                                  {mat.is_import ? 'Material Supply' : 'Accepting Export'}
                                              </span>
                                              <h4 className="text-white font-medium text-sm">{mat.facility?.name}</h4>
                                              <p className="text-xs text-slate-400 mt-1">{mat.name}</p>
                                          </div>
                                          <div className="text-right">
                                              <div className="text-lg font-bold text-white">
                                                  ${mat.is_import ? mat.price_per_ton.toFixed(2) : mat.price_per_cy.toFixed(2)}
                                                  <span className="text-xs text-slate-400 font-normal">/{mat.is_import ? 'Ton' : 'CY'}</span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-slate-500 text-sm text-center py-4">No live data yet.</p>
                              )}
                          </div>
                      </div>
                  </div>

              </div>
          </div>
      </main>
    </div>
  );
}
