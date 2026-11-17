# GarageEstimator (RETIRED 2026-11-17)

**This app has been folded into LiveEdge. Do not deploy or extend this repo.**

The garage takeoff now lives in LiveEdge (`amcgrean/liveedge`, a private repo):

| Was here | Now in LiveEdge |
|---|---|
| `app/page.js` (calculator) | `/sales/garage` (`app/sales/garage/`) |
| `lib/garageCalculator.js` (formulas, item codes) | `src/lib/garage-estimator/engine.ts` and `codes.ts` |
| `lib/takeoffTable.js` (takeoff rows, CSV) | `src/lib/garage-estimator/takeoff.ts` |
| `app/admin` truss pricing tab, `truss_prices` | `/admin/garage-truss-prices`, `bids.garage_truss_prices` |
| `quotes` table, `/api/quotes` | `bids.garage_quotes`, `/api/garage/quotes` |
| `agents` table, PINs, admin password | LiveEdge users and sign-in. Customer, salesperson and branch come from LiveEdge |

Everything you need to know (how the formulas were ported and proven identical, how truss
pricing works now, the CSV format, the data to copy out of this app's database, what was not
carried over, and the plan for pushing the quote to Agility) is in LiveEdge:

**`docs/garage-estimator.md`**

## Before this repo is archived (owner checklist)

1. LiveEdge migration `0214_garage_estimator.sql` is applied in Supabase.
2. Truss prices are copied from this app's Vercel Postgres (`truss_prices` table) onto
   `/admin/garage-truss-prices`. If every price there is blank, there is nothing to copy:
   this app stored the prices but never used them in the takeoff.
3. Anyone who wants the old quote history exports the `quotes` table to CSV first
   (Vercel > Storage > the database > Data). It is not imported into LiveEdge.
4. The Vercel project for this app is removed (or set to redirect to the LiveEdge garage page),
   and the Vercel Postgres database is deleted once step 2 and 3 are done.
5. Archive this repo on GitHub (Settings > Danger Zone > Archive). The code stays readable.

The code in this repo is left as it was on 2026-11-17 for reference. `lib/garageCalculator.js`
and `lib/takeoffTable.js` are the originals the LiveEdge tests were recorded from.

Known problem carried over: `nailgalvbox10d` and `nailgalvbox16d` (in `lib/garageCalculator.js`
and `lib/takeoffTable.js`) are not Agility item codes. See LiveEdge `docs/garage-estimator.md`,
"Item code check".
