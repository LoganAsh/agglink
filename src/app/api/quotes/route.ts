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
    const { facilityId, materialName, quantity, address } = body;

    const { error } = await supabase
      .from('quote_requests')
      .insert([
        {
          contractor_id: user.id,
          facility_id: facilityId,
          material_name: materialName,
          quantity: quantity,
          job_site_address: address,
          status: 'pending'
        }
      ]);

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: 'Failed to send quote request' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
