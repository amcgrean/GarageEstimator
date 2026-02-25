import { NextResponse } from 'next/server';
import { getActiveAgents } from '@/lib/db';

export async function GET() {
  try {
    const agents = await getActiveAgents();
    return NextResponse.json(agents);
  } catch (err) {
    console.error('GET /api/agents error:', err);
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 });
  }
}
