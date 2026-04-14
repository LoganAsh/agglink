/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { jobType = "Import (Delivery)", address, qty = 1500, materials = [] } = body;

    if (!address || !qty) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Geocode Address
    // Append Utah if not present to help Nominatim locate it accurately
    let searchAddress = address;
    if (!searchAddress.toLowerCase().includes('utah') && !searchAddress.toLowerCase().includes(', ut')) {
      searchAddress += ', Utah';
    }
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchAddress)}&format=json&limit=1`;
    const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'AggLink/1.0' }});
    const geoData = await geoRes.json();
    if (!geoData || geoData.length === 0) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }
    const jobLat = parseFloat(geoData[0].lat);
    const jobLon = parseFloat(geoData[0].lon);

    const isImport = jobType === "Import (Delivery)";

    // 2. Fetch Facilities
    let query = supabase.from('materials').select(`
        price_per_ton, price_per_cy, price_10w_load, price_sd_load, name,
        facility:facilities(id, name, address, latitude, longitude)
      `).eq('is_import', isImport);

    if (materials.length > 0) {
      query = query.in('name', materials);
    }

    const { data: availableMaterials, error } = await query;
    if (error || !availableMaterials || availableMaterials.length === 0) {
      return NextResponse.json({ error: 'No facilities found.' }, { status: 404 });
    }

    // Trucks configuration
    const trucks = [
      { type: 'Side Dump', rate: 155, cap: isImport ? 25 : 12 },
      { type: '10-Wheeler', rate: 135, cap: isImport ? 15 : 8 }
    ];

    const loadTimeHr = 15 / 60.0;
    const unloadTimeHr = (isImport ? 8 : 10) / 60.0;
    const loadUnloadHr = loadTimeHr + unloadTimeHr;
    const minHours = 2.0;

    const apiKey = process.env.ORS_API_KEY;
    const results: any[] = [];

    // 3. Process Routing & Costs
    for (const mat of availableMaterials) {
      const fac: any = mat.facility;
      const rawDist = haversineDistance(jobLat, jobLon, fac.latitude, fac.longitude);
      
      let dist = rawDist;
      let oneWayTimeHr = 0;

      if (rawDist <= 30.0 && apiKey) {
        try {
          const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${jobLon},${jobLat}&end=${fac.longitude},${fac.latitude}&radiuses=-1|-1`;
          const orsRes = await fetch(orsUrl, {});
          if (orsRes.ok) {
            const orsData = await orsRes.json();
            const summary = orsData.features[0].properties.summary;
            dist = summary.distance / 1609.34;
            const penalty = dist > 10.0 ? 1.10 : 1.20;
            oneWayTimeHr = (summary.duration / 3600.0) * penalty;
          } else {
            throw new Error("ORS Failed");
          }
        } catch {
          dist = rawDist < 10.0 ? rawDist * 1.5 : rawDist * 1.3;
          oneWayTimeHr = dist / 30.0;
        }
      } else {
        dist = rawDist < 10.0 ? rawDist * 1.5 : rawDist * 1.3;
        oneWayTimeHr = dist / 30.0;
      }

      const travelTimeHr = oneWayTimeHr * 2;
      const rawCycleHr = travelTimeHr + loadUnloadHr;

      for (const truck of trucks) {
        const eff = truck.type === '10-Wheeler' ? 1.0 : 0.95;
        const cycleTimeHr = rawCycleHr / eff;
        
        const trips = Math.ceil(qty / truck.cap);
        let maxTripsPerDay = Math.floor(8.0 / cycleTimeHr);
        if (maxTripsPerDay < 1) maxTripsPerDay = 1;

        const fullShifts = Math.floor(trips / maxTripsPerDay);
        const leftoverTrips = trips % maxTripsPerDay;

        const roundHalfHr = (hrs: number) => Math.ceil(hrs * 2) / 2.0;

        let fullShiftHrs = roundHalfHr(maxTripsPerDay * cycleTimeHr);
        if (fullShifts > 0 && fullShiftHrs < minHours) fullShiftHrs = minHours;

        let leftoverHrs = leftoverTrips > 0 ? roundHalfHr(leftoverTrips * cycleTimeHr) : 0.0;
        if (leftoverHrs > 0 && leftoverHrs < minHours) leftoverHrs = minHours;

        const totalBilledHrs = (fullShifts * fullShiftHrs) + leftoverHrs;
        const totalTruckingCost = totalBilledHrs * truck.rate;
        
        let materialCost = 0;
        let basePriceLabel = 0;

        if (isImport) {
          materialCost = mat.price_per_ton * qty;
          basePriceLabel = mat.price_per_ton;
        } else {
          // Per-load pricing vs Per-CY pricing
          const dumpFee = truck.type === '10-Wheeler' ? mat.price_10w_load : mat.price_sd_load;
          if (dumpFee > 0) {
            materialCost = trips * dumpFee;
            basePriceLabel = dumpFee; // Store as raw number, front-end formats it
          } else {
            materialCost = mat.price_per_cy * qty;
            basePriceLabel = mat.price_per_cy;
          }
        }

        const totalCost = materialCost + totalTruckingCost;

        results.push({
          supplier: fac.name,
          truckFleet: truck.type,
          cycle: Math.round(cycleTimeHr * 60),
          basePrice: basePriceLabel,
          frtPerUnit: totalTruckingCost / qty,
          totalPerUnit: totalCost / qty,
          totalCost: totalCost
        });
      }
    }

    // Sort by cheapest total per unit
    results.sort((a, b) => a.totalPerUnit - b.totalPerUnit);

    return NextResponse.json({ success: true, data: results.slice(0, 10) });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
