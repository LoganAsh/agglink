/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import LogoutButton from '@/components/LogoutButton';
import { toast } from 'sonner';
import { Skeleton } from '@/components/Skeleton';
import dynamic from 'next/dynamic';
import InvoicePaymentForm from '@/components/InvoicePaymentForm';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });
const InvoicePDFButton = dynamic(() => import('@/components/InvoicePDFButton'), { ssr: false });

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
  contractorInvoices: initialContractorInvoices = [],
  invoiceLineItems = [],
  truckingNetwork: initialTruckingNetwork = [],
  allTruckers = [],
  truckerRates = [],
  contractorJobRequests: initialContractorJobRequests = [],
  facilityMaterials = [],
  allMaterialCategories = [],
  allMaterialCategoryMap = [],
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
  contractorInvoices?: any[],
  invoiceLineItems?: any[],
  truckingNetwork?: any[],
  allTruckers?: any[],
  truckerRates?: any[],
  contractorJobRequests?: any[],
  facilityMaterials?: any[],
  allMaterialCategories?: any[],
  allMaterialCategoryMap?: any[],
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
  const [activeView, setActiveView] = useState<'dashboard' | 'projects' | 'facility_management' | 'trucking_network' | 'invoices' | 'calculator'>('dashboard');
  const [networkSearch, setNetworkSearch] = useState('');
  const [networkFilter, setNetworkFilter] = useState<'all' | 'in' | 'out'>('all');
  const [expandedFacilityIds, setExpandedFacilityIds] = useState<Set<string>>(new Set());
  const [tierRequestRes, setTierRequestRes] = useState<any>(null);
  const [tierRequestMessage, setTierRequestMessage] = useState('');
  const [tierRequestSending, setTierRequestSending] = useState(false);

  // Contractor invoices
  const [contractorInvoices] = useState<any[]>(initialContractorInvoices);
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'unpaid' | 'paid' | 'overdue'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Trucking network
  const [truckingNetwork, setTruckingNetwork] = useState<any[]>(initialTruckingNetwork);
  const [contractorJobRequests, setContractorJobRequests] = useState<any[]>(initialContractorJobRequests);

  // Trucker quote request modal state
  const [showJobRequestModal, setShowJobRequestModal] = useState(false);
  const [jobRequestEstimate, setJobRequestEstimate] = useState<any>(null);
  const [selectedTruckerId, setSelectedTruckerId] = useState('');
  const [jobRequestMessage, setJobRequestMessage] = useState('');
  const [sendingJobRequest, setSendingJobRequest] = useState(false);

  const submitJobRequest = async () => {
    if (!jobRequestEstimate || !selectedTruckerId) return;
    setSendingJobRequest(true);
    const payload = {
      contractor_id: profileId,
      trucker_id: selectedTruckerId,
      project_id: jobRequestEstimate.project_id,
      project_estimate_id: jobRequestEstimate.id,
      material_name: jobRequestEstimate.material_name,
      quantity: jobRequestEstimate.quantity,
      truck_type: jobRequestEstimate.truck_fleet,
      pickup_facility_id: jobRequestEstimate.facility_id,
      dropoff_address: activeProject?.address || null,
      message: jobRequestMessage || null,
    };
    const { data, error } = await supabase
      .from('trucker_job_requests')
      .insert(payload)
      .select('*, trucker:profiles!trucker_job_requests_trucker_id_fkey(company_name), pickup:facilities(name)')
      .single();
    if (data && !error) {
      setContractorJobRequests([data, ...contractorJobRequests]);
      setShowJobRequestModal(false);
      toast.success('Quote request sent!');
    } else toast.error('Failed to send: ' + (error?.message || 'unknown'));
    setSendingJobRequest(false);
  };

  const addTruckerToNetwork = async (truckerId: string) => {
    const { data, error } = await supabase
      .from('contractor_trucking_network')
      .insert({ contractor_id: profileId, trucker_id: truckerId })
      .select('*, trucker:profiles!contractor_trucking_network_trucker_id_fkey(id, company_name)')
      .single();
    if (data && !error) setTruckingNetwork(prev => [...prev, data]);
    else toast.error('Failed to add trucker: ' + (error?.message || 'unknown'));
  };

  const removeTruckerFromNetwork = async (truckerId: string) => {
    const { error } = await supabase
      .from('contractor_trucking_network')
      .delete()
      .match({ contractor_id: profileId, trucker_id: truckerId });
    if (!error) setTruckingNetwork(prev => prev.filter(t => t.trucker_id !== truckerId));
    else toast.error('Failed to remove: ' + error.message);
  };
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
    else toast.error('Failed to add to network: ' + (error?.message || 'unknown'));
  };

  const removeFromNetwork = async (facilityId: string) => {
    const { error } = await supabase
      .from('contractor_facility_network')
      .delete()
      .match({ contractor_id: profileId, facility_id: facilityId });
    if (!error) setNetworkFacilities(prev => prev.filter(f => f.id !== facilityId));
    else toast.error('Failed to remove from network: ' + error.message);
  };

  const addAllCompanyFacilities = async (ownerId: string) => {
    if (!ownerId) return;
    const ownerFacilities = (allFacilities || []).filter((f: any) => f.owner_id === ownerId);
    const networkIds = new Set(networkFacilities.map((f: any) => f.id));
    const toAdd = ownerFacilities.filter((f: any) => !networkIds.has(f.id));
    if (toAdd.length === 0) {
      toast("All of this company's facilities are already in your network.");
      return;
    }
    const rows = toAdd.map((f: any) => ({ contractor_id: profileId, facility_id: f.id }));
    const { data, error } = await supabase
      .from('contractor_facility_network')
      .insert(rows)
      .select('*, facility:facilities(*)');
    if (error) {
      toast.error('Failed to add facilities: ' + error.message);
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
      toast.success('Request sent!');
      setTierRequestRes(null);
    } else toast.error('Failed to send request: ' + error.message);
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
      toast.error('Failed to ' + (isArchived ? 'unarchive' : 'archive') + ' project: ' + error.message);
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
    } else toast.error("Failed to save project.");
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
    } else toast.error("Failed to create project");
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
    } else toast.error("Failed to delete project.");
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
    if (!activeProject || selectedMaterials.length === 0 || !qty) { toast.error("Please select at least one material and fill out all fields."); return; }
    if (!selectedTruckType) { toast.error("Please select a truck type."); return; }

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
    } else { toast.error("Failed to add requirement."); console.error(error); }
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
      else toast.error("Failed to remove saved estimate.");
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
      else toast.error("Failed to save estimate.");
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
      toast.error('Failed to send message: ' + error.message);
    }
    setSendingFollowup(false);
  };

  const submitQuoteModal = async () => {
    if (!activeProject || !quoteModalReq) return;
    const ids = Array.from(quoteModalSelected).filter(id => {
      const fac = quoteModalFacilities.find(f => f.facilityId === id);
      return fac?.acceptsQuotes !== false;
    });
    if (ids.length === 0) { toast.error('Select at least one facility.'); return; }
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
          toast.success(`Sent ${results.length - declinedCount} request${results.length - declinedCount === 1 ? '' : 's'}. ${declinedCount} were auto-declined for being below the supplier's minimum.`);
        }

        setActiveTab('pending');
        closeQuoteModal();
      } else {
        const d = await response.json().catch(() => ({}));
        toast.error('Error: ' + (d.error || response.statusText));
      }
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    }
    setSubmittingQuoteModal(false);
  };

  //        Results table (reusable for single and multi-material)
  const ResultsTable = ({ options, req, label }: { options: any[], req: any, label?: string }) => {
    if (!options || options.length === 0) return <p className="p-3 text-center text-xs text-red-700">No results found.</p>;
    return (
      <div className="w-full overflow-x-auto">
        {label && <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200"><span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">{label}</span></div>}
        <table className="w-full min-w-[520px] text-xs text-left">
          <thead className="text-zinc-500 bg-zinc-50">
            <tr>
              <th className="px-4 py-2 font-medium">{req.job_type === 'Import (Delivery)' ? 'Supplier' : 'Dump Site'}</th>
              <th className="px-4 py-2 font-medium">Material</th>
              <th className="px-4 py-2 font-medium">Fleet</th>
              <th className="px-4 py-2 font-medium text-right">Base</th>
              <th className="px-4 py-2 font-medium text-right">Frt</th>
              <th className="px-4 py-2 font-bold text-right text-zinc-900">Total</th>
              <th className="px-4 py-2 font-medium text-right">Job Total</th>
              <th className="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
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
                <span className={`ml-1 text-[10px] font-semibold ${pct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {pct >= 0 ? '+' : ''}{pct.toFixed(0)}%
                </span>
              );
              const stockColor = res.stockStatus === 'out_of_stock' ? 'bg-red-500' : res.stockStatus === 'low' ? 'bg-yellow-500' : 'bg-emerald-500';
              const stockLabel = res.stockStatus === 'out_of_stock' ? 'Out' : res.stockStatus === 'low' ? 'Low' : null;
              return (
                <tr key={idx} className={isSaved ? "bg-emerald-500/10" : "hover:bg-white transition-colors duration-150"}>
                  <td className="px-4 py-2 text-zinc-700">
                    <div className="flex items-center space-x-1.5">
                      <span>{res.supplier}</span>
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${stockColor}`} title={res.stockStatus}></span>
                      {stockLabel && <span className={`text-[10px] font-semibold ${res.stockStatus === 'out_of_stock' ? 'text-red-700' : 'text-yellow-700'}`}>{stockLabel}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-zinc-700">{res.materialName || req.material_name}</td>
                  <td className="px-4 py-2 text-zinc-600">
                    <div>{res.truckFleet}</div>
                    {res.truckerName && <div className="text-[9px] text-cyan-700 mt-0.5"><i className="fa-solid fa-truck mr-1"></i>{res.truckerName}</div>}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-600">
                    ${res.basePrice.toFixed(2)}
                    {savingsSpan(baseSavingsPct)}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-600">${res.frtPerUnit.toFixed(2)}{savingsSpan(frtSavingsPct)}</td>
                  <td className={`px-4 py-2 text-right font-bold ${req.job_type === 'Import (Delivery)' ? 'text-orange-600' : 'text-blue-700'}`}>
                    ${res.totalPerUnit.toFixed(2)}{savingsSpan(totalSavingsPct)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-zinc-800">${(req.quantity * res.totalPerUnit).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-2">
                    <div className="flex space-x-1 justify-center">
                      <button onClick={() => toggleEstimate(res, req)} disabled={savingEstimateId === res.facilityId + res.truckFleet + req.id}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50 ${isSaved ? 'bg-emerald-500 text-white hover:bg-red-500' : 'bg-zinc-100 text-zinc-700 hover:bg-emerald-600 hover:text-white'}`}
                        title={isSaved ? "Remove saved estimate" : "Lock in this price"}>
                        {savingEstimateId === res.facilityId + res.truckFleet + req.id ? <i className="fa-solid fa-spinner fa-spin"></i> : isSaved ? <i className="fa-solid fa-xmark"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                      </button>
                      {(() => {
                        const tier = res.pricingTier || 'public';
                        const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
                        const tierColor =
                          tier === 'public' ? 'border-zinc-300 text-zinc-600 hover:bg-zinc-100' :
                          tier === 'contractor' ? 'border-orange-500/30 text-orange-600 hover:bg-orange-500/10' :
                                                  'border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10';
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
                          className="px-2 py-1 rounded text-[10px] font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 inline-flex items-center">
                          <i className="fa-solid fa-check mr-1"></i>Approved
                        </span>
                      ) : res.isDeclined ? (
                        <span title="Custom quote declined by supplier"
                          className="px-2 py-1 rounded text-[10px] font-bold border border-red-500/40 bg-red-500/10 text-red-700 inline-flex items-center">
                          <i className="fa-solid fa-xmark mr-1"></i>Declined
                        </span>
                      ) : res.isQuotePending ? (
                        <span title="Awaiting supplier response"
                          className="px-2 py-1 rounded text-[10px] font-bold border border-orange-500/40 bg-orange-500/10 text-orange-600 inline-flex items-center">
                          <i className="fa-solid fa-clock mr-1"></i>Pending
                        </span>
                      ) : res.acceptsQuotes === false ? (
                        <span title="Supplier is not accepting quote requests"
                          className="px-2 py-1 rounded text-[10px] font-bold border border-zinc-300 bg-zinc-100 text-zinc-600 inline-flex items-center">
                          <i className="fa-solid fa-ban mr-1"></i>No Quotes
                        </span>
                      ) : (
                        <button onClick={() => openQuoteModal(res, req, options)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${req.job_type === 'Import (Delivery)' ? 'border-orange-500/30 text-orange-500 hover:bg-orange-500/10' : 'border-blue-500/30 text-blue-700 hover:bg-blue-500/10'}`}>
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
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 text-zinc-700 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-zinc-200">
          <span className="text-xl font-bold text-zinc-900 tracking-wide">AggLink<span className="text-orange-500">.</span></span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button type="button" onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-150 text-left hover:translate-x-0.5 ${activeView === 'dashboard' ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-600 hover:text-zinc-900 hover:bg-white'}`}>
            <i className="fa-solid fa-gauge-high mr-3 w-4 text-center"></i>Dashboard
          </button>
          <button type="button" onClick={() => {
              setActiveView('projects');
              setActiveProject(null);
              setSavedEstimates([]); setRequirements([]); setManifestResults({}); setProjectQuotes([]);
              setJobLat(undefined); setJobLon(undefined); setJobAddress(undefined);
            }}
            className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-150 text-left hover:translate-x-0.5 ${activeView === 'projects' ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-600 hover:text-zinc-900 hover:bg-white'}`}>
            <i className="fa-solid fa-folder mr-3 w-4 text-center"></i>Projects
          </button>
          <button type="button" onClick={() => setActiveView('facility_management')}
            className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-150 text-left hover:translate-x-0.5 ${activeView === 'facility_management' ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-600 hover:text-zinc-900 hover:bg-white'}`}>
            <i className="fa-solid fa-network-wired mr-3 w-4 text-center"></i>Facility Network
          </button>
          <button type="button" onClick={() => setActiveView('trucking_network')}
            className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-150 text-left hover:translate-x-0.5 ${activeView === 'trucking_network' ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-600 hover:text-zinc-900 hover:bg-white'}`}>
            <i className="fa-solid fa-truck mr-3 w-4 text-center"></i>Trucking Network
          </button>
          {(() => {
            const unpaidCount = contractorInvoices.filter((i: any) => i.status !== 'paid').length;
            return (
              <button type="button" onClick={() => setActiveView('invoices')}
                className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-150 text-left hover:translate-x-0.5 ${activeView === 'invoices' ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-600 hover:text-zinc-900 hover:bg-white'}`}>
                <i className="fa-solid fa-file-invoice-dollar mr-3 w-4 text-center"></i>Invoices
                {unpaidCount > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unpaidCount}</span>
                )}
              </button>
            );
          })()}
          <button type="button" onClick={() => setActiveView('calculator')}
            className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-150 text-left hover:translate-x-0.5 ${activeView === 'calculator' ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-600 hover:text-zinc-900 hover:bg-white'}`}>
            <i className="fa-solid fa-calculator mr-3 w-4 text-center"></i>Calculator
          </button>
        </nav>
        <div className="p-4 border-t border-zinc-200">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold border-2 border-zinc-400">{profileName.substring(0, 2).toUpperCase()}</div>
            <div className="ml-3"><p className="text-sm font-semibold text-zinc-900">{profileName}</p><p className="text-xs text-zinc-600">{companyName}</p></div>
          </div>
        </div>
        <LogoutButton />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-zinc-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="relative w-full md:w-96 flex items-center space-x-3">
            {activeProject ? (
              <>
                <h2 className="text-lg font-semibold text-zinc-900">{activeProject.name}</h2>
                {activeProject.status === 'archived' ? (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-700 border border-red-500/30 rounded text-[10px] font-bold uppercase tracking-wider hidden sm:block">Archived Project</span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 rounded text-[10px] font-bold uppercase tracking-wider hidden sm:block">Active Project</span>
                )}
                <button onClick={openEditModal} className="ml-1 p-1.5 text-zinc-400 hover:text-orange-600 hover:bg-orange-500/10 rounded-md transition-all" title="Edit project">
                  <i className="fa-solid fa-pen-to-square text-xs"></i>
                </button>
                <button onClick={toggleArchive} disabled={archivingProject}
                  className="ml-1 p-1.5 text-zinc-400 hover:text-amber-700 hover:bg-amber-500/10 rounded-md transition-all disabled:opacity-50"
                  title={activeProject.status === 'archived' ? 'Unarchive project' : 'Archive project'}>
                  <i className={`fa-solid ${activeProject.status === 'archived' ? 'fa-box-open' : 'fa-box-archive'} text-xs`}></i>
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="ml-1 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all" title="Delete project">
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </>
            ) : <span className="text-zinc-600 italic">Select a project to begin...</span>}
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="md:hidden w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-zinc-200"><LogoutButton /></div>
            {activeView === 'projects' && projects.length > 0 && (() => {
              const recents = recentProjectIds
                .map(id => projects.find(p => p.id === id))
                .filter(Boolean);
              if (recents.length === 0) return null;
              return (
                <select className="bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:border-orange-500"
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
            <button onClick={() => setShowProjectModal(true)} className="bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-orange-500/20 transition-all hidden sm:block whitespace-nowrap">+ New Project</button>
          </div>
        </header>

        {/* Content */}
        {activeView === 'dashboard' && (
        <div className="p-4 md:p-8 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-zinc-600 font-semibold uppercase tracking-wider">Avg Freight Savings</p>
              <h3 className={`text-3xl font-bold mt-1 ${accountFreightSavings === null ? 'text-zinc-500' : accountSavingsFmt.positive ? 'text-emerald-700' : 'text-red-700'}`}>
                <span key={accountSavingsFmt.display} className="inline-block kpi-fade">{accountSavingsFmt.display}</span>
              </h3>
              <p className="text-xs text-zinc-600 mt-3">{accountSavingsFmt.sub}</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-zinc-600 font-semibold uppercase tracking-wider">Active Network</p>
              <h3 className="text-3xl font-bold text-zinc-900 mt-1">
                <span key={pitsCount + dumpsCount} className="inline-block kpi-fade">{pitsCount + dumpsCount}</span>
              </h3>
              <p className="text-xs text-zinc-600 mt-3">{pitsCount} Pits | {dumpsCount} Dumps</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-zinc-600 font-semibold uppercase tracking-wider">Total Est. Value</p>
              <h3 className={`text-3xl font-bold mt-1 ${accountTotalValue.total > 0 ? 'text-zinc-900' : 'text-zinc-500'}`}>
                <span key={accountTotalValue.total} className="inline-block kpi-fade">{accountTotalValue.total > 0 ? fmtCompactCurrency(accountTotalValue.total) : '--'}</span>
              </h3>
              <p className="text-xs text-zinc-600 mt-3">
                {accountTotalValue.projectCount > 0 ? `Across ${accountTotalValue.projectCount} active bid${accountTotalValue.projectCount === 1 ? '' : 's'}` : 'No active bids yet'}
              </p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-zinc-600 font-semibold uppercase tracking-wider">Most Requested Material</p>
              {mostRequestedMaterial.name ? (
                <>
                  <h3 className="text-xl font-bold text-zinc-900 mt-2 truncate" title={mostRequestedMaterial.name}>{mostRequestedMaterial.name}</h3>
                  <p className="text-xs text-zinc-600 mt-3">
                    {mostRequestedMaterial.quantity.toLocaleString()} {importMaterials?.includes(mostRequestedMaterial.name) ? 'Tons' : exportMaterials?.includes(mostRequestedMaterial.name) ? 'CY' : 'Units'} requested
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-bold text-zinc-500 mt-1">--</h3>
                  <p className="text-xs text-zinc-600 mt-3">No saved estimates yet</p>
                </>
              )}
            </div>
          </div>

          {/* Dashboard placeholders: Materials by Month + Upcoming Bids */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Materials Purchased by Month</h2>
                  <p className="text-xs text-zinc-600 mt-0.5">12-month rolling view</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded">Placeholder</span>
              </div>
              <div className="h-64 flex items-end space-x-2 px-2 pb-2 border-b border-zinc-200">
                {(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']).map((m, i) => {
                  const sample = [40, 65, 35, 80, 55, 70, 90, 75, 60, 85, 50, 95];
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="w-full bg-orange-500/30 hover:bg-orange-500/50 rounded-t-sm transition-colors" style={{ height: `${sample[i]}%` }} />
                      <span className="text-[10px] text-zinc-500 mt-1">{m}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 text-right italic">Sample data — not yet wired to real estimates.</p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-900">Upcoming Bids</h2>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded">Placeholder</span>
              </div>
              <div className="space-y-3">
                {[
                  { proj: 'I-15 Reconstruction',       date: 'Jul 14', amount: '$1.2M' },
                  { proj: 'Mountain View Subdivision', date: 'Jul 22', amount: '$640K' },
                  { proj: 'Riverdale Bridge',          date: 'Aug 03', amount: '$2.1M' },
                ].map(b => (
                  <div key={b.proj} className="flex items-center justify-between py-2.5 px-3 bg-zinc-50/80 border border-zinc-200 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{b.proj}</p>
                      <p className="text-[10px] text-zinc-500">Due {b.date}</p>
                    </div>
                    <span className="text-xs font-semibold text-orange-600 flex-shrink-0">{b.amount}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 mt-3 text-right italic">Sample data — bid tracking coming soon.</p>
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
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${isActive ? 'bg-orange-500/10 text-orange-600 border-orange-500/40' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:text-zinc-900'}`}>
                  {f} <span className="ml-1.5 text-[10px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {!activeProject ? (
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50/80 text-xs text-zinc-600 uppercase tracking-wider">
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
                          className="px-5 py-3 cursor-pointer hover:text-zinc-900 select-none">
                          {col.label}
                          {projectsSortKey === col.key && (
                            <i className={`fa-solid fa-arrow-${projectsSortDir === 'asc' ? 'up' : 'down'} ml-1.5 text-[10px]`}></i>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/70">
                    {visibleProjects.length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-10 text-center text-zinc-500 italic">No {projectsFilter} projects.</td></tr>
                    ) : [...visibleProjects].sort((a, b) => {
                      const dir = projectsSortDir === 'asc' ? 1 : -1;
                      const av = a[projectsSortKey] ?? '';
                      const bv = b[projectsSortKey] ?? '';
                      if (av < bv) return -1 * dir;
                      if (av > bv) return 1 * dir;
                      return 0;
                    }).map(p => (
                      <tr key={p.id} onClick={() => selectProject(p)}
                        className="cursor-pointer hover:bg-zinc-100 transition-colors">
                        <td className="px-5 py-3 font-medium text-zinc-900">{p.name}</td>
                        <td className="px-5 py-3 text-zinc-600 truncate max-w-xs">{p.address || '—'}</td>
                        <td className="px-5 py-3 text-zinc-600">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                        <td className="px-5 py-3 text-zinc-600">{p.last_calculated ? new Date(p.last_calculated).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
          <>
          <button onClick={() => { setActiveProject(null); setSavedEstimates([]); setRequirements([]); setManifestResults({}); setProjectQuotes([]); setJobLat(undefined); setJobLon(undefined); setJobAddress(undefined); }}
            className="text-xs text-zinc-600 hover:text-orange-600 transition-colors flex items-center">
            <i className="fa-solid fa-arrow-left mr-1.5"></i>All Projects
          </button>

          {/* Top Row: Map + Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

              {/* Map */}
              <div className="col-span-1 lg:col-span-2 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[420px]">
                <div className="flex-1 bg-white w-full relative">
                  <MapComponent jobLat={jobLat} jobLon={jobLon} jobAddress={jobAddress}
                    facilities={networkFacilities}
                  />
                </div>
                <div className="px-4 py-2 border-t border-zinc-200 flex items-center space-x-5">
                  <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider mr-1">Legend</span>
                  {[['bg-red-500','Job Site'],['bg-orange-500','Material Pit'],['bg-blue-500','Dump Site'],['bg-emerald-500','Pit & Dump']].map(([color, label]) => (
                    <span key={label} className="flex items-center space-x-1.5 text-xs text-zinc-600">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`}></span><span>{label}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Project Feed */}
              <div className="col-span-1 bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col h-[420px]">
                <div className="p-5 border-b border-zinc-200 bg-zinc-50/80">
                  <h2 className="text-lg font-semibold text-zinc-900 mb-4">Project Feed</h2>
                  <div className="flex space-x-1 p-1 bg-white rounded-lg border border-zinc-200">
                    <button onClick={() => setActiveTab('locked')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'locked' ? 'bg-zinc-100 text-zinc-900 shadow' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}`}>Locked Pricing</button>
                    <button onClick={() => setActiveTab('pending')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center ${activeTab === 'pending' ? 'bg-zinc-100 text-zinc-900 shadow' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                      Pending Quotes
                      {projectQuotes.filter(q => q.status === 'pending').length > 0 && (
                        <span className="ml-1.5 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{projectQuotes.filter(q => q.status === 'pending').length}</span>
                      )}
                    </button>
                  </div>
                </div>
                <div className="p-5 flex-1 space-y-4 overflow-y-auto">
                  {!activeProject ? (
                    <p className="text-zinc-500 text-sm text-center py-4">Select a project to view the feed.</p>
                  ) : activeTab === 'locked' ? (
                    savedEstimates.length > 0 ? savedEstimates.map((est: any, idx: number) => {
                      const existingReq = contractorJobRequests.find((r: any) => r.project_estimate_id === est.id);
                      const reqStatusColor = existingReq?.status === 'quoted' ? 'text-emerald-700' : existingReq?.status === 'declined' ? 'text-red-700' : 'text-orange-600';
                      return (
                      <div key={idx} className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block">{est.is_custom_quote ? 'Locked (Discount)' : 'Locked'}</span>
                            <h4 className="text-zinc-900 font-medium text-sm">{est.material_name}</h4>
                            <p className="text-xs text-zinc-600 mt-1">{est.facility?.name || "Selected Facility"} | {est.quantity} {importMaterials?.includes(est.material_name) ? "Tons" : "CY"} | {est.truck_fleet}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-emerald-700">${est.total_price.toFixed(2)}<span className="text-xs text-emerald-500/70 font-normal">/{importMaterials?.includes(est.material_name) ? "Ton" : "CY"}</span></div>
                          </div>
                        </div>

                        {existingReq && (
                          <div className={`mt-2 text-[10px] ${reqStatusColor} font-semibold`}>
                            <i className="fa-solid fa-truck mr-1"></i>
                            {existingReq.trucker?.company_name}: {existingReq.status.toUpperCase()}
                            {existingReq.status === 'quoted' && existingReq.offered_hourly_rate && (
                              <span className="ml-1 text-zinc-900">${Number(existingReq.offered_hourly_rate).toFixed(2)}/hr</span>
                            )}
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setJobRequestEstimate(est);
                            setSelectedTruckerId('');
                            setJobRequestMessage('');
                            setShowJobRequestModal(true);
                          }}
                          className="mt-3 w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
                          <i className="fa-solid fa-truck mr-1.5"></i>{existingReq ? 'Send Another Quote Request' : 'Request Trucker Quote'}
                        </button>
                      </div>
                      );
                    }) : <p className="text-zinc-500 text-sm text-center py-4">No locked pricing yet.</p>
                  ) : (
                    projectQuotes.length > 0 ? projectQuotes.map((q: any, idx: number) => {
                      const startDate = [q.start_month, q.start_year].filter(Boolean).join(' ');
                      const borderColor = q.status === 'pending' ? 'border-orange-500/30 bg-orange-500/5' : q.status === 'declined' ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5';
                      const badgeColor = q.status === 'pending' ? 'bg-orange-500/20 text-orange-500' : q.status === 'declined' ? 'bg-red-500/20 text-red-700' : 'bg-emerald-500/20 text-emerald-700';
                      const badgeLabel = q.status === 'pending' ? 'Awaiting Response' : q.status === 'declined' ? 'Declined' : 'Quote Received';
                      return (
                      <div key={idx} className={`border rounded-lg p-4 ${borderColor}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block ${badgeColor}`}>{badgeLabel}</span>
                            <h4 className="text-zinc-900 font-medium text-sm">{q.facility?.name || "Supplier"}</h4>
                            <p className="text-xs text-zinc-600 mt-1">{q.material_name}</p>
                            {startDate && <p className="text-[11px] text-zinc-500 mt-0.5">Start: {startDate}</p>}
                            {q.bid_date && <p className="text-[11px] text-zinc-500 mt-0.5">Bid by: {q.bid_date}</p>}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-zinc-700">{q.quantity} <span className="text-xs font-normal">{importMaterials?.includes(q.material_name) ? "Tons" : "CY"}</span></div>
                            {q.offered_price && <div className="text-lg font-bold text-emerald-700 mt-1">${q.offered_price.toFixed(2)}<span className="text-xs text-emerald-500/70 font-normal">/{importMaterials?.includes(q.material_name) ? "Ton" : "CY"}</span></div>}
                          </div>
                        </div>
                        {q.message && (
                          <div className="mt-3 bg-zinc-50 border border-zinc-200 rounded px-2.5 py-1.5">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Your note</p>
                            <p className="text-[11px] text-zinc-700 whitespace-pre-wrap mt-0.5">{q.message}</p>
                          </div>
                        )}
                        {q.supplier_message && (
                          <div className="mt-2 bg-emerald-500/5 border border-emerald-500/20 rounded px-2.5 py-1.5">
                            <p className="text-[9px] text-emerald-700 uppercase tracking-wider font-semibold">Supplier reply</p>
                            <p className="text-[11px] text-zinc-800 whitespace-pre-wrap mt-0.5">{q.supplier_message}</p>
                          </div>
                        )}
                        {q.contractor_message && messagingQuoteId !== q.id && (
                          <div className="mt-2 bg-zinc-50 border border-zinc-200 rounded px-2.5 py-1.5">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Your last message</p>
                            <p className="text-[11px] text-zinc-700 whitespace-pre-wrap mt-0.5">{q.contractor_message}</p>
                          </div>
                        )}
                        {q.status === 'pending' && (
                          <div className="mt-3 pt-2 border-t border-zinc-200">
                            {messagingQuoteId === q.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={followupText}
                                  onChange={e => setFollowupText(e.target.value)}
                                  rows={3}
                                  autoFocus
                                  placeholder="Send a question or note to the supplier..."
                                  className="w-full bg-white border border-zinc-300 rounded px-2 py-1.5 text-xs text-zinc-900 focus:border-orange-500 focus:outline-none resize-none"
                                />
                                <div className="flex justify-end space-x-2">
                                  <button onClick={() => { setMessagingQuoteId(null); setFollowupText(''); }}
                                    className="text-zinc-600 hover:text-zinc-900 text-xs font-semibold px-2">Cancel</button>
                                  <button disabled={sendingFollowup || !followupText.trim()} onClick={() => sendQuoteFollowup(q.id)}
                                    className="bg-orange-500 hover:bg-orange-600 active:scale-[0.97] disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-bold transition-all">
                                    {sendingFollowup ? '...' : 'Send Message'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-end">
                                <button onClick={() => { setMessagingQuoteId(q.id); setFollowupText(''); }}
                                  className="text-orange-500 hover:text-orange-600 text-xs font-bold transition-colors">
                                  Send Message <i className="fa-solid fa-arrow-right ml-1"></i>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    }) : <p className="text-zinc-500 text-sm text-center py-4">No pending quotes.</p>
                  )}
                </div>
              </div>
          </div>

              {/* Manifest */}
              <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/80">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Project Manifest (Bill of Materials)</h2>
                    {lastCalculated && <p className="text-xs text-zinc-600 mt-0.5"><i className="fa-solid fa-clock mr-1"></i> Last Routed: {lastCalculated.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                  </div>
                  {requirements.length > 0 && (
                    <button onClick={calculateManifest} disabled={isCalculating} className="bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] text-white px-4 py-1.5 rounded text-sm font-bold shadow-lg transition-all disabled:opacity-50">
                      {isCalculating ? 'Routing...' : (lastCalculated ? 'Re-Route Logistics' : 'Optimize Logistics')}
                    </button>
                  )}
                </div>

                {!activeProject ? (
                  <div className="p-12 text-center text-zinc-500">
                    <i className="fa-solid fa-folder-open text-4xl mb-3 opacity-50"></i>
                    <p>Select or create a project to build your logistics manifest.</p>
                  </div>
                ) : (
                  <div className="p-5 space-y-6">

                    {/* Project savings banner */}
                    {projectFreightSavings !== null && (
                      <div className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg border ${projectSavingsFmt.positive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        <i className={`fa-solid fa-truck text-sm ${projectSavingsFmt.positive ? 'text-emerald-700' : 'text-red-700'}`}></i>
                        <div>
                          <span className={`text-sm font-bold ${projectSavingsFmt.positive ? 'text-emerald-700' : 'text-red-700'}`}>{projectSavingsFmt.display}</span>
                          <span className="text-xs text-zinc-600 ml-2">freight savings on this project vs. top-5 avg</span>
                        </div>
                      </div>
                    )}

                    {/* Add Requirement Form */}
                    <div className="bg-zinc-50/80 p-4 rounded-lg border border-zinc-200 space-y-3">
                      <h3 className="text-sm font-semibold text-zinc-900">Add Requirement</h3>

                      {/* Import / Export toggle */}
                      <div className="inline-flex relative bg-white border border-zinc-200 rounded-lg p-0.5">
                        <span className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md transition-all duration-200 ${isImport ? 'left-0.5 bg-orange-500/20 border border-orange-500/40' : 'left-[calc(50%+2px)] bg-blue-500/20 border border-blue-500/40'}`} />
                        <button type="button" onClick={() => { setJobType("Import (Delivery)"); setSelectedMaterials([]); setSelectedCategory(""); }}
                          className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-md transition-colors ${isImport ? 'text-orange-600' : 'text-zinc-500 hover:text-zinc-700'}`}>
                          Import
                        </button>
                        <button type="button" onClick={() => { setJobType("Export (Haul-Off)"); setSelectedMaterials([]); setSelectedCategory(""); }}
                          className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-md transition-colors ${!isImport ? 'text-blue-700' : 'text-zinc-500 hover:text-zinc-700'}`}>
                          Export
                        </button>
                      </div>

                      {/* Row: Category + Truck Type + Quantity */}
                      <div className="flex flex-col md:flex-row gap-2">
                        {/* Category */}
                        <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedMaterials([]); }}
                          className={`flex-1 bg-white border rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none appearance-none ${isImport ? 'border-zinc-200 focus:border-orange-500' : 'border-zinc-200 focus:border-blue-500'}`}>
                          <option value="">All Categories</option>
                          {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        {/* Truck Type */}
                        <select value={selectedTruckType} onChange={(e) => setSelectedTruckType(e.target.value)} required
                          className={`flex-1 bg-white border rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none appearance-none ${isImport ? 'border-zinc-200 focus:border-orange-500' : 'border-zinc-200 focus:border-blue-500'}`}>
                          <option value="">-- Truck Type --</option>
                          {truckTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>

                        {/* Quantity */}
                        <div className="relative w-full md:w-32">
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-600">{isImport ? 'Tons' : 'CY'}</span>
                          <input type="number" required value={qty} onChange={(e) => setQty(Number(e.target.value))}
                            className={`w-full bg-white border rounded-lg pl-3 pr-10 py-2 text-sm text-zinc-900 focus:outline-none ${isImport ? 'border-zinc-200 focus:border-orange-500' : 'border-zinc-200 focus:border-blue-500'}`} />
                        </div>
                      </div>

                      {/* Material multi-select checkboxes */}
                      {filteredMaterials.length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-600 mb-2">Select material(s) to compare:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                            {filteredMaterials.map(mat => (
                              <label key={mat} className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all text-xs ${selectedMaterials.includes(mat) ? (isImport ? 'bg-orange-500/10 border-orange-500/50 text-orange-700' : 'bg-blue-500/10 border-blue-500/50 text-blue-300') : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
                                <input type="checkbox" checked={selectedMaterials.includes(mat)} onChange={() => toggleMaterial(mat)} className="sr-only" />
                                <span className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${selectedMaterials.includes(mat) ? (isImport ? 'bg-orange-500 border-orange-500' : 'bg-blue-500 border-blue-500') : 'border-zinc-300'}`}>
                                  {selectedMaterials.includes(mat) && <i className="fa-solid fa-check text-zinc-900" style={{ fontSize: '8px' }}></i>}
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
                          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all text-zinc-900 disabled:opacity-40 ${isImport ? 'bg-orange-500 hover:bg-orange-600 active:scale-[0.97]' : 'bg-blue-500 hover:bg-blue-600 active:scale-[0.97]'}`}>
                          + Add {selectedMaterials.length > 1 ? `${selectedMaterials.length} Materials` : 'Material'}
                        </button>
                        {selectedMaterials.length > 1 && (
                          <span className="ml-3 text-xs text-zinc-600">Results will show side-by-side comparison</span>
                        )}
                      </form>
                    </div>

                    {/* Requirements list */}
                    <div className="space-y-6">
                      {requirements.map((req: any) => {
                        const result = manifestResults[req.id];
                        const comparedMats = (req.compared_materials && req.compared_materials.length > 0)
                          ? req.compared_materials
                          : (req.material_name ? [req.material_name] : []);
                        const unit = req.job_type === 'Import (Delivery)' ? 'Tons' : 'CY';
                        return (
                          <div key={req.id} className="border border-zinc-200 rounded-lg overflow-hidden">
                            {/* Header */}
                            <div className={`px-4 py-3 flex justify-between items-start gap-3 ${req.job_type === 'Import (Delivery)' ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-2">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${req.job_type === 'Import (Delivery)' ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-700'}`}>
                                    {req.job_type === 'Import (Delivery)' ? 'Import' : 'Export'}
                                  </span>
                                  <span className="text-sm font-semibold text-zinc-900">
                                    {req.quantity.toLocaleString()} {unit}
                                  </span>
                                  {req.truck_type && (
                                    <span className="px-1.5 py-0.5 bg-white border border-zinc-200 text-zinc-700 rounded text-[10px] font-medium">{req.truck_type}</span>
                                  )}
                                </div>
                                <div className="mt-2 flex items-baseline flex-wrap gap-1.5">
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                    {comparedMats.length > 1 ? 'Materials:' : 'Material:'}
                                  </span>
                                  {comparedMats.length === 0 ? (
                                    <span className="text-xs italic text-zinc-400">none selected</span>
                                  ) : comparedMats.length === 1 ? (
                                    <span className="text-sm font-semibold text-zinc-900">{comparedMats[0]}</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {comparedMats.map((m: string) => (
                                        <span key={m} className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-xs font-medium text-zinc-800">{m}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button onClick={() => removeRequirement(req.id)} className="text-zinc-500 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5" title="Remove requirement">
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>

                            {/* Results */}
                            {isCalculating && !result ? (
                              <div className="bg-white border-t border-zinc-200 p-4 space-y-2" aria-label="Calculating routing">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="h-4 flex-1" />
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-4 w-16" />
                                  </div>
                                ))}
                              </div>
                            ) : result ? (
                              <div className="bg-white border-t border-zinc-200">
                                {Array.isArray(result) && result.length > 0 ? (
                                  <ResultsTable options={result} req={req} />
                                ) : (
                                  <p className="p-3 text-center text-xs text-red-700">No facilities found or routing failed.</p>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {requirements.length === 0 && (
                        <div className="text-center py-6 border-2 border-dashed border-zinc-200 rounded-lg">
                          <p className="text-zinc-500 text-sm">No materials added to manifest yet.</p>
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
            <h1 className="text-2xl font-bold text-zinc-900">Facility Network</h1>
            <p className="text-sm text-zinc-600 mt-1">Add facilities to your network to see them in the estimator and on your map.</p>
          </div>

          {/* Network filter chips */}
          <div className="flex items-center space-x-2">
            {([
              { id: 'all', label: 'All',              count: (allFacilities || []).length, activeCls: 'bg-orange-500/10 text-orange-600 border-orange-500/40' },
              { id: 'in',  label: 'In My Network',    count: inNetworkAll.length,          activeCls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40' },
              { id: 'out', label: 'Outside Network',  count: outNetworkAll.length,         activeCls: 'bg-zinc-100 text-zinc-700 border-zinc-400' },
            ] as const).map(opt => {
              const isActive = networkFilter === opt.id;
              return (
                <button key={opt.id} onClick={() => setNetworkFilter(opt.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isActive ? opt.activeCls : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:text-zinc-900'}`}>
                  {opt.label} <span className="ml-1.5 text-[10px] opacity-80">({opt.count})</span>
                </button>
              );
            })}
          </div>

          {/* All facilities map with custom popups */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden h-[460px]">
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
                  <div style={{ background: '#ffffff', color: '#18181b', padding: '8px 10px', borderRadius: '6px', minWidth: '200px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{fac.name}</div>
                    <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>{typeLabel}</div>
                    <div style={{ fontSize: '11px', color: '#52525b', marginTop: '6px' }}>
                      <span style={{ color: '#a1a1aa' }}>Owner: </span>{ownerName}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {inNetwork ? (
                        <button
                          onClick={() => removeFromNetwork(fac.id)}
                          style={{ background: 'transparent', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.4)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
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
                          style={{ background: 'transparent', color: '#c2410c', border: '1px solid rgba(249,115,22,0.4)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
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
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm"></i>
            <input
              type="text"
              value={networkSearch}
              onChange={e => setNetworkSearch(e.target.value)}
              placeholder="Search facilities by name..."
              className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between text-xs text-zinc-600">
              <span>{visibleFacilities.length} facilities</span>
              <span>{networkFacilities.length} in your network</span>
            </div>
            <div className="divide-y divide-zinc-200/70">
              {visibleFacilities
                .map((f: any) => {
                  const inNetwork = networkFacilities.some((n: any) => n.id === f.id);
                  const owner = (suppliers || []).find((s: any) => s.id === f.owner_id);
                  const rel = (relationships || []).find((r: any) => r.supplier_id === f.owner_id);
                  const tier = rel?.tier || 'public';
                  const tierColor =
                    tier === 'customer' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' :
                    tier === 'contractor' ? 'bg-orange-500/10 text-orange-600 border-orange-500/30' :
                    'bg-zinc-100 text-zinc-600 border-zinc-300';
                  const typeColor =
                    f.type === 'pit'  ? 'bg-orange-500/20 text-orange-600 border-orange-500/30' :
                    f.type === 'dump' ? 'bg-blue-500/20 text-blue-700 border-blue-500/30' :
                                        'bg-emerald-500/20 text-emerald-700 border-emerald-500/30';
                  const isExpanded = expandedFacilityIds.has(f.id);
                  const facMats = (facilityMaterials || []).filter((m: any) => m.facility_id === f.id);

                  // Group materials by category name (a material can belong to multiple
                  // categories via material_category_map). Materials with no category
                  // entry land in "Uncategorized".
                  const catNameById = new Map<string, string>((allMaterialCategories || []).map((c: any) => [c.id, c.name]));
                  const groupedMats: Record<string, any[]> = {};
                  for (const mat of facMats) {
                    const mappings = (allMaterialCategoryMap || []).filter((m: any) => m.material_name === mat.name);
                    if (mappings.length === 0) {
                      (groupedMats['Uncategorized'] ||= []).push(mat);
                    } else {
                      for (const m of mappings) {
                        const catName = catNameById.get(m.category_id) || 'Uncategorized';
                        (groupedMats[catName] ||= []).push(mat);
                      }
                    }
                  }
                  const groupNames = Object.keys(groupedMats).sort((a, b) =>
                    a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)
                  );

                  const priceForMaterial = (mat: any) => {
                    if (mat.is_import) {
                      const c = Number(mat.price_per_ton_contractor) || 0;
                      const cu = Number(mat.price_per_ton_customer) || 0;
                      const pu = Number(mat.price_per_ton) || 0;
                      const v = tier === 'customer' && cu > 0 ? cu : tier === 'contractor' && c > 0 ? c : pu;
                      return { value: v, unit: '/ton' };
                    }
                    const c = Number(mat.price_per_cy_contractor) || 0;
                    const cu = Number(mat.price_per_cy_customer) || 0;
                    const pu = Number(mat.price_per_cy) || 0;
                    const v = tier === 'customer' && cu > 0 ? cu : tier === 'contractor' && c > 0 ? c : pu;
                    return { value: v, unit: '/CY' };
                  };

                  return (
                    <div key={f.id} className="px-5 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <button
                          onClick={() => {
                            setExpandedFacilityIds(prev => {
                              const next = new Set(prev);
                              if (next.has(f.id)) next.delete(f.id); else next.add(f.id);
                              return next;
                            });
                          }}
                          className="min-w-0 flex-1 text-left flex items-start gap-3 group"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Collapse materials' : 'Expand materials'}
                        >
                          <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} text-[10px] text-zinc-500 group-hover:text-zinc-700 mt-1.5 w-3 flex-shrink-0 transition-transform`}></i>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-semibold text-zinc-900 truncate">{f.name}</p>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeColor}`}>{f.type}</span>
                              <span className="text-[10px] text-zinc-500">· {facMats.length} material{facMats.length === 1 ? '' : 's'}</span>
                            </div>
                            {f.address && <p className="text-xs text-zinc-600 mt-1 truncate">{f.address}</p>}
                            <div className="flex items-center space-x-2 mt-1.5">
                              <span className="text-[10px] text-zinc-500">Owner: <span className="text-zinc-600">{owner?.company_name || '—'}</span></span>
                              <span className="text-[10px] text-zinc-500">Price Tier:</span>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${tierColor}`}>{tier}</span>
                            </div>
                          </div>
                        </button>
                        {inNetwork ? (
                          <button onClick={() => removeFromNetwork(f.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-300 text-zinc-600 hover:border-red-500/50 hover:text-red-700 transition-all whitespace-nowrap flex-shrink-0">
                            <i className="fa-solid fa-minus mr-1.5"></i>Remove
                          </button>
                        ) : (
                          <button onClick={() => addToNetwork(f.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white transition-all whitespace-nowrap flex-shrink-0">
                            <i className="fa-solid fa-plus mr-1.5"></i>Add to Network
                          </button>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-3 ml-6 bg-zinc-50/80 border border-zinc-200 rounded-lg overflow-hidden">
                          {facMats.length === 0 ? (
                            <p className="px-4 py-6 text-center text-xs text-zinc-500 italic">No materials listed at this facility.</p>
                          ) : (
                            groupNames.map(catName => (
                              <div key={catName} className="border-b border-zinc-200 last:border-b-0">
                                <div className="px-4 py-2 bg-white/60 border-b border-zinc-200">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">{catName}</p>
                                </div>
                                <div className="divide-y divide-zinc-200/70">
                                  {groupedMats[catName].map((mat: any) => {
                                    const { value, unit } = priceForMaterial(mat);
                                    const has10w = Number(mat.price_10w_load) > 0;
                                    const hasSd = Number(mat.price_sd_load) > 0;
                                    return (
                                      <div key={mat.id} className="px-4 py-2 flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-medium text-zinc-900 truncate">{mat.name}</p>
                                          {(has10w || hasSd) && (
                                            <p className="text-[10px] text-zinc-500 mt-0.5">
                                              {has10w && <span>10-Wheeler: <span className="text-zinc-700">${Number(mat.price_10w_load).toFixed(2)}</span></span>}
                                              {has10w && hasSd && <span> · </span>}
                                              {hasSd && <span>Side Dump: <span className="text-zinc-700">${Number(mat.price_sd_load).toFixed(2)}</span></span>}
                                            </p>
                                          )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <p className="text-sm font-bold text-zinc-900">${value.toFixed(2)}<span className="text-[10px] text-zinc-500 font-normal">{unit}</span></p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              {visibleFacilities.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-zinc-500 italic">No facilities match your filter.</div>
              )}
            </div>
          </div>
        </div>
          );
        })()}

        {activeView === 'trucking_network' && (() => {
          const networkTruckerIds = truckingNetwork.map((t: any) => t.trucker_id);
          const inNetwork = (allTruckers || []).filter((t: any) => networkTruckerIds.includes(t.id));
          const notInNetwork = (allTruckers || []).filter((t: any) => !networkTruckerIds.includes(t.id));
          return (
        <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">

          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Trucking Network</h1>
            <p className="text-sm text-zinc-600 mt-1">Add trucking companies to use their rates in your project estimates.</p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">My Trucking Network ({inNetwork.length})</h2>
            </div>
            {inNetwork.length === 0 ? (
              <p className="p-8 text-center text-zinc-500 text-sm">No trucking companies in your network yet. Add some below to use their rates.</p>
            ) : (
              <div className="divide-y divide-zinc-200/70">
                {inNetwork.map((trucker: any) => {
                  const truckerSpecificRates = (truckerRates || []).filter((r: any) => r.trucker_id === trucker.id);
                  return (
                    <div key={trucker.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <i className="fa-solid fa-truck text-cyan-700"></i>
                            <span className="text-sm font-semibold text-zinc-900">{trucker.company_name}</span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                            {truckerSpecificRates.map((rate: any) => (
                              <div key={rate.id} className="bg-zinc-50/80 border border-zinc-200 rounded-lg px-3 py-2">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{rate.truck_type}</p>
                                <p className="text-sm text-zinc-900 font-bold mt-0.5">${Number(rate.hourly_rate).toFixed(2)}<span className="text-[10px] text-zinc-500 font-normal">/hr</span></p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">Min {rate.minimum_hours_per_day}hr/day</p>
                              </div>
                            ))}
                            {truckerSpecificRates.length === 0 && (
                              <span className="text-xs text-zinc-500 italic">No rates published yet</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => removeTruckerFromNetwork(trucker.id)}
                          className="text-zinc-500 hover:text-red-500 transition-colors text-xs">
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/80">
              <h2 className="text-sm font-semibold text-zinc-900">Available Trucking Companies ({notInNetwork.length})</h2>
            </div>
            {notInNetwork.length === 0 ? (
              <p className="p-8 text-center text-zinc-500 text-sm">No additional trucking companies available.</p>
            ) : (
              <div className="divide-y divide-zinc-200/70">
                {notInNetwork.map((trucker: any) => {
                  const truckerSpecificRates = (truckerRates || []).filter((r: any) => r.trucker_id === trucker.id);
                  return (
                    <div key={trucker.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-truck text-zinc-500"></i>
                          <span className="text-sm font-semibold text-zinc-900">{trucker.company_name}</span>
                          <span className="text-xs text-zinc-500">({truckerSpecificRates.length} truck type{truckerSpecificRates.length !== 1 ? 's' : ''})</span>
                        </div>
                      </div>
                      <button onClick={() => addTruckerToNetwork(trucker.id)}
                        className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
                        + Add to Network
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
          );
        })()}

        {activeView === 'invoices' && (() => {
          const totalOutstanding = contractorInvoices
            .filter((i: any) => i.status !== 'paid')
            .reduce((sum: number, i: any) => sum + (Number(i.total_amount) - Number(i.amount_paid || 0)), 0);
          const thisYear = new Date().getFullYear();
          const paidThisYear = contractorInvoices
            .filter((i: any) => i.status === 'paid' && i.paid_date && new Date(i.paid_date).getFullYear() === thisYear)
            .reduce((sum: number, i: any) => sum + Number(i.amount_paid || i.total_amount || 0), 0);
          const overdueCount = contractorInvoices.filter((i: any) => i.status === 'overdue').length;
          const filtered = contractorInvoices.filter((i: any) =>
            invoiceFilter === 'all'     ? true :
            invoiceFilter === 'unpaid'  ? i.status !== 'paid' :
            invoiceFilter === 'paid'    ? i.status === 'paid' :
            i.status === 'overdue'
          );
          return (
        <div className="p-4 md:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Invoices</h1>
            <p className="text-sm text-zinc-600 mt-1">Bills from your suppliers. Click to view details and pay online.</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <p className="text-xs text-zinc-600 font-semibold uppercase tracking-wider">Total Outstanding</p>
              <h3 className={`text-3xl font-bold mt-1 ${totalOutstanding > 0 ? 'text-orange-600' : 'text-zinc-500'}`}>
                ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-zinc-600 mt-3">{contractorInvoices.filter((i: any) => i.status !== 'paid').length} unpaid invoice(s)</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <p className="text-xs text-zinc-600 font-semibold uppercase tracking-wider">Paid This Year</p>
              <h3 className="text-3xl font-bold text-emerald-700 mt-1">
                ${paidThisYear.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h3>
              <p className="text-xs text-zinc-600 mt-3">{thisYear} year-to-date</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <p className="text-xs text-zinc-600 font-semibold uppercase tracking-wider">Overdue</p>
              <h3 className={`text-3xl font-bold mt-1 ${overdueCount > 0 ? 'text-red-700' : 'text-zinc-500'}`}>{overdueCount}</h3>
              <p className="text-xs text-zinc-600 mt-3">past their due date</p>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex space-x-1 p-1 bg-white rounded-lg border border-zinc-200 inline-flex">
            {(['all', 'unpaid', 'paid', 'overdue'] as const).map(f => (
              <button key={f} onClick={() => setInvoiceFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${invoiceFilter === f ? 'bg-zinc-100 text-zinc-900 shadow' : 'text-zinc-600 hover:text-zinc-900'}`}>
                {f}
              </button>
            ))}
          </div>

          {/* Invoice list */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
                <i className="fa-solid fa-file-invoice-dollar text-4xl text-zinc-400 mb-3"></i>
                <p className="text-zinc-600 text-sm">No invoices {invoiceFilter !== 'all' ? `with status "${invoiceFilter}"` : 'yet'}.</p>
              </div>
            ) : filtered.map((inv: any) => {
              const statusColor =
                inv.status === 'paid'    ? 'bg-emerald-500/20 text-emerald-700' :
                inv.status === 'overdue' ? 'bg-red-500/20 text-red-700' :
                inv.status === 'sent'    ? 'bg-blue-500/20 text-blue-700' :
                                           'bg-zinc-200 text-zinc-600';
              const owed = Number(inv.total_amount) - Number(inv.amount_paid || 0);
              return (
                <div key={inv.id}
                  onClick={() => { setSelectedInvoice(inv); setShowInvoiceDetail(true); }}
                  className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-zinc-900/10 transition-all duration-200 cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-bold text-zinc-900">{inv.invoice_number}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${statusColor}`}>{inv.status}</span>
                      </div>
                      {(() => {
                        const issuer = inv.supplier?.company_name || inv.trucker?.company_name || 'Unknown';
                        const issuerType = inv.supplier_id ? 'Supplier' : inv.trucker_id ? 'Trucking' : null;
                        const issuerColor = inv.supplier_id ? 'bg-orange-500/15 text-orange-600 border-orange-500/30' : 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30';
                        return (
                          <p className="text-sm text-zinc-700 flex items-center gap-2">
                            <span>{issuer}</span>
                            {issuerType && <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${issuerColor}`}>{issuerType}</span>}
                          </p>
                        );
                      })()}
                      {inv.project?.name && <p className="text-xs text-zinc-500 mt-0.5">{inv.project.name}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                        {inv.issued_date && <span><i className="fa-solid fa-calendar mr-1"></i>{new Date(inv.issued_date).toLocaleDateString()}</span>}
                        {inv.due_date    && <span><i className="fa-solid fa-clock mr-1"></i>Due {new Date(inv.due_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end">
                      <div className="text-xl font-bold text-zinc-900">${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      {inv.amount_paid > 0 && inv.amount_paid < inv.total_amount && (
                        <div className="text-xs text-emerald-700 mt-1">${Number(inv.amount_paid).toFixed(2)} paid</div>
                      )}
                      {inv.status !== 'paid' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); setShowPaymentModal(true); }}
                          className="mt-2 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
                          Pay ${owed.toFixed(2)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
          );
        })()}

        {activeView === 'calculator' && (
        <div className="p-4 md:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: inputs */}
            <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-zinc-900">Quick Calculator</h2>
              <p className="text-xs text-zinc-600">Calculate freight and material costs without creating a project.</p>

              <div className="inline-flex relative bg-white border border-zinc-200 rounded-lg p-0.5">
                <span className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md transition-all duration-200 ${calcIsImport ? 'left-0.5 bg-orange-500/20 border border-orange-500/40' : 'left-[calc(50%+2px)] bg-blue-500/20 border border-blue-500/40'}`} />
                <button type="button" onClick={() => { setCalcIsImport(true); setCalcJobType("Import (Delivery)"); setCalcMaterials([]); setCalcCategory(""); }}
                  className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-md transition-colors ${calcIsImport ? 'text-orange-600' : 'text-zinc-500 hover:text-zinc-700'}`}>
                  Import
                </button>
                <button type="button" onClick={() => { setCalcIsImport(false); setCalcJobType("Export (Haul-Off)"); setCalcMaterials([]); setCalcCategory(""); }}
                  className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-md transition-colors ${!calcIsImport ? 'text-blue-700' : 'text-zinc-500 hover:text-zinc-700'}`}>
                  Export
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Job Site <span className="text-xs text-zinc-500 font-normal ml-1">Click map to drop pin</span></label>
                <div className="h-48 rounded-lg overflow-hidden border border-zinc-200">
                  <MapComponent jobLat={calcLat} jobLon={calcLon} facilities={networkFacilities} onMapClick={handleCalcMapClick} interactive={true} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Address {calcIsReverseGeocoding && <span className="text-xs text-orange-600 animate-pulse ml-2">Looking up...</span>}</label>
                <textarea value={calcAddress} onChange={(e) => setCalcAddress(e.target.value)} placeholder="Click map above or type address manually"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-orange-500 h-14 resize-none" />
              </div>

              <div className="flex flex-col md:flex-row gap-2">
                <select value={calcCategory} onChange={(e) => { setCalcCategory(e.target.value); setCalcMaterials([]); }}
                  className={`flex-1 bg-white border rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none appearance-none ${calcIsImport ? 'border-zinc-200 focus:border-orange-500' : 'border-zinc-200 focus:border-blue-500'}`}>
                  <option value="">All Categories</option>
                  {calcFilteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <select value={calcTruckType} onChange={(e) => setCalcTruckType(e.target.value)}
                  className={`flex-1 bg-white border rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none appearance-none ${calcIsImport ? 'border-zinc-200 focus:border-orange-500' : 'border-zinc-200 focus:border-blue-500'}`}>
                  <option value="">-- Truck Type --</option>
                  {truckTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>

                <div className="relative w-full md:w-32">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-600">{calcIsImport ? 'Tons' : 'CY'}</span>
                  <input type="number" value={calcQty} onChange={(e) => setCalcQty(Number(e.target.value))}
                    className={`w-full bg-white border rounded-lg pl-3 pr-10 py-2 text-sm text-zinc-900 focus:outline-none ${calcIsImport ? 'border-zinc-200 focus:border-orange-500' : 'border-zinc-200 focus:border-blue-500'}`} />
                </div>
              </div>

              {calcFilteredMaterials.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-600 mb-2">Select material(s) to compare:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {calcFilteredMaterials.map(mat => (
                      <label key={mat} className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all text-xs ${calcMaterials.includes(mat) ? (calcIsImport ? 'bg-orange-500/10 border-orange-500/50 text-orange-700' : 'bg-blue-500/10 border-blue-500/50 text-blue-300') : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
                        <input type="checkbox" checked={calcMaterials.includes(mat)} onChange={() => calcToggleMaterial(mat)} className="sr-only" />
                        <span className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${calcMaterials.includes(mat) ? (calcIsImport ? 'bg-orange-500 border-orange-500' : 'bg-blue-500 border-blue-500') : 'border-zinc-300'}`}>
                          {calcMaterials.includes(mat) && <i className="fa-solid fa-check text-zinc-900" style={{ fontSize: '8px' }}></i>}
                        </span>
                        <span className="truncate">{mat}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={runCalculator} disabled={calcIsCalculating || !calcAddress || calcMaterials.length === 0 || !calcTruckType}
                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.97] disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-bold transition-all">
                {calcIsCalculating ? 'Calculating...' : 'Calculate'}
              </button>
            </div>

            {/* Right: results */}
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-200 bg-zinc-50/80">
                <h2 className="text-lg font-semibold text-zinc-900">Results</h2>
                {calcResults.length > 0 && <p className="text-xs text-zinc-600 mt-0.5">Top {calcResults.length} options sorted by total price</p>}
              </div>
              {calcResults.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  <i className="fa-solid fa-calculator text-4xl mb-3 opacity-30"></i>
                  <p className="text-sm">Fill in the details and hit Calculate to see results.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-zinc-500 bg-white/80 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Supplier</th>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-4 py-3">Fleet</th>
                        <th className="px-4 py-3 text-right">Base</th>
                        <th className="px-4 py-3 text-right">Frt</th>
                        <th className="px-4 py-3 text-right font-bold text-zinc-900">Total/Unit</th>
                        <th className="px-4 py-3 text-right">Job Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/70">
                      {calcResults.map((res: any, idx: number) => {
                        const allTotal = calcResults.map(r => r.totalPerUnit);
                        const avgTotal = allTotal.reduce((a, b) => a + b, 0) / allTotal.length;
                        const savingsPct = avgTotal > 0 ? ((avgTotal - res.totalPerUnit) / avgTotal) * 100 : null;
                        return (
                          <tr key={idx} className="hover:bg-zinc-100 transition-colors duration-150">
                            <td className="px-4 py-3 text-zinc-700">{res.supplier}</td>
                            <td className="px-4 py-3 text-zinc-600">{res.materialName}</td>
                            <td className="px-4 py-3 text-zinc-600">
                              <div>{res.truckFleet}</div>
                              {res.truckerName && <div className="text-[9px] text-cyan-700 mt-0.5"><i className="fa-solid fa-truck mr-1"></i>{res.truckerName}</div>}
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-600">${res.basePrice.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right text-zinc-600">${res.frtPerUnit.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-bold text-orange-600">
                              ${res.totalPerUnit.toFixed(2)}
                              {savingsPct !== null && <span className={`ml-1 text-[10px] font-semibold ${savingsPct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{savingsPct >= 0 ? '+' : ''}{savingsPct.toFixed(0)}%</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-700 font-semibold">${(calcQty * res.totalPerUnit).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center"><i className="fa-solid fa-triangle-exclamation text-red-500"></i></div>
              <div><h2 className="text-base font-bold text-zinc-900">Delete Project</h2><p className="text-xs text-zinc-600">This cannot be undone.</p></div>
            </div>
            <p className="text-sm text-zinc-700 mb-6">Are you sure you want to delete <span className="font-semibold text-zinc-900">{activeProject.name}</span>? All requirements, estimates, and quotes will be permanently removed.</p>
            <div className="flex space-x-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-lg text-sm font-semibold border border-zinc-200 text-zinc-700 hover:bg-white transition-all">Cancel</button>
              <button onClick={deleteProject} disabled={isDeletingProject} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">{isDeletingProject ? 'Deleting...' : 'Delete Project'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-zinc-900">Create New Project</h2>
              <button onClick={closeModal} className="text-zinc-600 hover:text-zinc-900"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Project Name</label>
                <input type="text" required value={newProjName} onChange={(e) => setNewProjName(e.target.value)} placeholder="e.g., Redwood Subdivision"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Job Site Location <span className="ml-2 text-xs text-zinc-500 font-normal">Click the map to drop your pin</span></label>
                <div className="relative h-64 w-full rounded-lg overflow-hidden border border-zinc-200">
                  <MapComponent jobLat={modalJobLat} jobLon={modalJobLon} facilities={networkFacilities} onMapClick={handleMapClick} interactive={true} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Job Site Address {isReverseGeocoding && <span className="ml-2 text-xs text-orange-600 animate-pulse">Looking up address...</span>}</label>
                <textarea required value={newProjAddr} onChange={(e) => setNewProjAddr(e.target.value)} placeholder="Click the map above, or type an address manually"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-orange-500 h-16 resize-none" />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-2 rounded-lg text-sm font-semibold border border-zinc-200 text-zinc-700 hover:bg-white transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white py-2 rounded-lg text-sm font-semibold transition-all">Create & Select</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-zinc-900">Edit Project</h2>
              <button onClick={closeEditModal} className="text-zinc-600 hover:text-zinc-900"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <form onSubmit={saveProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Project Name</label>
                <input type="text" required value={editProjName} onChange={(e) => setEditProjName(e.target.value)} placeholder="e.g., Redwood Subdivision"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Job Site Location <span className="ml-2 text-xs text-zinc-500 font-normal">Click the map to drop your pin</span></label>
                <div className="relative h-64 w-full rounded-lg overflow-hidden border border-zinc-200">
                  <MapComponent jobLat={editJobLat} jobLon={editJobLon} facilities={networkFacilities} onMapClick={handleEditMapClick} interactive={true} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Job Site Address {isEditReverseGeocoding && <span className="ml-2 text-xs text-orange-600 animate-pulse">Looking up address...</span>}</label>
                <textarea required value={editProjAddr} onChange={(e) => setEditProjAddr(e.target.value)} placeholder="Click the map above, or type an address manually"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-orange-500 h-16 resize-none" />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={closeEditModal} className="flex-1 py-2 rounded-lg text-sm font-semibold border border-zinc-200 text-zinc-700 hover:bg-white transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white py-2 rounded-lg text-sm font-semibold transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quote Request Modal */}
      {showQuoteModal && quoteModalReq && activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4" onClick={closeQuoteModal}>
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Request Job-Specific Quote</h3>
                <p className="text-xs text-zinc-600 mt-0.5">{activeProject.name}</p>
              </div>
              <button onClick={closeQuoteModal} className="text-zinc-600 hover:text-zinc-900 p-1.5">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Job details */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-zinc-500 uppercase tracking-wider font-semibold">Material</p>
                    <p className="text-zinc-900 font-medium mt-0.5">{quoteModalReq.material_name}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 uppercase tracking-wider font-semibold">Quantity</p>
                    <p className="text-zinc-900 font-medium mt-0.5">{Number(quoteModalReq.quantity || 0).toLocaleString()} {quoteModalReq.job_type === 'Import (Delivery)' ? 'tons' : 'CY'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-zinc-500 uppercase tracking-wider font-semibold">Job Site</p>
                    <p className="text-zinc-900 font-medium mt-0.5">{activeProject.address}</p>
                  </div>
                </div>
              </div>

              {/* Start date (optional) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">Job Start Date <span className="text-zinc-400 font-normal normal-case">(optional)</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={quoteStartMonth}
                    onChange={e => setQuoteStartMonth(e.target.value)}
                    className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-orange-500"
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
                    className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Bid date (optional) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">Bid Date <span className="text-zinc-400 font-normal normal-case">(optional — deadline for the supplier to respond)</span></label>
                <input
                  type="date"
                  value={quoteBidDate}
                  onChange={e => setQuoteBidDate(e.target.value)}
                  className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Facility selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                  Suppliers to Request Quote From <span className="text-zinc-400 font-normal normal-case">({quoteModalSelected.size} selected)</span>
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {quoteModalFacilities.map(fac => {
                    const checked = quoteModalSelected.has(fac.facilityId);
                    const disabled = fac.acceptsQuotes === false;
                    return (
                      <label key={fac.facilityId}
                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-all ${disabled ? 'bg-zinc-50/80 border-zinc-200 opacity-60 cursor-not-allowed' : checked ? 'bg-orange-500/10 border-orange-500/40 cursor-pointer' : 'bg-white border-zinc-200 hover:border-zinc-300 cursor-pointer'}`}>
                        <div className="flex items-center space-x-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleQuoteFacility(fac.facilityId)}
                            className="w-4 h-4 accent-orange-500 flex-shrink-0 disabled:opacity-50"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate">{fac.supplier}</p>
                            <p className="text-[10px] text-zinc-500">{fac.truckFleet}{disabled && <span className="ml-2 text-red-700">Not accepting quotes</span>}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-zinc-900">${fac.totalPerUnit.toFixed(2)}</p>
                          <p className="text-[10px] text-zinc-500">{quoteModalReq.job_type === 'Import (Delivery)' ? '/ton' : '/CY'}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">Additional Details <span className="text-zinc-400 font-normal normal-case">(optional)</span></label>
                <textarea
                  value={quoteMessage}
                  onChange={e => setQuoteMessage(e.target.value)}
                  rows={4}
                  placeholder="Specs, delivery preferences, scheduling notes, etc."
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex space-x-3 flex-shrink-0">
              <button onClick={closeQuoteModal}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-zinc-200 text-zinc-700 hover:bg-white transition-all">
                Cancel
              </button>
              <button onClick={submitQuoteModal} disabled={submittingQuoteModal || quoteModalSelected.size === 0}
                className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-[0.97] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">
                {submittingQuoteModal ? 'Sending...' : `Send Request (${quoteModalSelected.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showInvoiceDetail && selectedInvoice && (() => {
        const items = (invoiceLineItems || []).filter((li: any) => li.invoice_id === selectedInvoice.id);
        const owed = Number(selectedInvoice.total_amount) - Number(selectedInvoice.amount_paid || 0);
        const statusColor =
          selectedInvoice.status === 'paid'    ? 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30' :
          selectedInvoice.status === 'overdue' ? 'bg-red-500/20 text-red-700 border-red-500/30' :
          selectedInvoice.status === 'sent'    ? 'bg-blue-500/20 text-blue-700 border-blue-500/30' :
                                                 'bg-zinc-200 text-zinc-600 border-zinc-300';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4" onClick={() => setShowInvoiceDetail(false)}>
            <div className="bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-zinc-900">{selectedInvoice.invoice_number}</h2>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border ${statusColor}`}>{selectedInvoice.status}</span>
                  </div>
                  {(() => {
                    const issuer = selectedInvoice.supplier?.company_name || selectedInvoice.trucker?.company_name || 'Unknown';
                    const issuerType = selectedInvoice.supplier_id ? 'Supplier' : selectedInvoice.trucker_id ? 'Trucking' : null;
                    const issuerColor = selectedInvoice.supplier_id ? 'text-orange-600' : 'text-cyan-700';
                    return (
                      <p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-2">
                        <span>{issuer}</span>
                        {issuerType && <span className={`text-[9px] font-bold uppercase tracking-wider ${issuerColor}`}>· {issuerType}</span>}
                      </p>
                    );
                  })()}
                </div>
                <button onClick={() => setShowInvoiceDetail(false)} className="text-zinc-600 hover:text-zinc-900 p-1.5">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {selectedInvoice.project?.name && (
                    <div>
                      <p className="text-zinc-500 uppercase tracking-wider font-semibold">Project</p>
                      <p className="text-zinc-800 mt-0.5">{selectedInvoice.project.name}</p>
                    </div>
                  )}
                  {selectedInvoice.issued_date && (
                    <div>
                      <p className="text-zinc-500 uppercase tracking-wider font-semibold">Issued</p>
                      <p className="text-zinc-800 mt-0.5">{new Date(selectedInvoice.issued_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedInvoice.due_date && (
                    <div>
                      <p className="text-zinc-500 uppercase tracking-wider font-semibold">Due</p>
                      <p className="text-zinc-800 mt-0.5">{new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedInvoice.paid_date && (
                    <div>
                      <p className="text-zinc-500 uppercase tracking-wider font-semibold">Paid</p>
                      <p className="text-emerald-700 mt-0.5">{new Date(selectedInvoice.paid_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {/* Line items */}
                <div>
                  <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">Line Items</p>
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg overflow-hidden">
                    {items.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic text-center py-6">No line items.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="bg-zinc-50/80 text-zinc-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Description</th>
                            <th className="px-3 py-2 text-right font-semibold w-20">Qty</th>
                            <th className="px-3 py-2 text-right font-semibold w-24">Unit Price</th>
                            <th className="px-3 py-2 text-right font-semibold w-28">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200/70">
                          {items.map((it: any, i: number) => (
                            <tr key={it.id || i}>
                              <td className="px-3 py-2 text-zinc-800">{it.description}{it.material_name && it.material_name !== it.description && <span className="text-zinc-500 text-[10px] block">{it.material_name}</span>}</td>
                              <td className="px-3 py-2 text-right text-zinc-700">{Number(it.quantity).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right text-zinc-700">${Number(it.unit_price).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-zinc-900 font-semibold">${Number(it.line_total).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-5 py-3 min-w-[260px] space-y-1">
                    <div className="flex justify-between text-xs text-zinc-600">
                      <span>Subtotal</span>
                      <span className="text-zinc-900">${Number(selectedInvoice.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-600">
                      <span>Tax</span>
                      <span className="text-zinc-900">${Number(selectedInvoice.tax_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-zinc-200 my-1" />
                    <div className="flex justify-between text-base font-bold text-zinc-900">
                      <span>Total</span>
                      <span>${Number(selectedInvoice.total_amount).toFixed(2)}</span>
                    </div>
                    {Number(selectedInvoice.amount_paid || 0) > 0 && (
                      <>
                        <div className="flex justify-between text-xs text-emerald-700 mt-1">
                          <span>Paid</span>
                          <span>−${Number(selectedInvoice.amount_paid).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-orange-600">
                          <span>Owed</span>
                          <span>${owed.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Notes</p>
                    <p className="text-xs text-zinc-700 whitespace-pre-wrap mt-1">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between gap-2 flex-shrink-0">
                <InvoicePDFButton
                  invoice={selectedInvoice}
                  lineItems={(invoiceLineItems || []).filter((li: any) => li.invoice_id === selectedInvoice.id)}
                  supplier={selectedInvoice.supplier || selectedInvoice.trucker}
                  contractor={{ company_name: companyName }}
                />
                <div className="flex items-center space-x-2">
                  <button onClick={() => setShowInvoiceDetail(false)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-zinc-200 text-zinc-700 hover:bg-white transition-all">
                    Close
                  </button>
                  {selectedInvoice.status !== 'paid' && (
                    <button onClick={() => { setShowInvoiceDetail(false); setShowPaymentModal(true); }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] text-white transition-all">
                      Pay ${owed.toFixed(2)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Pay Invoice</h2>
                <p className="text-xs text-zinc-600">{selectedInvoice.invoice_number}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-zinc-600 hover:text-zinc-900"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <InvoicePaymentForm
              invoiceId={selectedInvoice.id}
              onClose={() => setShowPaymentModal(false)}
              onSuccess={() => {
                setShowPaymentModal(false);
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}

      {/* Trucker Job Request Modal */}
      {showJobRequestModal && jobRequestEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-zinc-900">Request Trucker Quote</h2>
              <button onClick={() => setShowJobRequestModal(false)} className="text-zinc-600 hover:text-zinc-900">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">Material</span>
                <span className="text-zinc-900 font-semibold">{jobRequestEstimate.material_name}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-zinc-600">Quantity</span>
                <span className="text-zinc-900 font-semibold">{Number(jobRequestEstimate.quantity).toLocaleString()} {importMaterials?.includes(jobRequestEstimate.material_name) ? 'Tons' : 'CY'}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-zinc-600">Truck Type</span>
                <span className="text-zinc-900 font-semibold">{jobRequestEstimate.truck_fleet}</span>
              </div>
            </div>

            <label className="block text-sm font-medium text-zinc-700 mb-1">Send to Trucker</label>
            <select value={selectedTruckerId} onChange={e => setSelectedTruckerId(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-cyan-500 mb-4">
              <option value="">-- Select Trucking Company --</option>
              {truckingNetwork.map((t: any) => (
                <option key={t.trucker_id} value={t.trucker_id}>{t.trucker?.company_name}</option>
              ))}
            </select>

            {truckingNetwork.length === 0 && (
              <p className="text-xs text-zinc-500 italic mb-4">
                You don&apos;t have any trucking companies in your network yet. Add some from the Trucking Network tab first.
              </p>
            )}

            <label className="block text-sm font-medium text-zinc-700 mb-1">Message (optional)</label>
            <textarea value={jobRequestMessage} onChange={e => setJobRequestMessage(e.target.value)}
              placeholder="Project timeline, special requirements, etc."
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-cyan-500 h-20 resize-none mb-4" />

            <div className="flex space-x-3">
              <button onClick={() => setShowJobRequestModal(false)} disabled={sendingJobRequest}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-zinc-200 text-zinc-700 hover:bg-white transition-all disabled:opacity-40">
                Cancel
              </button>
              <button onClick={submitJobRequest} disabled={sendingJobRequest || !selectedTruckerId || truckingNetwork.length === 0}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 active:scale-[0.97] disabled:opacity-40 text-white py-2 rounded-lg text-sm font-semibold transition-all">
                {sendingJobRequest ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tier Request Modal */}
      {tierRequestRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-zinc-900">Request Better Pricing</h2>
              <button onClick={() => setTierRequestRes(null)} className="text-zinc-600 hover:text-zinc-900"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <p className="text-sm text-zinc-600 mb-4">
              You are currently receiving <span className="font-semibold capitalize text-zinc-900">{tierRequestRes.pricingTier}</span> pricing from <span className="font-semibold text-zinc-900">{tierRequestRes.supplier}</span>.
            </p>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Message (optional)</label>
            <textarea value={tierRequestMessage} onChange={e => setTierRequestMessage(e.target.value)}
              placeholder="Introduce yourself or explain your typical volume..."
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-orange-500 h-24 resize-none mb-4" />
            <div className="space-y-2">
              {tierRequestRes.pricingTier === 'public' && (
                <button onClick={() => submitTierRequest('contractor')} disabled={tierRequestSending}
                  className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.97] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">
                  Request Contractor Pricing
                </button>
              )}
              <button onClick={() => submitTierRequest('customer')} disabled={tierRequestSending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">
                Request Customer Pricing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
