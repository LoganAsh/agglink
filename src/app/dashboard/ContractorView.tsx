/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import LogoutButton from '@/components/LogoutButton';

export default function ContractorView({ 
  profileName = "Logan Ash", 
  companyName = "Ash Excavation", 
  pitsCount = 14, 
  dumpsCount = 14,
  // recentMaterials removed for Project Feed
  importMaterials = [],
  exportMaterials = []
}: { profileName?: string, companyName?: string, pitsCount?: number, dumpsCount?: number, importMaterials?: string[], exportMaterials?: string[] }) {

  const supabase = createClient();
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjAddr, setNewProjAddr] = useState("");
  const [savingEstimateId, setSavingEstimateId] = useState<string | null>(null);
  const [savedEstimates, setSavedEstimates] = useState<any[]>([]);
  const [projectQuotes, setProjectQuotes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'locked' | 'pending'>('locked');
  const [requestingId, setRequestingId] = useState<string | null>(null);

  // Manifest States
  const [requirements, setRequirements] = useState<any[]>([]);
  const [manifestResults, setManifestResults] = useState<any>({});
  const [isCalculating, setIsCalculating] = useState(false);

  // Requirement Form States
  const [jobType, setJobType] = useState("Import (Delivery)");
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [qty, setQty] = useState(1500);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false });
      
    if (data) setProjects(data);
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjAddr) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        contractor_id: user.id,
        name: newProjName,
        address: newProjAddr
      }])
      .select()
      .single();

    if (data && !error) {
      setProjects([data, ...projects]);
      setActiveProject(data);
      setShowProjectModal(false);
      setNewProjName("");
      setNewProjAddr("");
      setSavedEstimates([]);
      setRequirements([]);
      setManifestResults({});
    } else {
      alert("Failed to create project");
    }
  };

  const selectProject = async (proj: any) => {
    setActiveProject(proj);
    setManifestResults(proj.cached_results || {});
    setLastCalculated(proj.last_calculated ? new Date(proj.last_calculated) : null);
    
    // Fetch saved estimates
    const { data: estData } = await supabase
      .from('project_estimates')
      .select('*, facility:facilities(name)')
      .eq('project_id', proj.id);
    if (estData) setSavedEstimates(estData);

    // Fetch project requirements (manifest)
    const { data: reqData } = await supabase
      .from('project_requirements')
      .select('*')
      .eq('project_id', proj.id)
      .order('created_at', { ascending: true });
    if (reqData) setRequirements(reqData);
    
    setManifestResults({});
  };

  const addRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !selectedMaterial || !qty) {
      alert("Please select a project and fill out all fields.");
      return;
    }

    const { data, error } = await supabase
      .from('project_requirements')
      .insert([{
        project_id: activeProject.id,
        job_type: jobType,
        material_name: selectedMaterial,
        quantity: qty
      }])
      .select()
      .single();

    if (data && !error) {
      setRequirements([...requirements, data]);
      setSelectedMaterial("");
    } else {
      alert("Failed to add requirement.");
      console.error(error);
    }
  };

  const removeRequirement = async (reqId: string) => {
    const { error } = await supabase.from('project_requirements').delete().eq('id', reqId);
    if (!error) {
      setRequirements(requirements.filter(r => r.id !== reqId));
      const newResults = { ...manifestResults };
      delete newResults[reqId];
      setManifestResults(newResults);
    }
  };

  const calculateManifest = async () => {
    if (!activeProject || requirements.length === 0) return;
    setIsCalculating(true);
    
    const newResults: any = { ...manifestResults };

    for (const req of requirements) {
      try {
        const response = await fetch('/api/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address: activeProject.address, 
            qty: req.quantity, 
            jobType: req.job_type, 
            materials: [req.material_name],
            projectId: activeProject.id
          })
        });
        const data = await response.json();
        if (data.success) {
          // Store top 5 options for this requirement
          newResults[req.id] = data.data.slice(0, 5);
        } else {
          newResults[req.id] = [];
        }
      } catch (err) {
        console.error(err);
        newResults[req.id] = [];
      }
    }
    
    setManifestResults(newResults);
    
    const now = new Date();
    setLastCalculated(now);
    
    // Save these results permanently to the project
    await supabase.from('projects').update({
      cached_results: newResults,
      last_calculated: now.toISOString()
    }).eq('id', activeProject.id);

    setIsCalculating(false);
  };

  const toggleEstimate = async (res: any, req: any) => {
    if (!activeProject) return;
    setSavingEstimateId(res.facilityId + res.truckFleet + req.id);
    
    // Check if this exact option is already saved
    const existingExact = savedEstimates.find(se => se.facility_id === res.facilityId && se.material_name === req.material_name && se.truck_fleet === res.truckFleet);

    if (existingExact) {
      // Toggle OFF: Remove it
      const { error } = await supabase.from('project_estimates').delete().eq('id', existingExact.id);
      if (!error) {
        setSavedEstimates(savedEstimates.filter(se => se.id !== existingExact.id));
      } else {
        alert("Failed to remove saved estimate.");
      }
    } else {
      // Toggle ON: Remove any existing for this material, then insert new
      const existingForMat = savedEstimates.find(se => se.material_name === req.material_name);
      if (existingForMat) {
        await supabase.from('project_estimates').delete().eq('id', existingForMat.id);
      }

      const { data, error } = await supabase
        .from('project_estimates')
        .insert([{
          project_id: activeProject.id,
          facility_id: res.facilityId,
          material_name: req.material_name,
          quantity: req.quantity,
          truck_fleet: res.truckFleet,
          base_price: res.basePrice,
          freight_price: res.frtPerUnit,
          total_price: res.totalPerUnit
        }])
        .select()
        .single();
        
      if (data && !error) {
        const filteredState = savedEstimates.filter(se => se.material_name !== req.material_name);
        setSavedEstimates([...filteredState, { ...data, facility: { name: res.supplier } }]);
      } else {
        alert("Failed to save estimate.");
      }
    }
    setSavingEstimateId(null);
  };

  const requestQuote = async (res: any, req: any) => {
    setRequestingId(res.facilityId + req.id);
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: res.facilityId,
          materialName: req.material_name,
          quantity: req.quantity,
          address: activeProject.address,
          projectId: activeProject.id
        })
      });
      if (response.ok) {
        alert("Quote request sent directly to the supplier!");
        // Optimistically add to state
        setProjectQuotes([...projectQuotes, {
          id: Math.random().toString(),
          facility_id: res.facilityId,
          material_name: req.material_name,
          quantity: req.quantity,
          status: 'pending',
          facility: { name: res.supplier }
        }]);
        setActiveTab('pending');
      } else {
        const errorData = await response.json();
        alert("Database Error: " + errorData.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message); console.error(e);
    }
    setRequestingId(null);
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
              <div className="relative w-full md:w-96 flex items-center">
                  {activeProject ? (
                    <div className="flex items-center space-x-3">
                      <h2 className="text-lg font-semibold text-white">{activeProject.name}</h2>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold uppercase tracking-wider hidden sm:block">
                        Active Project
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Select a project to begin...</span>
                  )}
              </div>
              <div className="flex items-center space-x-2 md:space-x-4">
                  <div className="md:hidden w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg border border-slate-700">
                    <LogoutButton />
                  </div>
                  {projects.length > 0 && (
                    <select 
                      className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
                      onChange={(e) => {
                        if (e.target.value === "") {
                          setActiveProject(null);
                          setSavedEstimates([]);
                          setRequirements([]);
                          setManifestResults({});
                        } else {
                          const p = projects.find(proj => proj.id === e.target.value);
                          if (p) selectProject(p);
                        }
                      }}
                      value={activeProject ? activeProject.id : ""}
                    >
                      <option value="">-- Switch Project --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={() => setShowProjectModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-orange-500/20 transition-all hidden sm:block whitespace-nowrap">
                      + New Project
                  </button>
              </div>
          </header>

          {/* Dashboard Content */}
          <div className="p-4 md:p-8 space-y-6">
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
                  
                  {/* Left Col: Project Manifest & Routing */}
                  <div className="col-span-1 lg:col-span-2 space-y-6">
                      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                          
                          {/* Manifest Header */}
                          <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                              <div>
                                <h2 className="text-lg font-semibold text-white">Project Manifest (Bill of Materials)</h2>
                                {lastCalculated && (
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    <i className="fa-solid fa-clock mr-1"></i> Last Routed: {lastCalculated.toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                                  </p>
                                )}
                              </div>
                              {requirements.length > 0 && (
                                <button 
                                  onClick={calculateManifest} 
                                  disabled={isCalculating}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded text-sm font-bold shadow-lg transition-all disabled:opacity-50"
                                >
                                  {isCalculating ? 'Routing...' : (lastCalculated ? 'Re-Route Logistics' : 'Optimize Logistics')}
                                </button>
                              )}
                          </div>

                          {!activeProject ? (
                            <div className="p-12 text-center text-slate-500">
                                <i className="fa-solid fa-folder-open text-4xl mb-3 opacity-50"></i>
                                <p>Select or create a project to build your logistics manifest.</p>
                            </div>
                          ) : (
                            <div className="p-5 space-y-6">
                                {/* Add Requirement Form */}
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                    <h3 className="text-sm font-semibold text-white mb-3">Add Requirement</h3>
                                    <div className="flex space-x-4 mb-3">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input type="radio" name="jobType" value="Import (Delivery)" checked={jobType === "Import (Delivery)"} onChange={(e) => { setJobType(e.target.value); setSelectedMaterial(""); }} className="text-orange-500 focus:ring-orange-500"/>
                                            <span className="text-sm font-medium text-slate-300">Import</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input type="radio" name="jobType" value="Export (Haul-Off)" checked={jobType === "Export (Haul-Off)"} onChange={(e) => { setJobType(e.target.value); setSelectedMaterial(""); }} className="text-blue-500 focus:ring-blue-500"/>
                                            <span className="text-sm font-medium text-slate-300">Export</span>
                                        </label>
                                    </div>
                                    <form onSubmit={addRequirement} className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                                        <select value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)} required className={`flex-1 bg-slate-800 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none appearance-none ${jobType === 'Import (Delivery)' ? 'border-slate-700 focus:border-orange-500' : 'border-slate-700 focus:border-blue-500'}`}>
                                            <option value="">-- Select Material --</option>
                                            {(jobType === "Import (Delivery)" ? importMaterials : exportMaterials)?.map(m => (
                                              <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                        <div className="relative w-full md:w-32">
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">{jobType === 'Import (Delivery)' ? 'Tons' : 'CY'}</span>
                                            <input type="number" required value={qty} onChange={(e) => setQty(Number(e.target.value))} className={`w-full bg-slate-800 border rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:outline-none ${jobType === 'Import (Delivery)' ? 'border-slate-700 focus:border-orange-500' : 'border-slate-700 focus:border-blue-500'}`} />
                                        </div>
                                        <button type="submit" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all text-white ${jobType === 'Import (Delivery)' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                                            + Add
                                        </button>
                                    </form>
                                </div>

                                {/* List of Requirements & Results */}
                                <div className="space-y-6">
                                    {requirements.map((req: any) => (
                                      <div key={req.id} className="border border-slate-700 rounded-lg overflow-hidden">
                                          {/* Requirement Header */}
                                          <div className={`px-4 py-3 flex justify-between items-center ${req.job_type === 'Import (Delivery)' ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                                              <div className="flex items-center space-x-3">
                                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${req.job_type === 'Import (Delivery)' ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-400'}`}>
                                                      {req.job_type === 'Import (Delivery)' ? 'Import' : 'Export'}
                                                  </span>
                                                  <span className="font-semibold text-white">{req.material_name}</span>
                                                  <span className="text-slate-400 text-sm">({req.quantity.toLocaleString()} {req.job_type === 'Import (Delivery)' ? 'Tons' : 'CY'})</span>
                                              </div>
                                              <button onClick={() => removeRequirement(req.id)} className="text-slate-500 hover:text-red-500 transition-colors">
                                                  <i className="fa-solid fa-trash"></i>
                                              </button>
                                          </div>
                                          
                                          {/* Render Results if calculated */}
                                          {manifestResults[req.id] && (
                                            <div className="bg-slate-900 w-full overflow-x-auto border-t border-slate-700">
                                                {manifestResults[req.id].length > 0 ? (
                                                  <table className="w-full min-w-[500px] text-xs text-left">
                                                      <thead className="text-slate-500 bg-slate-800/50">
                                                          <tr>
                                                              <th className="px-4 py-2 font-medium">{req.job_type === 'Import (Delivery)' ? 'Supplier' : 'Dump Site'}</th>
                                                              <th className="px-4 py-2 font-medium">Fleet</th>
                                                              <th className="px-4 py-2 font-medium text-right">Base</th>
                                                              <th className="px-4 py-2 font-medium text-right">Frt</th>
                                                              <th className="px-4 py-2 font-bold text-right text-white">Total</th>
                                                              <th className="px-4 py-2 text-center">Action</th>
                                                          </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-slate-800">
                                                          {manifestResults[req.id].map((res: any, idx: number) => {
                                                            const isSaved = savedEstimates.some(se => se.facility_id === res.facilityId && se.material_name === req.material_name && se.truck_fleet === res.truckFleet);
                                                            return (
                                                              <tr key={idx} className={isSaved ? "bg-emerald-500/10" : "hover:bg-slate-800 transition-colors"}>
                                                                  <td className="px-4 py-2 text-slate-300">{res.supplier}</td>
                                                                  <td className="px-4 py-2 text-slate-400">{res.truckFleet}</td>
                                                                  <td className="px-4 py-2 text-right text-slate-400">
                                                                    ${res.basePrice.toFixed(2)}
                                                                    {res.isCustomQuote && <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded" title="Special Pricing Applied">★</span>}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-right text-slate-400">${res.frtPerUnit.toFixed(2)}</td>
                                                                  <td className={`px-4 py-2 text-right font-bold ${req.job_type === 'Import (Delivery)' ? 'text-orange-400' : 'text-blue-400'}`}>${res.totalPerUnit.toFixed(2)}</td>
                                                                  <td className="px-4 py-2">
                                                                    <div className="flex space-x-1 justify-center">
                                                                        <button 
                                                                          onClick={() => toggleEstimate(res, req)}
                                                                          disabled={savingEstimateId === res.facilityId + res.truckFleet + req.id}
                                                                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50 ${isSaved ? 'bg-emerald-500 text-white hover:bg-red-500 hover:border-red-500' : 'bg-slate-700 text-slate-300 hover:bg-emerald-600 hover:text-white'}`}
                                                                          title={isSaved ? "Remove saved estimate" : "Lock in this price"}
                                                                        >
                                                                          {savingEstimateId === res.facilityId + res.truckFleet + req.id ? (
                                                                            <i className="fa-solid fa-spinner fa-spin"></i>
                                                                          ) : isSaved ? (
                                                                            <i className="fa-solid fa-xmark"></i>
                                                                          ) : (
                                                                            <i className="fa-solid fa-floppy-disk"></i>
                                                                          )}
                                                                        </button>
                                                                        <button 
                                                                          onClick={() => requestQuote(res, req)}
                                                                          disabled={requestingId === res.facilityId + req.id}
                                                                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${req.job_type === 'Import (Delivery)' ? 'border-orange-500/30 text-orange-500 hover:bg-orange-500/10' : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'}`}
                                                                        >
                                                                          {requestingId === res.facilityId + req.id ? '...' : 'Quote'}
                                                                        </button>
                                                                    </div>
                                                                  </td>
                                                              </tr>
                                                            );
                                                          })}
                                                      </tbody>
                                                  </table>
                                                ) : (
                                                  <p className="p-3 text-center text-xs text-red-400">No facilities found or routing failed.</p>
                                                )}
                                            </div>
                                          )}
                                      </div>
                                    ))}
                                    {requirements.length === 0 && (
                                      <div className="text-center py-6 border-2 border-dashed border-slate-700 rounded-lg">
                                          <p className="text-slate-500 text-sm">No materials added to manifest yet.</p>
                                      </div>
                                    )}
                                </div>
                            </div>
                          )}
                      </div>
                  </div>

                  {/* Right Col: Project Dashboard Feed */}
                  <div className="col-span-1 space-y-6">
                      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm h-full flex flex-col">
                          <div className="p-5 border-b border-slate-700 bg-slate-900/50">
                              <h2 className="text-lg font-semibold text-white mb-4">Project Feed</h2>
                              
                              {/* Tabs */}
                              <div className="flex space-x-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
                                  <button 
                                    onClick={() => setActiveTab('locked')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'locked' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                                  >
                                      Locked Pricing
                                  </button>
                                  <button 
                                    onClick={() => setActiveTab('pending')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center ${activeTab === 'pending' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                                  >
                                      Pending Quotes
                                      {projectQuotes.filter(q => q.status === 'pending').length > 0 && (
                                        <span className="ml-1.5 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{projectQuotes.filter(q => q.status === 'pending').length}</span>
                                      )}
                                  </button>
                              </div>
                          </div>
                          
                          <div className="p-5 flex-1 space-y-4 max-h-[600px] overflow-y-auto">
                              {!activeProject ? (
                                <p className="text-slate-500 text-sm text-center py-4">Select a project to view the feed.</p>
                              ) : activeTab === 'locked' ? (
                                savedEstimates.length > 0 ? savedEstimates.map((est: any, idx: number) => {
                                  // Reconstruct supplier name if we can, or just display the data we have. We saved facility_id but not the name. 
                                  // Ideally we'd fetch facility name in selectProject. For the prototype, we show what we have.
                                  return (
                                    <div key={idx} className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block">
                                                  {est.is_custom_quote ? 'Locked (Discount)' : 'Locked'}
                                                </span>
                                                <h4 className="text-white font-medium text-sm">{est.material_name}</h4>
                                                <p className="text-xs text-slate-400 mt-1">{est.facility?.name || "Selected Facility"} | {est.quantity} {importMaterials?.includes(est.material_name) ? "Tons" : "CY"} | {est.truck_fleet}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-emerald-400">
                                                    ${est.total_price.toFixed(2)}<span className="text-xs text-emerald-500/70 font-normal">/{importMaterials?.includes(est.material_name) ? "Ton" : "CY"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                  )
                                }) : <p className="text-slate-500 text-sm text-center py-4">No locked pricing yet.</p>
                              ) : (
                                projectQuotes.length > 0 ? projectQuotes.map((q: any, idx: number) => (
                                    <div key={idx} className={`border rounded-lg p-4 ${q.status === 'pending' ? 'border-orange-500/30 bg-orange-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block ${q.status === 'pending' ? 'bg-orange-500/20 text-orange-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                    {q.status === 'pending' ? 'Awaiting Response' : 'Quote Received'}
                                                </span>
                                                <h4 className="text-white font-medium text-sm">{q.facility?.name || "Supplier"}</h4>
                                                <p className="text-xs text-slate-400 mt-1">{q.material_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-slate-300">
                                                    {q.quantity} <span className="text-xs font-normal">{importMaterials?.includes(q.material_name) ? "Tons" : "CY"}</span>
                                                </div>
                                                {q.offered_price && (
                                                  <div className="text-lg font-bold text-emerald-400 mt-1">
                                                      ${q.offered_price.toFixed(2)}<span className="text-xs text-emerald-500/70 font-normal">/{importMaterials?.includes(q.material_name) ? "Ton" : "CY"}</span>
                                                  </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )) : <p className="text-slate-500 text-sm text-center py-4">No pending quotes.</p>
                              )}
                          </div>
                      </div>
                  </div>

              </div>
          </div>
      </main>

      {/* Project Creation Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Create New Project</h2>
              <button onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-white">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Project Name</label>
                <input 
                  type="text" 
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g., Redwood Subdivision" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Job Site Address</label>
                <textarea 
                  required
                  value={newProjAddr}
                  onChange={(e) => setNewProjAddr(e.target.value)}
                  placeholder="e.g., 5600 W 8600 S, West Jordan, UT" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 h-24" 
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowProjectModal(false)} className="flex-1 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-semibold transition-all">Create & Select</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
