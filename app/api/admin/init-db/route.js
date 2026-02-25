import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST() {
  try {
    await sql`
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
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS truss_prices (
        id            SERIAL PRIMARY KEY,
        branch        VARCHAR(50)  NOT NULL,
        pitch         VARCHAR(5)   NOT NULL,
        snapped_width INTEGER      NOT NULL,
        price_per_sf  NUMERIC(8,4),
        updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_by    INTEGER REFERENCES agents(id),
        UNIQUE(branch, pitch, snapped_width)
      )
    `;

    // Seed placeholder truss_prices rows if the table is empty
    const { rows } = await sql`SELECT COUNT(*) AS count FROM truss_prices`;
    let seededTruss = 0;

    if (Number(rows[0].count) === 0) {
      const entries = [
        ['Grimes',      '4/12', 28], ['Grimes',      '4/12', 34],
        ['Grimes',      '6/12', 28], ['Grimes',      '6/12', 34],
        ['Grimes',      '8/12', 28], ['Grimes',      '8/12', 34],
        ['Coralville',  '4/12', 28], ['Coralville',  '4/12', 34],
        ['Coralville',  '6/12', 28], ['Coralville',  '6/12', 34],
        ['Coralville',  '8/12', 28], ['Coralville',  '8/12', 34],
        ['Fort_Dodge',  '4/12', 28], ['Fort_Dodge',  '4/12', 34],
        ['Fort_Dodge',  '6/12', 28], ['Fort_Dodge',  '6/12', 34],
        ['Fort_Dodge',  '8/12', 28], ['Fort_Dodge',  '8/12', 34],
      ];

      for (const [branch, pitch, width] of entries) {
        await sql`
          INSERT INTO truss_prices (branch, pitch, snapped_width, price_per_sf)
          VALUES (${branch}, ${pitch}, ${width}, NULL)
          ON CONFLICT (branch, pitch, snapped_width) DO NOTHING
        `;
        seededTruss++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Database tables created successfully.',
      seededTrussRows: seededTruss,
    });
  } catch (err) {
    console.error('POST /api/admin/init-db error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
