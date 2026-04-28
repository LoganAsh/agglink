"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type Mode = 'login' | 'request';
type RequestedRole = 'contractor' | 'supplier' | 'trucking';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request Access state
  const [reqFullName, setReqFullName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqCompany, setReqCompany] = useState('');
  const [reqRole, setReqRole] = useState<RequestedRole>('contractor');
  const [reqNotes, setReqNotes] = useState('');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqSuccess, setReqSuccess] = useState(false);

  const router = useRouter();
  const supabase = typeof window !== 'undefined' ? createClient() : null;

  const handleLogin = async (e: React.FormEvent) => {
    if (!supabase) return;
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push('/dashboard'); }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    if (!supabase) return;
    e.preventDefault();
    setReqLoading(true);
    setReqError(null);
    const { error } = await supabase.from('signup_requests').insert([{
      full_name: reqFullName,
      email: reqEmail,
      company_name: reqCompany,
      requested_role: reqRole,
      notes: reqNotes || null,
    }]);
    if (error) {
      setReqError('Failed to submit request. Please try again.');
      console.error(error);
    } else {
      setReqSuccess(true);
    }
    setReqLoading(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setReqError(null);
    setReqSuccess(false);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-300 font-sans flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          AggLink<span className="text-orange-500">.</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400">The Utah Aggregate Logistics Network</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Mode toggle */}
        <div className="flex mb-4 bg-slate-800 border border-slate-700 rounded-xl p-1">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode('request')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'request' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Request Access
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10">

          {/*        SIGN IN        */}
          {mode === 'login' && (
            <form className="space-y-6" onSubmit={handleLogin}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email address</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none sm:text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none sm:text-sm transition-colors"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="flex w-full justify-center rounded-lg bg-orange-500 py-2 px-4 text-sm font-semibold text-white hover:bg-orange-600 transition-all disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}

          {/*        REQUEST ACCESS        */}
          {mode === 'request' && (
            <>
              {reqSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <i className="fa-solid fa-check text-emerald-400 text-lg"></i>
                  </div>
                  <h3 className="text-white font-semibold text-base">Request Submitted</h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">
                    Your access request has been sent to the AggLink administrator. You will receive an email once your account has been approved.
                  </p>
                  <button
                    onClick={() => switchMode('login')}
                    className="mt-4 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleRequestAccess}>
                  {reqError && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg">
                      {reqError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text" required value={reqFullName} onChange={(e) => setReqFullName(e.target.value)}
                      placeholder="John Smith"
                      className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none sm:text-sm transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                    <input
                      type="email" required value={reqEmail} onChange={(e) => setReqEmail(e.target.value)}
                      placeholder="john@company.com"
                      className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none sm:text-sm transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
                    <input
                      type="text" required value={reqCompany} onChange={(e) => setReqCompany(e.target.value)}
                      placeholder="Smith Excavation LLC"
                      className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none sm:text-sm transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Account Type</label>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setReqRole('contractor')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${reqRole === 'contractor' ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                      >
                        Contractor
                      </button>
                      <button
                        type="button"
                        onClick={() => setReqRole('supplier')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${reqRole === 'supplier' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                      >
                        Supplier / Pit
                      </button>
                      <button
                        type="button"
                        onClick={() => setReqRole('trucking')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${reqRole === 'trucking' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                      >
                        Trucking Company
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {reqRole === 'contractor'
                        ? 'Contractors can create projects, run estimates, and request quotes.'
                        : reqRole === 'trucking'
                        ? 'Trucking companies set hauling rates and respond to job requests from contractors.'
                        : 'Suppliers can list materials and respond to quote requests.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Additional Notes <span className="text-slate-500 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={reqNotes} onChange={(e) => setReqNotes(e.target.value)}
                      placeholder="Tell us a bit about your business..."
                      rows={2}
                      className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none sm:text-sm transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit" disabled={reqLoading}
                    className="flex w-full justify-center rounded-lg bg-orange-500 py-2 px-4 text-sm font-semibold text-white hover:bg-orange-600 transition-all disabled:opacity-50 mt-2"
                  >
                    {reqLoading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
