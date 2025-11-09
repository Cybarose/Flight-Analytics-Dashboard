import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'states.csv');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ time: Math.floor(Date.now()/1000), flights: [] }, { status: 200 });
    }

    const text = fs.readFileSync(filePath, 'utf8');
    const [headerLine, ...rows] = text.split(/\r?\n/);
    const header = headerLine?.split(',') ?? [];

    const idx = (k: string) => header.indexOf(k);
    const iTime = idx('time');
    const iIcao = idx('icao24');
    const iLat = idx('lat');
    const iLon = idx('lon');
    const iVel = idx('velocity');
    const iHead = idx('heading');
    const iGeo = idx('geoaltitude');
    const iGround = idx('on_ground');
    const iCall = idx('callsign');

    const maxRows = 50000;
    const flights = rows.slice(0, maxRows).map(l => {
      if (!l) return null;
      const c = l.split(',');
      if (c.length < 6) return null;
      return {
        icao24: c[iIcao] || '',
        callsign: (c[iCall] || '').trim(),
        country: '', 
        lastContact: Number(c[iTime] || 0),
        lon: c[iLon] ? Number(c[iLon]) : null,
        lat: c[iLat] ? Number(c[iLat]) : null,
        baro_altitude: null,
        on_ground: (c[iGround] || '').toLowerCase() === 'true',
        velocity_ms: c[iVel] ? Number(c[iVel]) : null,
        heading: c[iHead] ? Number(c[iHead]) : null,
        geo_altitude: c[iGeo] ? Number(c[iGeo]) : null,
        squawk: null,
      };
    }).filter(Boolean) as any[];

    return NextResponse.json({
      time: flights[0]?.lastContact ?? Math.floor(Date.now()/1000),
      flights
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'read_error', flights: [] }, { status: 200 });
  }
}
