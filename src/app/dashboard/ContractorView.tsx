/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import LogoutButton from '@/components/LogoutButton';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function ContractorView({ 
  profileName = "Logan Ash", 
  companyName = "Ash Excavation", 
  pitsCount = 14, 
  dumpsCount = 14,
  importMaterials = [],
  exportMaterials = []
}: { profileName?: string, companyName?: string, pitsCount?: number, dumpsCount?: number, importMaterials?: string[], exportMaterials?: string[] }) {

  const supabase = createClient();
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjAddr, setNewProjAddr] = useState("");
  const [savingEstimateId, setSavingEstimateId] = useState<string | null>(null);
  const [savedEstimates, setSavedEstimates] = useState<any[]>([]);
  const [projectQuotes, setProjectQuotes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'locked' | 'pending'>('locked');
  const [requestingId, setRequestingId] = useState<string | null>(null);

  // Dashboard map states
  const [jobLat, setJobLat] = useState<number | undefined>(undefined);
  const [jobLon, setJobLon] = useState<number | undefined>(undefined);
  const [jobAddress, setJobAddress] = useState<string | undefined>(undefined);

  // All facilities for map markers
  const [allFacilities, setAllFacilities] = useState<any[]>([]);

  // Modal map states
  const [modalJobLat, setModalJobLat] = useState<number | undefined>(undefined);
  const [modalJobLon, setModalJobLon] = useState<number | undefined>(undefined);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Manifest states
  const [requirements, setRequirements] = useState<any[]>([]);
  const [manifestResults, setManifestResults] = useState<any>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);

  // Requirement form states
  const [jobType, setJobType] = useState("Import (Delivery)");
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [qty, setQty] = useState(1500);

  useEffect(() => {
    fetchProjects();
    fetchAllFacilities();
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

  const fetchAllFacilities = async () => {
    const { data } = await supabase.from('facilities').select('id, name, type, latitude, longitude');
    if (data) setAllFacilities(data);
  };

  const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch { /* silently fail */ }
    return null;
  }, []);

  const handleMapClick = useCallback(async (lat: number, lon: number) => {
    setModalJobLat(lat);
    setModalJobLon(lon);
    setIsReverseGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const data = await res.json();
      if (data.display_name) setNewProjAddr(data.display_name);
    } catch {
      setNewProjAddr(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    }
    setIsReverseGeocoding(false);
  }, []);

  const closeModal = () => {
    setShowProjectModal(false);
    setNewProjName("");
    setNewProjAddr("");
    setModalJobLat(undefined);
    setModalJobLon(undefined);
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjAddr) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('projects')
      .insert([{ contractor_id: user.id, name: newProjName, address: newProjAddr, latitude: modalJobLat ?? null, longitude: modalJobLon ?? null }])
      .select().single();
    if (data && !error) {
      setProjects([data, ...projects]);
      setActiveProject(data);
      if (modalJobLat && modalJobLon) { setJobLat(modalJobLat); setJobLon(modalJobLon); setJobAddress(newProjAddr); }
      closeModal();
      setSavedEstimates([]);
      setRequirements([]);
      setManifestResults({});
    } else {
      alert("Failed to create project");
    }
  };

  const deleteProject = async () => {
    if (!activeProject) return;
    setIsDeletingProject(true);
    // Delete child records first to respect FK constraints
    await supabase.from('project_requirements').delete().eq('project_id', activeProject.id);
    await supabase.from('project_estimates').delete().eq('project_id', activeProject.id);
    await supabase.from('quote_requests').delete().eq('project_id', activeProject.id);
    const { error } = await supabase.from('projects').delete().eq('id', activeProject.id);
    if (!error) {
      const remaining = projects.filter(p => p.id !== activeProject.id);
      setProjects(remaining);
      setActiveProject(null);
      setSavedEstimates([]);
      setRequirements([]);
      setManifestResults({});
      setJobLat(undefined);
      setJobLon(undefined);
      setJobAddress(undefined);
    } else {
      alert("Failed to delete project.");
    }
    setIsDeletingProject(false);
    setShowDeleteConfirm(false);
  };

  const selectProject = async (proj: any) => {
    setActiveProject(proj);
    setManifestResults(proj.cached_results || {});
    setLastCalculated(proj.last_calculated ? new Date(proj.last_calculated) : null);
    setJobAddress(proj.address);
    if (proj.latitude && proj.longitude) {
      setJobLat(proj.latitude);
      setJobLon(proj.longitude);
    } else if (proj.address) {
      const coords = await geocodeAddress(proj.address);
      if (coords) {
        setJobLat(coords.lat);
        setJobLon(coords.lon);
        await supabase.from('projects').update({ latitude: coords.lat, longitude: coords.lon }).eq('id', proj.id);
      } else { setJobLat(undefined); setJobLon(undefined); }
    }
    const { data: estData } = await supabase.from('project_estimates').select('*, facility:facilities(name)').eq('project_id', proj.id);
    if (estData) setSavedEstimates(estData);
    const { data: reqData } = await supabase.from('project_requirements').select('*').eq('project_id', proj.id).order('created_at', { ascending: true });
    if (reqData) setRequirements(reqData);
    setManifestResults({});
  };

  const addRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !selectedMaterial || !qty) { alert("Please select a project and fill out all fields."); return; }
    const { data, error } = await supabase.from('project_requirements')
      .insert([{ project_id: activeProject.id, job_type: jobType, material_name: selectedMaterial, quantity: qty }])
      .select().single();
    if (data && !error) { setRequirements([...requirements, data]); setSelectedMaterial(""); }
    else { alert("Failed to add requirement."); console.error(error); }
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
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: activeProject.address, qty: req.quantity, jobType: req.job_type, materials: [req.material_name], projectId: activeProject.id })
        });
        const data = await response.json();
        if (data.success) {
          if (data.jobLat && data.jobLon) { setJobLat(data.jobLat); setJobLon(data.jobLon); }
          newResults[req.id] = data.data.slice(0, 5);
        } else { newResults[req.id] = []; }
      } catch (err) { console.error(err); newResults[req.id] = []; }
    }
    setManifestResults(newResults);
    const now = new Date();
    setLastCalculated(now);
    await supabase.from('projects').update({ cached_results: newResults, last_calculated: now.toISOString() }).eq('id', activeProject.id);
    setIsCalculating(false);
  };

  const toggleEstimate = async (res: any, req: any) => {
    if (!activeProject) return;
    setSavingEstimateId(res.facilityId + res.truckFleet + req.id);
    const existingExact = savedEstimates.find(se => se.facility_id === res.facilityId && se.material_name === req.material_name && se.truck_fleet === res.truckFleet);
    if (existingExact) {
      const { error } = await supabase.from('project_estimates').delete().eq('id', existingExact.id);
      if (!error) setSavedEstimates(savedEstimates.filter(se => se.id !== existingExact.id));
      else alert("Failed to remove saved estimate.");
    } else {
      const existingForMat = savedEstimates.find(se => se.material_name === req.material_name);
      if (existingForMat) await supabase.from('project_estimates').delete().eq('id', existingForMat.id);
      const { data, error } = await supabase.from('project_estimates').insert([{
        project_id: activeProject.id, facility_id: res.facilityId, material_name: req.material_name,
        quantity: req.quantity, truck_fleet: res.truckFleet, base_price: res.basePrice,
        freight_price: res.frtPerUnit, total_price: res.totalPerUnit
      }]).select().single();
      if (data && !error) setSavedEstimates([...savedEstimates.filter(se => se.material_name !== req.material_name), { ...data, facility: { name: res.supplier } }]);
      else alert("Failed to save estimate.");
    }
    setSavingEstimateId(null);
  };

  const requestQuote = async (res: any, req: any) => {
    setRequestingId(res.facilityId + req.id);
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId: res.facilityId, materialName: req.material_name, quantity: req.quantity, address: activeProject.address, projectId: activeProject.id })
      });
      if (response.ok) {
        alert("Quote request sent directly to the supplier!");
        setProjectQuotes([...projectQuotes, { id: Math.random().toString(), facility_id: res.facilityId, material_name: req.material_name, quantity: req.quantity, status: 'pending', facility: { name: res.supplier } }]);
        setActiveTab('pending');
      } else { const errorData = await response.json(); alert("Database Error: " + errorData.error); }
    } catch (e: any) { alert("Error: " + e.message); console.error(e); }
    setRequestingId(null);
  };

  const isImport = jobType === "Import (Delivery)";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0b1120] text-slate-300 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold text-white tracking-wide">AggLink<span className="text-orange-500">.</span></span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="#" className="flex items-center px-4 py-3 bg-orange-500/10 text-orange-500 rounded-lg font-medium">Dashboard</a>
          <a href="#" className="flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors">Smart Estimator</a>
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
        {/* Header */}
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="relative w-full md:w-96 flex items-center space-x-3">
            {activeProject ? (
              <>
                <h2 className="text-lg font-semibold text-white">{activeProject.name}</h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold uppercase tracking-wider hidden sm:block">Active Project</span>
                {/* Delete button */}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="ml-1 p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                  title="Delete project"
                >
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </>
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
                  if (e.target.value === "") { setActiveProject(null); setSavedEstimates([]); setRequirements([]); setManifestResults({}); setJobLat(undefined); setJobLon(undefined); setJobAddress(undefined); }
                  else { const p = projects.find(proj => proj.id === e.target.value); if (p) selectProject(p); }
                }}
                value={activeProject ? activeProject.id : ""}
              >
                <option value="">-- Switch Project --</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
            {/* Left Col */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
              {/* Map Card */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden">
                <div className="h-64 bg-slate-900 w-full relative">
                  <MapComponent
                    jobLat={jobLat}
                    jobLon={jobLon}
                    jobAddress={jobAddress}
                    facilities={
                      Object.values(manifestResults).flat().length > 0
                        ? Object.values(manifestResults).flat().map((r: any) => ({ lat: r.lat, lon: r.lon, name: r.supplier, isDump: r.basePrice === 0 || r.frtPerUnit > 0 }))
                        : allFacilities
                    }
                  />
                </div>
                {/* Inline legend */}
                <div className="px-4 py-2 border-t border-slate-700 flex items-center space-x-5">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mr-1">Legend</span>
                  {[['bg-red-500','Job Site'],['bg-orange-500','Material Pit'],['bg-blue-500','Dump Site'],['bg-emerald-500','Pit & Dump']].map(([color, label]) => (
                    <span key={label} className="flex items-center space-x-1.5 text-xs text-slate-400">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`}></span><span>{label}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Manifest Card */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Project Manifest (Bill of Materials)</h2>
                    {lastCalculated && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        <i className="fa-solid fa-clock mr-1"></i> Last Routed: {lastCalculated.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  {requirements.length > 0 && (
                    <button onClick={calculateManifest} disabled={isCalculating} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded text-sm font-bold shadow-lg transition-all disabled:opacity-50">
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
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                      <h3 className="text-sm font-semibold text-white mb-3">Add Requirement</h3>

                      {/* ── Custom Import / Export toggle ── */}
                      <div className="inline-flex relative bg-slate-800 border border-slate-700 rounded-lg p-0.5 mb-4">
                        {/* Sliding pill indicator */}
                        <span
                          className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md transition-all duration-200 ease-in-out ${isImport ? 'left-0.5 bg-orange-500/20 border border-orange-500/40' : 'left-[calc(50%+2px)] bg-blue-500/20 border border-blue-500/40'}`}
                        />
                        <button
                          type="button"
                          onClick={() => { setJobType("Import (Delivery)"); setSelectedMaterial(""); }}
                          className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 ${isImport ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          ↓ Import
                        </button>
                        <button
                          type="button"
                          onClick={() => { setJobType("Export (Haul-Off)"); setSelectedMaterial(""); }}
                          className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 ${!isImport ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          ↑ Export
                        </button>
                      </div>

                      <form onSubmit={addRequirement} className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                        <select value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)} required
                          className={`flex-1 bg-slate-800 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none appearance-none ${isImport ? 'border-slate-700 focus:border-orange-500' : 'border-slate-700 focus:border-blue-500'}`}>
                          <option value="">-- Select Material --</option>
                          {(isImport ? importMaterials : exportMaterials)?.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="relative w-full md:w-32">
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">{isImport ? 'Tons' : 'CY'}</span>
                          <input type="number" required value={qty} onChange={(e) => setQty(Number(e.target.value))}
                            className={`w-full bg-slate-800 border rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:outline-none ${isImport ? 'border-slate-700 focus:border-orange-500' : 'border-slate-700 focus:border-blue-500'}`} />
                        </div>
                        <button type="submit" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all text-white ${isImport ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                          + Add
                        </button>
                      </form>
                    </div>

                    <div className="space-y-6">
                      {requirements.map((req: any) => (
                        <div key={req.id} className="border border-slate-700 rounded-lg overflow-hidden">
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
                                              <button onClick={() => toggleEstimate(res, req)} disabled={savingEstimateId === res.facilityId + res.truckFleet + req.id}
                                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50 ${isSaved ? 'bg-emerald-500 text-white hover:bg-red-500' : 'bg-slate-700 text-slate-300 hover:bg-emerald-600 hover:text-white'}`}
                                                title={isSaved ? "Remove saved estimate" : "Lock in this price"}>
                                                {savingEstimateId === res.facilityId + res.truckFleet + req.id ? <i className="fa-solid fa-spinner fa-spin"></i> : isSaved ? <i className="fa-solid fa-xmark"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                                              </button>
                                              <button onClick={() => requestQuote(res, req)} disabled={requestingId === res.facilityId + req.id}
                                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${req.job_type === 'Import (Delivery)' ? 'border-orange-500/30 text-orange-500 hover:bg-orange-500/10' : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'}`}>
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

            {/* Right Col: Project Feed */}
            <div className="col-span-1 space-y-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm h-full flex flex-col">
                <div className="p-5 border-b border-slate-700 bg-slate-900/50">
                  <h2 className="text-lg font-semibold text-white mb-4">Project Feed</h2>
                  <div className="flex space-x-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
                    <button onClick={() => setActiveTab('locked')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'locked' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>Locked Pricing</button>
                    <button onClick={() => setActiveTab('pending')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center ${activeTab === 'pending' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
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
                    savedEstimates.length > 0 ? savedEstimates.map((est: any, idx: number) => (
                      <div key={idx} className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block">{est.is_custom_quote ? 'Locked (Discount)' : 'Locked'}</span>
                            <h4 className="text-white font-medium text-sm">{est.material_name}</h4>
                            <p className="text-xs text-slate-400 mt-1">{est.facility?.name || "Selected Facility"} | {est.quantity} {importMaterials?.includes(est.material_name) ? "Tons" : "CY"} | {est.truck_fleet}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-emerald-400">${est.total_price.toFixed(2)}<span className="text-xs text-emerald-500/70 font-normal">/{importMaterials?.includes(est.material_name) ? "Ton" : "CY"}</span></div>
                          </div>
                        </div>
                      </div>
                    )) : <p className="text-slate-500 text-sm text-center py-4">No locked pricing yet.</p>
                  ) : (
                    projectQuotes.length > 0 ? projectQuotes.map((q: any, idx: number) => (
                      <div key={idx} className={`border rounded-lg p-4 ${q.status === 'pending' ? 'border-orange-500/30 bg-orange-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block ${q.status === 'pending' ? 'bg-orange-500/20 text-orange-500' : 'bg-emerald-500/20 text-emerald-400'}`}>{q.status === 'pending' ? 'Awaiting Response' : 'Quote Received'}</span>
                            <h4 className="text-white font-medium text-sm">{q.facility?.name || "Supplier"}</h4>
                            <p className="text-xs text-slate-400 mt-1">{q.material_name}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-300">{q.quantity} <span className="text-xs font-normal">{importMaterials?.includes(q.material_name) ? "Tons" : "CY"}</span></div>
                            {q.offered_price && <div className="text-lg font-bold text-emerald-400 mt-1">${q.offered_price.toFixed(2)}<span className="text-xs text-emerald-500/70 font-normal">/{importMaterials?.includes(q.material_name) ? "Ton" : "CY"}</span></div>}
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

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Delete Project</h2>
                <p className="text-xs text-slate-400">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-6">
              Are you sure you want to delete <span className="font-semibold text-white">{activeProject.name}</span>? All requirements, estimates, and quotes will be permanently removed.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={deleteProject}
                disabled={isDeletingProject}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all"
              >
                {isDeletingProject ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Project Modal ── */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-white">Create New Project</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Project Name</label>
                <input type="text" required value={newProjName} onChange={(e) => setNewProjName(e.target.value)} placeholder="e.g., Redwood Subdivision"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Job Site Location
                  <span className="ml-2 text-xs text-slate-500 font-normal">Click the map to drop your pin</span>
                </label>
                <div className="relative h-64 w-full rounded-lg overflow-hidden border border-slate-700">
                  <MapComponent jobLat={modalJobLat} jobLon={modalJobLon} facilities={allFacilities} onMapClick={handleMapClick} interactive={true} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Job Site Address
                  {isReverseGeocoding && <span className="ml-2 text-xs text-orange-400 animate-pulse">Looking up address...</span>}
                </label>
                <textarea required value={newProjAddr} onChange={(e) => setNewProjAddr(e.target.value)}
                  placeholder="Click the map above, or type an address manually"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 h-16 resize-none" />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-semibold transition-all">Create & Select</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
