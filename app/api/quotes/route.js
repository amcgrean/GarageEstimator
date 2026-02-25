import { NextResponse } from 'next/server';
import { verifyAgentPin, saveQuote } from '@/lib/db';
import { validateGarageInputs } from '@/lib/garageCalculator';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      jobName, agentId, agentPin, branch,
      wallThickness, wallHeight, width, length,
      roofPitch, roofOverhangInches, includeShingles, sidingType, wrapWindows,
      overheadDoors, serviceDoors, windows,
      geometry, takeoffRows,
    } = body;

    // Validate inputs
    const errors = validateGarageInputs({
      wallThickness, wallHeight: Number(wallHeight),
      width: Number(width), length: Number(length),
      overheadDoors: Number(overheadDoors),
      roofPitch, roofOverhangInches: Number(roofOverhangInches),
      sidingType, serviceDoors: Number(serviceDoors),
      windows: Number(windows),
    });
    if (errors.length) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    // Validate PIN
    if (!agentId || !agentPin) {
      return NextResponse.json({ error: 'Agent ID and PIN are required' }, { status: 400 });
    }
    const pinValid = await verifyAgentPin(Number(agentId), String(agentPin));
    if (!pinValid) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Save quote
    const quote = await saveQuote({
      jobName: jobName ?? '',
      agentId: Number(agentId),
      branch,
      wallThickness,
      wallHeight: Number(wallHeight),
      width: Number(width),
      length: Number(length),
      roofPitch,
      overhangIn: Number(roofOverhangInches),
      includeShingles: Boolean(includeShingles),
      sidingType,
      wrapWindows: Boolean(wrapWindows),
      overheadDoors: Number(overheadDoors),
      serviceDoors: Number(serviceDoors),
      windows: Number(windows),
      perimeterLf: geometry?.perimeterLF ?? 0,
      roofSf: geometry?.roofSF ?? 0,
      wallSf: geometry?.wallSheathingSF ?? 0,
      takeoffRows: takeoffRows ?? [],
    });

    return NextResponse.json({ success: true, quoteId: quote.id, createdAt: quote.created_at });
  } catch (err) {
    console.error('POST /api/quotes error:', err);
    return NextResponse.json({ error: 'Failed to save quote' }, { status: 500 });
  }
}
