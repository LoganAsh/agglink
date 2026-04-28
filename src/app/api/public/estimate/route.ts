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

    // 2. Fetch Materials (with all tier price columns + facility owner_id)
    const { data: allForImport, error } = await supabase.from('materials').select(`
      price_per_ton, price_per_ton_contractor, price_per_ton_customer,
      price_per_cy, price_per_cy_contractor, price_per_cy_customer,
      price_10w_load, price_sd_load, name, stock_status,
      facility:facilities(id, name, address, latitude, longitude, owner_id, accepts_quote_requests)
    `).eq('is_import', isImport);

    const availableMaterials = error || !allForImport
      ? []
      : (materials.length > 0
          ? allForImport.filter((m: any) => materials.includes(m.name))
          : allForImport);

    if (!availableMaterials || availableMaterials.length === 0) {
      return NextResponse.json({ success: false, error: 'No facilities found.', data: [] }, { status: 200 });
    }

    // 2b. Network filter — only include facilities the contractor has added to their network.
    // Also load the contractor's per-supplier tier so we can pick the right price column.
    const userId = user.id;
    const { data: network } = await supabase
      .from('contractor_facility_network')
      .select('facility_id')
      .eq('contractor_id', userId);
    const networkFacilityIds: string[] = network?.map((n: any) => n.facility_id) || [];

    const { data: rels } = await supabase
      .from('supplier_relationships')
      .select('supplier_id, tier')
      .eq('contractor_id', userId);
    const relationships: any[] = rels || [];

    const networkFiltered = availableMaterials.filter((m: any) => {
      const fac = Array.isArray(m.facility) ? m.facility[0] : m.facility;
      return networkFacilityIds.includes(fac?.id);
    });

    if (networkFiltered.length === 0) {
      return NextResponse.json({ success: true, jobLat, jobLon, data: [], grouped: {} });
    }

    // 3. Build truck list — prefer rates from the contractor's trucking network
    //    when available, falling back to platform defaults per truck type.
    let networkTruckerRates: any[] = [];
    {
      const { data: truckerNetwork } = await supabase
        .from('contractor_trucking_network')
        .select('trucker_id')
        .eq('contractor_id', userId);
      const truckerIds = truckerNetwork?.map((t: any) => t.trucker_id) || [];
      if (truckerIds.length > 0) {
        const { data: rs } = await supabase
          .from('trucking_company_rates')
          .select('*, trucker:profiles!trucking_company_rates_trucker_id_fkey(id, company_name)')
          .in('trucker_id', truckerIds)
          .eq('active', true);
        networkTruckerRates = rs || [];
      }
    }

    const HARDCODED_TRUCKS = [
      { type: 'Side Dump',   rate: 155, cap: isImport ? 25 : 12, minHours: 2.0 },
      { type: '10-Wheeler',  rate: 135, cap: isImport ? 15 : 8,  minHours: 2.0 },
    ];

    const getTruckConfig = (tt: string) => {
      const matching = networkTruckerRates.filter(r => r.truck_type === tt);
      if (matching.length > 0) {
        const cheapest = matching.reduce((min, r) => r.hourly_rate < min.hourly_rate ? r : min);
        return {
          type: tt,
          rate: Number(cheapest.hourly_rate),
          cap: isImport ? Number(cheapest.capacity_tons || 25) : Number(cheapest.capacity_cy || 12),
          minHours: Number(cheapest.minimum_hours_per_day || 2.0),
          truckerName: cheapest.trucker?.company_name as string | null,
          truckerId: cheapest.trucker_id as string | null,
        };
      }
      const hardcoded = HARDCODED_TRUCKS.find(t => t.type === tt);
      if (hardcoded) return { ...hardcoded, truckerName: null, truckerId: null };
      return null;
    };

    const allTrucks = HARDCODED_TRUCKS.map(t => getTruckConfig(t.type)).filter(Boolean) as any[];
    const trucks = truckType
      ? allTrucks.filter(t => t.type === truckType)
      : allTrucks;
    const activeTrucks = trucks.length > 0 ? trucks : allTrucks;

    const loadTimeHr    = 15 / 60.0;
    const unloadTimeHr  = (isImport ? 8 : 10) / 60.0;
    const loadUnloadHr  = loadTimeHr + unloadTimeHr;
    const apiKey        = process.env.ORS_API_KEY;

    // 4. Fetch custom quotes (responded with offered_price) and declined quotes
    let customQuotes: any[] = [];
    if (projectId) {
      const { data: quotes } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['pending', 'responded', 'declined'])
        .order('created_at', { ascending: false });
      if (quotes) customQuotes = quotes;
    }

    // 5. Process routing & costs     group results by material name
    const resultsByMaterial: Record<string, any[]> = {};

    for (const mat of networkFiltered) {
      const fac: any = mat.facility;
      if (!fac?.latitude || !fac?.longitude) continue;

      // Tier with this facility's owning supplier (default 'public')
      const facOwnerId = fac?.owner_id;
      const rel = relationships.find(r => r.supplier_id === facOwnerId);
      const tier = rel?.tier || 'public';

      const rawDist = haversineDistance(jobLat, jobLon, fac.latitude, fac.longitude);
      let dist = rawDist;
      let oneWayTimeHr = 0;

      if (rawDist <= 30.0 && apiKey) {
        try {
          const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${jobLon},${jobLat}&end=${fac.longitude},${fac.latitude}&radiuses=-1|-1`;
          const orsRes = await fetch(orsUrl);
          if (orsRes.ok) {
            const orsData = await orsRes.json();
            const summary = orsData.features[0].properties.summary;
            dist = summary.distance / 1609.34;
            const penalty = dist > 10.0 ? 1.10 : 1.20;
            oneWayTimeHr = (summary.duration / 3600.0) * penalty;
          } else throw new Error("ORS Failed");
        } catch {
          dist = rawDist < 10.0 ? rawDist * 1.5 : rawDist * 1.3;
          oneWayTimeHr = dist / 30.0;
        }
      } else {
        dist = rawDist < 10.0 ? rawDist * 1.5 : rawDist * 1.3;
        oneWayTimeHr = dist / 30.0;
      }

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

        const minHoursForTruck = Number(truck.minHours ?? 2.0);
        let fullShiftHrs  = roundHalfHr(maxTripsPerDay * cycleTimeHr);
        if (fullShifts > 0 && fullShiftHrs < minHoursForTruck) fullShiftHrs = minHoursForTruck;
        let leftoverHrs   = leftoverTrips > 0 ? roundHalfHr(leftoverTrips * cycleTimeHr) : 0.0;
        if (leftoverHrs > 0 && leftoverHrs < minHoursForTruck) leftoverHrs = minHoursForTruck;

        const totalBilledHrs    = (fullShifts * fullShiftHrs) + leftoverHrs;
        const totalTruckingCost = totalBilledHrs * truck.rate;

        let materialCost  = 0;
        let basePriceLabel = 0;
        let isCustomQuote  = false;
        let isDeclined     = false;
        let isQuotePending = false;

        // customQuotes is ordered by created_at desc — first match wins
        const latestQuote = customQuotes.find(q =>
          q.facility_id === fac.id && q.material_name === mat.name
        );
        const respondedQuote = latestQuote?.status === 'responded' && latestQuote?.offered_price ? latestQuote : null;
        if (latestQuote?.status === 'declined') isDeclined = true;
        if (latestQuote?.status === 'pending') isQuotePending = true;

        if (respondedQuote) {
          materialCost   = respondedQuote.offered_price * qty;
          basePriceLabel = respondedQuote.offered_price;
          isCustomQuote  = true;
        } else if (isImport) {
          let priceField = 'price_per_ton';
          if (tier === 'contractor' && mat.price_per_ton_contractor > 0) priceField = 'price_per_ton_contractor';
          else if (tier === 'customer' && mat.price_per_ton_customer > 0) priceField = 'price_per_ton_customer';
          basePriceLabel = (mat as any)[priceField];
          materialCost   = basePriceLabel * qty;
        } else {
          const dumpFee = truck.type === '10-Wheeler' ? mat.price_10w_load : mat.price_sd_load;
          if (dumpFee > 0) {
            materialCost   = trips * dumpFee;
            basePriceLabel = dumpFee;
          } else {
            let priceField = 'price_per_cy';
            if (tier === 'contractor' && mat.price_per_cy_contractor > 0) priceField = 'price_per_cy_contractor';
            else if (tier === 'customer' && mat.price_per_cy_customer > 0) priceField = 'price_per_cy_customer';
            basePriceLabel = (mat as any)[priceField];
            materialCost   = basePriceLabel * qty;
          }
        }

        const totalCost = materialCost + totalTruckingCost;
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
          isDeclined,
          isQuotePending,
          stockStatus:  mat.stock_status || 'in_stock',
          acceptsQuotes: fac.accepts_quote_requests !== false,
          pricingTier:  tier,
          supplierId:   facOwnerId,
          truckerName:  truck.truckerName,
          truckerId:    truck.truckerId,
        };

        if (!resultsByMaterial[mat.name]) resultsByMaterial[mat.name] = [];
        resultsByMaterial[mat.name].push(entry);
      }
    }

    // Sort each material group by cheapest total, take top 5
    const groupedResults: Record<string, any[]> = {};
    for (const [matName, entries] of Object.entries(resultsByMaterial)) {
      groupedResults[matName] = entries
        .sort((a, b) => a.totalPerUnit - b.totalPerUnit)
        .slice(0, 5);
    }

    // Flat results for backwards compatibility (single-material requests)
    const flatResults = Object.values(groupedResults).flat()
      .sort((a, b) => a.totalPerUnit - b.totalPerUnit);

    return NextResponse.json({
      success:  true,
      jobLat,
      jobLon,
      data:     flatResults.slice(0, 10),   // legacy flat list
      grouped:  groupedResults,             // new: keyed by material name
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
