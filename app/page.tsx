'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid
} from 'recharts';
import { useCsvStates } from './hooks/useCsvStates';

export default function Dashboard() {
  const {
    kpis, topAirlines, airportPerformance, currentFlight,
    last7Airborne, traffic, loading, error
  } = useCsvStates();

  const overviewSeries = useMemo(() => {
    const pts = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      blue: Math.round((kpis.active || 0) * (i / 24)),
    }));
    return pts;
  }, [kpis]);

  const [idx, setIdx] = useState(0);
  const wrap = (i: number) => {
    if (last7Airborne.length === 0) return 0;
    const n = last7Airborne.length;
    return ((i % n) + n) % n;
    };
  const slide = (d: number) => setIdx(i => wrap(i + d));
  const sel = last7Airborne[wrap(idx)] || currentFlight;

  const airlineColor = (i: number) =>
    ['#4ea2ff','#d85dbb','#41c79b','#79e5ec','#9aa6ff','#f0a3ff','#7ed0ff','#7fffca'][i % 8];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f1b35] to-[#1a2642] text-white">
      {/* NAVBAR */}
      <nav className="fixed w-full top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-6 md:px-8">
          <div className="flex items-center justify-between h-20">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Flight Dashboard</h1>
            <span className="text-sm text-white/60">
              {loading ? 'Loading dataset…' : (error ? 'Dataset error' : 'Dataset loaded')}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 pt-28 relative z-10">
        {/* Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-stretch">
          {/* Overview */}
          <div className="relative min-w-0 flex-1 flex flex-col bg-white/5 rounded-3xl border border-white/10 p-12 min-h-[500px] shadow-2xl overflow-hidden">
            <h2 className="text-2xl font-medium mb-4 text-white">Overview</h2>
            <div className="text-7xl font-bold mb-1">{kpis.active || 0}</div>
            <p className="text-white/50 mb-4 text-lg">Active Flights (from CSV)</p>
            <div className="min-w-0" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" aspect={3}>
                <LineChart data={overviewSeries}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                  <XAxis dataKey="hour" stroke="transparent" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="transparent" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="blue" stroke="#4ea2ff" strokeWidth={3.5} dot={false} isAnimationActive={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="relative min-w-0 flex-1 flex flex-col bg-white/5 rounded-3xl border border-white/10 p-12 min-h-[500px] shadow-2xl overflow-hidden">
            <div className="absolute right-10 top-8 w-48 h-32 pointer-events-none opacity-90">
              <Image src="/airplanepic.png" alt="3D Airplane" fill style={{ objectFit: 'contain' }} className="drop-shadow-xl" priority />
            </div>
            <div className="z-10 flex flex-col h-full">
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2 text-white">Current Flight</h2>
                <h3 className="text-3xl font-bold mb-2">{sel?.callsign || '—'}</h3>
                <div className="text-zinc-400 text-lg">{sel ? 'Most recent airborne state (CSV)' : 'No Data'}</div>
              </div>

              <div className="grid grid-cols-2 gap-7 mt-auto">
                <div className="space-y-3">
                  <div><div className="text-zinc-400 text-base">Velocity (m/s)</div><div className="font-bold text-2xl text-white">{sel?.velocity_ms?.toFixed(0) ?? '—'}</div></div>
                  <div><div className="text-zinc-400 text-base">Heading</div><div className="text-white/90 text-lg">{sel?.heading?.toFixed(0) ?? '—'}</div></div>
                </div>
                <div className="space-y-3 text-right">
                  <div><div className="text-zinc-400 text-base">Latitude</div><div className="text-white/90 text-lg">{sel?.lat?.toFixed(3) ?? '—'}</div></div>
                  <div><div className="text-zinc-400 text-base">Longitude</div><div className="text-white/90 text-lg">{sel?.lon?.toFixed(3) ?? '—'}</div></div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={()=>slide(-1)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-40"
                  disabled={last7Airborne.length === 0}
                >
                  ‹ Prev
                </button>
                <div className="flex gap-2">
                  {last7Airborne.map((_,i)=>(
                    <button
                      key={i}
                      onClick={()=>setIdx(i)}
                      className={`w-2.5 h-2.5 rounded-full ${i===((idx%last7Airborne.length)+last7Airborne.length)%last7Airborne.length?'bg-white':'bg-white/30'}`}
                      aria-label={`Flight ${i+1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={()=>slide(1)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-40"
                  disabled={last7Airborne.length === 0}
                >
                  Next ›
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mt-10">
          <div className="min-w-0 flex-1 flex flex-col bg-white/5 rounded-3xl border border-white/10 p-12 shadow-2xl min-h-[380px] overflow-hidden">
            <h2 className="text-2xl font-medium mb-2 text-white">Flight Traffic</h2>
            <p className="text-white/50 mb-4 text-sm">CSV replay (dataset bins)</p>
            <div className="min-w-0" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" aspect={3}>
                <AreaChart data={traffic}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#41c79b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#41c79b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                  <XAxis dataKey="time" stroke="transparent" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto','auto']} stroke="transparent" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="flights" stroke="#41c79b" strokeWidth={3.5} fill="url(#areaGradient)" dot={false} isAnimationActive={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Airlines */}
          <div className="min-w-0 relative flex-1 flex flex-col bg-white/5 rounded-3xl border border-white/10 p-12 shadow-2xl min-h-[380px] overflow-hidden">
            <h2 className="text-2xl font-medium mb-6 text-white">Top Airlines</h2>
            <div className="grid grid-cols-2 gap-y-6 gap-x-12">
              {topAirlines.map((a, i) => (
                <div key={a.name + i} className="flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={airlineColor(i)}>
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                  </svg>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-white/90 font-medium tracking-wide">{a.name}</span>
                      <span className="text-white/50 text-sm">{a.percentAll}%</span>
                    </div>
                    <div className="h-2 mt-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${a.percentTop}%`, background: airlineColor(i) }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-6">
              Bar width = share within Top-8; number = global share (within this CSV slice).
            </p>
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 gap-10 mt-10">
          <div className="min-w-0 flex-1 flex flex-col bg-white/5 rounded-3xl border border-white/10 p-12 shadow-2xl min-h-[380px] overflow-hidden">
            <h2 className="text-2xl font-medium mb-4 text-white">Airport Performance</h2>
            <p className="text-white/50 mb-4 text-lg">On-Time vs Delayed (proxy from states.csv)</p>
            <div className="min-w-0" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" aspect={3}>
                <BarChart data={airportPerformance} barSize={26}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                  <XAxis dataKey="airport" stroke="transparent" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="transparent" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }} />
                  <Bar dataKey="onTime" fill="#41c79b" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="delayed" fill="#d85dbb" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-8 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#41c79b]" />
                <span className="text-white/70">On-Time</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#d85dbb]" />
                <span className="text-white/70">Delayed</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
