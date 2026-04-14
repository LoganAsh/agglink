import React from 'react';

export default function Dashboard() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0b1120] text-slate-300 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
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
              <a href="#" className="flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors">
                  Supplier Network
              </a>
              <a href="#" className="flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors">
                  Fleet Dispatch
              </a>
              <a href="#" className="flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors">
                  Proposals
              </a>
          </nav>
          <div className="p-4 border-t border-slate-800">
              <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border-2 border-slate-500">
                      LA
                  </div>
                  <div className="ml-3">
                      <p className="text-sm font-semibold text-white">Logan Ash</p>
                      <p className="text-xs text-slate-400">Ash Excavation</p>
                  </div>
              </div>
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
          {/* Top Header */}
          <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10">
              <div className="relative w-96">
                  <input type="text" placeholder="Search estimates, pits, or materials..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
              <div className="flex items-center space-x-6">
                  <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-orange-500/20 transition-all">
                      + New Estimate
                  </button>
              </div>
          </header>

          {/* Dashboard Content */}
          <div className="p-8 space-y-6">
              <div className="flex justify-between items-end">
                  <div>
                      <h1 className="text-2xl font-bold text-white">Marketplace Overview</h1>
                      <p className="text-slate-400 text-sm mt-1">Real-time aggregate logistics across the Salt Lake Valley.</p>
                  </div>
                  <div className="flex space-x-2">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">API Connected</span>
                  </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-6">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Avg Freight Savings</p>
                              <h3 className="text-3xl font-bold text-white mt-1">14.2%</h3>
                          </div>
                      </div>
                      <p className="text-xs text-emerald-400 mt-3">2.1% from last month</p>
                  </div>
                  
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Network</p>
                              <h3 className="text-3xl font-bold text-white mt-1">28</h3>
                          </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-3">14 Pits | 14 Recycling/Dumps</p>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Est. Value</p>
                              <h3 className="text-3xl font-bold text-white mt-1">$1.4M</h3>
                          </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-3">Across 12 active bids</p>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Market Price</p>
                              <h3 className="text-3xl font-bold text-white mt-1">$10.20<span className="text-sm text-slate-400 font-normal">/ton</span></h3>
                          </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-3">Avg Road Base (SLC Region)</p>
                  </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-3 gap-6">
                  
                  {/* Left Col: Live Routing Engine */}
                  <div className="col-span-2 space-y-6">
                      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                          <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                              <h2 className="text-lg font-semibold text-white">Live Routing: Project Alpha</h2>
                              <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg text-xs font-medium">Req: 1,500 Tons (UDOT Base)</span>
                          </div>
                          
                          {/* Map Mockup */}
                          <div className="h-64 bg-slate-800 w-full relative border-b border-slate-700 flex items-center justify-center">
                              <span className="text-slate-500">[Interactive Map Component Will Load Here]</span>
                          </div>

                          {/* Results Table */}
                          <div className="p-0 overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                  <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-y border-slate-700">
                                      <tr>
                                          <th className="px-5 py-3">Supplier</th>
                                          <th className="px-5 py-3">Truck Fleet</th>
                                          <th className="px-5 py-3 text-right">Cycle</th>
                                          <th className="px-5 py-3 text-right">Base $/T</th>
                                          <th className="px-5 py-3 text-right">Frt $/T</th>
                                          <th className="px-5 py-3 text-right text-orange-500">Total $/T</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-700">
                                      <tr className="bg-orange-500/5 hover:bg-slate-900 transition-colors">
                                          <td className="px-5 py-4 font-medium text-white">Geneva Rock (Black Rock)</td>
                                          <td className="px-5 py-4 text-slate-400">10-Wheeler</td>
                                          <td className="px-5 py-4 text-right">58 min</td>
                                          <td className="px-5 py-4 text-right">$10.70</td>
                                          <td className="px-5 py-4 text-right">$8.70</td>
                                          <td className="px-5 py-4 text-right font-bold text-orange-500">$19.40</td>
                                      </tr>
                                      <tr className="hover:bg-slate-900 transition-colors">
                                          <td className="px-5 py-4 font-medium text-white">Kilgore (West Valley)</td>
                                          <td className="px-5 py-4 text-slate-400">Side Dump</td>
                                          <td className="px-5 py-4 text-right">64 min</td>
                                          <td className="px-5 py-4 text-right">$11.50</td>
                                          <td className="px-5 py-4 text-right">$6.88</td>
                                          <td className="px-5 py-4 text-right font-bold text-white">$18.38</td>
                                      </tr>
                                      <tr className="hover:bg-slate-900 transition-colors">
                                          <td className="px-5 py-4 font-medium text-white">TM Crushing (Glenwood)</td>
                                          <td className="px-5 py-4 text-slate-400">Side Dump</td>
                                          <td className="px-5 py-4 text-right">72 min</td>
                                          <td className="px-5 py-4 text-right">$10.20</td>
                                          <td className="px-5 py-4 text-right">$8.60</td>
                                          <td className="px-5 py-4 text-right font-bold text-white">$18.80</td>
                                      </tr>
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>

                  {/* Right Col: Supplier Marketplace */}
                  <div className="col-span-1 space-y-6">
                      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm h-full flex flex-col">
                          <div className="p-5 border-b border-slate-700 flex justify-between items-center">
                              <h2 className="text-lg font-semibold text-white">Supplier Network Exchange</h2>
                          </div>
                          
                          <div className="p-5 flex-1 space-y-4">
                              {/* Export Item */}
                              <div className="border border-blue-500/30 bg-blue-500/5 rounded-lg p-4">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block">Accepting Export</span>
                                          <h4 className="text-white font-medium text-sm">Salt Lake Valley Landfill</h4>
                                          <p className="text-xs text-slate-400 mt-1">Clean Fill (Dirt)</p>
                                      </div>
                                      <div className="text-right">
                                          <div className="text-lg font-bold text-white">$0.00<span className="text-xs text-slate-400 font-normal">/CY</span></div>
                                          <p className="text-[10px] text-emerald-400 mt-1">Open till 5:00 PM</p>
                                      </div>
                                  </div>
                              </div>

                              {/* Import Item */}
                              <div className="border border-orange-500/30 bg-orange-500/5 rounded-lg p-4">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-500 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block">Material Supply</span>
                                          <h4 className="text-white font-medium text-sm">Concrete Recycling Inc.</h4>
                                          <p className="text-xs text-slate-400 mt-1">1&quot; Gravel (Recycled)</p>
                                      </div>
                                      <div className="text-right">
                                          <div className="text-lg font-bold text-white">$12.00<span className="text-xs text-slate-400 font-normal">/Ton</span></div>
                                          <p className="text-[10px] text-emerald-400 mt-1">High Inventory</p>
                                      </div>
                                  </div>
                              </div>
                              
                              {/* Import Item */}
                              <div className="border border-slate-600 bg-slate-900/50 rounded-lg p-4">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block">Material Supply</span>
                                          <h4 className="text-white font-medium text-sm">Bland Recycling</h4>
                                          <p className="text-xs text-slate-400 mt-1">Recycled Concrete Road Base</p>
                                      </div>
                                      <div className="text-right">
                                          <div className="text-lg font-bold text-white">$8.75<span className="text-xs text-slate-400 font-normal">/Ton</span></div>
                                      </div>
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
