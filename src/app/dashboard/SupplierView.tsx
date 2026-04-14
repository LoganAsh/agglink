import React from 'react';
import LogoutButton from '@/components/LogoutButton';

export default function SupplierView() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0b1120] text-slate-300 font-sans">
      

    {/*  Sidebar  */}
    <aside className="w-64 bg-slate-900 border-r border-panelBorder flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-panelBorder">
            <i className="fa-solid fa-route text-brand text-2xl mr-3"></i>
            <span className="text-xl font-bold text-white tracking-wide">AggLink<span className="text-brand">.</span></span>
            <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 uppercase tracking-widest">Supplier</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
            <a href="#" className="flex items-center px-4 py-3 bg-brand/10 text-brand rounded-lg font-medium">
                <i className="fa-solid fa-warehouse w-6"></i> Inventory & Pricing
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors">
                <i className="fa-solid fa-handshake w-6"></i> Project Quotes
                <span className="ml-auto bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full">3</span>
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors">
                <i className="fa-solid fa-chart-pie w-6"></i> Market Analytics
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors">
                <i className="fa-solid fa-truck-ramp-box w-6"></i> Scale House Log
            </a>
        </nav>
        <div className="p-4 border-t border-panelBorder">
            <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-blue-200 font-bold border border-blue-700">
                    GR
                </div>
                <div className="ml-3">
                    <p className="text-sm font-semibold text-white">Black Rock Pit</p>
                    <p className="text-xs text-slate-400">Geneva Rock</p>
                </div>
            </div>
        </div>
    </aside>

    {/*  Main Content  */}
    <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/*  Top Header  */}
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-panelBorder flex items-center justify-between px-8 sticky top-0 z-10">
            <div className="relative w-96">
                <i className="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"></i>
                <input type="text" placeholder="Search materials, contractors, or projects..." className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand transition-colors" />
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
                    <button className="px-4 py-2 bg-brand/10 text-brand border border-brand/20 rounded-lg text-sm font-semibold hover:bg-brand/20 transition-colors">
                        <i className="fa-solid fa-sliders mr-2"></i> Bulk Adjust Prices
                    </button>
                    <button className="bg-brand hover:bg-brandHover text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-brand/20 transition-all">
                        <i className="fa-solid fa-plus mr-2"></i> Add Material
                    </button>
                </div>
            </div>

            {/*  KPI Cards  */}
            <div className="grid grid-cols-4 gap-6">
                <div className="bg-panel border border-panelBorder rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Today&apos;s Volume</p>
                            <h3 className="text-3xl font-bold text-white mt-1">2,840<span className="text-sm font-normal text-slate-400"> Tons</span></h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <i className="fa-solid fa-scale-balanced text-lg"></i>
                        </div>
                    </div>
                </div>
                
                <div className="bg-panel border border-panelBorder rounded-xl p-5 shadow-sm border-l-4 border-l-brand">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Quotes</p>
                            <h3 className="text-3xl font-bold text-white mt-1">3 <span className="text-sm font-normal text-brand">Requests</span></h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                            <i className="fa-solid fa-hand-holding-dollar text-lg"></i>
                        </div>
                    </div>
                </div>

                <div className="bg-panel border border-panelBorder rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Top Moving Mat.</p>
                            <h3 className="text-xl font-bold text-white mt-2">UDOT Road Base</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <i className="fa-solid fa-layer-group text-lg"></i>
                        </div>
                    </div>
                </div>

                <div className="bg-panel border border-panelBorder rounded-xl p-5 shadow-sm">
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
                    <div className="bg-panel border border-panelBorder rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-panelBorder bg-slate-800/50 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-white"><i className="fa-solid fa-boxes-stacked text-brand mr-2"></i> Primary Aggregate Inventory</h2>
                            <div className="flex space-x-2">
                                <span className="px-2 py-1 bg-slate-700 text-xs rounded text-slate-300">Last Synced: Just now</span>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-panelBorder">
                                    <tr>
                                        <th className="px-5 py-4">Material Name</th>
                                        <th className="px-5 py-4">Stock Level</th>
                                        <th className="px-5 py-4 text-right">Public Rate ($/T)</th>
                                        <th className="px-5 py-4 text-center">Status</th>
                                        <th className="px-5 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-panelBorder">
                                    {/*  Row 1  */}
                                    <tr className="hover:bg-slate-800 transition-colors">
                                        <td className="px-5 py-4 font-medium text-white">UDOT Spec Road Base</td>
                                        <td className="px-5 py-4">
                                            <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                                            </div>
                                            <span className="text-[10px] text-slate-400">45,000+ Tons</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end">
                                                <span className="font-bold text-white">$10.70</span>
                                                <i className="fa-solid fa-pen text-slate-500 hover:text-white cursor-pointer ml-3 text-xs"></i>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20">In Stock</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button className="text-brand hover:text-brandHover text-xs font-semibold uppercase tracking-wide">
                                                <i className="fa-solid fa-tags mr-1"></i> Special Pricing
                                            </button>
                                        </td>
                                    </tr>
                                    {/*  Row 2  */}
                                    <tr className="hover:bg-slate-800 transition-colors">
                                        <td className="px-5 py-4 font-medium text-white">A1b Fill Dirt</td>
                                        <td className="px-5 py-4">
                                            <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                                            </div>
                                            <span className="text-[10px] text-slate-400">Unlimited</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end">
                                                <span className="font-bold text-white">$8.05</span>
                                                <i className="fa-solid fa-pen text-slate-500 hover:text-white cursor-pointer ml-3 text-xs"></i>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20">In Stock</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button className="text-brand hover:text-brandHover text-xs font-semibold uppercase tracking-wide">
                                                <i className="fa-solid fa-tags mr-1"></i> Special Pricing
                                            </button>
                                        </td>
                                    </tr>
                                    {/*  Row 3  */}
                                    <tr className="bg-amber-500/5 hover:bg-slate-800 transition-colors">
                                        <td className="px-5 py-4 font-medium text-white">2&quot; Gravel</td>
                                        <td className="px-5 py-4">
                                            <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                                                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                                            </div>
                                            <span className="text-[10px] text-amber-400">Low: Crushing scheduled</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end">
                                                <span className="font-bold text-white">$17.50</span>
                                                <i className="fa-solid fa-pen text-slate-500 hover:text-white cursor-pointer ml-3 text-xs"></i>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded border border-amber-500/20">Low Stock</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button className="text-brand hover:text-brandHover text-xs font-semibold uppercase tracking-wide">
                                                <i className="fa-solid fa-tags mr-1"></i> Special Pricing
                                            </button>
                                        </td>
                                    </tr>
                                    {/*  Row 4  */}
                                    <tr className="hover:bg-slate-800 transition-colors">
                                        <td className="px-5 py-4 font-medium text-white">1&quot; Gravel</td>
                                        <td className="px-5 py-4">
                                            <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                                            </div>
                                            <span className="text-[10px] text-slate-400">12,000 Tons</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end">
                                                <span className="font-bold text-white">$19.40</span>
                                                <i className="fa-solid fa-pen text-slate-500 hover:text-white cursor-pointer ml-3 text-xs"></i>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20">In Stock</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button className="text-brand hover:text-brandHover text-xs font-semibold uppercase tracking-wide">
                                                <i className="fa-solid fa-tags mr-1"></i> Special Pricing
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/*  Right Col: Project Specific Requests  */}
                <div className="col-span-1 space-y-6">
                    {/*  Project Request Widget  */}
                    <div className="bg-slate-800 border-2 border-brand/50 rounded-xl shadow-lg shadow-brand/10 overflow-hidden">
                        <div className="bg-brand/10 p-4 border-b border-brand/20 flex justify-between items-center">
                            <h3 className="text-brand font-bold"><i className="fa-solid fa-bolt mr-2"></i> Quote Requests</h3>
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand"></span>
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
                                            <input type="text" value="9.50" className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 pl-5 text-sm text-white focus:border-brand focus:outline-none" />
                                        </div>
                                    </div>
                                    <button className="bg-brand hover:bg-brandHover text-white px-3 py-1.5 rounded text-xs font-bold transition-colors">
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
                                    <button className="text-brand hover:text-brandHover text-xs font-bold transition-colors">
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
