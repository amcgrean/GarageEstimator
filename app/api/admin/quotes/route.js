import { NextResponse } from 'next/server';
import { getQuotes, getQuoteCount } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page     = Number(searchParams.get('page') ?? 1);
    const limit    = Number(searchParams.get('limit') ?? 50);
    const agentId  = searchParams.get('agentId') ?? undefined;
    const branch   = searchParams.get('branch') ?? undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo   = searchParams.get('dateTo') ?? undefined;

    const [quotes, total] = await Promise.all([
      getQuotes({ page, limit, agentId, branch, dateFrom, dateTo }),
      getQuoteCount(),
    ]);

    return NextResponse.json({ quotes, total, page, limit });
  } catch (err) {
    console.error('GET /api/admin/quotes error:', err);
    return NextResponse.json({ error: 'Failed to load quotes' }, { status: 500 });
  }
}
