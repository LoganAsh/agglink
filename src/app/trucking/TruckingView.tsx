/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import LogoutButton from '@/components/LogoutButton';

const InvoicePDFButton = dynamic(() => import('@/components/InvoicePDFButton'), { ssr: false });

export default function TruckingView({
  profileId,
  profile,
  truckTypes = [],
  rates: initialRates = [],
  networkLinks = [],
  jobRequests: initialJobRequests = [],
  invoices: initialInvoices = [],
  lineItems: initialLineItems = [],
  networkContractors = [],
  acceptedJobRequests = [],
}: {
  profileId: string;
  profile: any;
  truckTypes?: any[];
  rates?: any[];
  networkLinks?: any[];
  jobRequests?: any[];
  invoices?: any[];
  lineItems?: any[];
  networkContractors?: any[];
  acceptedJobRequests?: any[];
}) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'rates' | 'customers' | 'jobs' | 'invoices'>('rates');
  const [rates, setRates] = useState<any[]>(initialRates);
  const [jobRequests, setJobRequests] = useState<any[]>(initialJobRequests);
  const [savingTruckType, setSavingTruckType] = useState<string | null>(null);
  const [jobsFilter, setJobsFilter] = useState<'all' | 'pending' | 'quoted' | 'accepted' | 'declined'>('all');
  const [quoteFor, setQuoteFor] = useState<any | null>(null);
  const [quoteRate, setQuoteRate] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Invoices state
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [lineItems, setLineItems] = useState<any[]>(initialLineItems);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');
  const [invContractor, setInvContractor] = useState('');
  const [invDueDate, setInvDueDate] = useState('');
  const [invNotes, setInvNotes] = useState('');
  const [invTaxRate, setInvTaxRate] = useState('0');
  const [invItems, setInvItems] = useState<any[]>([]);
  const [invSelectedJobRequests, setInvSelectedJobRequests] = useState<string[]>([]);
  const [invShowJobs, setInvShowJobs] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);

  const overdueInvoiceCount = invoices.filter(i => i.status === 'overdue').length;

  const companyName = profile?.company_name || 'Trucking Company';
  const initials = companyName.substring(0, 2).toUpperCase();
  const pendingJobCount = jobRequests.filter(j => j.status === 'pending').length;

  //        Rates
  const upsertRate = async (truckType: string, fields: any) => {
    setSavingTruckType(truckType);
    const existing = rates.find(r => r.truck_type === truckType);
    if (existing) {
      const { data, error } = await supabase
        .from('trucking_company_rates')
        .update(fields)
        .eq('id', existing.id)
        .select().single();
      if (data && !error) setRates(prev => prev.map(r => r.id === existing.id ? data : r));
      else if (error) alert('Failed to save: ' + error.message);
    } else {
      const { data, error } = await supabase
        .from('trucking_company_rates')
        .insert({ trucker_id: profileId, truck_type: truckType, ...fields })
        .select().single();
      if (data && !error) setRates(prev => [...prev, data]);
      else if (error) alert('Failed to save: ' + error.message);
    }
    setSavingTruckType(null);
  };

  //        Job requests
  const declineJob = async (req: any) => {
    if (!confirm('Decline this job request?')) return;
    const { error } = await supabase
      .from('trucker_job_requests')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', req.id);
    if (error) { alert('Failed to decline: ' + error.message); return; }
    setJobRequests(prev => prev.map(j => j.id === req.id ? { ...j, status: 'declined', responded_at: new Date().toISOString() } : j));
  };

  const openQuote = (req: any) => {
    setQuoteFor(req);
    const existing = rates.find(r => r.truck_type === req.truck_type);
    setQuoteRate(existing?.hourly_rate ? String(existing.hourly_rate) : '');
    setQuoteMessage('');
  };

  const submitQuote = async () => {
    if (!quoteFor) return;
    const rate = parseFloat(quoteRate);
    if (isNaN(rate) || rate <= 0) { alert('Enter a valid hourly rate.'); return; }
    setSubmittingQuote(true);
    const update = {
      status: 'quoted',
      offered_hourly_rate: rate,
      response_message: quoteMessage.trim() || null,
      responded_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('trucker_job_requests')
      .update(update)
      .eq('id', quoteFor.id);
    if (error) { alert('Failed to submit quote: ' + error.message); setSubmittingQuote(false); return; }
    setJobRequests(prev => prev.map(j => j.id === quoteFor.id ? { ...j, ...update } : j));
    setQuoteFor(null);
    setSubmittingQuote(false);
  };

  //        Invoices
  const resetInvoiceForm = () => {
    setInvContractor(''); setInvDueDate(''); setInvNotes('');
    setInvTaxRate('0'); setInvItems([]); setInvSelectedJobRequests([]); setInvShowJobs(false);
  };

  const loadInvoiceForEdit = (inv: any) => {
    setInvContractor(inv.contractor_id);
    setInvDueDate(inv.due_date || '');
    setInvNotes(inv.notes || '');
    const taxPct = inv.tax_amount && inv.subtotal ? (Number(inv.tax_amount) / Number(inv.subtotal) * 100).toFixed(2) : '0';
    setInvTaxRate(taxPct);
    const items = lineItems.filter(li => li.invoice_id === inv.id);
    setInvItems(items.map(it => ({ ...it })));
    setInvSelectedJobRequests([]);
    setInvShowJobs(false);
  };

  const addLineItem = () => {
    setInvItems([...invItems, { description: '', material_name: '', quantity: 0, unit_price: 0, line_total: 0, unit: 'load', display_order: invItems.length }]);
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

  const importFromJobRequests = () => {
    const selected = acceptedJobRequests.filter((r: any) => invSelectedJobRequests.includes(r.id));
    if (selected.length === 0) return;
    const newItems = selected.map((r: any, i: number) => ({
      description: `Trucking – ${r.material_name} (${r.truck_type || 'Truck'})${r.pickup?.name ? ' from ' + r.pickup.name : ''}`,
      material_name: r.material_name,
      quantity: r.quantity,
      unit_price: r.offered_hourly_rate || 0,
      line_total: Number(r.quantity) * Number(r.offered_hourly_rate || 0),
      unit: r.truck_type || 'load',
      display_order: invItems.length + i,
    }));
    setInvItems([...invItems, ...newItems]);
    if (selected.length > 0 && !invContractor) setInvContractor(selected[0].contractor_id);
    setInvSelectedJobRequests([]);
    setInvShowJobs(false);
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
      .eq('trucker_id', profileId).order('created_at', { ascending: false });
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
      trucker_id: profileId,
      supplier_id: null,
      contractor_id: invContractor,
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
      unit: item.unit || 'load',
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

  const filteredJobs = jobRequests.filter(j =>
    jobsFilter === 'all' ? true : j.status === jobsFilter
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0b1120] text-slate-300 font-sans">

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold text-white tracking-wide">AggLink<span className="text-cyan-400">.</span></span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button onClick={() => setActiveTab('rates')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'rates' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-dollar-sign w-4 text-center"></i>
            <span>My Rates</span>
          </button>
          <button onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'customers' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-users w-4 text-center"></i>
            <span>Customers</span>
          </button>
          <button onClick={() => setActiveTab('jobs')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'jobs' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-truck-fast w-4 text-center"></i>
            <span>Job Requests</span>
            {pendingJobCount > 0 && (
              <span className="ml-auto bg-cyan-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingJobCount}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('invoices')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'invoices' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <i className="fa-solid fa-file-invoice-dollar w-4 text-center"></i>
            <span>Invoices</span>
            {overdueInvoiceCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{overdueInvoiceCount}</span>
            )}
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm">{initials}</div>
            <div className="ml-3">
              <p className="text-sm font-semibold text-white truncate">{companyName}</p>
              <p className="text-xs text-cyan-400 font-medium">Trucking</p>
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
            <span className="md:hidden text-base font-bold text-white">AggLink<span className="text-cyan-400">.</span></span>
            <h1 className="text-lg font-semibold text-white">
              {activeTab === 'rates' ? 'My Rates' : activeTab === 'customers' ? 'Customers' : activeTab === 'invoices' ? 'Invoices' : 'Job Requests'}
            </h1>
          </div>
          <div className="md:hidden"><LogoutButton /></div>
        </header>

        <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">

          {/* MY RATES TAB */}
          {activeTab === 'rates' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Set your hourly rate, minimum hours per day, and capacity for each truck type. Contractors will use these to compute estimates and request your services.</p>
              </div>

              {truckTypes.length === 0 ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                  <p className="text-slate-400 text-sm">No truck types configured yet. Contact an admin.</p>
                </div>
              ) : truckTypes.map(t => {
                const rate = rates.find(r => r.truck_type === t.name);
                const isActive = !!rate?.active;
                const saving = savingTruckType === t.name;
                return (
                  <div key={t.id} className={`bg-slate-800 border rounded-xl p-5 transition-colors ${isActive ? 'border-cyan-500/40' : 'border-slate-700'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-white">{t.name}</h3>
                        {!rate && <p className="text-xs text-slate-500 mt-0.5">Not configured</p>}
                        {rate && <p className={`text-[11px] uppercase tracking-wider font-bold mt-0.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>{isActive ? 'Active' : 'Inactive'}</p>}
                      </div>
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <span className="text-xs text-slate-400">{isActive ? 'Enabled' : 'Disabled'}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          disabled={saving}
                          onClick={() => upsertRate(t.name, { active: !isActive })}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${isActive ? 'bg-cyan-500' : 'bg-slate-700'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Hourly Rate ($)</label>
                        <input
                          type="number" step="0.01" min="0"
                          defaultValue={rate?.hourly_rate ?? ''}
                          onBlur={e => {
                            const v = parseFloat(e.target.value) || 0;
                            if (rate?.hourly_rate !== v) upsertRate(t.name, { hourly_rate: v });
                          }}
                          placeholder="0.00"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Min Hours / Day</label>
                        <input
                          type="number" step="0.5" min="0"
                          defaultValue={rate?.minimum_hours_per_day ?? ''}
                          onBlur={e => {
                            const v = parseFloat(e.target.value) || 0;
                            if (rate?.minimum_hours_per_day !== v) upsertRate(t.name, { minimum_hours_per_day: v });
                          }}
                          placeholder="2"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Capacity (tons)</label>
                        <input
                          type="number" step="0.1" min="0"
                          defaultValue={rate?.capacity_tons ?? ''}
                          onBlur={e => {
                            const v = parseFloat(e.target.value) || 0;
                            if (rate?.capacity_tons !== v) upsertRate(t.name, { capacity_tons: v });
                          }}
                          placeholder="25"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Capacity (CY)</label>
                        <input
                          type="number" step="0.1" min="0"
                          defaultValue={rate?.capacity_cy ?? ''}
                          onBlur={e => {
                            const v = parseFloat(e.target.value) || 0;
                            if (rate?.capacity_cy !== v) upsertRate(t.name, { capacity_cy: v });
                          }}
                          placeholder="12"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                    {saving && <p className="text-xs text-cyan-400 mt-2"><i className="fa-solid fa-spinner fa-spin mr-1"></i>Saving...</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* CUSTOMERS TAB */}
          {activeTab === 'customers' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/40">
                <h2 className="text-sm font-semibold text-white">Contractors who have you in their network ({networkLinks.length})</h2>
                <p className="text-xs text-slate-500 mt-0.5">When a contractor adds your trucking company to their network, they appear here and can request jobs.</p>
              </div>
              {networkLinks.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-500 italic">No contractors yet.</div>
              ) : (
                <div className="divide-y divide-slate-700/60">
                  {networkLinks.map((link: any) => (
                    <div key={link.id} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{link.contractor?.company_name || 'Unknown contractor'}</p>
                        {link.created_at && <p className="text-[11px] text-slate-500 mt-0.5">Added {new Date(link.created_at).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* JOB REQUESTS TAB */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              <div className="flex space-x-1 p-1 bg-slate-800 rounded-lg border border-slate-700 inline-flex">
                {(['all', 'pending', 'quoted', 'accepted', 'declined'] as const).map(f => (
                  <button key={f} onClick={() => setJobsFilter(f)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${jobsFilter === f ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                    {f}{f !== 'all' && ` (${jobRequests.filter(j => j.status === f).length})`}
                  </button>
                ))}
              </div>

              {filteredJobs.length === 0 ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                  <i className="fa-solid fa-truck-fast text-4xl text-slate-600 mb-3"></i>
                  <p className="text-slate-400 text-sm">No {jobsFilter !== 'all' ? jobsFilter : ''} job requests {jobsFilter === 'all' ? 'yet' : ''}.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredJobs.map((req: any) => {
                    const statusColor =
                      req.status === 'pending'  ? 'bg-cyan-500/20 text-cyan-400' :
                      req.status === 'quoted'   ? 'bg-blue-500/20 text-blue-400' :
                      req.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                                                  'bg-red-500/20 text-red-400';
                    return (
                      <div key={req.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-base font-bold text-white">{req.contractor?.company_name || 'Unknown contractor'}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${statusColor}`}>{req.status}</span>
                            </div>
                            {req.material_name && (
                              <p className="text-sm text-slate-300">
                                <span className="text-slate-500">Material:</span> {req.material_name}
                                {req.quantity && <> · <span className="text-slate-500">Qty:</span> {Number(req.quantity).toLocaleString()} {req.unit || 'tons'}</>}
                              </p>
                            )}
                            {req.truck_type && <p className="text-xs text-slate-400 mt-1"><span className="text-slate-500">Truck:</span> {req.truck_type}</p>}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-xs">
                              {req.pickup && (
                                <div className="bg-slate-900/40 border border-slate-700/60 rounded px-3 py-2">
                                  <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Pickup</p>
                                  <p className="text-slate-300 mt-0.5 truncate">{req.pickup.name}</p>
                                  {req.pickup.address && <p className="text-slate-500 text-[10px] mt-0.5 truncate">{req.pickup.address}</p>}
                                </div>
                              )}
                              {req.project && (
                                <div className="bg-slate-900/40 border border-slate-700/60 rounded px-3 py-2">
                                  <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Drop-off</p>
                                  <p className="text-slate-300 mt-0.5 truncate">{req.project.name}</p>
                                  {req.project.address && <p className="text-slate-500 text-[10px] mt-0.5 truncate">{req.project.address}</p>}
                                </div>
                              )}
                            </div>
                            {req.message && (
                              <div className="mt-3 bg-slate-900/40 border border-slate-700/60 rounded px-3 py-2">
                                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Contractor note</p>
                                <p className="text-xs text-slate-300 whitespace-pre-wrap mt-0.5">{req.message}</p>
                              </div>
                            )}
                            {req.offered_hourly_rate && (
                              <div className="mt-3 bg-cyan-500/5 border border-cyan-500/20 rounded px-3 py-2">
                                <p className="text-[9px] text-cyan-400 uppercase tracking-wider font-semibold">Your quote</p>
                                <p className="text-sm font-bold text-cyan-300 mt-0.5">${Number(req.offered_hourly_rate).toFixed(2)}/hr</p>
                                {req.response_message && <p className="text-xs text-slate-300 whitespace-pre-wrap mt-1">{req.response_message}</p>}
                              </div>
                            )}
                          </div>
                          {req.status === 'pending' && (
                            <div className="flex space-x-2 flex-shrink-0">
                              <button onClick={() => declineJob(req)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-600 text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-all">
                                Decline
                              </button>
                              <button onClick={() => openQuote(req)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-600 text-white transition-all">
                                Quote
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* INVOICES TAB */}
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
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-cyan-500/20 transition-all">
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

        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800">
          <div className="flex items-center justify-around px-2 py-2">
            <button onClick={() => setActiveTab('rates')}
              className={`flex flex-col items-center space-y-1 px-3 py-1.5 rounded-lg transition-all ${activeTab === 'rates' ? 'text-cyan-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-dollar-sign text-lg"></i>
              <span className="text-[10px] font-medium">Rates</span>
            </button>
            <button onClick={() => setActiveTab('customers')}
              className={`flex flex-col items-center space-y-1 px-3 py-1.5 rounded-lg transition-all ${activeTab === 'customers' ? 'text-cyan-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-users text-lg"></i>
              <span className="text-[10px] font-medium">Customers</span>
            </button>
            <button onClick={() => setActiveTab('jobs')}
              className={`flex flex-col items-center space-y-1 px-3 py-1.5 rounded-lg transition-all relative ${activeTab === 'jobs' ? 'text-cyan-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-truck-fast text-lg"></i>
              {pendingJobCount > 0 && <span className="absolute top-0 right-0.5 bg-cyan-500 text-white text-[9px] font-bold px-1 rounded-full">{pendingJobCount}</span>}
              <span className="text-[10px] font-medium">Jobs</span>
            </button>
            <button onClick={() => setActiveTab('invoices')}
              className={`flex flex-col items-center space-y-1 px-3 py-1.5 rounded-lg transition-all relative ${activeTab === 'invoices' ? 'text-cyan-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-file-invoice-dollar text-lg"></i>
              {overdueInvoiceCount > 0 && <span className="absolute top-0 right-0.5 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full">{overdueInvoiceCount}</span>}
              <span className="text-[10px] font-medium">Invoices</span>
            </button>
          </div>
        </div>

      </main>

      {/* Invoice create/edit modal */}
      {showInvoiceModal && (() => {
        const totals = calcTotals();
        const jobsForContractor = (acceptedJobRequests || []).filter((r: any) =>
          !invContractor || r.contractor_id === invContractor
        );
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">

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

              <div className="overflow-y-auto p-6 space-y-5">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Contractor</label>
                    <select value={invContractor} onChange={e => setInvContractor(e.target.value)} required
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
                      <option value="">— Select Contractor —</option>
                      {networkContractors.map((c: any) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                    {networkContractors.length === 0 && (
                      <p className="text-[11px] text-slate-500 italic mt-1">No contractors have added you to their network yet.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</label>
                    <input type="date" value={invDueDate} onChange={e => setInvDueDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>

                <div className="bg-slate-800/40 border border-slate-700 rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setInvShowJobs(!invShowJobs)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-white">Import from Accepted Jobs</span>
                      <span className="ml-2 text-xs text-slate-500">({jobsForContractor.length} available)</span>
                    </div>
                    <i className={`fa-solid fa-chevron-${invShowJobs ? 'up' : 'down'} text-xs text-slate-500`}></i>
                  </button>
                  {invShowJobs && (
                    <div className="px-4 py-3 border-t border-slate-700 space-y-2">
                      {jobsForContractor.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">No accepted job requests for the selected contractor.</p>
                      ) : (
                        <>
                          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            {jobsForContractor.map((r: any) => {
                              const checked = invSelectedJobRequests.includes(r.id);
                              return (
                                <label key={r.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded border cursor-pointer ${checked ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'}`}>
                                  <div className="flex items-center space-x-2 min-w-0">
                                    <input type="checkbox" checked={checked}
                                      onChange={() => setInvSelectedJobRequests(checked ? invSelectedJobRequests.filter(id => id !== r.id) : [...invSelectedJobRequests, r.id])}
                                      className="w-3.5 h-3.5 accent-cyan-500 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-white truncate">{r.material_name} ({r.truck_type || 'Truck'})</p>
                                      <p className="text-[10px] text-slate-500">{r.contractor?.company_name}{r.pickup?.name ? ` • from ${r.pickup.name}` : ''}</p>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-xs font-semibold text-white">${Number(r.offered_hourly_rate || 0).toFixed(2)}</p>
                                    <p className="text-[10px] text-slate-500">× {r.quantity}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                          <div className="flex justify-end">
                            <button type="button" onClick={importFromJobRequests} disabled={invSelectedJobRequests.length === 0}
                              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors">
                              Import {invSelectedJobRequests.length > 0 ? `(${invSelectedJobRequests.length})` : 'Selected'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Line Items</label>
                    <button type="button" onClick={addLineItem}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold">
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
                                  placeholder="Description" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500" />
                              </td>
                              <td className="px-2 py-2">
                                <input type="number" step="0.01" value={item.quantity ?? 0} onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-cyan-500" />
                              </td>
                              <td className="px-2 py-2">
                                <input type="number" step="0.01" value={item.unit_price ?? 0} onChange={e => updateLineItem(idx, 'unit_price', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-cyan-500" />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tax Rate (%)</label>
                    <input type="number" step="0.01" min="0" max="100" value={invTaxRate} onChange={e => setInvTaxRate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</label>
                    <textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} rows={2}
                      placeholder="Payment terms, references…"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none" />
                  </div>
                </div>

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
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white transition-all">
                  {savingInvoice ? 'Saving…' : 'Save & Send'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Quote modal */}
      {quoteFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold text-white">Quote Job Request</h2>
                <p className="text-xs text-slate-400 mt-0.5">{quoteFor.contractor?.company_name}</p>
              </div>
              <button onClick={() => setQuoteFor(null)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
            </div>

            <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 text-xs space-y-1 mb-4">
              {quoteFor.material_name && <p><span className="text-slate-500">Material:</span> <span className="text-slate-200">{quoteFor.material_name}</span></p>}
              {quoteFor.quantity && <p><span className="text-slate-500">Quantity:</span> <span className="text-slate-200">{Number(quoteFor.quantity).toLocaleString()} {quoteFor.unit || 'tons'}</span></p>}
              {quoteFor.truck_type && <p><span className="text-slate-500">Truck Type:</span> <span className="text-slate-200">{quoteFor.truck_type}</span></p>}
            </div>

            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Offered Hourly Rate ($)</label>
            <input type="number" step="0.01" min="0" value={quoteRate} onChange={e => setQuoteRate(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 mb-3" />

            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Message <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
            <textarea value={quoteMessage} onChange={e => setQuoteMessage(e.target.value)} rows={3}
              placeholder="Availability, equipment notes, etc."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none mb-4" />

            <div className="flex space-x-2">
              <button onClick={() => setQuoteFor(null)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">
                Cancel
              </button>
              <button onClick={submitQuote} disabled={submittingQuote || !quoteRate}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-all">
                {submittingQuote ? 'Sending...' : 'Send Quote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
