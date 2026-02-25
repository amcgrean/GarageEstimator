import { NextResponse } from 'next/server';
import { updateAgent } from '@/lib/db';

export async function PUT(request, { params }) {
  try {
    const id = Number(params.id);
    const body = await request.json();
    const { name, username, branch, pin, active } = body;

    if (!name || !username || !branch) {
      return NextResponse.json({ error: 'name, username, and branch are required' }, { status: 400 });
    }
    // If PIN provided, validate format
    if (pin !== undefined && pin !== '' && !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    const agent = await updateAgent(id, { name, username, branch, pin, active: Boolean(active) });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    return NextResponse.json(agent);
  } catch (err) {
    if (err.message?.includes('unique') || err.code === '23505') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error('PUT /api/admin/agents/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}
