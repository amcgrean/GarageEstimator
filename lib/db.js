import { sql } from '@vercel/postgres';

// Re-export sql for convenience
export { sql };

// ============================================================
// AGENTS
// ============================================================

export async function getActiveAgents() {
  const { rows } = await sql`
    SELECT id, name, username, branch
    FROM agents
    WHERE active = true
    ORDER BY branch, name
  `;
  return rows;
}

export async function getAllAgents() {
  const { rows } = await sql`
    SELECT id, name, username, branch, pin, active, created_at
    FROM agents
    ORDER BY branch, name
  `;
  return rows;
}

export async function getAgentById(id) {
  const { rows } = await sql`
    SELECT id, name, username, branch, pin, active FROM agents WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function verifyAgentPin(agentId, pin) {
  const { rows } = await sql`
    SELECT pin FROM agents WHERE id = ${agentId} AND active = true
  `;
  if (!rows[0]) return false;
  // PIN stored as bcrypt hash
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.compare(pin, rows[0].pin);
}

export async function createAgent({ name, username, branch, pin }) {
  const bcrypt = await import('bcryptjs');
  const hashed = await bcrypt.default.hash(pin, 10);
  const { rows } = await sql`
    INSERT INTO agents (name, username, branch, pin)
    VALUES (${name}, ${username}, ${branch}, ${hashed})
    RETURNING id, name, username, branch, active, created_at
  `;
  return rows[0];
}

export async function updateAgent(id, { name, username, branch, pin, active }) {
  if (pin !== undefined && pin !== null && pin !== '') {
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.default.hash(pin, 10);
    const { rows } = await sql`
      UPDATE agents
      SET name = ${name}, username = ${username}, branch = ${branch},
          pin = ${hashed}, active = ${active}
      WHERE id = ${id}
      RETURNING id, name, username, branch, active
    `;
    return rows[0];
  } else {
    const { rows } = await sql`
      UPDATE agents
      SET name = ${name}, username = ${username}, branch = ${branch}, active = ${active}
      WHERE id = ${id}
      RETURNING id, name, username, branch, active
    `;
    return rows[0];
  }
}

// ============================================================
// QUOTES
// ============================================================

export async function saveQuote({
  jobName, agentId, branch,
  wallThickness, wallHeight, width, length,
  roofPitch, overhangIn, includeShingles, sidingType, wrapWindows,
  overheadDoors, serviceDoors, windows,
  perimeterLf, roofSf, wallSf,
  takeoffRows,
}) {
  const { rows } = await sql`
    INSERT INTO quotes (
      job_name, agent_id, branch,
      wall_thickness, wall_height, width, length,
      roof_pitch, overhang_in, include_shingles, siding_type, wrap_windows,
      overhead_doors, service_doors, windows,
      perimeter_lf, roof_sf, wall_sf,
      takeoff_rows
    ) VALUES (
      ${jobName}, ${agentId}, ${branch},
      ${wallThickness}, ${wallHeight}, ${width}, ${length},
      ${roofPitch}, ${overhangIn}, ${includeShingles}, ${sidingType}, ${wrapWindows},
      ${overheadDoors}, ${serviceDoors}, ${windows},
      ${perimeterLf}, ${roofSf}, ${wallSf},
      ${JSON.stringify(takeoffRows)}
    )
    RETURNING id, created_at
  `;
  return rows[0];
}

export async function getQuotes({ page = 1, limit = 50, agentId, branch, dateFrom, dateTo } = {}) {
  const offset = (page - 1) * limit;
  // All optional filters — use null to skip
  const agentIdVal  = agentId  ? Number(agentId) : null;
  const branchVal   = branch   ? String(branch)  : null;
  const dateFromVal = dateFrom ? String(dateFrom) : null;
  const dateToVal   = dateTo   ? String(dateTo)   : null;

  const { rows } = await sql`
    SELECT
      q.id, q.job_name, q.branch, q.created_at,
      q.wall_thickness, q.wall_height, q.width, q.length,
      q.roof_pitch, q.overhang_in, q.include_shingles, q.siding_type, q.wrap_windows,
      q.overhead_doors, q.service_doors, q.windows,
      q.perimeter_lf, q.roof_sf, q.wall_sf,
      q.takeoff_rows,
      a.name AS agent_name
    FROM quotes q
    LEFT JOIN agents a ON q.agent_id = a.id
    WHERE (${agentIdVal}::int IS NULL  OR q.agent_id = ${agentIdVal}::int)
      AND (${branchVal}::text IS NULL  OR q.branch = ${branchVal}::text)
      AND (${dateFromVal}::date IS NULL OR q.created_at::date >= ${dateFromVal}::date)
      AND (${dateToVal}::date IS NULL   OR q.created_at::date <= ${dateToVal}::date)
    ORDER BY q.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows;
}

export async function getQuoteCount() {
  const { rows } = await sql`SELECT COUNT(*) AS count FROM quotes`;
  return Number(rows[0].count);
}

// ============================================================
// TRUSS PRICES
// ============================================================

export async function getTrussPrices() {
  const { rows } = await sql`
    SELECT branch, pitch, snapped_width, price_per_sf, updated_at
    FROM truss_prices
    ORDER BY branch, pitch, snapped_width
  `;
  return rows;
}

export async function upsertTrussPrice({ branch, pitch, snappedWidth, pricePersf, updatedBy }) {
  const { rows } = await sql`
    INSERT INTO truss_prices (branch, pitch, snapped_width, price_per_sf, updated_by, updated_at)
    VALUES (${branch}, ${pitch}, ${snappedWidth}, ${pricePersf}, ${updatedBy}, NOW())
    ON CONFLICT (branch, pitch, snapped_width)
    DO UPDATE SET price_per_sf = ${pricePersf}, updated_by = ${updatedBy}, updated_at = NOW()
    RETURNING *
  `;
  return rows[0];
}

// ============================================================
// METRICS
// ============================================================

export async function getMetrics() {
  const [dailyVolume, topSizes, pitchSiding, byAgent, byBranch] = await Promise.all([
    // Quotes per day — last 30 days
    sql`
      SELECT DATE(created_at) AS day, COUNT(*) AS count
      FROM quotes
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day
    `,
    // Top 10 garage sizes
    sql`
      SELECT width, length, COUNT(*) AS count
      FROM quotes
      GROUP BY width, length
      ORDER BY count DESC
      LIMIT 10
    `,
    // Pitch + siding combos
    sql`
      SELECT roof_pitch, siding_type, COUNT(*) AS count
      FROM quotes
      GROUP BY roof_pitch, siding_type
      ORDER BY count DESC
    `,
    // By agent
    sql`
      SELECT a.name, a.branch, COUNT(q.id) AS count, MAX(q.created_at) AS last_active
      FROM agents a
      LEFT JOIN quotes q ON q.agent_id = a.id
      GROUP BY a.id, a.name, a.branch
      ORDER BY count DESC
    `,
    // By branch
    sql`
      SELECT branch, COUNT(*) AS count
      FROM quotes
      GROUP BY branch
      ORDER BY count DESC
    `,
  ]);

  const total = byBranch.rows.reduce((s, r) => s + Number(r.count), 0);

  return {
    dailyVolume:   dailyVolume.rows,
    topSizes:      topSizes.rows,
    pitchSiding:   pitchSiding.rows.map(r => ({ ...r, pct: total > 0 ? ((Number(r.count) / total) * 100).toFixed(1) : '0' })),
    byAgent:       byAgent.rows,
    byBranch:      byBranch.rows,
    totalQuotes:   total,
  };
}
