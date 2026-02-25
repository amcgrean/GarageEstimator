import { NextResponse } from 'next/server';
import { getTrussPrices } from '@/lib/db';

export async function GET() {
  try {
    const rows = await getTrussPrices();

    // Build nested structure: { branch: { pitch: { snappedWidth: price } } }
    const table = {};
    for (const row of rows) {
      if (!table[row.branch]) table[row.branch] = {};
      if (!table[row.branch][row.pitch]) table[row.branch][row.pitch] = {};
      table[row.branch][row.pitch][row.snapped_width] = row.price_per_sf
        ? Number(row.price_per_sf)
        : null;
    }
    return NextResponse.json(table);
  } catch (err) {
    console.error('GET /api/truss-prices error:', err);
    return NextResponse.json({ error: 'Failed to load truss prices' }, { status: 500 });
  }
}
