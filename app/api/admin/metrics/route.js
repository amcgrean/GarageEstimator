import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getMetrics();
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/admin/metrics error:', err);
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 });
  }
}
