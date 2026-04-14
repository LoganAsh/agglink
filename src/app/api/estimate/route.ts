import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Ensure the user is authenticated to use the API
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobType, lat, lon, qty, materials } = body;

    if (!lat || !lon || !qty) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isImport = jobType === "Import (Delivery)";

    // Query the database for facilities that offer the requested materials
    let query = supabase
      .from('materials')
      .select(`
        price_per_ton,
        price_per_cy,
        price_10w_load,
        price_sd_load,
        name,
        facility:facilities(id, name, address, latitude, longitude)
      `)
      .eq('is_import', isImport);

    if (materials && materials.length > 0) {
      query = query.in('name', materials);
    }

    const { data: availableMaterials, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch facilities' }, { status: 500 });
    }

    if (!availableMaterials || availableMaterials.length === 0) {
      return NextResponse.json({ error: 'No facilities found offering the selected materials.' }, { status: 404 });
    }

    // Process the results to group by facility
    const results = availableMaterials.map(mat => {
      // In a real scenario, we would run the OpenRouteService API here for each facility
      // For this step, we will just return the raw data so the frontend can calculate
      return {
        facilityName: mat.facility.name,
        materialName: mat.name,
        lat: mat.facility.latitude,
        lon: mat.facility.longitude,
        pricePerTon: mat.price_per_ton,
        pricePerCy: mat.price_per_cy,
        price10W: mat.price_10w_load,
        priceSD: mat.price_sd_load
      };
    });

    return NextResponse.json({ success: true, count: results.length, data: results });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
