/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const DEFAULT_AUTO_DECLINE = 'Auto-declined: requested quantity is below this material’s minimum order threshold.';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      facilityId,        // legacy single-facility form
      facilityIds,       // new array form
      materialName,
      quantity,
      address,
      projectId,
      startMonth,
      startYear,
      bidDate,
      message,
    } = body;

    const ids: string[] = Array.isArray(facilityIds) && facilityIds.length > 0
      ? facilityIds
      : (facilityId ? [facilityId] : []);

    if (ids.length === 0 || !materialName) {
      return NextResponse.json({ error: 'Missing facilityIds or materialName' }, { status: 400 });
    }

    // Service-role client to read suppliers' auto-decline thresholds and messages
    // (contractors can't read other profiles' fields under typical RLS).
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminClient = serviceKey
      ? createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
      : null;
    const lookupClient = adminClient ?? supabase;

    // Look up auto_decline_below for each (facility_id, material_name)
    const { data: matRows } = await lookupClient
      .from('materials')
      .select('facility_id, auto_decline_below')
      .in('facility_id', ids)
      .eq('name', materialName);
    const thresholdByFacility: Record<string, number | null> = {};
    for (const m of (matRows || [])) {
      thresholdByFacility[m.facility_id] = m.auto_decline_below ?? null;
    }

    // Look up each facility's owner -> their auto_decline_message
    const { data: facRows } = await lookupClient
      .from('facilities')
      .select('id, owner_id')
      .in('id', ids);
    const ownerByFacility: Record<string, string | null> = {};
    const ownerIds: string[] = [];
    for (const f of (facRows || [])) {
      ownerByFacility[f.id] = f.owner_id ?? null;
      if (f.owner_id) ownerIds.push(f.owner_id);
    }

    const messageByOwner: Record<string, string | null> = {};
    if (ownerIds.length > 0) {
      const { data: profRows } = await lookupClient
        .from('profiles')
        .select('id, auto_decline_message')
        .in('id', ownerIds);
      for (const p of (profRows || [])) {
        messageByOwner[p.id] = p.auto_decline_message ?? null;
      }
    }

    const qty = Number(quantity || 0);

    const rows = ids.map(fid => {
      const threshold = thresholdByFacility[fid];
      const isAutoDecline = threshold != null && qty > 0 && qty < threshold;
      const ownerId = ownerByFacility[fid];
      const ownerMsg = ownerId ? messageByOwner[ownerId] : null;
      return {
        contractor_id: user.id,
        facility_id: fid,
        material_name: materialName,
        quantity,
        job_site_address: address,
        project_id: projectId,
        status: isAutoDecline ? 'declined' : 'pending',
        start_month: startMonth || null,
        start_year: startYear || null,
        bid_date: bidDate || null,
        message: message || null,
        supplier_message: isAutoDecline ? (ownerMsg || DEFAULT_AUTO_DECLINE) : null,
      };
    });

    const { error } = await supabase.from('quote_requests').insert(rows);

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const autoDeclinedCount = rows.filter(r => r.status === 'declined').length;
    return NextResponse.json({
      success: true,
      count: rows.length,
      autoDeclined: autoDeclinedCount,
      results: rows.map(r => ({ facilityId: r.facility_id, status: r.status, supplierMessage: r.supplier_message })),
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
