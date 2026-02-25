import { NextResponse } from 'next/server';
import { getAllAgents, createAgent } from '@/lib/db';

export async function GET() {
  try {
    const agents = await getAllAgents();
    // Don't expose PIN hashes
    return NextResponse.json(agents.map(a => ({ ...a, pin: undefined })));
  } catch (err) {
    console.error('GET /api/admin/agents error:', err);
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, username, branch, pin } = body;

    if (!name || !username || !branch) {
      return NextResponse.json({ error: 'name, username, and branch are required' }, { status: 400 });
    }
    if (!/^\d{4}$/.test(pin ?? '')) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    const agent = await createAgent({ name, username, branch, pin: pin ?? '0000' });
    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    if (err.message?.includes('unique') || err.code === '23505') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error('POST /api/admin/agents error:', err);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
