import { NextResponse } from 'next/server';
import { getTrussPrices, upsertTrussPrice } from '@/lib/db';

export async function GET() {
  try {
    const rows = await getTrussPrices();
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/admin/truss-prices error:', err);
    return NextResponse.json({ error: 'Failed to load truss prices' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    // body: [{ branch, pitch, snappedWidth, pricePersf }]
    const updates = Array.isArray(body) ? body : [body];

    const results = await Promise.all(
      updates.map(u =>
        upsertTrussPrice({
          branch: u.branch,
          pitch: u.pitch,
          snappedWidth: Number(u.snappedWidth),
          pricePersf: u.pricePersf !== '' ? Number(u.pricePersf) : null,
          updatedBy: null,
        })
      )
    );
    return NextResponse.json({ success: true, updated: results.length });
  } catch (err) {
    console.error('PUT /api/admin/truss-prices error:', err);
    return NextResponse.json({ error: 'Failed to update truss prices' }, { status: 500 });
  }
}
