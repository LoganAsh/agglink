/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Core state
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'calculator'>('dashboard');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjAddr, setNewProjAddr] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProjName, setEditProjName] = useState("");
  const [editProjAddr, setEditProjAddr] = useState("");
  const [editJobLat, setEditJobLat] = useState<number | undefined>(undefined);
  const [editJobLon, setEditJobLon] = useState<number | undefined>(undefined);
  const [isEditReverseGeocoding, setIsEditReverseGeocoding] = useState(false);
  const [savingEstimateId, setSavingEstimateId] = useState<string | null>(null);
  const [savedEstimates, setSavedEstimates] = useState<any[]>([]);
  const [allSavedEstimates, setAllSavedEstimates] = useState<any[]>([]);
  const [projectQuotes, setProjectQuotes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'locked' | 'pending'>('locked');
  const [requestingId, setRequestingId] = useState<string | null>(null);

  // Map state
  const [jobLat, setJobLat] = useState<number | undefined>(undefined);
  const [jobLon, setJobLon] = useState<number | undefined>(undefined);
  const [jobAddress, setJobAddress] = useState<string | undefined>(undefined);
  const [allFacilities, setAllFacilities] = useState<any[]>([]);
  const [modalJobLat, setModalJobLat] = useState<number | undefined>(undefined);
  const [modalJobLon, setModalJobLon] = useState<number | undefined>(undefined);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Manifest state
  const [requirements, setRequirements] = useState<any[]>([]);
  const [manifestResults, setManifestResults] = useState<any>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);

  // Categories & truck types
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<any[]>([]);
  const [truckTypes, setTruckTypes] = useState<any[]>([]);

  // Requirement form state
  const [jobType, setJobType] = useState("Import (Delivery)");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedTruckType, setSelectedTruckType] = useState("");
  const [qty, setQty] = useState(1500);

  // Calculator state
  const [calcAddress, setCalcAddress] = useState("");
  const [calcLat, setCalcLat] = useState<number | undefined>(undefined);
  const [calcLon, setCalcLon] = useState<number | undefined>(undefined);
  const [calcJobType, setCalcJobType] = useState("Import (Delivery)");
  const [calcCategory, setCalcCategory] = useState("");
  const [calcMaterials, setCalcMaterials] = useState<string[]>([]);
  const [calcTruckType, setCalcTruckType] = useState("");
  const [calcQty, setCalcQty] = useState(1500);
  const [calcResults, setCalcResults] = useState<any[]>([]);
  const [calcIsCalculating, setCalcIsCalculating] = useState(false);
  const [calcIsReverseGeocoding, setCalcIsReverseGeocoding] = useState(false);
  const [calcIsImport, setCalcIsImport] = useState(true);

  const isImport = jobType === "Import (Delivery)";

  useEffect(() => {
    fetchProjects();
    fetchAllFacilities();
    fetchAllSavedEstimates();
    fetchCategoriesAndTrucks();
  }, []);

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').eq('contractor_id', user.id).order('created_at', { ascending: false });
    if (data) setProjects(data);
  };

  const fetchAllFacilities = async () => {
    const { data } = await supabase.from('facilities').select('id, name, type, latitude, longitude');
    if (data) setAllFacilities(data);
  };

  const fetchAllSavedEstimates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: userProjects } = await supabase.from('projects').select('id').eq('contractor_id', user.id);
    if (!userProjects || userProjects.length === 0) return;
    const projectIds = userProjects.map(p => p.id);
    const { data: estimates } = await supabase.from('project_estimates').select('*').in('project_id', projectIds);
    if (estimates) setAllSavedEstimates(estimates);
  };

  const fetchCategoriesAndTrucks = async () => {
    const [{ data: cats }, { data: map }, { data: trucks }] = await Promise.all([
      supabase.from('material_categories').select('*').order('name'),
      supabase.from('material_category_map').select('*'),
      supabase.from('truck_types').select('*').eq('active', true).order('name'),
    ]);
    if (cats) setCategories(cats);
    if (map) setCategoryMap(map);
    if (trucks) setTruckTypes(trucks);
  };

  // Materials available for selected category
  const filteredMaterials = useMemo(() => {
    const allMats = isImport ? importMaterials : exportMaterials;
    if (!selectedCategory) return allMats;
    const cat = categories.find(c => c.id === selectedCategory);
    if (!cat) return allMats;
    const mapped = categoryMap.filter(m => m.category_id === selectedCategory).map(m => m.material_name);
    return allMats.filter(m => mapped.includes(m));
  }, [selectedCategory, isImport, importMaterials, exportMaterials, categories, categoryMap]);

  // Categories for current job type
  const filteredCategories = useMemo(() =>
    categories.filter(c => c.type === (isImport ? 'import' : 'export')),
    [categories, isImport]
  );

  // Toggle a material in the multi-select list
  const toggleMaterial = (mat: string) => {
    setSelectedMaterials(prev =>
      prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]
    );
  };

  const calcFilteredMaterials = useMemo(() => {
    const allMats = calcIsImport ? importMaterials : exportMaterials;
    if (!calcCategory) return allMats;
    const cat = categories.find(c => c.id === calcCategory);
    if (!cat) return allMats;
    const mapped = categoryMap.filter(m => m.category_id === calcCategory).map(m => m.material_name);
    return allMats.filter(m => mapped.includes(m));
  }, [calcCategory, calcIsImport, importMaterials, exportMaterials, categories, categoryMap]);

  const calcFilteredCategories = useMemo(() =>
    categories.filter(c => c.type === (calcIsImport ? 'import' : 'export')),
    [categories, calcIsImport]
  );

  const calcToggleMaterial = (mat: string) => {
    setCalcMaterials(prev =>
      prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]
    );
  };

  //        Freight savings calculations
  const accountFreightSavings = useMemo(() => {
    if (allSavedEstimates.length === 0 || projects.length === 0) return null;
    const savingsPcts: number[] = [];
    for (const proj of projects) {
      const cachedResults = proj.cached_results || {};
      if (Object.keys(cachedResults).length === 0) continue;
      const projEstimates = allSavedEstimates.filter(e => e.project_id === proj.id);
      for (const est of projEstimates) {
        for (const [, options] of Object.entries(cachedResults) as [string, any[]][]) {
          if (!options || options.length === 0) continue;
          const avgFrt = options.reduce((s: number, o: any) => s + (o.frtPerUnit || 0), 0) / options.length;
          if (avgFrt === 0) continue;
          const savingsPct = ((avgFrt - est.freight_price) / avgFrt) * 100;
          savingsPcts.push(savingsPct);
          break;
        }
      }
    }
    if (savingsPcts.length === 0) return null;
    return savingsPcts.reduce((a, b) => a + b, 0) / savingsPcts.length;
  }, [allSavedEstimates, projects]);

  const projectFreightSavings = useMemo(() => {
    if (savedEstimates.length === 0 || Object.keys(manifestResults).length === 0) return null;
    const savingsPcts: number[] = [];
    for (const est of savedEstimates) {
      for (const options of Object.values(manifestResults) as any[][]) {
        if (!options || options.length === 0) continue;
        const avgFrt = options.reduce((s: number, o: any) => s + (o.frtPerUnit || 0), 0) / options.length;
        if (avgFrt === 0) continue;
        savingsPcts.push(((avgFrt - est.freight_price) / avgFrt) * 100);
        break;
      }
    }
    if (savingsPcts.length === 0) return null;
    return savingsPcts.reduce((a, b) => a + b, 0) / savingsPcts.length;
  }, [savedEstimates, manifestResults]);

  const fmtSavings = (val: number | null) => {
    if (val === null) return { display: '--', sub: 'No estimates yet', positive: true };
    const sign = val >= 0 ? '+' : '';
    return { display: `${sign}${val.toFixed(1)}%`, sub: val >= 0 ? 'below avg market freight' : 'above avg market freight', positive: val >= 0 };
  };
  const accountSavingsFmt = fmtSavings(accountFreightSavings);
  const projectSavingsFmt = fmtSavings(projectFreightSavings);

  const accountTotalValue = useMemo(() => {
    if (allSavedEstimates.length === 0) return { total: 0, projectCount: 0 };
    const total = allSavedEstimates.reduce((sum, est) => sum + (est.quantity * est.total_price), 0);
    const projectIds = new Set(allSavedEstimates.map(est => est.project_id));
    return { total, projectCount: projectIds.size };
  }, [allSavedEstimates]);

  const fmtCompactCurrency = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  //        Geocoding
  const geocodeAddress = useCallback(async (address: string) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
      const data = await res.json();
      if (data?.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch { /* silent */ }
    return null;
  }, []);

  const handleMapClick = useCallback(async (lat: number, lon: number) => {
    setModalJobLat(lat); setModalJobLon(lon); setIsReverseGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const data = await res.json();
      if (data.display_name) setNewProjAddr(data.display_name);
    } catch { setNewProjAddr(`${lat.toFixed(5)}, ${lon.toFixed(5)}`); }
    setIsReverseGeocoding(false);
  }, []);

  const handleCalcMapClick = useCallback(async (lat: number, lon: number) => {
    setCalcLat(lat); setCalcLon(lon); setCalcIsReverseGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const data = await res.json();
      if (data.display_name) setCalcAddress(data.display_name);
    } catch { setCalcAddress(`${lat.toFixed(5)}, ${lon.toFixed(5)}`); }
    setCalcIsReverseGeocoding(false);
  }, []);

  const runCalculator = async () => {
    if (!calcAddress || calcMaterials.length === 0 || !calcTruckType) return;
    setCalcIsCalculating(true);
    try {
      const response = await fetch('/api/public/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: calcAddress,
          qty: calcQty,
          jobType: calcJobType,
          materials: calcMaterials,
          truckType: calcTruckType,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setCalcResults(Array.isArray(data.data) ? data.data.slice(0, 5) : []);
      } else {
        setCalcResults([]);
      }
    } catch {
      setCalcResults([]);
    }
    setCalcIsCalculating(false);
  };

  const handleEditMapClick = useCallback(async (lat: number, lon: number) => {
    setEditJobLat(lat); setEditJobLon(lon); setIsEditReverseGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const data = await res.json();
      if (data.display_name) setEditProjAddr(data.display_name);
    } catch { setEditProjAddr(`${lat.toFixed(5)}, ${lon.toFixed(5)}`); }
    setIsEditReverseGeocoding(false);
  }, []);

  //        Project CRUD
  const closeModal = () => { setShowProjectModal(false); setNewProjName(""); setNewProjAddr(""); setModalJobLat(undefined); setModalJobLon(undefined); };

  const openEditModal = () => {
    if (!activeProject) return;
    setEditProjName(activeProject.name || "");
    setEditProjAddr(activeProject.address || "");
    setEditJobLat(activeProject.latitude ?? undefined);
    setEditJobLon(activeProject.longitude ?? undefined);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditProjName("");
    setEditProjAddr("");
    setEditJobLat(undefined);
    setEditJobLon(undefined);
    setIsEditReverseGeocoding(false);
  };

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !editProjName || !editProjAddr) return;
    const locationChanged =
      editJobLat !== activeProject.latitude ||
      editJobLon !== activeProject.longitude ||
      editProjAddr !== activeProject.address;

    const updatePayload: any = {
      name: editProjName,
      address: editProjAddr,
      latitude: editJobLat ?? null,
      longitude: editJobLon ?? null,
    };
    if (locationChanged) {
      updatePayload.cached_results = {};
      updatePayload.last_calculated = null;
      await supabase.from('project_estimates').delete().eq('project_id', activeProject.id);
      await supabase.from('project_requirements').delete().eq('project_id', activeProject.id);
      setSavedEstimates([]);
      setRequirements([]);
      setManifestResults({});
      setLastCalculated(null);
    }

    const { data, error } = await supabase.from('projects').update(updatePayload).eq('id', activeProject.id).select().single();
    if (data && !error) {
      setActiveProject(data);
      setProjects(projects.map(p => p.id === data.id ? data : p));
      if (locationChanged) {
        setJobLat(editJobLat);
        setJobLon(editJobLon);
        setJobAddress(editProjAddr);
        await fetchAllSavedEstimates();
      }
      closeEditModal();
    } else alert("Failed to save project.");
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjAddr) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('projects').insert([{ contractor_id: user.id, name: newProjName, address: newProjAddr, latitude: modalJobLat ?? null, longitude: modalJobLon ?? null }]).select().single();
    if (data && !error) {
      setProjects([data, ...projects]); setActiveProject(data);
      if (modalJobLat && modalJobLon) { setJobLat(modalJobLat); setJobLon(modalJobLon); setJobAddress(newProjAddr); }
      closeModal(); setSavedEstimates([]); setRequirements([]); setManifestResults({});
    } else alert("Failed to create project");
  };

  const deleteProject = async () => {
    if (!activeProject) return;
    setIsDeletingProject(true);
    await supabase.from('project_requirements').delete().eq('project_id', activeProject.id);
    await supabase.from('project_estimates').delete().eq('project_id', activeProject.id);
    await supabase.from('quote_requests').delete().eq('project_id', activeProject.id);
    const { error } = await supabase.from('projects').delete().eq('id', activeProject.id);
    if (!error) {
      setProjects(projects.filter(p => p.id !== activeProject.id));
      setActiveProject(null); setSavedEstimates([]); setRequirements([]); setManifestResults({});
      setJobLat(undefined); setJobLon(undefined); setJobAddress(undefined);
      await fetchAllSavedEstimates();
    } else alert("Failed to delete project.");
    setIsDeletingProject(false); setShowDeleteConfirm(false);
  };

  const selectProject = async (proj: any) => {
    setActiveProject(proj);
    setManifestResults(proj.cached_results || {});
    setLastCalculated(proj.last_calculated ? new Date(proj.last_calculated) : null);
    setJobAddress(proj.address);
    if (proj.latitude && proj.longitude) { setJobLat(proj.latitude); setJobLon(proj.longitude); }
    else if (proj.address) {
      const coords = await geocodeAddress(proj.address);
      if (coords) { setJobLat(coords.lat); setJobLon(coords.lon); await supabase.from('projects').update({ latitude: coords.lat, longitude: coords.lon }).eq('id', proj.id); }
      else { setJobLat(undefined); setJobLon(undefined); }
    }
    const { data: estData } = await supabase.from('project_estimates').select('*, facility:facilities(name)').eq('project_id', proj.id);
    if (estData) setSavedEstimates(estData);
    const { data: reqData } = await supabase.from('project_requirements').select('*').eq('project_id', proj.id).order('created_at', { ascending: true });
    if (reqData) setRequirements(reqData);
    setManifestResults(proj.cached_results || {});
  };

  //        Requirements
  const addRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || selectedMaterials.length === 0 || !qty) { alert("Please select at least one material and fill out all fields."); return; }
    if (!selectedTruckType) { alert("Please select a truck type."); return; }

    // Insert one requirement per selected material (or one with compared_materials for multi)
    const primaryMaterial = selectedMaterials[0];
    const { data, error } = await supabase.from('project_requirements').insert([{
      project_id: activeProject.id,
      job_type: jobType,
      material_name: primaryMaterial,
      quantity: qty,
      truck_type: selectedTruckType,
      compared_materials: selectedMaterials,
    }]).select().single();

    if (data && !error) {
      setRequirements([...requirements, data]);
      setSelectedMaterials([]);
    } else { alert("Failed to add requirement."); console.error(error); }
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

  //        Manifest calculation
  const calculateManifest = async () => {
    if (!activeProject || requirements.length === 0) return;
    setIsCalculating(true);
    const newResults: any = { ...manifestResults };

    for (const req of requirements) {
      try {
        const materialsToFetch = req.compared_materials?.length > 0 ? req.compared_materials : [req.material_name];
        console.log('Fetching estimate for req:', req.id, 'materials:', materialsToFetch, 'truckType:', req.truck_type);
        if (!materialsToFetch || materialsToFetch.length === 0) {
          console.error('No materials to fetch for req:', req.id);
          newResults[req.id] = [];
          continue;
        }
        const response = await fetch('/api/public/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: activeProject.address,
            qty: req.quantity,
            jobType: req.job_type,
            materials: materialsToFetch,
            truckType: req.truck_type && req.truck_type.length > 0 ? req.truck_type : undefined,
            projectId: activeProject.id,
          })
        });

        console.log('Estimate response status:', response.status, 'for materials:', materialsToFetch);

        if (!response.ok) {
          const text = await response.text();
          console.error('Estimate failed:', response.status, text, 'materials:', JSON.stringify(materialsToFetch));
          newResults[req.id] = [];
          continue;
        }

        const data = await response.json();
        if (data.success) {
          if (data.jobLat && data.jobLon) { setJobLat(data.jobLat); setJobLon(data.jobLon); }
          newResults[req.id] = data.data.slice(0, 5);
        } else { newResults[req.id] = []; }
      } catch (err) {
        console.error('Estimate fetch failed for req:', req.id, err);
        newResults[req.id] = [];
      }
    }

    setManifestResults(newResults);
    const now = new Date();
    setLastCalculated(now);
    await supabase.from('projects').update({ cached_results: newResults, last_calculated: now.toISOString() }).eq('id', activeProject.id);
    await fetchAllSavedEstimates();
    setIsCalculating(false);
  };

  //        Estimate saving
  const toggleEstimate = async (res: any, req: any) => {
    if (!activeProject) return;
    setSavingEstimateId(res.facilityId + res.truckFleet + req.id);
    const existingExact = savedEstimates.find(se => se.facility_id === res.facilityId && se.material_name === (res.materialName || req.material_name) && se.truck_fleet === res.truckFleet);
    if (existingExact) {
      const { error } = await supabase.from('project_estimates').delete().eq('id', existingExact.id);
      if (!error) { setSavedEstimates(savedEstimates.filter(se => se.id !== existingExact.id)); await fetchAllSavedEstimates(); }
      else alert("Failed to remove saved estimate.");
    } else {
      const matName = res.materialName || req.material_name;
      const existingForMat = savedEstimates.find(se => se.material_name === matName);
      if (existingForMat) await supabase.from('project_estimates').delete().eq('id', existingForMat.id);
      const { data, error } = await supabase.from('project_estimates').insert([{
        project_id: activeProject.id, facility_id: res.facilityId,
        material_name: matName, quantity: req.quantity,
        truck_fleet: res.truckFleet, base_price: res.basePrice,
        freight_price: res.frtPerUnit, total_price: res.totalPerUnit
      }]).select().single();
      if (data && !error) { setSavedEstimates([...savedEstimates.filter(se => se.material_name !== matName), { ...data, facility: { name: res.supplier } }]); await fetchAllSavedEstimates(); }
      else alert("Failed to save estimate.");
    }
    setSavingEstimateId(null);
  };

  const requestQuote = async (res: any, req: any) => {
    setRequestingId(res.facilityId + req.id);
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId: res.facilityId, materialName: res.materialName || req.material_name, quantity: req.quantity, address: activeProject.address, projectId: activeProject.id })
      });
      if (response.ok) {
        alert("Quote request sent!"); setProjectQuotes([...projectQuotes, { id: Math.random().toString(), facility_id: res.facilityId, material_name: res.materialName || req.material_name, quantity: req.quantity, status: 'pending', facility: { name: res.supplier } }]); setActiveTab('pending');
      } else { const d = await response.json(); alert("Error: " + d.error); }
    } catch (e: any) { alert("Error: " + e.message); }
    setRequestingId(null);
  };

  //        Results table (reusable for single and multi-material)
  const ResultsTable = ({ options, req, label }: { options: any[], req: any, label?: string }) => {
    if (!options || options.length === 0) return <p className="p-3 text-center text-xs text-red-400">No results found.</p>;
    return (
      <div className="w-full overflow-x-auto">
        {label && <div className="px-4 py-2 bg-slate-800/60 border-b border-slate-700"><span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{label}</span></div>}
        <table className="w-full min-w-[520px] text-xs text-left">
          <thead className="text-slate-500 bg-slate-800/50">
            <tr>
              <th className="px-4 py-2 font-medium">{req.job_type === 'Import (Delivery)' ? 'Supplier' : 'Dump Site'}</th>
              <th className="px-4 py-2 font-medium">Material</th>
              <th className="px-4 py-2 font-medium">Fleet</th>
              <th className="px-4 py-2 font-medium text-right">Base</th>
              <th className="px-4 py-2 font-medium text-right">Frt</th>
              <th className="px-4 py-2 font-bold text-right text-white">Total</th>
              <th className="px-4 py-2 font-medium text-right">Job Total</th>
              <th className="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {options.map((res: any, idx: number) => {
              const isSaved = savedEstimates.some(se => se.facility_id === res.facilityId && se.material_name === (res.materialName || req.material_name) && se.truck_fleet === res.truckFleet);
              const allBase = options.map((o: any) => o.basePrice);
              const avgBase = allBase.reduce((a: number, b: number) => a + b, 0) / allBase.length;
              const baseSavingsPct = avgBase > 0 ? ((avgBase - res.basePrice) / avgBase) * 100 : null;
              const allFrts = options.map((o: any) => o.frtPerUnit);
              const avgFrt = allFrts.reduce((a: number, b: number) => a + b, 0) / allFrts.length;
              const frtSavingsPct = avgFrt > 0 ? ((avgFrt - res.frtPerUnit) / avgFrt) * 100 : null;
              const allTotal = options.map((o: any) => o.totalPerUnit);
              const avgTotal = allTotal.reduce((a: number, b: number) => a + b, 0) / allTotal.length;
              const totalSavingsPct = avgTotal > 0 ? ((avgTotal - res.totalPerUnit) / avgTotal) * 100 : null;
              const savingsSpan = (pct: number | null) => pct === null ? null : (
                <span className={`ml-1 text-[10px] font-semibold ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pct >= 0 ? '+' : ''}{pct.toFixed(0)}%
                </span>
              );
              return (
                <tr key={idx} className={isSaved ? "bg-emerald-500/10" : "hover:bg-slate-800 transition-colors"}>
                  <td className="px-4 py-2 text-slate-300">{res.supplier}</td>
                  <td className="px-4 py-2 text-slate-300">{res.materialName || req.material_name}</td>
                  <td className="px-4 py-2 text-slate-400">{res.truckFleet}</td>
                  <td className="px-4 py-2 text-right text-slate-400">
                    ${res.basePrice.toFixed(2)}{res.isCustomQuote && <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded">*</span>}
                    {savingsSpan(baseSavingsPct)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-400">${res.frtPerUnit.toFixed(2)}{savingsSpan(frtSavingsPct)}</td>
                  <td className={`px-4 py-2 text-right font-bold ${req.job_type === 'Import (Delivery)' ? 'text-orange-400' : 'text-blue-400'}`}>
                    ${res.totalPerUnit.toFixed(2)}{savingsSpan(totalSavingsPct)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-200">${(req.quantity * res.totalPerUnit).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
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
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0b1120] text-slate-300 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold text-white tracking-wide">AggLink<span className="text-orange-500">.</span></span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button type="button" onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeView === 'dashboard' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-gauge-high mr-3 w-4 text-center"></i>Dashboard
          </button>
          <button type="button" onClick={() => setActiveView('calculator')}
            className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeView === 'calculator' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-calculator mr-3 w-4 text-center"></i>Calculator
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border-2 border-slate-500">{profileName.substring(0, 2).toUpperCase()}</div>
            <div className="ml-3"><p className="text-sm font-semibold text-white">{profileName}</p><p className="text-xs text-slate-400">{companyName}</p></div>
          </div>
        </div>
        <LogoutButton />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="relative w-full md:w-96 flex items-center space-x-3">
            {activeProject ? (
              <>
                <h2 className="text-lg font-semibold text-white">{activeProject.name}</h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold uppercase tracking-wider hidden sm:block">Active Project</span>
                <button onClick={openEditModal} className="ml-1 p-1.5 text-slate-600 hover:text-orange-400 hover:bg-orange-500/10 rounded-md transition-all" title="Edit project">
                  <i className="fa-solid fa-pen-to-square text-xs"></i>
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="ml-1 p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all" title="Delete project">
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </>
            ) : <span className="text-slate-400 italic">Select a project to begin...</span>}
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="md:hidden w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg border border-slate-700"><LogoutButton /></div>
            {projects.length > 0 && (
              <select className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
                onChange={(e) => {
                  if (e.target.value === "") { setActiveProject(null); setSavedEstimates([]); setRequirements([]); setManifestResults({}); setJobLat(undefined); setJobLon(undefined); setJobAddress(undefined); }
                  else { const p = projects.find(proj => proj.id === e.target.value); if (p) selectProject(p); }
                }}
                value={activeProject ? activeProject.id : ""}>
                <option value="">-- Switch Project --</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <button onClick={() => setShowProjectModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-orange-500/20 transition-all hidden sm:block whitespace-nowrap">+ New Project</button>
          </div>
        </header>

        {/* Content */}
        {activeView === 'dashboard' && (
        <div className="p-4 md:p-8 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Avg Freight Savings</p>
              <h3 className={`text-3xl font-bold mt-1 ${accountFreightSavings === null ? 'text-slate-500' : accountSavingsFmt.positive ? 'text-emerald-400' : 'text-red-400'}`}>{accountSavingsFmt.display}</h3>
              <p className="text-xs text-slate-400 mt-3">{accountSavingsFmt.sub}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Network</p>
              <h3 className="text-3xl font-bold text-white mt-1">{pitsCount + dumpsCount}</h3>
              <p className="text-xs text-slate-400 mt-3">{pitsCount} Pits | {dumpsCount} Dumps</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Est. Value</p>
              <h3 className={`text-3xl font-bold mt-1 ${accountTotalValue.total > 0 ? 'text-white' : 'text-slate-500'}`}>
                {accountTotalValue.total > 0 ? fmtCompactCurrency(accountTotalValue.total) : '--'}
              </h3>
              <p className="text-xs text-slate-400 mt-3">
                {accountTotalValue.projectCount > 0 ? `Across ${accountTotalValue.projectCount} active bid${accountTotalValue.projectCount === 1 ? '' : 's'}` : 'No active bids yet'}
              </p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Market Price</p>
              <h3 className="text-3xl font-bold text-white mt-1">$10.20<span className="text-sm text-slate-400 font-normal">/ton</span></h3>
              <p className="text-xs text-slate-400 mt-3">Avg Road Base (SLC Region)</p>
            </div>
          </div>

          {/* Top Row: Map + Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

              {/* Map */}
              <div className="col-span-1 lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col h-[420px]">
                <div className="flex-1 bg-slate-900 w-full relative">
                  <MapComponent jobLat={jobLat} jobLon={jobLon} jobAddress={jobAddress}
                    facilities={allFacilities}
                  />
                </div>
                <div className="px-4 py-2 border-t border-slate-700 flex items-center space-x-5">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mr-1">Legend</span>
                  {[['bg-red-500','Job Site'],['bg-orange-500','Material Pit'],['bg-blue-500','Dump Site'],['bg-emerald-500','Pit & Dump']].map(([color, label]) => (
                    <span key={label} className="flex items-center space-x-1.5 text-xs text-slate-400">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`}></span><span>{label}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Project Feed */}
              <div className="col-span-1 bg-slate-800 border border-slate-700 rounded-xl shadow-sm flex flex-col h-[420px]">
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
                <div className="p-5 flex-1 space-y-4 overflow-y-auto">
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

              {/* Manifest */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Project Manifest (Bill of Materials)</h2>
                    {lastCalculated && <p className="text-xs text-slate-400 mt-0.5"><i className="fa-solid fa-clock mr-1"></i> Last Routed: {lastCalculated.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
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

                    {/* Project savings banner */}
                    {projectFreightSavings !== null && (
                      <div className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg border ${projectSavingsFmt.positive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        <i className={`fa-solid fa-truck text-sm ${projectSavingsFmt.positive ? 'text-emerald-400' : 'text-red-400'}`}></i>
                        <div>
                          <span className={`text-sm font-bold ${projectSavingsFmt.positive ? 'text-emerald-400' : 'text-red-400'}`}>{projectSavingsFmt.display}</span>
                          <span className="text-xs text-slate-400 ml-2">freight savings on this project vs. top-5 avg</span>
                        </div>
                      </div>
                    )}

                    {/* Add Requirement Form */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-3">
                      <h3 className="text-sm font-semibold text-white">Add Requirement</h3>

                      {/* Import / Export toggle */}
                      <div className="inline-flex relative bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                        <span className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md transition-all duration-200 ${isImport ? 'left-0.5 bg-orange-500/20 border border-orange-500/40' : 'left-[calc(50%+2px)] bg-blue-500/20 border border-blue-500/40'}`} />
                        <button type="button" onClick={() => { setJobType("Import (Delivery)"); setSelectedMaterials([]); setSelectedCategory(""); }}
                          className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-md transition-colors ${isImport ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          Import
                        </button>
                        <button type="button" onClick={() => { setJobType("Export (Haul-Off)"); setSelectedMaterials([]); setSelectedCategory(""); }}
                          className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-md transition-colors ${!isImport ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          Export
                        </button>
                      </div>

                      {/* Row: Category + Truck Type + Quantity */}
                      <div className="flex flex-col md:flex-row gap-2">
                        {/* Category */}
                        <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedMaterials([]); }}
                          className={`flex-1 bg-slate-800 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none appearance-none ${isImport ? 'border-slate-700 focus:border-orange-500' : 'border-slate-700 focus:border-blue-500'}`}>
                          <option value="">All Categories</option>
                          {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        {/* Truck Type */}
                        <select value={selectedTruckType} onChange={(e) => setSelectedTruckType(e.target.value)} required
                          className={`flex-1 bg-slate-800 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none appearance-none ${isImport ? 'border-slate-700 focus:border-orange-500' : 'border-slate-700 focus:border-blue-500'}`}>
                          <option value="">-- Truck Type --</option>
                          {truckTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>

                        {/* Quantity */}
                        <div className="relative w-full md:w-32">
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">{isImport ? 'Tons' : 'CY'}</span>
                          <input type="number" required value={qty} onChange={(e) => setQty(Number(e.target.value))}
                            className={`w-full bg-slate-800 border rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:outline-none ${isImport ? 'border-slate-700 focus:border-orange-500' : 'border-slate-700 focus:border-blue-500'}`} />
                        </div>
                      </div>

                      {/* Material multi-select checkboxes */}
                      {filteredMaterials.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 mb-2">Select material(s) to compare:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                            {filteredMaterials.map(mat => (
                              <label key={mat} className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all text-xs ${selectedMaterials.includes(mat) ? (isImport ? 'bg-orange-500/10 border-orange-500/50 text-orange-300' : 'bg-blue-500/10 border-blue-500/50 text-blue-300') : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                <input type="checkbox" checked={selectedMaterials.includes(mat)} onChange={() => toggleMaterial(mat)} className="sr-only" />
                                <span className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${selectedMaterials.includes(mat) ? (isImport ? 'bg-orange-500 border-orange-500' : 'bg-blue-500 border-blue-500') : 'border-slate-600'}`}>
                                  {selectedMaterials.includes(mat) && <i className="fa-solid fa-check text-white" style={{ fontSize: '8px' }}></i>}
                                </span>
                                <span className="truncate">{mat}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add button */}
                      <form onSubmit={addRequirement}>
                        <button type="submit" disabled={selectedMaterials.length === 0 || !selectedTruckType}
                          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all text-white disabled:opacity-40 ${isImport ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                          + Add {selectedMaterials.length > 1 ? `${selectedMaterials.length} Materials` : 'Material'}
                        </button>
                        {selectedMaterials.length > 1 && (
                          <span className="ml-3 text-xs text-slate-400">Results will show side-by-side comparison</span>
                        )}
                      </form>
                    </div>

                    {/* Requirements list */}
                    <div className="space-y-6">
                      {requirements.map((req: any) => {
                        const result = manifestResults[req.id];
                        const comparedMats = req.compared_materials || [req.material_name];
                        return (
                          <div key={req.id} className="border border-slate-700 rounded-lg overflow-hidden">
                            {/* Header */}
                            <div className={`px-4 py-3 flex justify-between items-center ${req.job_type === 'Import (Delivery)' ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${req.job_type === 'Import (Delivery)' ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {req.job_type === 'Import (Delivery)' ? 'Import' : 'Export'}
                                </span>
                                {comparedMats.length === 1 ? (
                                  <span className="font-semibold text-white text-sm">{comparedMats[0]}</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {comparedMats.map((m: string) => (
                                      <span key={m} className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px]">{m}</span>
                                    ))}
                                  </div>
                                )}
                                <span className="text-slate-400 text-xs">({req.quantity.toLocaleString()} {req.job_type === 'Import (Delivery)' ? 'Tons' : 'CY'})</span>
                                {req.truck_type && <span className="px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded text-[10px]">{req.truck_type}</span>}
                              </div>
                              <button onClick={() => removeRequirement(req.id)} className="text-slate-500 hover:text-red-500 transition-colors ml-2">
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>

                            {/* Results */}
                            {result && (
                              <div className="bg-slate-900 border-t border-slate-700">
                                {Array.isArray(result) && result.length > 0 ? (
                                  <ResultsTable options={result} req={req} />
                                ) : (
                                  <p className="p-3 text-center text-xs text-red-400">No facilities found or routing failed.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
        )}

        {activeView === 'calculator' && (
        <div className="p-4 md:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: inputs */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Quick Calculator</h2>
              <p className="text-xs text-slate-400">Calculate freight and material costs without creating a project.</p>

              <div className="inline-flex relative bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                <span className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md transition-all duration-200 ${calcIsImport ? 'left-0.5 bg-orange-500/20 border border-orange-500/40' : 'left-[calc(50%+2px)] bg-blue-500/20 border border-blue-500/40'}`} />
                <button type="button" onClick={() => { setCalcIsImport(true); setCalcJobType("Import (Delivery)"); setCalcMaterials([]); setCalcCategory(""); }}
                  className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-md transition-colors ${calcIsImport ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}>
                  Import
                </button>
                <button type="button" onClick={() => { setCalcIsImport(false); setCalcJobType("Export (Haul-Off)"); setCalcMaterials([]); setCalcCategory(""); }}
                  className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-md transition-colors ${!calcIsImport ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
                  Export
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Job Site <span className="text-xs text-slate-500 font-normal ml-1">Click map to drop pin</span></label>
                <div className="h-48 rounded-lg overflow-hidden border border-slate-700">
                  <MapComponent jobLat={calcLat} jobLon={calcLon} facilities={allFacilities} onMapClick={handleCalcMapClick} interactive={true} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Address {calcIsReverseGeocoding && <span className="text-xs text-orange-400 animate-pulse ml-2">Looking up...</span>}</label>
                <textarea value={calcAddress} onChange={(e) => setCalcAddress(e.target.value)} placeholder="Click map above or type address manually"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 h-14 resize-none" />
              </div>

              <div className="flex flex-col md:flex-row gap-2">
                <select value={calcCategory} onChange={(e) => { setCalcCategory(e.target.value); setCalcMaterials([]); }}
                  className={`flex-1 bg-slate-900 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none appearance-none ${calcIsImport ? 'border-slate-700 focus:border-orange-500' : 'border-slate-700 focus:border-blue-500'}`}>
                  <option value="">All Categories</option>
                  {calcFilteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <select value={calcTruckType} onChange={(e) => setCalcTruckType(e.target.value)}
                  className={`flex-1 bg-slate-900 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none appearance-none ${calcIsImport ? 'border-slate-700 focus:border-orange-500' : 'border-slate-700 focus:border-blue-500'}`}>
                  <option value="">-- Truck Type --</option>
                  {truckTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>

                <div className="relative w-full md:w-32">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">{calcIsImport ? 'Tons' : 'CY'}</span>
                  <input type="number" value={calcQty} onChange={(e) => setCalcQty(Number(e.target.value))}
                    className={`w-full bg-slate-900 border rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:outline-none ${calcIsImport ? 'border-slate-700 focus:border-orange-500' : 'border-slate-700 focus:border-blue-500'}`} />
                </div>
              </div>

              {calcFilteredMaterials.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Select material(s) to compare:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {calcFilteredMaterials.map(mat => (
                      <label key={mat} className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all text-xs ${calcMaterials.includes(mat) ? (calcIsImport ? 'bg-orange-500/10 border-orange-500/50 text-orange-300' : 'bg-blue-500/10 border-blue-500/50 text-blue-300') : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                        <input type="checkbox" checked={calcMaterials.includes(mat)} onChange={() => calcToggleMaterial(mat)} className="sr-only" />
                        <span className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${calcMaterials.includes(mat) ? (calcIsImport ? 'bg-orange-500 border-orange-500' : 'bg-blue-500 border-blue-500') : 'border-slate-600'}`}>
                          {calcMaterials.includes(mat) && <i className="fa-solid fa-check text-white" style={{ fontSize: '8px' }}></i>}
                        </span>
                        <span className="truncate">{mat}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={runCalculator} disabled={calcIsCalculating || !calcAddress || calcMaterials.length === 0 || !calcTruckType}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-bold transition-all">
                {calcIsCalculating ? 'Calculating...' : 'Calculate'}
              </button>
            </div>

            {/* Right: results */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-700 bg-slate-900/50">
                <h2 className="text-lg font-semibold text-white">Results</h2>
                {calcResults.length > 0 && <p className="text-xs text-slate-400 mt-0.5">Top {calcResults.length} options sorted by total price</p>}
              </div>
              {calcResults.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <i className="fa-solid fa-calculator text-4xl mb-3 opacity-30"></i>
                  <p className="text-sm">Fill in the details and hit Calculate to see results.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-slate-500 bg-slate-800/80 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Supplier</th>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-4 py-3">Fleet</th>
                        <th className="px-4 py-3 text-right">Base</th>
                        <th className="px-4 py-3 text-right">Frt</th>
                        <th className="px-4 py-3 text-right font-bold text-white">Total/Unit</th>
                        <th className="px-4 py-3 text-right">Job Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {calcResults.map((res: any, idx: number) => {
                        const allTotal = calcResults.map(r => r.totalPerUnit);
                        const avgTotal = allTotal.reduce((a, b) => a + b, 0) / allTotal.length;
                        const savingsPct = avgTotal > 0 ? ((avgTotal - res.totalPerUnit) / avgTotal) * 100 : null;
                        return (
                          <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 text-slate-300">{res.supplier}</td>
                            <td className="px-4 py-3 text-slate-400">{res.materialName}</td>
                            <td className="px-4 py-3 text-slate-400">{res.truckFleet}</td>
                            <td className="px-4 py-3 text-right text-slate-400">${res.basePrice.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right text-slate-400">${res.frtPerUnit.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-bold text-orange-400">
                              ${res.totalPerUnit.toFixed(2)}
                              {savingsPct !== null && <span className={`ml-1 text-[10px] font-semibold ${savingsPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{savingsPct >= 0 ? '+' : ''}{savingsPct.toFixed(0)}%</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-300 font-semibold">${(calcQty * res.totalPerUnit).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center"><i className="fa-solid fa-triangle-exclamation text-red-500"></i></div>
              <div><h2 className="text-base font-bold text-white">Delete Project</h2><p className="text-xs text-slate-400">This cannot be undone.</p></div>
            </div>
            <p className="text-sm text-slate-300 mb-6">Are you sure you want to delete <span className="font-semibold text-white">{activeProject.name}</span>? All requirements, estimates, and quotes will be permanently removed.</p>
            <div className="flex space-x-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">Cancel</button>
              <button onClick={deleteProject} disabled={isDeletingProject} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">{isDeletingProject ? 'Deleting...' : 'Delete Project'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-white">Create New Project</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Project Name</label>
                <input type="text" required value={newProjName} onChange={(e) => setNewProjName(e.target.value)} placeholder="e.g., Redwood Subdivision"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Job Site Location <span className="ml-2 text-xs text-slate-500 font-normal">Click the map to drop your pin</span></label>
                <div className="relative h-64 w-full rounded-lg overflow-hidden border border-slate-700">
                  <MapComponent jobLat={modalJobLat} jobLon={modalJobLon} facilities={allFacilities} onMapClick={handleMapClick} interactive={true} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Job Site Address {isReverseGeocoding && <span className="ml-2 text-xs text-orange-400 animate-pulse">Looking up address...</span>}</label>
                <textarea required value={newProjAddr} onChange={(e) => setNewProjAddr(e.target.value)} placeholder="Click the map above, or type an address manually"
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

      {/* Edit Project Modal */}
      {showEditModal && activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-white">Edit Project</h2>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <form onSubmit={saveProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Project Name</label>
                <input type="text" required value={editProjName} onChange={(e) => setEditProjName(e.target.value)} placeholder="e.g., Redwood Subdivision"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Job Site Location <span className="ml-2 text-xs text-slate-500 font-normal">Click the map to drop your pin</span></label>
                <div className="relative h-64 w-full rounded-lg overflow-hidden border border-slate-700">
                  <MapComponent jobLat={editJobLat} jobLon={editJobLon} facilities={allFacilities} onMapClick={handleEditMapClick} interactive={true} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Job Site Address {isEditReverseGeocoding && <span className="ml-2 text-xs text-orange-400 animate-pulse">Looking up address...</span>}</label>
                <textarea required value={editProjAddr} onChange={(e) => setEditProjAddr(e.target.value)} placeholder="Click the map above, or type an address manually"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 h-16 resize-none" />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={closeEditModal} className="flex-1 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-semibold transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
