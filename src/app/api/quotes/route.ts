/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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
      message,
    } = body;

    const ids: string[] = Array.isArray(facilityIds) && facilityIds.length > 0
      ? facilityIds
      : (facilityId ? [facilityId] : []);

    if (ids.length === 0 || !materialName) {
      return NextResponse.json({ error: 'Missing facilityIds or materialName' }, { status: 400 });
    }

    const rows = ids.map(fid => ({
      contractor_id: user.id,
      facility_id: fid,
      material_name: materialName,
      quantity,
      job_site_address: address,
      project_id: projectId,
      status: 'pending',
      start_month: startMonth || null,
      start_year: startYear || null,
      message: message || null,
    }));

    const { error } = await supabase.from('quote_requests').insert(rows);

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
