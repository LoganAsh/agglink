/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import LogoutButton from '@/components/LogoutButton';

export default function TruckingView({
  profileId,
  profile,
  truckTypes = [],
  rates: initialRates = [],
  networkLinks = [],
  jobRequests: initialJobRequests = [],
}: {
  profileId: string;
  profile: any;
  truckTypes?: any[];
  rates?: any[];
  networkLinks?: any[];
  jobRequests?: any[];
}) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'rates' | 'customers' | 'jobs'>('rates');
  const [rates, setRates] = useState<any[]>(initialRates);
  const [jobRequests, setJobRequests] = useState<any[]>(initialJobRequests);
  const [savingTruckType, setSavingTruckType] = useState<string | null>(null);
  const [jobsFilter, setJobsFilter] = useState<'all' | 'pending' | 'quoted' | 'accepted' | 'declined'>('all');
  const [quoteFor, setQuoteFor] = useState<any | null>(null);
  const [quoteRate, setQuoteRate] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);

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
              {activeTab === 'rates' ? 'My Rates' : activeTab === 'customers' ? 'Customers' : 'Job Requests'}
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

        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800">
          <div className="flex items-center justify-around px-2 py-2">
            <button onClick={() => setActiveTab('rates')}
              className={`flex flex-col items-center space-y-1 px-4 py-1.5 rounded-lg transition-all ${activeTab === 'rates' ? 'text-cyan-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-dollar-sign text-lg"></i>
              <span className="text-[10px] font-medium">Rates</span>
            </button>
            <button onClick={() => setActiveTab('customers')}
              className={`flex flex-col items-center space-y-1 px-4 py-1.5 rounded-lg transition-all ${activeTab === 'customers' ? 'text-cyan-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-users text-lg"></i>
              <span className="text-[10px] font-medium">Customers</span>
            </button>
            <button onClick={() => setActiveTab('jobs')}
              className={`flex flex-col items-center space-y-1 px-4 py-1.5 rounded-lg transition-all relative ${activeTab === 'jobs' ? 'text-cyan-400' : 'text-slate-500'}`}>
              <i className="fa-solid fa-truck-fast text-lg"></i>
              {pendingJobCount > 0 && <span className="absolute top-0 right-1 bg-cyan-500 text-white text-[9px] font-bold px-1 rounded-full">{pendingJobCount}</span>}
              <span className="text-[10px] font-medium">Jobs</span>
            </button>
          </div>
        </div>

      </main>

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
