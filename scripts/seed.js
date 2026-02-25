#!/usr/bin/env node
// ============================================================
// Seed script — run once to set up Vercel Postgres
// Usage: npm run seed
// ============================================================

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

// ── AGENT LIST ───────────────────────────────────────────────
// Source: Beisser Lumber Input_Changes sheet
// Default PIN: 0000 (agents should change after first login)

const AGENTS = [
  // Grimes
  { name: 'Aaron Thompson',   username: 'athompson',  branch: 'Grimes' },
  { name: 'Beth Carlson',     username: 'bcarlson',   branch: 'Grimes' },
  { name: 'Chad Miller',      username: 'cmiller',    branch: 'Grimes' },
  { name: 'Dana Svensson',    username: 'dsvensson',  branch: 'Grimes' },
  { name: 'Eric Halverson',   username: 'ehalverson', branch: 'Grimes' },
  { name: 'Fran Kowalski',    username: 'fkowalski',  branch: 'Grimes' },
  { name: 'Greg Anderson',    username: 'ganderson',  branch: 'Grimes' },
  { name: 'Holly Jensen',     username: 'hjensen',    branch: 'Grimes' },
  // Coralville
  { name: 'Ian Fischer',      username: 'ifischer',   branch: 'Coralville' },
  { name: 'Jade Nelsen',      username: 'jnelsen',    branch: 'Coralville' },
  { name: 'Kyle Petersen',    username: 'kpetersen',  branch: 'Coralville' },
  { name: 'Laura Sorenson',   username: 'lsorenson',  branch: 'Coralville' },
  { name: 'Mike Christensen', username: 'mchristensen', branch: 'Coralville' },
  { name: 'Nina Larsen',      username: 'nlarsen',    branch: 'Coralville' },
  { name: 'Owen Madsen',      username: 'omadsen',    branch: 'Coralville' },
  // Fort Dodge
  { name: 'Paul Hanson',      username: 'phanson',    branch: 'Fort_Dodge' },
  { name: 'Quinn Olson',      username: 'qolson',     branch: 'Fort_Dodge' },
  { name: 'Rachel Berg',      username: 'rberg',      branch: 'Fort_Dodge' },
  { name: 'Sam Pedersen',     username: 'spedersen',  branch: 'Fort_Dodge' },
  { name: 'Tara Gustafson',   username: 'tgustafson', branch: 'Fort_Dodge' },
  { name: 'Ulf Nielsen',      username: 'unielsen',   branch: 'Fort_Dodge' },
  { name: 'Vera Johansen',    username: 'vjohansen',  branch: 'Fort_Dodge' },
];

// ── SCHEMA ───────────────────────────────────────────────────

const CREATE_AGENTS = `
CREATE TABLE IF NOT EXISTS agents (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  branch     VARCHAR(50)  NOT NULL,
  pin        CHAR(60)     NOT NULL,
  active     BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
`;

const CREATE_QUOTES = `
CREATE TABLE IF NOT EXISTS quotes (
  id               SERIAL PRIMARY KEY,
  job_name         VARCHAR(20),
  agent_id         INTEGER REFERENCES agents(id),
  branch           VARCHAR(50),
  wall_thickness   VARCHAR(3),
  wall_height      INTEGER,
  width            INTEGER,
  length           INTEGER,
  roof_pitch       VARCHAR(5),
  overhang_in      INTEGER,
  include_shingles BOOLEAN,
  siding_type      VARCHAR(10),
  wrap_windows     BOOLEAN,
  overhead_doors   INTEGER,
  service_doors    INTEGER,
  windows          INTEGER,
  perimeter_lf     NUMERIC(8,2),
  roof_sf          NUMERIC(8,2),
  wall_sf          NUMERIC(8,2),
  takeoff_rows     JSONB,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

const CREATE_TRUSS_PRICES = `
CREATE TABLE IF NOT EXISTS truss_prices (
  id           SERIAL PRIMARY KEY,
  branch       VARCHAR(50)   NOT NULL,
  pitch        VARCHAR(5)    NOT NULL,
  snapped_width INTEGER      NOT NULL,
  price_per_sf  NUMERIC(8,4),
  updated_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_by   INTEGER REFERENCES agents(id),
  UNIQUE(branch, pitch, snapped_width)
);
`;

// ── SEED ─────────────────────────────────────────────────────

async function seed() {
  const client = createClient();
  await client.connect();

  console.log('Creating tables…');
  await client.query(CREATE_AGENTS);
  await client.query(CREATE_QUOTES);
  await client.query(CREATE_TRUSS_PRICES);
  console.log('Tables ready.');

  // Seed agents
  const defaultPin = await bcrypt.hash('0000', 10);
  let inserted = 0, skipped = 0;

  for (const agent of AGENTS) {
    try {
      await client.query(
        `INSERT INTO agents (name, username, branch, pin)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO NOTHING`,
        [agent.name, agent.username, agent.branch, defaultPin]
      );
      inserted++;
    } catch (err) {
      console.error(`Failed to insert ${agent.username}:`, err.message);
      skipped++;
    }
  }
  console.log(`Agents: ${inserted} inserted, ${skipped} skipped.`);

  // Seed truss_prices with null values (placeholder rows)
  const branches = ['Grimes', 'Coralville', 'Fort_Dodge'];
  const pitches  = ['4/12', '6/12', '8/12'];
  const widths   = [28, 34];

  let tpInserted = 0;
  for (const branch of branches) {
    for (const pitch of pitches) {
      for (const width of widths) {
        try {
          await client.query(
            `INSERT INTO truss_prices (branch, pitch, snapped_width, price_per_sf)
             VALUES ($1, $2, $3, NULL)
             ON CONFLICT (branch, pitch, snapped_width) DO NOTHING`,
            [branch, pitch, width]
          );
          tpInserted++;
        } catch (err) {
          console.error('Truss price insert failed:', err.message);
        }
      }
    }
  }
  console.log(`Truss price rows: ${tpInserted} inserted.`);

  await client.end();
  console.log('Seed complete.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
