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

    const body = await request.json();
    const {
      jobType = "Import (Delivery)",
      address,
      qty = 1500,
      materials = [],       // array of material names to compare
      truckType,            // optional: filter to specific truck type
      projectId
    } = body;

    if (!address || !qty) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Geocode Address
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

    // 2. Fetch Materials
    let query = supabase.from('materials').select(`
      price_per_ton, price_per_cy, price_10w_load, price_sd_load, name,
      facility:facilities(id, name, address, latitude, longitude)
    `).eq('is_import', isImport);

    if (materials.length > 0) {
      query = query.in('name', materials);
    }

    console.log('QUERY_MATERIALS:', JSON.stringify(materials));
    console.log('QUERY_IS_IMPORT:', isImport);
    console.log('QUERY_JOB_TYPE:', jobType);
    const { data: availableMaterials, error } = await query;
    console.log('Query result count:', availableMaterials?.length, 'error:', error?.message);
    if (error || !availableMaterials || availableMaterials.length === 0) {
      console.log('No materials found for:', JSON.stringify(materials), 'jobType:', jobType, 'isImport:', isImport, 'is_import filter:', isImport);
      return NextResponse.json({ success: true, jobLat: 0, jobLon: 0, data: [], grouped: {} });
    }

    // 3. Build truck list     filter by truckType if specified
    const allTrucks = [
      { type: 'Side Dump',   rate: 155, cap: isImport ? 25 : 12 },
      { type: '10-Wheeler',    rate: 135, cap: isImport ? 15 : 8  },
    ];
    const trucks = truckType
      ? allTrucks.filter(t => t.type === truckType)
      : allTrucks;

    // If truckType was specified but not found, fall back to all trucks
    const activeTrucks = trucks.length > 0 ? trucks : allTrucks;

    const loadTimeHr    = 15 / 60.0;
    const unloadTimeHr  = (isImport ? 8 : 10) / 60.0;
    const loadUnloadHr  = loadTimeHr + unloadTimeHr;
    const minHours      = 2.0;

    // 4. Fetch custom quotes
    let customQuotes: any[] = [];
    if (projectId) {
      const { data: quotes } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'responded');
      if (quotes) customQuotes = quotes;
    }

    // 5. Process routing & costs     group results by material name
    const resultsByMaterial: Record<string, any[]> = {};

    // Pre-filter materials with valid facility coords
    const validMaterials: { mat: any; fac: any }[] = [];
    for (const mat of availableMaterials) {
      console.log('Processing material:', mat.name, 'facility:', mat.facility);
      const fac: any = Array.isArray(mat.facility) ? mat.facility[0] : mat.facility;
      if (!fac?.latitude || !fac?.longitude) {
        console.log('Skipping material, no facility coords:', mat.name, mat.facility);
        continue;
      }
      validMaterials.push({ mat, fac });
    }

    // Run all routing calls in parallel using Google Distance Matrix
    const routings = await Promise.all(validMaterials.map(async ({ fac }) => {
      const rawDist = haversineDistance(jobLat, jobLon, fac.latitude, fac.longitude);
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
      let dist = rawDist;
      let oneWayTimeHr = 0;

      if (googleApiKey) {
        try {
          const matrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${jobLat},${jobLon}&destinations=${fac.latitude},${fac.longitude}&mode=driving&units=imperial&key=${googleApiKey}`;
          const matrixRes = await fetch(matrixUrl);
          if (matrixRes.ok) {
            const matrixData = await matrixRes.json();
            const element = matrixData.rows?.[0]?.elements?.[0];
            if (element?.status === 'OK') {
              dist = element.distance.value / 1609.34;
              oneWayTimeHr = (element.duration.value / 3600) * 1.1;
            } else {
              throw new Error('Matrix element not OK: ' + element?.status);
            }
          } else {
            throw new Error('Google API request failed');
          }
        } catch (err) {
          console.log('Google routing failed, using haversine fallback:', err);
          dist = rawDist < 10.0 ? rawDist * 1.5 : rawDist * 1.3;
          oneWayTimeHr = dist / 30.0;
        }
      } else {
        dist = rawDist < 10.0 ? rawDist * 1.5 : rawDist * 1.3;
        oneWayTimeHr = dist / 30.0;
      }

      return { dist, oneWayTimeHr };
    }));

    for (let i = 0; i < validMaterials.length; i++) {
      const { mat, fac } = validMaterials[i];
      try {
        const { oneWayTimeHr } = routings[i];
        const travelTimeHr = oneWayTimeHr * 2;
        const rawCycleHr   = travelTimeHr + loadUnloadHr;

        for (const truck of activeTrucks) {
          const eff         = truck.type === '10-Wheeler' ? 1.0 : 0.95;
          const cycleTimeHr = rawCycleHr / eff;
          const trips       = Math.ceil(qty / truck.cap);
          let maxTripsPerDay = Math.floor(8.0 / cycleTimeHr);
          if (maxTripsPerDay < 1) maxTripsPerDay = 1;

          const fullShifts    = Math.floor(trips / maxTripsPerDay);
          const leftoverTrips = trips % maxTripsPerDay;

          const roundHalfHr = (hrs: number) => Math.ceil(hrs * 2) / 2.0;

          let fullShiftHrs  = roundHalfHr(maxTripsPerDay * cycleTimeHr);
          if (fullShifts > 0 && fullShiftHrs < minHours) fullShiftHrs = minHours;
          let leftoverHrs   = leftoverTrips > 0 ? roundHalfHr(leftoverTrips * cycleTimeHr) : 0.0;
          if (leftoverHrs > 0 && leftoverHrs < minHours) leftoverHrs = minHours;

          const totalBilledHrs    = (fullShifts * fullShiftHrs) + leftoverHrs;
          const totalTruckingCost = totalBilledHrs * truck.rate;

          let materialCost  = 0;
          let basePriceLabel = 0;
          let isCustomQuote  = false;

          const customQuote = customQuotes.find(q =>
            q.facility_id === fac.id && q.material_name === mat.name
          );

          if (customQuote?.offered_price) {
            materialCost   = customQuote.offered_price * qty;
            basePriceLabel = customQuote.offered_price;
            isCustomQuote  = true;
          } else if (isImport) {
            materialCost   = mat.price_per_ton * qty;
            basePriceLabel = mat.price_per_ton;
          } else {
            const dumpFee = truck.type === '10-Wheeler' ? mat.price_10w_load : mat.price_sd_load;
            if (dumpFee > 0) {
              materialCost   = trips * dumpFee;
              basePriceLabel = dumpFee;
            } else {
              materialCost   = mat.price_per_cy * qty;
              basePriceLabel = mat.price_per_cy;
            }
          }

          const totalCost = materialCost + totalTruckingCost;
          console.log('Material calc:', mat.name, truck.type, { basePriceLabel, materialCost, totalTruckingCost, totalCost });
          if (!isFinite(totalCost) || !isFinite(basePriceLabel) || basePriceLabel === 0) {
            console.log('Skipping invalid result:', mat.name, truck.type, { basePriceLabel, totalCost });
            continue;
          }
          const entry = {
            facilityId:   fac.id,
            supplier:     fac.name,
            materialName: mat.name,
            truckFleet:   truck.type,
            cycle:        Math.round(cycleTimeHr * 60),
            basePrice:    basePriceLabel,
            lat:          fac.latitude,
            lon:          fac.longitude,
            frtPerUnit:   totalTruckingCost / qty,
            totalPerUnit: totalCost / qty,
            totalCost:    totalCost,
            isCustomQuote,
          };

          if (!resultsByMaterial[mat.name]) resultsByMaterial[mat.name] = [];
          resultsByMaterial[mat.name].push(entry);
        }
      } catch (matError) {
        console.error('Error processing material:', mat.name, matError);
        continue;
      }
    }

    const flatResults = Object.values(resultsByMaterial).flat()
      .sort((a, b) => a.totalPerUnit - b.totalPerUnit)
      .slice(0, 5);

    if (flatResults.length === 0) {
      return NextResponse.json({ success: true, jobLat, jobLon, data: [], grouped: {} });
    }

    return NextResponse.json({
      success:  true,
      jobLat,
      jobLon,
      data:     flatResults,
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
