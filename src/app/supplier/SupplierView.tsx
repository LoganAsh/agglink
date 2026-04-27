/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import LogoutButton from '@/components/LogoutButton';

const InvoicePDFButton = dynamic(() => import('@/components/InvoicePDFButton'), { ssr: false });

const STATUS_OPTIONS = [
  { value: 'in_stock', label: 'In Stock', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { value: 'low', label: 'Low', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  { value: 'out_of_stock', label: 'Out', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
];

export default function SupplierView({
  profile,
  profileId,
  facilities,
  materials: initialMaterials,
  allMaterialNames = [],
  contractors = [],
  relationships: initialRelationships = [],
  tierRequests: initialTierRequests = [],
  invoices: initialInvoices = [],
  lineItems: initialLineItems = [],
  availableEstimates = [],
  contractorProjects = [],
}: {
  profile: any;
  profileId: string;
  facilities: any[];
  materials: any[];
  allMaterialNames?: string[];
  contractors?: any[];
  relationships?: any[];
  tierRequests?: any[];
  invoices?: any[];
  lineItems?: any[];
  availableEstimates?: any[];
  contractorProjects?: any[];
}) {
  const supabase = createClient();

  const [materials, setMaterials] = useState<any[]>(initialMaterials);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quotes' | 'materials' | 'customers' | 'invoices' | 'add' | 'settings'>('dashboard');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState('');
  const [editingPriceField, setEditingPriceField] = useState<{ matId: string; field: string } | null>(null);

  // Customer management state
  const [relationships, setRelationships] = useState<any[]>(initialRelationships);
  const [tierRequests, setTierRequests] = useState<any[]>(initialTierRequests);

  // Invoices state
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [lineItems, setLineItems] = useState<any[]>(initialLineItems);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');
  const [invContractor, setInvContractor] = useState('');
  const [invProject, setInvProject] = useState('');
  const [invDueDate, setInvDueDate] = useState('');
  const [invNotes, setInvNotes] = useState('');
  const [invTaxRate, setInvTaxRate] = useState('0');
  const [invItems, setInvItems] = useState<any[]>([]);
  const [invSelectedEstimates, setInvSelectedEstimates] = useState<string[]>([]);
  const [invShowEstimates, setInvShowEstimates] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);

  const overdueInvoiceCount = invoices.filter(i => i.status === 'overdue').length;

  // Settings tab state
  const [facilitySettings, setFacilitySettings] = useState<any[]>(facilities);
  const [savingFacilityId, setSavingFacilityId] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resetEmailMsg, setResetEmailMsg] = useState<string | null>(null);
  const [autoDeclineMessage, setAutoDeclineMessage] = useState<string>(profile?.auto_decline_message || '');
  const [savingAutoMsg, setSavingAutoMsg] = useState(false);
  const [autoDeclineMsgSavedAt, setAutoDeclineMsgSavedAt] = useState<number | null>(null);
  const [savingThresholdId, setSavingThresholdId] = useState<string | null>(null);

  // Quote response state
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [messagingTo, setMessagingTo] = useState<string | null>(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quotesFilter, setQuotesFilter] = useState<'pending' | 'approved' | 'declined'>('pending');

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
  const savePriceField = async (materialId: string, field: string, value: number) => {
    if (isNaN(value)) return;
    const mat = materials.find(m => m.id === materialId);
    const updates: Record<string, number> = { [field]: value };

    // When the supplier updates the public price, cascade the new value into the
    // contractor/customer tiers that haven't been customised — i.e. they're still
    // 0/null or still match the old public price.
    if (mat && (field === 'price_per_ton' || field === 'price_per_cy')) {
      const oldPublic = (mat as any)[field];
      const tierFields = field === 'price_per_ton'
        ? ['price_per_ton_contractor', 'price_per_ton_customer']
        : ['price_per_cy_contractor', 'price_per_cy_customer'];
      for (const tierField of tierFields) {
        const tierVal = (mat as any)[tierField];
        const isUnset = tierVal == null || tierVal === 0;
        const matchesOldPublic = oldPublic != null && tierVal === oldPublic;
        if (isUnset || matchesOldPublic) updates[tierField] = value;
      }
    }

    const { error } = await supabase.from('materials').update(updates).eq('id', materialId);
    if (!error) setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, ...updates } : m));
    else alert('Failed to update price');
  };

  const setContractorTier = async (contractorId: string, tier: string) => {
    const { data, error } = await supabase
      .from('supplier_relationships')
      .upsert({
        supplier_id: profileId,
        contractor_id: contractorId,
        tier,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'supplier_id,contractor_id' })
      .select().single();
    if (data && !error) {
      setRelationships(prev => {
        const filtered = prev.filter(r => r.contractor_id !== contractorId);
        return [...filtered, data];
      });
    } else alert('Failed to update tier: ' + error?.message);
  };

  const handleTierRequest = async (req: any, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      await setContractorTier(req.contractor_id, req.requested_tier);
    }
    await supabase.from('tier_requests').update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.id);
    setTierRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r));
  };

  //        Invoices
  const resetInvoiceForm = () => {
    setInvContractor(''); setInvProject(''); setInvDueDate(''); setInvNotes('');
    setInvTaxRate('0'); setInvItems([]); setInvSelectedEstimates([]); setInvShowEstimates(false);
  };

  const loadInvoiceForEdit = (inv: any) => {
    setInvContractor(inv.contractor_id);
    setInvProject(inv.project_id || '');
    setInvDueDate(inv.due_date || '');
    setInvNotes(inv.notes || '');
    const taxPct = inv.tax_amount && inv.subtotal ? (Number(inv.tax_amount) / Number(inv.subtotal) * 100).toFixed(2) : '0';
    setInvTaxRate(taxPct);
    const items = lineItems.filter(li => li.invoice_id === inv.id);
    setInvItems(items.map(it => ({ ...it })));
    setInvSelectedEstimates([]);
    setInvShowEstimates(false);
  };

  const addLineItem = () => {
    setInvItems([...invItems, { description: '', material_name: '', quantity: 0, unit_price: 0, line_total: 0, unit: 'ton', display_order: invItems.length }]);
  };

  const updateLineItem = (idx: number, field: string, value: any) => {
    const updated = [...invItems];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      const q = parseFloat(updated[idx].quantity) || 0;
      const u = parseFloat(updated[idx].unit_price) || 0;
      updated[idx].line_total = q * u;
    }
    setInvItems(updated);
  };

  const removeLineItem = (idx: number) => setInvItems(invItems.filter((_, i) => i !== idx));

  const importFromEstimates = () => {
    const selected = availableEstimates.filter((e: any) => invSelectedEstimates.includes(e.id));
    if (selected.length === 0) return;
    const newItems = selected.map((e: any, i: number) => ({
      description: `${e.material_name} – ${e.facility?.name || 'Material'}`,
      material_name: e.material_name,
      quantity: e.quantity,
      unit_price: e.total_price,
      line_total: Number(e.quantity) * Number(e.total_price),
      unit: 'ton',
      source_estimate_id: e.id,
      display_order: invItems.length + i,
    }));
    setInvItems([...invItems, ...newItems]);
    if (selected.length > 0 && !invContractor) {
      setInvContractor(selected[0].project.contractor_id);
      setInvProject(selected[0].project.id);
    }
    setInvSelectedEstimates([]);
    setInvShowEstimates(false);
  };

  const calcTotals = () => {
    const subtotal = invItems.reduce((sum, item) => sum + (parseFloat(item.line_total) || 0), 0);
    const taxRate = parseFloat(invTaxRate) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const refreshInvoices = async () => {
    const { data: refreshed } = await supabase.from('invoices')
      .select('*, contractor:profiles!invoices_contractor_id_fkey(company_name), project:projects(name)')
      .eq('supplier_id', profileId).order('created_at', { ascending: false });
    if (refreshed) {
      setInvoices(refreshed);
      const ids = refreshed.map((i: any) => i.id);
      if (ids.length > 0) {
        const { data: items } = await supabase
          .from('invoice_line_items')
          .select('*')
          .in('invoice_id', ids)
          .order('display_order');
        if (items) setLineItems(items);
      } else {
        setLineItems([]);
      }
    }
  };

  const saveInvoice = async (status: 'draft' | 'sent') => {
    if (!invContractor || invItems.length === 0) {
      alert('Please select a contractor and add at least one line item.');
      return;
    }
    setSavingInvoice(true);
    const totals = calcTotals();
    const payload: any = {
      supplier_id: profileId,
      contractor_id: invContractor,
      project_id: invProject || null,
      status,
      subtotal: totals.subtotal,
      tax_amount: totals.tax,
      total_amount: totals.total,
      due_date: invDueDate || null,
      notes: invNotes || null,
      issued_date: status === 'sent' ? new Date().toISOString().split('T')[0] : null,
    };

    let invoiceId = editingInvoice?.id;
    if (editingInvoice) {
      const { error } = await supabase.from('invoices').update(payload).eq('id', editingInvoice.id);
      if (error) { alert('Failed: ' + error.message); setSavingInvoice(false); return; }
      await supabase.from('invoice_line_items').delete().eq('invoice_id', editingInvoice.id);
    } else {
      const { data: numData, error: numErr } = await supabase.rpc('next_invoice_number', { p_supplier_id: profileId });
      if (numErr) { alert('Failed to generate invoice number: ' + numErr.message); setSavingInvoice(false); return; }
      payload.invoice_number = numData;
      const { data: newInv, error } = await supabase.from('invoices').insert(payload).select().single();
      if (error || !newInv) { alert('Failed: ' + error?.message); setSavingInvoice(false); return; }
      invoiceId = newInv.id;
    }

    const itemsToInsert = invItems.map((item, idx) => ({
      invoice_id: invoiceId,
      description: item.description,
      material_name: item.material_name || null,
      quantity: parseFloat(item.quantity) || 0,
      unit_price: parseFloat(item.unit_price) || 0,
      line_total: parseFloat(item.line_total) || 0,
      unit: item.unit || 'ton',
      source_estimate_id: item.source_estimate_id || null,
      display_order: idx,
    }));
    if (itemsToInsert.length > 0) {
      await supabase.from('invoice_line_items').insert(itemsToInsert);
    }

    await refreshInvoices();
    setSavingInvoice(false);
    setShowInvoiceModal(false);
    setEditingInvoice(null);
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm('Delete this invoice permanently?')) return;
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) { alert('Failed to delete: ' + error.message); return; }
    setInvoices(invoices.filter(i => i.id !== id));
    setLineItems(lineItems.filter(li => li.invoice_id !== id));
    setShowInvoiceModal(false);
    setEditingInvoice(null);
  };

  //        Add material
  const addMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatFacilityId || !newMatName) return;
    setAddingMaterial(true);
    const tonPrice = newMatIsImport ? (parseFloat(newMatPricePerTon) || 0) : 0;
    const cyPrice  = !newMatIsImport ? (parseFloat(newMatPricePerCy) || 0) : 0;
    const { data, error } = await supabase.from('materials').insert([{
      facility_id: newMatFacilityId,
      name: newMatName,
      is_import: newMatIsImport,
      price_per_ton:            tonPrice,
      price_per_ton_contractor: tonPrice,
      price_per_ton_customer:   tonPrice,
      price_per_cy:             cyPrice,
      price_per_cy_contractor:  cyPrice,
      price_per_cy_customer:    cyPrice,
      price_10w_load: parseFloat(newMat10wLoad) || 0,
      price_sd_load:  parseFloat(newMatSdLoad)  || 0,
      stock_status:   newMatStock,
    }]).select().single();
    if (data && !error) {
      setMaterials([...materials, data]);
      setNewMatName(''); setNewMatPricePerTon(''); setNewMatPricePerCy('');
      setNewMat10wLoad(''); setNewMatSdLoad(''); setNewMatStock('in_stock');
      setActiveTab('materials');
    } else alert('Failed to add material: ' + error?.message);
    setAddingMaterial(false);
  };

  //        Settings — facility quote-acceptance toggle
  const toggleFacilityAcceptsQuotes = async (facilityId: string, next: boolean) => {
    setSavingFacilityId(facilityId);
    const prev = facilitySettings;
    setFacilitySettings(fs => fs.map(f => f.id === facilityId ? { ...f, accepts_quote_requests: next } : f));
    const { error } = await supabase
      .from('facilities')
      .update({ accepts_quote_requests: next })
      .eq('id', facilityId);
    if (error) {
      setFacilitySettings(prev);
      alert('Failed to update facility setting: ' + error.message);
    }
    setSavingFacilityId(null);
  };

  //        Settings — auto-decline response message (per profile)
  const saveAutoDeclineMessage = async () => {
    setSavingAutoMsg(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingAutoMsg(false); alert('Not signed in.'); return; }
    const { error } = await supabase
      .from('profiles')
      .update({ auto_decline_message: autoDeclineMessage.trim() || null })
      .eq('id', user.id);
    if (error) alert('Failed to save: ' + error.message);
    else setAutoDeclineMsgSavedAt(Date.now());
    setSavingAutoMsg(false);
  };

  //        Materials — auto-decline threshold (per material)
  const saveAutoDeclineThreshold = async (mat: any) => {
    setSavingThresholdId(mat.id);
    const raw = mat.auto_decline_below;
    const newVal = raw === '' || raw == null ? null : Math.max(0, Math.floor(Number(raw)));
    const { error } = await supabase
      .from('materials')
      .update({ auto_decline_below: newVal })
      .eq('id', mat.id);
    if (error) alert('Failed to update threshold: ' + error.message);
    else setMaterials(prev => prev.map(m => m.id === mat.id ? { ...m, auto_decline_below: newVal } : m));
    setSavingThresholdId(null);
  };

  //        Settings — password reset email
  const sendPasswordReset = async () => {
    setResetEmailSent('sending');
    setResetEmailMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setResetEmailSent('error');
      setResetEmailMsg('Could not determine your email address.');
      return;
    }
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo });
    if (error) {
      setResetEmailSent('error');
      setResetEmailMsg(error.message);
    } else {
      setResetEmailSent('sent');
      setResetEmailMsg(`Password reset email sent to ${user.email}.`);
    }
  };

  //        Delete material
  const deleteMaterial = async (materialId: string) => {
    if (!confirm('Remove this material from your supply list?')) return;
    const { error } = await supabase.from('materials').delete().eq('id', materialId);
    if (!error) setMaterials(prev => prev.filter(m => m.id !== materialId));
    else alert('Failed to remove material');
  };

  //        Quote requests — fetch all statuses once on mount; updates locally after responding
  useEffect(() => {
    let cancelled = false;
    const facilityIds = facilities.map(f => f.id);
    if (facilityIds.length === 0) { setQuotes([]); return; }
    setLoadingQuotes(true);
    supabase
      .from('quote_requests')
      .select('*, contractor:profiles(company_name)')
      .in('facility_id', facilityIds)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setQuotes(data);
        setLoadingQuotes(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingQuotes = quotes.filter(q => q.status === 'pending');
  const filteredQuotes = quotes.filter(q =>
    quotesFilter === 'pending' ? q.status === 'pending' :
    quotesFilter === 'approved' ? q.status === 'responded' :
    q.status === 'declined'
  );

  const submitQuote = async (quote: any) => {
    const price = parseFloat(offerPrice);
    if (isNaN(price)) return;
    setSubmittingQuote(true);
    const update = {
      status: 'responded',
      offered_price: price,
      supplier_message: responseMessage.trim() || null,
    };
    const { error } = await supabase.from('quote_requests').update(update).eq('id', quote.id);
    if (!error) {
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, ...update } : q));
      setRespondingTo(null);
      setOfferPrice('');
      setResponseMessage('');
    } else alert('Failed to submit quote.');
    setSubmittingQuote(false);
  };

  const declineQuote = async (quote: any) => {
    setSubmittingQuote(true);
    const update = {
      status: 'declined',
      supplier_message: responseMessage.trim() || null,
    };
    const { error } = await supabase.from('quote_requests').update(update).eq('id', quote.id);
    if (!error) {
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, ...update } : q));
      setRespondingTo(null);
      setOfferPrice('');
      setResponseMessage('');
    } else alert('Failed to decline quote.');
    setSubmittingQuote(false);
  };

  const sendMessageOnly = async (quote: any) => {
    if (!responseMessage.trim()) return;
    setSubmittingQuote(true);
    const update = { supplier_message: responseMessage.trim() };
    const { error } = await supabase.from('quote_requests').update(update).eq('id', quote.id);
    if (!error) {
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, ...update } : q));
      setMessagingTo(null);
      setResponseMessage('');
    } else alert('Failed to send message.');
    setSubmittingQuote(false);
  };

  // Group materials by facility
  const materialsByFacility = facilities.map(fac => ({
    facility: fac,
    materials: materials.filter(m => m.facility_id === fac.id),
  })).filter(g => g.materials.length > 0);

  const topMaterial = materials[0]?.name || '—';

  const initials = (profile.company_name || 'SP').substring(0, 2).toUpperCase();

  const renderQuoteCard = (q: any) => {
    const startDate = [q.start_month, q.start_year].filter(Boolean).join(' ');
    const isPending = q.status === 'pending';
    const isResponded = q.status === 'responded';
    const isDeclined = q.status === 'declined';
    return (
      <div key={q.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4 transition-all">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h4 className="text-white font-semibold truncate pr-2">{q.contractor?.company_name || 'Unknown Contractor'}</h4>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 ${
            isPending ? 'bg-orange-500/20 text-orange-400' :
            isResponded ? 'bg-emerald-500/20 text-emerald-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {isPending ? 'Pending' : isResponded ? 'Approved' : 'Declined'}
          </span>
        </div>
        {q.job_site_address && <p className="text-sm text-slate-300 truncate">Site: {q.job_site_address}</p>}
        <p className="text-sm text-slate-300 mt-2">Requested: <span className="font-bold text-white">{Number(q.quantity || 0).toLocaleString()} Units</span></p>
        <p className="text-sm text-slate-400 mt-1 truncate">Material: {q.material_name}</p>
        {startDate && <p className="text-sm text-slate-400 mt-1">Start: <span className="text-slate-300">{startDate}</span></p>}
        {q.bid_date && <p className="text-sm text-slate-400 mt-1">Bid by: <span className="text-slate-300">{q.bid_date}</span></p>}

        {q.message && (
          <div className="mt-3 bg-slate-800/60 border border-slate-700 rounded px-3 py-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Contractor note</p>
            <p className="text-xs text-slate-300 whitespace-pre-wrap">{q.message}</p>
          </div>
        )}
        {q.contractor_message && (
          <div className="mt-2 bg-orange-500/5 border border-orange-500/20 rounded px-3 py-2">
            <p className="text-[10px] text-orange-400 uppercase tracking-wider font-semibold mb-1">Contractor follow-up</p>
            <p className="text-xs text-slate-200 whitespace-pre-wrap">{q.contractor_message}</p>
          </div>
        )}

        {isResponded && q.offered_price != null && (
          <div className="mt-3 bg-emerald-500/5 border border-emerald-500/20 rounded px-3 py-2">
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold mb-1">Your offer</p>
            <p className="text-lg font-bold text-emerald-400">${Number(q.offered_price).toFixed(2)}</p>
            {q.supplier_message && <p className="text-xs text-slate-300 whitespace-pre-wrap mt-1">{q.supplier_message}</p>}
          </div>
        )}
        {isDeclined && (
          <div className="mt-3 bg-red-500/5 border border-red-500/20 rounded px-3 py-2">
            <p className="text-[10px] text-red-400 uppercase tracking-wider font-semibold mb-1">Declined</p>
            {q.supplier_message && <p className="text-xs text-slate-300 whitespace-pre-wrap mt-1">{q.supplier_message}</p>}
          </div>
        )}
        {isPending && q.supplier_message && respondingTo !== q.id && messagingTo !== q.id && (
          <div className="mt-3 bg-slate-800/60 border border-slate-700 rounded px-3 py-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Your last message</p>
            <p className="text-xs text-slate-300 whitespace-pre-wrap">{q.supplier_message}</p>
          </div>
        )}

        {isPending && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            {respondingTo === q.id ? (
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="text-xs text-slate-500 mr-2">Offer Price:</span>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white text-sm">$</span>
                    <input
                      type="number" step="0.01" value={offerPrice}
                      onChange={e => setOfferPrice(e.target.value)}
                      className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1 pl-5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 ml-2">/unit</span>
                </div>
                <textarea
                  value={responseMessage}
                  onChange={e => setResponseMessage(e.target.value)}
                  rows={3}
                  placeholder="Reply to the contractor (optional) — confirm specs, lead time, terms..."
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none resize-none"
                />
                <div className="flex justify-between items-center">
                  <button disabled={submittingQuote} onClick={() => declineQuote(q)}
                    className="text-red-400 hover:text-red-300 text-xs font-semibold border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded transition-colors disabled:opacity-50">
                    Decline Request
                  </button>
                  <div className="flex space-x-2">
                    <button onClick={() => { setRespondingTo(null); setOfferPrice(''); setResponseMessage(''); }}
                      className="text-slate-400 hover:text-white text-xs font-semibold px-2">Cancel</button>
                    <button disabled={submittingQuote || !offerPrice} onClick={() => submitQuote(q)}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50">
                      {submittingQuote ? '...' : 'Send Quote'}
                    </button>
                  </div>
                </div>
              </div>
            ) : messagingTo === q.id ? (
              <div className="space-y-2">
                <textarea
                  value={responseMessage}
                  onChange={e => setResponseMessage(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="Send a question or note to the contractor (no quote)..."
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none resize-none"
                />
                <div className="flex justify-end space-x-2">
                  <button onClick={() => { setMessagingTo(null); setResponseMessage(''); }}
                    className="text-slate-400 hover:text-white text-xs font-semibold px-2">Cancel</button>
                  <button disabled={submittingQuote || !responseMessage.trim()} onClick={() => sendMessageOnly(q)}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50">
                    {submittingQuote ? '...' : 'Send Message'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button onClick={() => { setMessagingTo(q.id); setOfferPrice(''); setResponseMessage(''); }}
                  className="text-slate-400 hover:text-white text-xs font-bold transition-colors">
                  Send Message <i className="fa-solid fa-arrow-right ml-1"></i>
                </button>
                <button onClick={() => { setRespondingTo(q.id); setOfferPrice(''); setResponseMessage(''); }}
                  className="text-orange-500 hover:text-orange-400 text-xs font-bold transition-colors">
                  Draft Response <i className="fa-solid fa-arrow-right ml-1"></i>
                </button>
              </div>
            )}
          </div>
        )}
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
          <button onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'dashboard' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-chart-line w-4 text-center"></i>
            <span>Dashboard</span>
            {pendingQuotes.length > 0 && (
              <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingQuotes.length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('quotes')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'quotes' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-handshake w-4 text-center"></i>
            <span>Quote Requests</span>
            {pendingQuotes.length > 0 && (
              <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingQuotes.length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('materials')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'materials' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-cubes w-4 text-center"></i>
            <span>My Materials</span>
          </button>
          <button onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'customers' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-handshake w-4 text-center"></i>
            <span>Customer Management</span>
            {tierRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{tierRequests.filter(r => r.status === 'pending').length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('invoices')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'invoices' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-file-invoice-dollar w-4 text-center"></i>
            <span>Invoices</span>
            {overdueInvoiceCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{overdueInvoiceCount}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('add')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'add' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-plus w-4 text-center"></i>
            <span>Add Material</span>
          </button>
          <button onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'settings' ? 'bg-orange-500/10 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-gear w-4 text-center"></i>
            <span>Settings</span>
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
              {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'quotes' ? 'Quote Requests' : activeTab === 'materials' ? 'My Materials' : activeTab === 'customers' ? 'Customer Management' : activeTab === 'invoices' ? 'Invoices' : activeTab === 'add' ? 'Add Material' : 'Settings'}
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

          {/*        DASHBOARD TAB        */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-white">Live Catalog Management</h1>
                  <p className="text-slate-400 text-sm mt-1">Manage public pricing, stock levels, and project-specific contractor rates.</p>
                </div>
                <div className="flex space-x-3">
                  <button onClick={() => setActiveTab('add')} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-orange-500/20 transition-all whitespace-nowrap">
                    <i className="fa-solid fa-plus mr-2"></i> Add Material
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Today&apos;s Volume</p>
                      <h3 className="text-3xl font-bold text-white mt-1">0<span className="text-sm font-normal text-slate-400"> Tons</span></h3>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <i className="fa-solid fa-scale-balanced text-lg"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Quotes</p>
                      <h3 className="text-3xl font-bold text-white mt-1">{pendingQuotes.length} <span className="text-sm font-normal text-orange-500">{pendingQuotes.length === 1 ? 'Request' : 'Requests'}</span></h3>
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
                      <h3 className="text-xl font-bold text-white mt-2 truncate">{topMaterial}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inventory & Pricing */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-white"><i className="fa-solid fa-boxes-stacked text-orange-500 mr-2"></i> Primary Aggregate Inventory</h2>
                      <span className="px-2 py-1 bg-slate-700 text-xs rounded text-slate-300 hidden sm:inline">Last Synced: Just now</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-700">
                          <tr>
                            <th className="px-5 py-4">Material Name</th>
                            <th className="px-5 py-4">Stock Level</th>
                            <th className="px-5 py-4 text-right">Public Rate</th>
                            <th className="px-5 py-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {materials.length > 0 ? materials.map((mat: any) => {
                            const stock = mat.stock_status || 'in_stock';
                            const stockMeta = stock === 'in_stock'
                              ? { label: 'In Stock', barColor: 'bg-emerald-500', barWidth: '85%', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
                              : stock === 'low'
                              ? { label: 'Low', barColor: 'bg-yellow-500', barWidth: '30%', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' }
                              : { label: 'Out of Stock', barColor: 'bg-red-500', barWidth: '5%', badge: 'bg-red-500/10 text-red-400 border-red-500/20' };
                            const unit = mat.is_import ? '/T' : '/CY';
                            const price = mat.is_import ? mat.price_per_ton : mat.price_per_cy;
                            return (
                              <tr key={mat.id} className="hover:bg-slate-800 transition-colors">
                                <td className="px-5 py-4 font-medium text-white">{mat.name}</td>
                                <td className="px-5 py-4">
                                  <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                                    <div className={`${stockMeta.barColor} h-2 rounded-full`} style={{ width: stockMeta.barWidth }}></div>
                                  </div>
                                  <span className="text-[10px] text-slate-400">{stockMeta.label}</span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end">
                                    {(() => {
                                      const publicField = mat.is_import ? 'price_per_ton' : 'price_per_cy';
                                      const isEditing = editingPriceField?.matId === mat.id && editingPriceField?.field === publicField;
                                      return isEditing ? (
                                        <div className="flex items-center space-x-2">
                                          <span className="text-white">$</span>
                                          <input
                                            type="number"
                                            value={editPriceVal}
                                            onChange={(e) => setEditPriceVal(e.target.value)}
                                            className="w-20 bg-slate-900 border border-orange-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
                                            step="0.01"
                                          />
                                          <button onClick={() => { savePriceField(mat.id, publicField, parseFloat(editPriceVal)); setEditingPriceField(null); }} className="text-emerald-400 hover:text-emerald-300">
                                            <i className="fa-solid fa-check"></i>
                                          </button>
                                          <button onClick={() => setEditingPriceField(null)} className="text-red-400 hover:text-red-300">
                                            <i className="fa-solid fa-xmark"></i>
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <span className="font-bold text-white">${(price || 0).toFixed(2)}<span className="text-xs text-slate-400 font-normal">{unit}</span></span>
                                          <button onClick={() => { setEditingPriceField({ matId: mat.id, field: publicField }); setEditPriceVal(String(price || 0)); }} className="text-slate-500 hover:text-white ml-3 text-xs focus:outline-none">
                                            <i className="fa-solid fa-pen"></i>
                                          </button>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <span className={`text-xs px-2 py-1 rounded border ${stockMeta.badge}`}>{stockMeta.label}</span>
                                </td>
                              </tr>
                            );
                          }) : (
                            <tr>
                              <td colSpan={4} className="px-5 py-8 text-center text-slate-500 italic">No materials in your supply list yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Quote Requests */}
                <div className="col-span-1 space-y-6">
                  <div className="bg-slate-800 border-2 border-orange-500/50 rounded-xl shadow-lg shadow-orange-500/10 overflow-hidden">
                    <div className="bg-orange-500/10 p-4 border-b border-orange-500/20 flex justify-between items-center">
                      <h3 className="text-orange-500 font-bold"><i className="fa-solid fa-bolt mr-2"></i> Quote Requests</h3>
                      {pendingQuotes.length > 0 && (
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
                      {loadingQuotes ? (
                        <p className="text-slate-500 text-sm text-center py-4">Checking for requests...</p>
                      ) : pendingQuotes.length > 0 ? (
                        pendingQuotes.map(renderQuoteCard)
                      ) : (
                        <p className="text-slate-500 text-sm text-center py-4">No pending quote requests.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/*        QUOTE REQUESTS TAB        */}
          {activeTab === 'quotes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'pending',  label: 'Pending',  count: quotes.filter(q => q.status === 'pending').length,   activeCls: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
                  { id: 'approved', label: 'Approved', count: quotes.filter(q => q.status === 'responded').length, activeCls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
                  { id: 'declined', label: 'Declined', count: quotes.filter(q => q.status === 'declined').length,  activeCls: 'bg-red-500/20 text-red-400 border-red-500/40' },
                ] as const).map(opt => {
                  const isActive = quotesFilter === opt.id;
                  return (
                    <button key={opt.id} onClick={() => setQuotesFilter(opt.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${isActive ? opt.activeCls : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-white'}`}>
                      {opt.label} <span className="ml-1.5 text-[10px] opacity-80">({opt.count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                {loadingQuotes ? (
                  <p className="text-slate-500 text-sm text-center py-6">Loading quote requests...</p>
                ) : filteredQuotes.length > 0 ? (
                  filteredQuotes.map(renderQuoteCard)
                ) : (
                  <p className="text-slate-500 text-sm text-center py-6">No {quotesFilter} quote requests.</p>
                )}
              </div>
            </div>
          )}

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
                      <div key={mat.id} className="py-3 px-4 space-y-2">
                        <div className="flex items-center gap-3">

                          {/* Left: name + badge */}
                          <div className="flex flex-col min-w-0 w-1/3">
                            <span className="text-sm font-medium text-white truncate">{mat.name}</span>
                            <span className={`text-[10px] font-bold uppercase mt-0.5 ${mat.is_import ? 'text-orange-400' : 'text-blue-400'}`}>
                              {mat.is_import ? 'Import' : 'Export'}
                            </span>
                          </div>

                          {/* Center: stock status */}
                          <div className="flex items-center justify-center space-x-1 flex-1">
                            {STATUS_OPTIONS.map(opt => (
                              <button key={opt.value} onClick={() => updateStockStatus(mat.id, opt.value)}
                                disabled={savingId === mat.id}
                                className={`flex-1 max-w-[110px] px-3 py-1.5 rounded-md text-[10px] font-semibold border transition-all disabled:opacity-50 ${mat.stock_status === opt.value ? opt.color : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500'}`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>

                          {/* Right: 3-tier pricing + delete */}
                          <div className="flex items-center justify-end flex-1 space-x-4">
                            {(['public', 'contractor', 'customer'] as const).map(tier => {
                              const fieldBase = mat.is_import ? 'price_per_ton' : 'price_per_cy';
                              const field = tier === 'public' ? fieldBase : `${fieldBase}_${tier}`;
                              const value = mat[field] || 0;
                              const publicValue = mat[fieldBase] || 0;
                              const matchesPublic = tier !== 'public' && value === publicValue;
                              const isEditing = editingPriceField?.matId === mat.id && editingPriceField?.field === field;
                              const tierLabel = tier === 'public' ? 'Public' : tier === 'contractor' ? 'Contr' : 'Cust';
                              const tierColor = tier === 'public' ? 'text-slate-400' : tier === 'contractor' ? 'text-orange-400' : 'text-emerald-400';
                              return (
                                <div key={tier} className="flex flex-col items-end flex-1 max-w-[110px]">
                                  <span className={`text-[9px] font-bold uppercase tracking-wider ${tierColor}`}>{tierLabel}</span>
                                  {isEditing ? (
                                    <div className="flex items-center space-x-1 mt-0.5">
                                      <input type="number" step="0.01" value={editPriceVal} onChange={e => setEditPriceVal(e.target.value)}
                                        className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-orange-500" />
                                      <button onClick={() => { savePriceField(mat.id, field, parseFloat(editPriceVal)); setEditingPriceField(null); }} className="text-emerald-400 text-xs"><i className="fa-solid fa-check"></i></button>
                                      <button onClick={() => setEditingPriceField(null)} className="text-slate-500 text-xs"><i className="fa-solid fa-xmark"></i></button>
                                    </div>
                                  ) : (
                                    <button onClick={() => { setEditingPriceField({ matId: mat.id, field }); setEditPriceVal(String(value)); }}
                                      className={`text-sm font-semibold hover:text-orange-400 transition-colors mt-0.5 ${matchesPublic ? 'text-slate-500' : 'text-white'}`}>
                                      ${value.toFixed(2)}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            <button onClick={() => deleteMaterial(mat.id)} className="text-slate-600 hover:text-red-500 transition-colors flex-shrink-0">
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        </div>

                        {/* Sub-row: auto-decline threshold */}
                        <div className="flex items-center text-[11px] text-slate-500 space-x-2 pl-1">
                          <i className="fa-solid fa-shield-halved text-slate-600"></i>
                          <label htmlFor={`autodec-${mat.id}`} className="whitespace-nowrap">Auto-decline below:</label>
                          <input
                            id={`autodec-${mat.id}`}
                            type="number"
                            min="0"
                            step="1"
                            value={mat.auto_decline_below ?? ''}
                            onChange={e => {
                              const raw = e.target.value;
                              setMaterials(prev => prev.map(m => m.id === mat.id ? { ...m, auto_decline_below: raw === '' ? null : raw } : m));
                            }}
                            onBlur={() => saveAutoDeclineThreshold(mat)}
                            disabled={savingThresholdId === mat.id}
                            placeholder="—"
                            className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
                          />
                          <span className="text-slate-600">{mat.is_import ? 'tons' : 'CY'}</span>
                          {(mat.auto_decline_below == null || mat.auto_decline_below === '') && (
                            <span className="text-slate-700 italic">leave blank to disable</span>
                          )}
                          {savingThresholdId === mat.id && <i className="fa-solid fa-spinner fa-spin text-slate-600"></i>}
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/*        CUSTOMER MANAGEMENT TAB        */}
          {activeTab === 'customers' && (
            <div className="space-y-6">

              {/* Pending Requests */}
              {tierRequests.filter(r => r.status === 'pending').length > 0 && (
                <div className="bg-slate-800 border border-orange-500/30 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700 bg-orange-500/5 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">Pending Tier Upgrade Requests</h2>
                    <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                      {tierRequests.filter(r => r.status === 'pending').length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {tierRequests.filter(r => r.status === 'pending').map(req => (
                      <div key={req.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{req.contractor?.company_name}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Requesting <span className="text-slate-300 capitalize">{req.current_tier}</span>
                              <i className="fa-solid fa-arrow-right mx-2 text-slate-500"></i>
                              <span className={req.requested_tier === 'customer' ? 'text-emerald-400' : 'text-orange-400'}>
                                {req.requested_tier.charAt(0).toUpperCase() + req.requested_tier.slice(1)}
                              </span>
                            </p>
                            {req.message && <p className="text-xs text-slate-500 italic mt-2">&ldquo;{req.message}&rdquo;</p>}
                          </div>
                          <div className="flex space-x-2">
                            <button onClick={() => handleTierRequest(req, 'reject')} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-600 text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-all">Reject</button>
                            <button onClick={() => handleTierRequest(req, 'approve')} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all">Approve</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Customers */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50">
                  <h2 className="text-sm font-semibold text-white">Customer Tiers ({contractors.length})</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Set pricing tier for each contractor. Defaults to Public.</p>
                </div>
                <div className="divide-y divide-slate-700/50">
                  {contractors.map(c => {
                    const rel = relationships.find(r => r.contractor_id === c.id);
                    const currentTier = rel?.tier || 'public';
                    return (
                      <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{c.company_name}</p>
                          {rel && <p className="text-[10px] text-slate-500 mt-0.5">Set {new Date(rel.updated_at).toLocaleDateString()}</p>}
                        </div>
                        <div className="flex space-x-1">
                          {(['public', 'contractor', 'customer'] as const).map(tier => {
                            const tierColor = tier === 'public' ? 'bg-slate-700/50 text-slate-300 border-slate-600' : tier === 'contractor' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                            return (
                              <button key={tier} onClick={() => setContractorTier(c.id, tier)}
                                className={`px-3 py-1 rounded-md text-[10px] font-semibold border transition-all ${currentTier === tier ? tierColor : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500'}`}>
                                {tier.charAt(0).toUpperCase() + tier.slice(1)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/*        INVOICES TAB        */}
          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex space-x-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
                  {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(f => (
                    <button key={f} onClick={() => setInvoiceFilter(f)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${invoiceFilter === f ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                      {f}{f !== 'all' && ` (${invoices.filter(i => i.status === f).length})`}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setEditingInvoice(null); resetInvoiceForm(); setShowInvoiceModal(true); }}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-orange-500/20 transition-all">
                  + New Invoice
                </button>
              </div>

              <div className="space-y-3">
                {invoices.filter(i => invoiceFilter === 'all' || i.status === invoiceFilter).length === 0 ? (
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                    <i className="fa-solid fa-file-invoice-dollar text-4xl text-slate-600 mb-3"></i>
                    <p className="text-slate-400 text-sm">No invoices {invoiceFilter !== 'all' ? `with status "${invoiceFilter}"` : 'yet'}.</p>
                  </div>
                ) : invoices.filter(i => invoiceFilter === 'all' || i.status === invoiceFilter).map((inv: any) => {
                  const statusColor =
                    inv.status === 'paid'    ? 'bg-emerald-500/20 text-emerald-400' :
                    inv.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                    inv.status === 'sent'    ? 'bg-blue-500/20 text-blue-400' :
                                               'bg-slate-600/30 text-slate-400';
                  return (
                    <div key={inv.id}
                      onClick={() => { setEditingInvoice(inv); loadInvoiceForEdit(inv); setShowInvoiceModal(true); }}
                      className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base font-bold text-white">{inv.invoice_number}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${statusColor}`}>{inv.status}</span>
                          </div>
                          <p className="text-sm text-slate-300">{inv.contractor?.company_name || 'Unknown Contractor'}</p>
                          {inv.project?.name && <p className="text-xs text-slate-500 mt-0.5">{inv.project.name}</p>}
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            {inv.issued_date && <span><i className="fa-solid fa-calendar mr-1"></i>{new Date(inv.issued_date).toLocaleDateString()}</span>}
                            {inv.due_date    && <span><i className="fa-solid fa-clock mr-1"></i>Due {new Date(inv.due_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold text-white">${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                          {inv.amount_paid > 0 && inv.amount_paid < inv.total_amount && (
                            <div className="text-xs text-emerald-400 mt-1">${Number(inv.amount_paid).toFixed(2)} paid</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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

          {/*        SETTINGS TAB        */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl space-y-6">

              {/* Facility quote settings */}
              <section className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/40">
                  <h2 className="text-base font-semibold text-white">Quote Request Settings</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Toggle whether contractors can send job-specific quote requests to each facility.</p>
                </div>
                {facilitySettings.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-slate-500">No facilities linked to your account.</div>
                ) : (
                  <ul className="divide-y divide-slate-700/60">
                    {facilitySettings.map(f => {
                      const enabled = f.accepts_quote_requests !== false;
                      const isSaving = savingFacilityId === f.id;
                      return (
                        <li key={f.id} className="px-6 py-4 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{f.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{f.type} facility</p>
                          </div>
                          <div className="flex items-center space-x-3 flex-shrink-0">
                            <span className={`text-xs font-semibold ${enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {enabled ? 'Accepting quotes' : 'Quotes disabled'}
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={enabled}
                              disabled={isSaving}
                              onClick={() => toggleFacilityAcceptsQuotes(f.id, !enabled)}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                            >
                              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Auto-decline response message */}
              <section className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/40">
                  <h2 className="text-base font-semibold text-white">Auto-decline Response</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Sent to contractors automatically when a quote request is below the material&apos;s minimum threshold (set per-material in My Materials).</p>
                </div>
                <div className="px-6 py-5 space-y-3">
                  <textarea
                    value={autoDeclineMessage}
                    onChange={e => setAutoDeclineMessage(e.target.value)}
                    rows={4}
                    placeholder="e.g., Thanks for reaching out. We have a minimum order quantity for this material — please let us know if you'd like to revise."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 resize-none"
                  />
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={saveAutoDeclineMessage}
                      disabled={savingAutoMsg}
                      className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      {savingAutoMsg ? 'Saving...' : 'Save Message'}
                    </button>
                    {autoDeclineMsgSavedAt && Date.now() - autoDeclineMsgSavedAt < 5000 && (
                      <span className="text-xs text-emerald-400"><i className="fa-solid fa-check mr-1"></i>Saved.</span>
                    )}
                  </div>
                </div>
              </section>

              {/* Account section */}
              <section className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/40">
                  <h2 className="text-base font-semibold text-white">Account</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Manage your sign-in credentials.</p>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm text-slate-300 font-medium">Reset Password</p>
                  <p className="text-xs text-slate-500 mt-1">We&apos;ll email you a secure link to set a new password.</p>
                  <button
                    type="button"
                    onClick={sendPasswordReset}
                    disabled={resetEmailSent === 'sending'}
                    className="mt-3 inline-flex items-center bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <i className="fa-solid fa-envelope mr-2"></i>
                    {resetEmailSent === 'sending' ? 'Sending...' : resetEmailSent === 'sent' ? 'Email Sent' : 'Send Password Reset Email'}
                  </button>
                  {resetEmailMsg && (
                    <p className={`text-xs mt-2 ${resetEmailSent === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{resetEmailMsg}</p>
                  )}
                </div>
              </section>

            </div>
          )}

        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800">
          <div className="flex items-center justify-around px-2 py-2">
            <button onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center space-y-1 px-3 py-1.5 rounded-lg transition-all ${activeTab === 'dashboard' ? 'text-orange-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-chart-line text-lg"></i>
              <span className="text-[10px] font-medium">Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('quotes')}
              className={`flex flex-col items-center space-y-1 px-3 py-1.5 rounded-lg transition-all relative ${activeTab === 'quotes' ? 'text-orange-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-handshake text-lg"></i>
              {pendingQuotes.length > 0 && <span className="absolute top-0 right-0.5 bg-orange-500 text-white text-[9px] font-bold px-1 rounded-full">{pendingQuotes.length}</span>}
              <span className="text-[10px] font-medium">Quotes</span>
            </button>
            <button onClick={() => setActiveTab('materials')}
              className={`flex flex-col items-center space-y-1 px-3 py-1.5 rounded-lg transition-all ${activeTab === 'materials' ? 'text-orange-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-cubes text-lg"></i>
              <span className="text-[10px] font-medium">Materials</span>
            </button>
            <button onClick={() => setActiveTab('customers')}
              className={`flex flex-col items-center space-y-1 px-3 py-1.5 rounded-lg transition-all relative ${activeTab === 'customers' ? 'text-orange-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-handshake text-lg"></i>
              {tierRequests.filter(r => r.status === 'pending').length > 0 && <span className="absolute top-0 right-0.5 bg-orange-500 text-white text-[9px] font-bold px-1 rounded-full">{tierRequests.filter(r => r.status === 'pending').length}</span>}
              <span className="text-[10px] font-medium">Customers</span>
            </button>
            <button onClick={() => setActiveTab('invoices')}
              className={`flex flex-col items-center space-y-1 px-3 py-1.5 rounded-lg transition-all relative ${activeTab === 'invoices' ? 'text-orange-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-file-invoice-dollar text-lg"></i>
              {overdueInvoiceCount > 0 && <span className="absolute top-0 right-0.5 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full">{overdueInvoiceCount}</span>}
              <span className="text-[10px] font-medium">Invoices</span>
            </button>
            <button onClick={() => setActiveTab('add')}
              className={`flex flex-col items-center space-y-1 px-3 py-1.5 rounded-lg transition-all ${activeTab === 'add' ? 'text-orange-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-plus text-lg"></i>
              <span className="text-[10px] font-medium">Add</span>
            </button>
            <button onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center space-y-1 px-3 py-1.5 rounded-lg transition-all ${activeTab === 'settings' ? 'text-orange-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-gear text-lg"></i>
              <span className="text-[10px] font-medium">Settings</span>
            </button>
          </div>
        </div>

      </main>

      {/* Invoice create/edit modal */}
      {showInvoiceModal && (() => {
        const totals = calcTotals();
        const projectsForContractor = (contractorProjects || []).filter((p: any) => p.contractor_id === invContractor);
        const estimatesForContractor = (availableEstimates || []).filter((e: any) =>
          !invContractor || e.project?.contractor_id === invContractor
        );
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">

              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-white">{editingInvoice ? `Edit ${editingInvoice.invoice_number}` : 'New Invoice'}</h2>
                  {editingInvoice && <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wider">Status: {editingInvoice.status}</p>}
                </div>
                <div className="flex items-center space-x-2">
                  {editingInvoice && (
                    <InvoicePDFButton
                      invoice={editingInvoice}
                      lineItems={lineItems.filter(li => li.invoice_id === editingInvoice.id)}
                      supplier={{ company_name: profile.company_name }}
                      contractor={editingInvoice.contractor}
                    />
                  )}
                  {editingInvoice && (
                    <button onClick={() => deleteInvoice(editingInvoice.id)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 transition-colors" title="Delete invoice">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  )}
                  <button onClick={() => { setShowInvoiceModal(false); setEditingInvoice(null); }} className="text-slate-400 hover:text-white p-1.5">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-6 space-y-5">

                {/* Top row: Contractor / Project / Due Date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Contractor</label>
                    <select value={invContractor} onChange={e => { setInvContractor(e.target.value); setInvProject(''); }} required
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                      <option value="">— Select Contractor —</option>
                      {contractors.map((c: any) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Project <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
                    <select value={invProject} onChange={e => setInvProject(e.target.value)} disabled={!invContractor}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 disabled:opacity-50">
                      <option value="">— No project —</option>
                      {projectsForContractor.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</label>
                    <input type="date" value={invDueDate} onChange={e => setInvDueDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                  </div>
                </div>

                {/* Import from Estimates */}
                <div className="bg-slate-800/40 border border-slate-700 rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setInvShowEstimates(!invShowEstimates)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-white">Import from Estimates</span>
                      <span className="ml-2 text-xs text-slate-500">({estimatesForContractor.length} available)</span>
                    </div>
                    <i className={`fa-solid fa-chevron-${invShowEstimates ? 'up' : 'down'} text-xs text-slate-500`}></i>
                  </button>
                  {invShowEstimates && (
                    <div className="px-4 py-3 border-t border-slate-700 space-y-2">
                      {estimatesForContractor.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">No saved estimates from your customers at your facilities.</p>
                      ) : (
                        <>
                          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            {estimatesForContractor.map((e: any) => {
                              const checked = invSelectedEstimates.includes(e.id);
                              return (
                                <label key={e.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded border cursor-pointer ${checked ? 'bg-orange-500/10 border-orange-500/40' : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'}`}>
                                  <div className="flex items-center space-x-2 min-w-0">
                                    <input type="checkbox" checked={checked}
                                      onChange={() => setInvSelectedEstimates(checked ? invSelectedEstimates.filter(id => id !== e.id) : [...invSelectedEstimates, e.id])}
                                      className="w-3.5 h-3.5 accent-orange-500 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-white truncate">{e.material_name} – {e.facility?.name}</p>
                                      <p className="text-[10px] text-slate-500">{e.project?.name} • {e.project?.contractor?.company_name}</p>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-xs font-semibold text-white">${Number(e.total_price).toFixed(2)}</p>
                                    <p className="text-[10px] text-slate-500">× {e.quantity}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                          <div className="flex justify-end">
                            <button type="button" onClick={importFromEstimates} disabled={invSelectedEstimates.length === 0}
                              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors">
                              Import {invSelectedEstimates.length > 0 ? `(${invSelectedEstimates.length})` : 'Selected'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Line items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Line Items</label>
                    <button type="button" onClick={addLineItem}
                      className="text-xs text-orange-400 hover:text-orange-300 font-semibold">
                      <i className="fa-solid fa-plus mr-1"></i>Add Line Item
                    </button>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-700 rounded-lg overflow-hidden">
                    {invItems.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-6">No line items yet.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="bg-slate-900/40 text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Description</th>
                            <th className="px-3 py-2 text-left font-semibold">Material</th>
                            <th className="px-3 py-2 text-right font-semibold w-20">Qty</th>
                            <th className="px-3 py-2 text-right font-semibold w-28">Unit Price</th>
                            <th className="px-3 py-2 text-right font-semibold w-28">Line Total</th>
                            <th className="px-3 py-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/60">
                          {invItems.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-2">
                                <input value={item.description || ''} onChange={e => updateLineItem(idx, 'description', e.target.value)}
                                  placeholder="Description" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500" />
                              </td>
                              <td className="px-2 py-2">
                                <input value={item.material_name || ''} onChange={e => updateLineItem(idx, 'material_name', e.target.value)}
                                  placeholder="Material" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500" />
                              </td>
                              <td className="px-2 py-2">
                                <input type="number" step="0.01" value={item.quantity ?? 0} onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-orange-500" />
                              </td>
                              <td className="px-2 py-2">
                                <input type="number" step="0.01" value={item.unit_price ?? 0} onChange={e => updateLineItem(idx, 'unit_price', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-orange-500" />
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-white">
                                ${(parseFloat(item.line_total) || 0).toFixed(2)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button type="button" onClick={() => removeLineItem(idx)} className="text-slate-500 hover:text-red-400 transition-colors">
                                  <i className="fa-solid fa-xmark text-xs"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Tax + Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tax Rate (%)</label>
                    <input type="number" step="0.01" min="0" max="100" value={invTaxRate} onChange={e => setInvTaxRate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</label>
                    <textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} rows={2}
                      placeholder="Payment terms, references…"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 resize-none" />
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="bg-slate-800/40 border border-slate-700 rounded-lg px-5 py-3 min-w-[260px] space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Subtotal</span>
                      <span className="text-white">${totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Tax ({(parseFloat(invTaxRate) || 0).toFixed(2)}%)</span>
                      <span className="text-white">${totals.tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-700 my-1" />
                    <div className="flex justify-between text-base font-bold text-white">
                      <span>Total</span>
                      <span>${totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end space-x-2 flex-shrink-0">
                <button onClick={() => { setShowInvoiceModal(false); setEditingInvoice(null); }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">
                  Cancel
                </button>
                <button onClick={() => saveInvoice('draft')} disabled={savingInvoice || !invContractor || invItems.length === 0}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white transition-all">
                  {savingInvoice ? 'Saving…' : 'Save as Draft'}
                </button>
                <button onClick={() => saveInvoice('sent')} disabled={savingInvoice || !invContractor || invItems.length === 0}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition-all">
                  {savingInvoice ? 'Saving…' : 'Save & Send'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
