"use client";
import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-hidden relative">

      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-orange-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-blue-500/15 rounded-full blur-[120px]" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Top navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 max-w-7xl mx-auto">
        <div className="text-2xl font-bold tracking-tight">
          AggLink<span className="text-orange-500">.</span>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <Link href="/login" className="text-sm text-slate-300 hover:text-white px-4 py-2 transition-colors">
            Sign In
          </Link>
          <Link href="/login?signup=true" className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white px-4 py-2 rounded-lg shadow-lg shadow-orange-500/20 transition-all">
            Request Access
          </Link>
        </div>
      </nav>

      {/* Hero section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-24 md:pb-32">
        <div className="max-w-3xl">

          {/* Pill badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Now in Utah</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Smart freight logistics for the{' '}
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">aggregate industry</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed mb-10 max-w-2xl">
            Connect contractors with material pits, dump sites, and trucking companies in one platform. Real-time pricing, route optimization, and end-to-end logistics built for civil construction.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/login?signup=true"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white font-semibold shadow-xl shadow-orange-500/30 transition-all hover:scale-[1.02] hover:-translate-y-0.5">
              Request Access
              <i className="fa-solid fa-arrow-right ml-2 text-sm"></i>
            </Link>
            <Link href="/login"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold backdrop-blur-sm transition-all">
              Sign In
            </Link>
          </div>

        </div>
      </section>

      {/* Feature cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="group relative bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-orange-500/30">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 flex items-center justify-center mb-4">
              <i className="fa-solid fa-route text-orange-400"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">Route Optimization</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time freight calculations using Google Maps routing. Compare pits, trucking fleets, and dump sites instantly.
            </p>
          </div>

          <div className="group relative bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-purple-500/30">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center mb-4">
              <i className="fa-solid fa-handshake text-purple-400"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">Tiered Pricing</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Build relationships with suppliers. Lock in contractor and customer pricing tiers with the partners you trust.
            </p>
          </div>

          <div className="group relative bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-cyan-500/30">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center mb-4">
              <i className="fa-solid fa-file-invoice-dollar text-cyan-400"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">Integrated Invoicing</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Generate invoices from accepted quotes. Stripe-powered payments. PDF downloads. All in one place.
            </p>
          </div>

        </div>
      </section>

      {/* Built-for section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-32">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-3">Built For</p>
          <h2 className="text-3xl md:text-4xl font-bold">Three sides of the industry, one platform</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/20 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <i className="fa-solid fa-hard-hat text-orange-400 text-xl"></i>
              <span className="text-lg font-semibold">Contractors</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start"><i className="fa-solid fa-check text-orange-400 mr-2 mt-1 text-xs"></i><span>Source materials and dump sites instantly</span></li>
              <li className="flex items-start"><i className="fa-solid fa-check text-orange-400 mr-2 mt-1 text-xs"></i><span>Compare routes and freight costs</span></li>
              <li className="flex items-start"><i className="fa-solid fa-check text-orange-400 mr-2 mt-1 text-xs"></i><span>Manage projects from estimate to invoice</span></li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-purple-500/5 to-transparent border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <i className="fa-solid fa-mountain text-purple-400 text-xl"></i>
              <span className="text-lg font-semibold">Suppliers</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start"><i className="fa-solid fa-check text-purple-400 mr-2 mt-1 text-xs"></i><span>List materials with tiered pricing</span></li>
              <li className="flex items-start"><i className="fa-solid fa-check text-purple-400 mr-2 mt-1 text-xs"></i><span>Manage customer relationships</span></li>
              <li className="flex items-start"><i className="fa-solid fa-check text-purple-400 mr-2 mt-1 text-xs"></i><span>Issue invoices and accept payments</span></li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/5 to-transparent border border-cyan-500/20 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <i className="fa-solid fa-truck text-cyan-400 text-xl"></i>
              <span className="text-lg font-semibold">Trucking</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start"><i className="fa-solid fa-check text-cyan-400 mr-2 mt-1 text-xs"></i><span>Publish hourly rates by truck type</span></li>
              <li className="flex items-start"><i className="fa-solid fa-check text-cyan-400 mr-2 mt-1 text-xs"></i><span>Respond to job-specific quote requests</span></li>
              <li className="flex items-start"><i className="fa-solid fa-check text-cyan-400 mr-2 mt-1 text-xs"></i><span>Bill contractors directly</span></li>
            </ul>
          </div>

        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 pb-24">
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20 rounded-3xl p-10 md:p-16 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Ready to streamline your logistics?</h2>
            <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
              Join the platform built specifically for Utah&apos;s aggregate industry.
            </p>
            <Link href="/login?signup=true"
              className="inline-flex items-center px-7 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white font-semibold text-lg shadow-2xl shadow-orange-500/40 transition-all hover:scale-[1.02]">
              Request Access
              <i className="fa-solid fa-arrow-right ml-2"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-8 border-t border-white/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            <span className="font-bold text-white">AggLink<span className="text-orange-500">.</span></span>
            <span className="ml-2">Aggregate Logistics Platform</span>
          </div>
          <div className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} AggLink. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
