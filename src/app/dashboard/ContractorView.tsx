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
  exportMaterials = [],
  profileId = "",
  networkFacilities: initialNetworkFacilities = [],
  allFacilities = [],
  suppliers = [],
  relationships = [],
}: {
  profileName?: string,
  companyName?: string,
  pitsCount?: number,
  dumpsCount?: number,
  importMaterials?: string[],
  exportMaterials?: string[],
  profileId?: string,
  networkFacilities?: any[],
  allFacilities?: any[],
  suppliers?: any[],
  relationships?: any[],
}) {

  const supabase = createClient();

  // Core state
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [projectsFilter, setProjectsFilter] = useState<'active' | 'archived'>('active');
  const [archivingProject, setArchivingProject] = useState(false);
  const [projectsSortKey, setProjectsSortKey] = useState<'name' | 'address' | 'created_at' | 'last_calculated'>('name');
  const [projectsSortDir, setProjectsSortDir] = useState<'asc' | 'desc'>('asc');
  const [recentProjectIds, setRecentProjectIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('agglink:recentProjectIds');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecentProjectIds(parsed.filter((x: any) => typeof x === 'string').slice(0, 5));
      }
    } catch { /* ignore corrupt entry */ }
  }, []);

  const pushRecentProject = (id: string) => {
    setRecentProjectIds(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, 5);
      try { localStorage.setItem('agglink:recentProjectIds', JSON.stringify(next)); } catch { /* quota / SSR */ }
      return next;
    });
  };
  const [activeView, setActiveView] = useState<'dashboard' | 'projects' | 'facility_management' | 'calculator'>('dashboard');
  const [networkSearch, setNetworkSearch] = useState('');
  const [networkFilter, setNetworkFilter] = useState<'all' | 'in' | 'out'>('all');
  const [tierRequestRes, setTierRequestRes] = useState<any>(null);
  const [tierRequestMessage, setTierRequestMessage] = useState('');
  const [tierRequestSending, setTierRequestSending] = useState(false);
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
  // Quote request modal state
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteModalReq, setQuoteModalReq] = useState<any | null>(null);
  const [quoteModalFacilities, setQuoteModalFacilities] = useState<any[]>([]);
  const [quoteModalSelected, setQuoteModalSelected] = useState<Set<string>>(new Set());
  const [quoteStartMonth, setQuoteStartMonth] = useState('');
  const [quoteStartYear, setQuoteStartYear] = useState('');
  const [quoteBidDate, setQuoteBidDate] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [submittingQuoteModal, setSubmittingQuoteModal] = useState(false);

  // Per-quote follow-up message (contractor → supplier on a pending request)
  const [messagingQuoteId, setMessagingQuoteId] = useState<string | null>(null);
  const [followupText, setFollowupText] = useState('');
  const [sendingFollowup, setSendingFollowup] = useState(false);

  // Map state
  const [jobLat, setJobLat] = useState<number | undefined>(undefined);
  const [jobLon, setJobLon] = useState<number | undefined>(undefined);
  const [jobAddress, setJobAddress] = useState<string | undefined>(undefined);
  const [networkFacilities, setNetworkFacilities] = useState<any[]>(initialNetworkFacilities);
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
    fetchAllSavedEstimates();
    fetchCategoriesAndTrucks();
  }, []);

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').eq('contractor_id', user.id).order('created_at', { ascending: false });
    if (data) setProjects(data);
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

  //        Facility network management
  const addToNetwork = async (facilityId: string) => {
    const { data, error } = await supabase
      .from('contractor_facility_network')
      .insert({ contractor_id: profileId, facility_id: facilityId })
      .select('*, facility:facilities(*)')
      .single();
    if (data && !error) setNetworkFacilities(prev => [...prev, data.facility]);
    else alert('Failed to add to network: ' + (error?.message || 'unknown'));
  };

  const removeFromNetwork = async (facilityId: string) => {
    const { error } = await supabase
      .from('contractor_facility_network')
      .delete()
      .match({ contractor_id: profileId, facility_id: facilityId });
    if (!error) setNetworkFacilities(prev => prev.filter(f => f.id !== facilityId));
    else alert('Failed to remove from network: ' + error.message);
  };

  const addAllCompanyFacilities = async (ownerId: string) => {
    if (!ownerId) return;
    const ownerFacilities = (allFacilities || []).filter((f: any) => f.owner_id === ownerId);
    const networkIds = new Set(networkFacilities.map((f: any) => f.id));
    const toAdd = ownerFacilities.filter((f: any) => !networkIds.has(f.id));
    if (toAdd.length === 0) {
      alert("All of this company's facilities are already in your network.");
      return;
    }
    const rows = toAdd.map((f: any) => ({ contractor_id: profileId, facility_id: f.id }));
    const { data, error } = await supabase
      .from('contractor_facility_network')
      .insert(rows)
      .select('*, facility:facilities(*)');
    if (error) {
      alert('Failed to add facilities: ' + error.message);
      return;
    }
    if (data) {
      const newFacilities = data.map((d: any) => d.facility).filter(Boolean);
      setNetworkFacilities(prev => [...prev, ...newFacilities]);
    }
  };

  //        Tier upgrade requests
  const openTierRequest = (res: any) => {
    setTierRequestRes(res);
    setTierRequestMessage('');
  };

  const submitTierRequest = async (requestedTier: 'contractor' | 'customer') => {
    if (!tierRequestRes) return;
    setTierRequestSending(true);
    const { error } = await supabase.from('tier_requests').insert({
      contractor_id: profileId,
      supplier_id: tierRequestRes.supplierId,
      current_tier: tierRequestRes.pricingTier,
      requested_tier: requestedTier,
      message: tierRequestMessage || null,
    });
    if (!error) {
      alert('Request sent!');
      setTierRequestRes(null);
    } else alert('Failed to send request: ' + error.message);
    setTierRequestSending(false);
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
    const archivedIds = new Set(projects.filter(p => p.status === 'archived').map(p => p.id));
    const activeEstimates = allSavedEstimates.filter(est => !archivedIds.has(est.project_id));
    const total = activeEstimates.reduce((sum, est) => sum + (est.quantity * est.total_price), 0);
    const projectIds = new Set(activeEstimates.map(est => est.project_id));
    return { total, projectCount: projectIds.size };
  }, [allSavedEstimates, projects]);

  const visibleProjects = useMemo(() =>
    projects.filter(p => projectsFilter === 'archived' ? p.status === 'archived' : p.status !== 'archived'),
    [projects, projectsFilter]
  );

  const toggleArchive = async () => {
    if (!activeProject) return;
    const isArchived = activeProject.status === 'archived';
    const nextStatus = isArchived ? 'active' : 'archived';
    setArchivingProject(true);
    const { error } = await supabase.from('projects').update({ status: nextStatus }).eq('id', activeProject.id);
    if (error) {
      alert('Failed to ' + (isArchived ? 'unarchive' : 'archive') + ' project: ' + error.message);
      setArchivingProject(false);
      return;
    }
    setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, status: nextStatus } : p));
    // Deselect so the user picks one from the new filter
    setActiveProject(null);
    setSavedEstimates([]);
    setRequirements([]);
    setManifestResults({});
    setProjectQuotes([]);
    setJobLat(undefined); setJobLon(undefined); setJobAddress(undefined);
    setProjectsFilter(nextStatus === 'archived' ? 'archived' : 'active');
    setArchivingProject(false);
  };

  const mostRequestedMaterial = useMemo(() => {
    if (allSavedEstimates.length === 0) return { name: null as string | null, quantity: 0 };
    const totals: Record<string, number> = {};
    for (const est of allSavedEstimates) {
      const name = est.material_name;
      if (!name) continue;
      totals[name] = (totals[name] || 0) + Number(est.quantity || 0);
    }
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return { name: null as string | null, quantity: 0 };
    return { name: entries[0][0], quantity: entries[0][1] };
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
    pushRecentProject(proj.id);
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
    const { data: quoteData } = await supabase.from('quote_requests').select('*, facility:facilities(name)').eq('project_id', proj.id).order('created_at', { ascending: false });
    setProjectQuotes(quoteData || []);
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

  //        Quote request modal
  const openQuoteModal = (res: any, req: any, options: any[]) => {
    // Dedupe by facilityId — multiple truck-fleet rows can share a supplier.
    const seen = new Set<string>();
    const uniqueFacilities: any[] = [];
    for (const o of options) {
      if (!seen.has(o.facilityId)) {
        seen.add(o.facilityId);
        uniqueFacilities.push(o);
      }
    }
    setQuoteModalReq(req);
    setQuoteModalFacilities(uniqueFacilities);
    setQuoteModalSelected(new Set([res.facilityId]));
    setQuoteStartMonth('');
    setQuoteStartYear(String(new Date().getFullYear()));
    setQuoteBidDate('');
    setQuoteMessage('');
    setShowQuoteModal(true);
  };

  const closeQuoteModal = () => {
    setShowQuoteModal(false);
    setQuoteModalReq(null);
    setQuoteModalFacilities([]);
    setQuoteModalSelected(new Set());
  };

  const toggleQuoteFacility = (facilityId: string) => {
    setQuoteModalSelected(prev => {
      const next = new Set(prev);
      if (next.has(facilityId)) next.delete(facilityId); else next.add(facilityId);
      return next;
    });
  };

  const sendQuoteFollowup = async (quoteId: string) => {
    const text = followupText.trim();
    if (!text) return;
    setSendingFollowup(true);
    const { error } = await supabase
      .from('quote_requests')
      .update({ contractor_message: text })
      .eq('id', quoteId);
    if (!error) {
      setProjectQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, contractor_message: text } : q));
      setMessagingQuoteId(null);
      setFollowupText('');
    } else {
      alert('Failed to send message: ' + error.message);
    }
    setSendingFollowup(false);
  };

  const submitQuoteModal = async () => {
    if (!activeProject || !quoteModalReq) return;
    const ids = Array.from(quoteModalSelected).filter(id => {
      const fac = quoteModalFacilities.find(f => f.facilityId === id);
      return fac?.acceptsQuotes !== false;
    });
    if (ids.length === 0) { alert('Select at least one facility.'); return; }
    setSubmittingQuoteModal(true);
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityIds: ids,
          materialName: quoteModalReq.material_name,
          quantity: quoteModalReq.quantity,
          address: activeProject.address,
          projectId: activeProject.id,
          startMonth: quoteStartMonth || null,
          startYear: quoteStartYear ? parseInt(quoteStartYear, 10) : null,
          bidDate: quoteBidDate || null,
          message: quoteMessage.trim() || null,
        }),
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({} as any));
        const results: { facilityId: string; status: string; supplierMessage: string | null }[] = data.results || ids.map((fid: string) => ({ facilityId: fid, status: 'pending', supplierMessage: null }));
        const statusByFacility = new Map(results.map(r => [r.facilityId, r.status]));

        const newQuotes = results.map(r => {
          const fac = quoteModalFacilities.find(f => f.facilityId === r.facilityId);
          return {
            id: Math.random().toString(),
            facility_id: r.facilityId,
            material_name: quoteModalReq.material_name,
            quantity: quoteModalReq.quantity,
            status: r.status,
            supplier_message: r.supplierMessage,
            facility: { name: fac?.supplier || 'Supplier' },
          };
        });
        setProjectQuotes([...projectQuotes, ...newQuotes]);

        // Optimistically reflect each result on the manifest entries
        const matName = quoteModalReq.material_name;
        setManifestResults((prev: any) => {
          const next: any = {};
          for (const k of Object.keys(prev)) {
            next[k] = (prev[k] || []).map((entry: any) => {
              if (entry.materialName !== matName) return entry;
              const status = statusByFacility.get(entry.facilityId);
              if (!status) return entry;
              return {
                ...entry,
                isQuotePending: status === 'pending',
                isDeclined:     status === 'declined',
                isCustomQuote:  false,
              };
            });
          }
          return next;
        });

        const declinedCount = data.autoDeclined ?? 0;
        if (declinedCount > 0) {
          alert(`Sent ${results.length - declinedCount} request${results.length - declinedCount === 1 ? '' : 's'}. ${declinedCount} were auto-declined for being below the supplier's minimum.`);
        }

        setActiveTab('pending');
        closeQuoteModal();
      } else {
        const d = await response.json().catch(() => ({}));
        alert('Error: ' + (d.error || response.statusText));
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
    setSubmittingQuoteModal(false);
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
              const stockColor = res.stockStatus === 'out_of_stock' ? 'bg-red-500' : res.stockStatus === 'low' ? 'bg-yellow-500' : 'bg-emerald-500';
              const stockLabel = res.stockStatus === 'out_of_stock' ? 'Out' : res.stockStatus === 'low' ? 'Low' : null;
              return (
                <tr key={idx} className={isSaved ? "bg-emerald-500/10" : "hover:bg-slate-800 transition-colors"}>
                  <td className="px-4 py-2 text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      <span>{res.supplier}</span>
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${stockColor}`} title={res.stockStatus}></span>
                      {stockLabel && <span className={`text-[10px] font-semibold ${res.stockStatus === 'out_of_stock' ? 'text-red-400' : 'text-yellow-400'}`}>{stockLabel}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-300">{res.materialName || req.material_name}</td>
                  <td className="px-4 py-2 text-slate-400">{res.truckFleet}</td>
                  <td className="px-4 py-2 text-right text-slate-400">
                    ${res.basePrice.toFixed(2)}
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
                      {(() => {
                        const tier = res.pricingTier || 'public';
                        const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
                        const tierColor =
                          tier === 'public' ? 'border-slate-600 text-slate-400 hover:bg-slate-700' :
                          tier === 'contractor' ? 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10' :
                                                  'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10';
                        return (
                          <button onClick={() => openTierRequest(res)}
                            disabled={tier === 'customer'}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${tierColor} disabled:cursor-default disabled:opacity-100`}
                            title={tier === 'customer' ? 'You are a Customer of this supplier' : 'Click to request upgrade'}>
                            {tierLabel}
                          </button>
                        );
                      })()}
                      {res.isCustomQuote ? (
                        <span title="Custom quote accepted"
                          className="px-2 py-1 rounded text-[10px] font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 inline-flex items-center">
                          <i className="fa-solid fa-check mr-1"></i>Approved
                        </span>
                      ) : res.isDeclined ? (
                        <span title="Custom quote declined by supplier"
                          className="px-2 py-1 rounded text-[10px] font-bold border border-red-500/40 bg-red-500/10 text-red-400 inline-flex items-center">
                          <i className="fa-solid fa-xmark mr-1"></i>Declined
                        </span>
                      ) : res.isQuotePending ? (
                        <span title="Awaiting supplier response"
                          className="px-2 py-1 rounded text-[10px] font-bold border border-orange-500/40 bg-orange-500/10 text-orange-400 inline-flex items-center">
                          <i className="fa-solid fa-clock mr-1"></i>Pending
                        </span>
                      ) : res.acceptsQuotes === false ? (
                        <span title="Supplier is not accepting quote requests"
                          className="px-2 py-1 rounded text-[10px] font-bold border border-slate-600 bg-slate-700/40 text-slate-400 inline-flex items-center">
                          <i className="fa-solid fa-ban mr-1"></i>No Quotes
                        </span>
                      ) : (
                        <button onClick={() => openQuoteModal(res, req, options)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${req.job_type === 'Import (Delivery)' ? 'border-orange-500/30 text-orange-500 hover:bg-orange-500/10' : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'}`}>
                          Quote
                        </button>
                      )}
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
          <button type="button" onClick={() => {
              setActiveView('projects');
              setActiveProject(null);
              setSavedEstimates([]); setRequirements([]); setManifestResults({}); setProjectQuotes([]);
              setJobLat(undefined); setJobLon(undefined); setJobAddress(undefined);
            }}
            className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeView === 'projects' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-folder mr-3 w-4 text-center"></i>Projects
          </button>
          <button type="button" onClick={() => setActiveView('facility_management')}
            className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeView === 'facility_management' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-network-wired mr-3 w-4 text-center"></i>Facility Network
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
                {activeProject.status === 'archived' ? (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold uppercase tracking-wider hidden sm:block">Archived Project</span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold uppercase tracking-wider hidden sm:block">Active Project</span>
                )}
                <button onClick={openEditModal} className="ml-1 p-1.5 text-slate-600 hover:text-orange-400 hover:bg-orange-500/10 rounded-md transition-all" title="Edit project">
                  <i className="fa-solid fa-pen-to-square text-xs"></i>
                </button>
                <button onClick={toggleArchive} disabled={archivingProject}
                  className="ml-1 p-1.5 text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-all disabled:opacity-50"
                  title={activeProject.status === 'archived' ? 'Unarchive project' : 'Archive project'}>
                  <i className={`fa-solid ${activeProject.status === 'archived' ? 'fa-box-open' : 'fa-box-archive'} text-xs`}></i>
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="ml-1 p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all" title="Delete project">
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </>
            ) : <span className="text-slate-400 italic">Select a project to begin...</span>}
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="md:hidden w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg border border-slate-700"><LogoutButton /></div>
            {activeView === 'projects' && projects.length > 0 && (() => {
              const recents = recentProjectIds
                .map(id => projects.find(p => p.id === id))
                .filter(Boolean);
              if (recents.length === 0) return null;
              return (
                <select className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
                  onChange={(e) => {
                    if (e.target.value === "") { setActiveProject(null); setSavedEstimates([]); setRequirements([]); setManifestResults({}); setProjectQuotes([]); setJobLat(undefined); setJobLon(undefined); setJobAddress(undefined); }
                    else { const p = projects.find(proj => proj.id === e.target.value); if (p) selectProject(p); }
                  }}
                  value={activeProject ? activeProject.id : ""}>
                  <option value="">-- Recent Projects --</option>
                  {recents.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              );
            })()}
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
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Most Requested Material</p>
              {mostRequestedMaterial.name ? (
                <>
                  <h3 className="text-xl font-bold text-white mt-2 truncate" title={mostRequestedMaterial.name}>{mostRequestedMaterial.name}</h3>
                  <p className="text-xs text-slate-400 mt-3">
                    {mostRequestedMaterial.quantity.toLocaleString()} {importMaterials?.includes(mostRequestedMaterial.name) ? 'Tons' : exportMaterials?.includes(mostRequestedMaterial.name) ? 'CY' : 'Units'} requested
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-bold text-slate-500 mt-1">--</h3>
                  <p className="text-xs text-slate-400 mt-3">No saved estimates yet</p>
                </>
              )}
            </div>
          </div>

          {/* Dashboard placeholders: Materials by Month + Upcoming Bids */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Materials Purchased by Month</h2>
                  <p className="text-xs text-slate-400 mt-0.5">12-month rolling view</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-700 text-slate-400 px-2 py-1 rounded">Placeholder</span>
              </div>
              <div className="h-64 flex items-end space-x-2 px-2 pb-2 border-b border-slate-700">
                {(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']).map((m, i) => {
                  const sample = [40, 65, 35, 80, 55, 70, 90, 75, 60, 85, 50, 95];
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="w-full bg-orange-500/30 hover:bg-orange-500/50 rounded-t-sm transition-colors" style={{ height: `${sample[i]}%` }} />
                      <span className="text-[10px] text-slate-500 mt-1">{m}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 text-right italic">Sample data — not yet wired to real estimates.</p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Upcoming Bids</h2>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-700 text-slate-400 px-2 py-1 rounded">Placeholder</span>
              </div>
              <div className="space-y-3">
                {[
                  { proj: 'I-15 Reconstruction',       date: 'Jul 14', amount: '$1.2M' },
                  { proj: 'Mountain View Subdivision', date: 'Jul 22', amount: '$640K' },
                  { proj: 'Riverdale Bridge',          date: 'Aug 03', amount: '$2.1M' },
                ].map(b => (
                  <div key={b.proj} className="flex items-center justify-between py-2.5 px-3 bg-slate-900/50 border border-slate-700/60 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{b.proj}</p>
                      <p className="text-[10px] text-slate-500">Due {b.date}</p>
                    </div>
                    <span className="text-xs font-semibold text-orange-400 flex-shrink-0">{b.amount}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-3 text-right italic">Sample data — bid tracking coming soon.</p>
            </div>
          </div>
        </div>
        )}

        {activeView === 'projects' && (
        <div className="p-4 md:p-8 space-y-6">
          {/* Active / Archived filter */}
          <div className="flex items-center space-x-2">
            {(['active','archived'] as const).map(f => {
              const isActive = projectsFilter === f;
              const count = projects.filter(p => f === 'archived' ? p.status === 'archived' : p.status !== 'archived').length;
              return (
                <button key={f}
                  onClick={() => {
                    setProjectsFilter(f);
                    // If the currently selected project doesn't match the new filter, deselect
                    if (activeProject) {
                      const activeIsArchived = activeProject.status === 'archived';
                      if ((f === 'archived') !== activeIsArchived) {
                        setActiveProject(null);
                        setSavedEstimates([]); setRequirements([]); setManifestResults({}); setProjectQuotes([]);
                        setJobLat(undefined); setJobLon(undefined); setJobAddress(undefined);
                      }
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${isActive ? 'bg-orange-500/10 text-orange-400 border-orange-500/40' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-white'}`}>
                  {f} <span className="ml-1.5 text-[10px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {!activeProject ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase tracking-wider">
                    <tr>
                      {([
                        { key: 'name',            label: 'Project' },
                        { key: 'address',         label: 'Address' },
                        { key: 'created_at',      label: 'Created' },
                        { key: 'last_calculated', label: 'Last Calculated' },
                      ] as const).map(col => (
                        <th key={col.key}
                          onClick={() => {
                            if (projectsSortKey === col.key) setProjectsSortDir(d => d === 'asc' ? 'desc' : 'asc');
                            else { setProjectsSortKey(col.key); setProjectsSortDir('asc'); }
                          }}
                          className="px-5 py-3 cursor-pointer hover:text-white select-none">
                          {col.label}
                          {projectsSortKey === col.key && (
                            <i className={`fa-solid fa-arrow-${projectsSortDir === 'asc' ? 'up' : 'down'} ml-1.5 text-[10px]`}></i>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {visibleProjects.length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500 italic">No {projectsFilter} projects.</td></tr>
                    ) : [...visibleProjects].sort((a, b) => {
                      const dir = projectsSortDir === 'asc' ? 1 : -1;
                      const av = a[projectsSortKey] ?? '';
                      const bv = b[projectsSortKey] ?? '';
                      if (av < bv) return -1 * dir;
                      if (av > bv) return 1 * dir;
                      return 0;
                    }).map(p => (
                      <tr key={p.id} onClick={() => selectProject(p)}
                        className="cursor-pointer hover:bg-slate-700/40 transition-colors">
                        <td className="px-5 py-3 font-medium text-white">{p.name}</td>
                        <td className="px-5 py-3 text-slate-400 truncate max-w-xs">{p.address || '—'}</td>
                        <td className="px-5 py-3 text-slate-400">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                        <td className="px-5 py-3 text-slate-400">{p.last_calculated ? new Date(p.last_calculated).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
          <>
          <button onClick={() => { setActiveProject(null); setSavedEstimates([]); setRequirements([]); setManifestResults({}); setProjectQuotes([]); setJobLat(undefined); setJobLon(undefined); setJobAddress(undefined); }}
            className="text-xs text-slate-400 hover:text-orange-400 transition-colors flex items-center">
            <i className="fa-solid fa-arrow-left mr-1.5"></i>All Projects
          </button>

          {/* Top Row: Map + Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

              {/* Map */}
              <div className="col-span-1 lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col h-[420px]">
                <div className="flex-1 bg-slate-900 w-full relative">
                  <MapComponent jobLat={jobLat} jobLon={jobLon} jobAddress={jobAddress}
                    facilities={networkFacilities}
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
                    projectQuotes.length > 0 ? projectQuotes.map((q: any, idx: number) => {
                      const startDate = [q.start_month, q.start_year].filter(Boolean).join(' ');
                      const borderColor = q.status === 'pending' ? 'border-orange-500/30 bg-orange-500/5' : q.status === 'declined' ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5';
                      const badgeColor = q.status === 'pending' ? 'bg-orange-500/20 text-orange-500' : q.status === 'declined' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400';
                      const badgeLabel = q.status === 'pending' ? 'Awaiting Response' : q.status === 'declined' ? 'Declined' : 'Quote Received';
                      return (
                      <div key={idx} className={`border rounded-lg p-4 ${borderColor}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block ${badgeColor}`}>{badgeLabel}</span>
                            <h4 className="text-white font-medium text-sm">{q.facility?.name || "Supplier"}</h4>
                            <p className="text-xs text-slate-400 mt-1">{q.material_name}</p>
                            {startDate && <p className="text-[11px] text-slate-500 mt-0.5">Start: {startDate}</p>}
                            {q.bid_date && <p className="text-[11px] text-slate-500 mt-0.5">Bid by: {q.bid_date}</p>}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-300">{q.quantity} <span className="text-xs font-normal">{importMaterials?.includes(q.material_name) ? "Tons" : "CY"}</span></div>
                            {q.offered_price && <div className="text-lg font-bold text-emerald-400 mt-1">${q.offered_price.toFixed(2)}<span className="text-xs text-emerald-500/70 font-normal">/{importMaterials?.includes(q.material_name) ? "Ton" : "CY"}</span></div>}
                          </div>
                        </div>
                        {q.message && (
                          <div className="mt-3 bg-slate-800/40 border border-slate-700/60 rounded px-2.5 py-1.5">
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Your note</p>
                            <p className="text-[11px] text-slate-300 whitespace-pre-wrap mt-0.5">{q.message}</p>
                          </div>
                        )}
                        {q.supplier_message && (
                          <div className="mt-2 bg-emerald-500/5 border border-emerald-500/20 rounded px-2.5 py-1.5">
                            <p className="text-[9px] text-emerald-400 uppercase tracking-wider font-semibold">Supplier reply</p>
                            <p className="text-[11px] text-slate-200 whitespace-pre-wrap mt-0.5">{q.supplier_message}</p>
                          </div>
                        )}
                        {q.contractor_message && messagingQuoteId !== q.id && (
                          <div className="mt-2 bg-slate-800/40 border border-slate-700/60 rounded px-2.5 py-1.5">
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Your last message</p>
                            <p className="text-[11px] text-slate-300 whitespace-pre-wrap mt-0.5">{q.contractor_message}</p>
                          </div>
                        )}
                        {q.status === 'pending' && (
                          <div className="mt-3 pt-2 border-t border-slate-700/60">
                            {messagingQuoteId === q.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={followupText}
                                  onChange={e => setFollowupText(e.target.value)}
                                  rows={3}
                                  autoFocus
                                  placeholder="Send a question or note to the supplier..."
                                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none resize-none"
                                />
                                <div className="flex justify-end space-x-2">
                                  <button onClick={() => { setMessagingQuoteId(null); setFollowupText(''); }}
                                    className="text-slate-400 hover:text-white text-xs font-semibold px-2">Cancel</button>
                                  <button disabled={sendingFollowup || !followupText.trim()} onClick={() => sendQuoteFollowup(q.id)}
                                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors">
                                    {sendingFollowup ? '...' : 'Send Message'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-end">
                                <button onClick={() => { setMessagingQuoteId(q.id); setFollowupText(''); }}
                                  className="text-orange-500 hover:text-orange-400 text-xs font-bold transition-colors">
                                  Send Message <i className="fa-solid fa-arrow-right ml-1"></i>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    }) : <p className="text-slate-500 text-sm text-center py-4">No pending quotes.</p>
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
          </>
          )}
        </div>
        )}

        {activeView === 'facility_management' && (() => {
          const networkIdSet = new Set(networkFacilities.map((f: any) => f.id));
          const inNetworkAll = (allFacilities || []).filter((f: any) => networkIdSet.has(f.id));
          const outNetworkAll = (allFacilities || []).filter((f: any) => !networkIdSet.has(f.id));
          const filterScoped =
            networkFilter === 'in'  ? inNetworkAll :
            networkFilter === 'out' ? outNetworkAll :
            (allFacilities || []);
          const matchesSearch = (f: any) => !networkSearch || f.name?.toLowerCase().includes(networkSearch.toLowerCase());
          const visibleFacilities = filterScoped.filter(matchesSearch);
          return (
        <div className="p-4 md:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Facility Network</h1>
            <p className="text-sm text-slate-400 mt-1">Add facilities to your network to see them in the estimator and on your map.</p>
          </div>

          {/* Network filter chips */}
          <div className="flex items-center space-x-2">
            {([
              { id: 'all', label: 'All',              count: (allFacilities || []).length, activeCls: 'bg-orange-500/10 text-orange-400 border-orange-500/40' },
              { id: 'in',  label: 'In My Network',    count: inNetworkAll.length,          activeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' },
              { id: 'out', label: 'Outside Network',  count: outNetworkAll.length,         activeCls: 'bg-slate-700/40 text-slate-300 border-slate-500' },
            ] as const).map(opt => {
              const isActive = networkFilter === opt.id;
              return (
                <button key={opt.id} onClick={() => setNetworkFilter(opt.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isActive ? opt.activeCls : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-white'}`}>
                  {opt.label} <span className="ml-1.5 text-[10px] opacity-80">({opt.count})</span>
                </button>
              );
            })}
          </div>

          {/* All facilities map with custom popups */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden h-[460px]">
            <MapComponent
              facilities={visibleFacilities}
              renderFacilityPopup={(fac: any) => {
                const owner = (suppliers || []).find((s: any) => s.id === fac.owner_id);
                const ownerName = owner?.company_name || 'Unknown supplier';
                const inNetwork = networkFacilities.some((n: any) => n.id === fac.id);
                const ownerFacilityCount = (allFacilities || []).filter((f: any) => f.owner_id === fac.owner_id).length;
                const typeLabel =
                  fac.type === 'dump' ? 'Dump / Recycle Site' :
                  fac.type === 'both' ? 'Pit & Dump Site' :
                  'Material Pit';
                return (
                  <div style={{ background: '#1e293b', color: '#f1f5f9', padding: '8px 10px', borderRadius: '6px', minWidth: '200px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{fac.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{typeLabel}</div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px' }}>
                      <span style={{ color: '#64748b' }}>Owner: </span>{ownerName}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {inNetwork ? (
                        <button
                          onClick={() => removeFromNetwork(fac.id)}
                          style={{ background: 'transparent', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <i className="fa-solid fa-minus" style={{ marginRight: 4 }}></i>Remove from Network
                        </button>
                      ) : (
                        <button
                          onClick={() => addToNetwork(fac.id)}
                          style={{ background: '#f97316', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <i className="fa-solid fa-plus" style={{ marginRight: 4 }}></i>Add to Network
                        </button>
                      )}
                      {fac.owner_id && ownerFacilityCount > 1 && (
                        <button
                          onClick={() => addAllCompanyFacilities(fac.owner_id)}
                          style={{ background: 'transparent', color: '#fb923c', border: '1px solid rgba(249,115,22,0.4)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          + Add all of {ownerName}&apos;s {ownerFacilityCount} facilities
                        </button>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          </div>

          <div className="relative max-w-md">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
            <input
              type="text"
              value={networkSearch}
              onChange={e => setNetworkSearch(e.target.value)}
              placeholder="Search facilities by name..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
              <span>{visibleFacilities.length} facilities</span>
              <span>{networkFacilities.length} in your network</span>
            </div>
            <div className="divide-y divide-slate-700/60">
              {visibleFacilities
                .map((f: any) => {
                  const inNetwork = networkFacilities.some((n: any) => n.id === f.id);
                  const owner = (suppliers || []).find((s: any) => s.id === f.owner_id);
                  const rel = (relationships || []).find((r: any) => r.supplier_id === f.owner_id);
                  const tier = rel?.tier || 'public';
                  const tierColor =
                    tier === 'customer' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    tier === 'contractor' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                    'bg-slate-700/40 text-slate-400 border-slate-600';
                  const typeColor =
                    f.type === 'pit'  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                    f.type === 'dump' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                        'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                  return (
                    <div key={f.id} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-semibold text-white truncate">{f.name}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeColor}`}>{f.type}</span>
                        </div>
                        {f.address && <p className="text-xs text-slate-400 mt-1 truncate">{f.address}</p>}
                        <div className="flex items-center space-x-2 mt-1.5">
                          <span className="text-[10px] text-slate-500">Owner: <span className="text-slate-400">{owner?.company_name || '—'}</span></span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${tierColor}`}>{tier}</span>
                        </div>
                      </div>
                      {inNetwork ? (
                        <button onClick={() => removeFromNetwork(f.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-600 text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-all whitespace-nowrap">
                          <i className="fa-solid fa-minus mr-1.5"></i>Remove
                        </button>
                      ) : (
                        <button onClick={() => addToNetwork(f.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-all whitespace-nowrap">
                          <i className="fa-solid fa-plus mr-1.5"></i>Add to Network
                        </button>
                      )}
                    </div>
                  );
                })}
              {visibleFacilities.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-slate-500 italic">No facilities match your filter.</div>
              )}
            </div>
          </div>
        </div>
          );
        })()}

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
                  <MapComponent jobLat={calcLat} jobLon={calcLon} facilities={networkFacilities} onMapClick={handleCalcMapClick} interactive={true} />
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
                  <MapComponent jobLat={modalJobLat} jobLon={modalJobLon} facilities={networkFacilities} onMapClick={handleMapClick} interactive={true} />
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
                  <MapComponent jobLat={editJobLat} jobLon={editJobLon} facilities={networkFacilities} onMapClick={handleEditMapClick} interactive={true} />
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

      {/* Quote Request Modal */}
      {showQuoteModal && quoteModalReq && activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={closeQuoteModal}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-white">Request Job-Specific Quote</h3>
                <p className="text-xs text-slate-400 mt-0.5">{activeProject.name}</p>
              </div>
              <button onClick={closeQuoteModal} className="text-slate-400 hover:text-white p-1.5">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Job details */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500 uppercase tracking-wider font-semibold">Material</p>
                    <p className="text-white font-medium mt-0.5">{quoteModalReq.material_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase tracking-wider font-semibold">Quantity</p>
                    <p className="text-white font-medium mt-0.5">{Number(quoteModalReq.quantity || 0).toLocaleString()} {quoteModalReq.job_type === 'Import (Delivery)' ? 'tons' : 'CY'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 uppercase tracking-wider font-semibold">Job Site</p>
                    <p className="text-white font-medium mt-0.5">{activeProject.address}</p>
                  </div>
                </div>
              </div>

              {/* Start date (optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Job Start Date <span className="text-slate-600 font-normal normal-case">(optional)</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={quoteStartMonth}
                    onChange={e => setQuoteStartMonth(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">— Month or Season —</option>
                    <optgroup label="Month">
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Season">
                      {['Spring','Summer','Fall','Winter'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                  </select>
                  <input
                    type="number"
                    min="2024" max="2099" step="1"
                    value={quoteStartYear}
                    onChange={e => setQuoteStartYear(e.target.value)}
                    placeholder="Year"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Bid date (optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bid Date <span className="text-slate-600 font-normal normal-case">(optional — deadline for the supplier to respond)</span></label>
                <input
                  type="date"
                  value={quoteBidDate}
                  onChange={e => setQuoteBidDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Facility selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Suppliers to Request Quote From <span className="text-slate-600 font-normal normal-case">({quoteModalSelected.size} selected)</span>
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {quoteModalFacilities.map(fac => {
                    const checked = quoteModalSelected.has(fac.facilityId);
                    const disabled = fac.acceptsQuotes === false;
                    return (
                      <label key={fac.facilityId}
                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-all ${disabled ? 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed' : checked ? 'bg-orange-500/10 border-orange-500/40 cursor-pointer' : 'bg-slate-800 border-slate-700 hover:border-slate-600 cursor-pointer'}`}>
                        <div className="flex items-center space-x-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleQuoteFacility(fac.facilityId)}
                            className="w-4 h-4 accent-orange-500 flex-shrink-0 disabled:opacity-50"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{fac.supplier}</p>
                            <p className="text-[10px] text-slate-500">{fac.truckFleet}{disabled && <span className="ml-2 text-red-400">Not accepting quotes</span>}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-white">${fac.totalPerUnit.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-500">{quoteModalReq.job_type === 'Import (Delivery)' ? '/ton' : '/CY'}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Additional Details <span className="text-slate-600 font-normal normal-case">(optional)</span></label>
                <textarea
                  value={quoteMessage}
                  onChange={e => setQuoteMessage(e.target.value)}
                  rows={4}
                  placeholder="Specs, delivery preferences, scheduling notes, etc."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700 flex space-x-3 flex-shrink-0">
              <button onClick={closeQuoteModal}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">
                Cancel
              </button>
              <button onClick={submitQuoteModal} disabled={submittingQuoteModal || quoteModalSelected.size === 0}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">
                {submittingQuoteModal ? 'Sending...' : `Send Request (${quoteModalSelected.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tier Request Modal */}
      {tierRequestRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-white">Request Better Pricing</h2>
              <button onClick={() => setTierRequestRes(null)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              You are currently receiving <span className="font-semibold capitalize text-white">{tierRequestRes.pricingTier}</span> pricing from <span className="font-semibold text-white">{tierRequestRes.supplier}</span>.
            </p>
            <label className="block text-sm font-medium text-slate-300 mb-1">Message (optional)</label>
            <textarea value={tierRequestMessage} onChange={e => setTierRequestMessage(e.target.value)}
              placeholder="Introduce yourself or explain your typical volume..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 h-24 resize-none mb-4" />
            <div className="space-y-2">
              {tierRequestRes.pricingTier === 'public' && (
                <button onClick={() => submitTierRequest('contractor')} disabled={tierRequestSending}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">
                  Request Contractor Pricing
                </button>
              )}
              <button onClick={() => submitTierRequest('customer')} disabled={tierRequestSending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">
                Request Customer Pricing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
