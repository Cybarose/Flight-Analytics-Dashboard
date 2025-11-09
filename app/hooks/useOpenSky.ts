'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

export type OpenSkyFlight = {
  icao24: string; callsign: string; country: string; lastContact: number;
  lon: number | null; lat: number | null; baro_altitude: number | null;
  on_ground: boolean; velocity_ms: number | null; heading: number | null;
  geo_altitude: number | null; squawk: string | null;
};

function rollingAvg(nums: number[], w = 3) {
  if (w <= 1 || nums.length <= 2) return nums;
  const out: number[] = [];
  for (let i = 0; i < nums.length; i++) {
    const s = Math.max(0, i - (w - 1) + 1);
    const slice = nums.slice(s, i + 1);
    out.push(Math.round(slice.reduce((a, b) => a + b, 0) / slice.length));
  }
  return out;
}

export function useOpenSkyStates(opts?: { pollMs?: number; bbox?: string }) {
  const { pollMs = 30000, bbox } = opts ?? {};
  const [flights, setFlights] = useState<OpenSkyFlight[]>([]);
  const [serverTs, setServerTs] = useState<number>(Date.now());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const pauseUntil = useRef<number>(0);

  useEffect(() => {
    let timer: any;
    let alive = true;

    const load = async () => {
      if (Date.now() < pauseUntil.current) return; 
      try {
        if (alive) setLoading(prev => prev && flights.length === 0); 
        const url = `/api/opensky${bbox ? `?bbox=${encodeURIComponent(bbox)}` : ''}`;
        const r = await fetch(url, { cache: 'no-store' });

        if (r.status === 429) {
          pauseUntil.current = Date.now() + 60_000; 
          setError('rate_limited');
          return;
        }
        if (!r.ok) throw new Error(await r.text());

        const { time, flights: jsonFlights } = await r.json();
        if (!alive) return;

        setFlights((jsonFlights ?? []) as OpenSkyFlight[]);
        setServerTs((time || 0) * 1000);
        setError(null);
      } catch (e: any) {
        if (alive) setError(e?.message ?? 'Fetch error');
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    timer = setInterval(load, pollMs);
    return () => { alive = false; clearInterval(timer); };
  }, [pollMs, bbox, flights.length]);

  return { flights, serverTs, loading, error };
}

export function useOpenSkyTraffic(opts?: { pollMs?: number; bbox?: string; maxPoints?: number; smooth?: number }) {
  const { pollMs = 30000, bbox, maxPoints = 60, smooth = 3 } = opts ?? {};
  const { flights, serverTs } = useOpenSkyStates({ pollMs, bbox });
  const [series, setSeries] = useState<{ time: string; flights: number }[]>([]);

  useEffect(() => {
    if (!serverTs) return;
    const point = {
      time: new Date(serverTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      flights: flights.length
    };
    setSeries(prev => {
      const next = [...prev.slice(-(maxPoints - 1)), point];
      if (smooth > 1) {
        const ys = rollingAvg(next.map(p => p.flights), smooth);
        return next.map((p, i) => ({ ...p, flights: ys[i] }));
      }
      return next;
    });
  }, [flights, serverTs, maxPoints, smooth]);

  return series;
}

export function useDerivedMetrics(flights: OpenSkyFlight[] = []) {
  const kpis = useMemo(() => {
    const active = flights.filter(f => !f.on_ground).length;
    const onGround = flights.filter(f => f.on_ground).length;
    return { blue: active, green: onGround };
  }, [flights]);

  const topAirlines = useMemo(() => {
    const counts: Record<string, number> = {};
    flights.forEach(f => {
      const cs = (f.callsign || '').trim();
      const prefix = cs ? cs.replace(/[0-9].*$/, '').slice(0, 3) : 'UNK';
      const key = prefix || 'UNK';
      counts[key] = (counts[key] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8)
      .map(([name,n]) => ({ name, count: n, percentAll: Math.round((n/total)*100) }));
    const sumTop = top.reduce((a,b)=>a+b.count,0) || 1;
    return top.map(t => ({ ...t, percentTop: Math.round((t.count/sumTop)*100) }));
  }, [flights]);

  const airportPerformance = useMemo(() => {
    const map = new Map<string, { onTime: number; delayed: number }>();
    flights.forEach(f => {
      const key = f.country || 'Unknown';
      if (!map.has(key)) map.set(key, { onTime: 0, delayed: 0 });
      const acc = map.get(key)!;
      const onTime = f.on_ground && (f.geo_altitude ?? 0) < 20;
      if (onTime) acc.onTime++; else acc.delayed++;
    });
    return Array.from(map, ([airport, v]) => ({ airport, ...v })).slice(0, 10);
  }, [flights]);

  const currentFlight = useMemo(() => {
    const airborne = flights.filter(f => !f.on_ground);
    return airborne.reduce<OpenSkyFlight | null>((best, f) =>
      !best || f.lastContact > best.lastContact ? f : best, null);
  }, [flights]);

  return { kpis, topAirlines, airportPerformance, currentFlight };
}
