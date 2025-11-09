'use client';
import { useEffect, useMemo, useState } from 'react';

export type CsvFlight = {
  icao24: string; callsign: string; country: string; lastContact: number;
  lon: number|null; lat: number|null; baro_altitude: number|null;
  on_ground: boolean; velocity_ms: number|null; heading: number|null;
  geo_altitude: number|null; squawk: string|null;
};

export function useCsvStates() {
  const [flights, setFlights] = useState<CsvFlight[]>([]);
  const [ts, setTs] = useState<number>(0);
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/states', { cache: 'no-store' });
        const j = await r.json();
        if (!alive) return;
        setFlights(j.flights ?? []);
        setTs((j.time ?? 0) * 1000);
      } catch (e: any) {
        setError(e?.message ?? 'fetch_error');
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const active = flights.filter(f => !f.on_ground).length;
    return { active };
  }, [flights]);

  const topAirlines = useMemo(() => {
    const counts: Record<string, number> = {};
    flights.forEach(f => {
      const prefix = (f.callsign || '').replace(/[0-9].*$/, '').slice(0, 3) || 'UNK';
      counts[prefix] = (counts[prefix] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a,b)=>a+b,0) || 1;
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8)
      .map(([name,n]) => ({ name, count:n, percentAll: Math.round((n/total)*100) }));
    const sumTop = top.reduce((a,b)=>a+b.count,0) || 1;
    return top.map(t => ({ ...t, percentTop: Math.round((t.count/sumTop)*100) }));
  }, [flights]);

  const airportPerformance = useMemo(() => {
    const map = new Map<string,{onTime:number;delayed:number}>();
    flights.forEach(f=>{
      const key = (f.callsign || '').replace(/[0-9].*$/, '').slice(0,3) || 'UNK';
      if(!map.has(key)) map.set(key,{onTime:0,delayed:0});
      const acc = map.get(key)!;
      const onTime = (f.on_ground === true) || ((f.velocity_ms ?? 0) < 1 && (f.geo_altitude ?? 0) < 20);
      if(onTime) acc.onTime++; else acc.delayed++;
    });
    return Array.from(map,([airport,v])=>({airport,...v})).slice(0,10);
  }, [flights]);

  const last7Airborne = useMemo(() => {
    return flights
      .filter(f=>!f.on_ground && f.lat!=null && f.lon!=null)
      .sort((a,b)=>b.lastContact - a.lastContact)
      .slice(0,7);
  }, [flights]);

  const traffic = useMemo(() => {
    if (flights.length === 0) return [];
    const bins = 60;
    const step = Math.ceil(flights.length / bins);
    const data = [];
    for (let i = 0; i < flights.length; i += step) {
      const slice = flights.slice(i, i + step);
      const airborne = slice.filter(f => !f.on_ground).length;
      data.push({
        time: `${Math.min(i + step, flights.length)}/${flights.length}`,
        flights: airborne
      });
    }
    return data;
  }, [flights]);

  return {
    flights, ts, kpis, topAirlines, airportPerformance,
    currentFlight: last7Airborne[0] ?? null,
    last7Airborne,
    traffic,
    loading, error
  };
}
