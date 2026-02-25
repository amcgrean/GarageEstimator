// ============================================================
// Garage Estimator — Calculation Engine
// Converted from GARAGE_TAKEOFF_11_10_25.xlsm
// Beisser Lumber — For Gabled Garages Only
// ============================================================

// ============================================================
// LOOKUP TABLES  (extracted from spreadsheet static data)
// ============================================================

/**

- Roof pitch properties.
- multiplier : area expansion factor applied to footprint to get actual roof SF
- slope      : rise/run as a decimal (used for rafter geometry)
  */
  const ROOF_PITCH_DATA = {
  ‘4/12’: { multiplier: 1.05, slope: 4 / 12 },
  ‘6/12’: { multiplier: 1.12, slope: 6 / 12 },
  ‘8/12’: { multiplier: 1.20, slope: 8 / 12 },
  };

/**

- Siding material properties.
- 
- boardLengthLF      : linear feet of soffit/rake coverage per board
- sfPerBoard         : square feet of wall coverage per board (for lap quantity)
- piecesPerSq        : boards needed per 100 SF (used for 12” rake/vent calcs)
- tinShinglesPerBoard: number of tin shingles used per lap board (flashing)
- zFlashLFPerPiece   : linear feet of z-flashing coverage per piece (0 = not used)
- wasteFactor        : waste multiplier applied to soffit/rake board counts
  */
  const SIDING_DATA = {
  LP: {
  boardLengthLF:       16,
  sfPerBoard:          9.33,
  piecesPerSq:         16,
  tinShinglesPerBoard: 2,
  zFlashLFPerPiece:    10,
  wasteFactor:         1.2,
  },
  Hardie: {
  boardLengthLF:       12,
  sfPerBoard:          7,
  piecesPerSq:         12,
  tinShinglesPerBoard: 2,
  zFlashLFPerPiece:    10,
  wasteFactor:         1.2,
  },
  Vinyl: {
  boardLengthLF:       12,
  sfPerBoard:          8.33,
  piecesPerSq:         50,
  tinShinglesPerBoard: 0,
  zFlashLFPerPiece:    0,
  wasteFactor:         1.05,
  },
  };

// ============================================================
// INPUT SCHEMA  (what the web form collects)
// ============================================================

/**

- @typedef {Object} GarageInputs
- 
- @property {string}  wallThickness      - “2x4” | “2x6”
- @property {number}  wallHeight         - feet: 8 | 9 | 10 | 12 | 14
- @property {number}  width              - gable-end width in feet (1–34)
- @property {number}  length             - garage length in feet (1–50)
- @property {number}  overheadDoors      - count of overhead door openings at gable ends: 0 | 1 | 2
- @property {string}  roofPitch          - “4/12” | “6/12” | “8/12”
- @property {number}  roofOverhangInches - overhang in inches: 12 | 16 | 24
- @property {boolean} includeShingles    - true | false
- @property {string}  sidingType         - “LP” | “Hardie” | “Vinyl” | “N/A”
- @property {boolean} wrapWindows        - whether to include window trim boards: true | false
- @property {number}  serviceDoors       - count of steel walk-in doors: 0 | 1 | 2
- @property {number}  windows            - count of vinyl windows: 0–6
  */

// ============================================================
// MAIN CALCULATION FUNCTION
// ============================================================

/**

- Calculate all material quantities for a gabled garage estimate.
- 
- @param   {GarageInputs} inputs
- @returns {GarageQuantities}  see typedef below for all fields
  */
  export function calculateGarage(inputs) {
  const {
  wallThickness,
  wallHeight,
  width,
  length,
  overheadDoors,
  roofPitch,
  roofOverhangInches,
  includeShingles,
  sidingType,
  wrapWindows,
  serviceDoors,
  windows,
  } = inputs;

// –––––––––––––––––––––––––––––
// PITCH & SIDING LOOKUPS
// –––––––––––––––––––––––––––––

const pitchData     = ROOF_PITCH_DATA[roofPitch];
const roofMultiplier = pitchData.multiplier;  // e.g. 1.05 for 4/12
const roofSlope      = pitchData.slope;        // e.g. 0.333 for 4/12

const overhangFt    = roofOverhangInches / 12; // convert inches → feet
const siding        = SIDING_DATA[sidingType] ?? null;
const hasSiding     = siding !== null;
const isLP          = sidingType === ‘LP’;
const isHardie      = sidingType === ‘Hardie’;
const isVinyl       = sidingType === ‘Vinyl’;
const isBoardSiding = isLP || isHardie;        // LP and Hardie share most board logic

// –––––––––––––––––––––––––––––
// INTERMEDIATE GEOMETRY  (F-column in spreadsheet)
// –––––––––––––––––––––––––––––

/**

- perimeterLF
- Total linear feet of exterior wall perimeter.
- Used as the base for stud counts, sill seal, sheathing, etc.
- Formula: (length + width) × 2
  */
  const perimeterLF = (length + width) * 2;

/**

- soffitLF
- Linear feet of eave soffit (both long sides), with 5% waste.
- The +2 accounts for the two gable-end overhangs adding ~1’ each.
- Formula: ROUNDUP(((length × 2) + 2) × 1.05)
  */
  const soffitLF = roundUp(((length * 2) + 2) * 1.05);

/**

- rakeLF
- Linear feet of rake (sloped roof edge), all 4 rake edges total.
- Uses the Pythagorean theorem: each rake run = half-width + overhang,
- each rake rise = roofSlope × half-width.
- Formula: SQRT((roofSlope × (width/2))² + ((width/2) + overhangFt)²) × 4
  */
  const rakeHalfRise = roofSlope * (width / 2);
  const rakeHalfRun  = (width / 2) + overhangFt;
  const rakeLF       = Math.sqrt(rakeHalfRise ** 2 + rakeHalfRun ** 2) * 4;

/**

- roofSF
- Total roof surface area in square feet, including overhang, after pitch expansion.
- Formula: (length + 1) × (width + (overhangFt × 2)) × roofMultiplier
- The +1 on length accounts for a ~1’ overhang at each gable end.
  */
  const roofSF = (length + 1) * (width + (overhangFt * 2)) * roofMultiplier;

/**

- gableSF
- Square footage of both gable-end triangles combined.
- Triangle area formula scaled by pitch and including overhang width.
- Formula: (width/2) × roofSlope × ((width + overhangFt) / 2) × 2
  */
  const gableSF = (width / 2) * roofSlope * ((width + overhangFt) / 2) * 2;

/**

- wallSheathingSF
- Total wall surface area for OSB sheathing and Tyvek.
- = rectangular wall area + both gable triangles.
- Formula: (perimeterLF × wallHeight) + gableSF
  */
  const wallSheathingSF = (perimeterLF * wallHeight) + gableSF;

/**

- roLengthLF
- Total rough-opening length for all doors and windows (for header sizing).
- Service doors assumed 3’ wide, windows assumed 4’ wide, × 2.5 for doubled headers.
- Formula: (serviceDoors × 3 + windows × 4) × 2.5
  */
  const roLengthLF = (serviceDoors * 3 + windows * 4) * 2.5;

/**

- lvlLF
- Total LVL linear footage for overhead door headers.
- One LVL runs full garage width above each overhead door opening (doubled = ×2).
- Formula: overheadDoors × width × 2
  */
  const lvlLF = overheadDoors * width * 2;

/**

- windWash2x4Count
- Number of 2×4 wind wash boards for the roof plane (soffit blocking).
- Formula: ROUNDUP((((roofSF / 3000) × 1000) + (soffitLF × overhangFt)) / 14 / 3)
  */
  const windWash2x4Count = roundUp(
  (((roofSF / 3000) * 1000) + (soffitLF * overhangFt)) / 14 / 3
  );

/**

- windWash2x6Count
- Number of 2×6 wind wash boards for the rake plane (rake blocking).
- Formula: ROUNDUP((((rakeLF × 3 × 1.05) + (soffitLF × 1.05)) / 14) / 3)
  */
  const windWash2x6Count = roundUp(
  (((rakeLF * 3 * 1.05) + (soffitLF * 1.05)) / 14) / 3
  );

// –––––––––––––––––––––––––––––
// FRAMING QUANTITIES
// –––––––––––––––––––––––––––––

/**

- Sill seal rolls (compressed foam under mudsill).
- One roll covers 50 LF; add 5% waste.
- Formula: ROUNDUP((perimeterLF / 50) × 1.05)
  */
  const sillSealRolls = roundUp((perimeterLF / 50) * 1.05);

/**

- Treated mudsill boards (rows 3–5: three lengths ordered).
- Formula: ROUNDUP((perimeterLF × 1.2) / 14 / 3)
- ×1.2 waste, ÷14 ft per board, ÷3 because ordered in 3 equal lengths.
  */
  const treatedMudsillEach = roundUp(((perimeterLF * 1.2) / 14) / 3);

/**

- Wall stud count (all walls combined).
- Formula: ROUNDUP(perimeterLF × 1.2)
- Standard stud spacing: ~1 stud per LF after accounting for corners/waste.
  */
  const studCount = roundUp(perimeterLF * 1.2);

/**

- Wind wash boards per length (same count ordered in 3 board lengths).
- Formula: ROUNDUP(((perimeterLF × 3) / 14) / 3)
  */
  const windWashFramingCount = roundUp(((perimeterLF * 3) / 14) / 3);

/**

- 2×12 header boards for door/window ROs.
- Formula: ROUNDUP(roLengthLF / 12)
  */
  const headers2x12 = roundUp(roLengthLF / 12);

/**

- Wall sheathing OSB (4×8 sheets = 32 SF each), +10% waste.
- Uses wallSheathingSF + gableSF (gables counted twice intentionally for waste).
- Formula: ROUNDUP(((wallSheathingSF + gableSF) / 32) × 1.1)
  */
  const wallSheathingOSB = iferror(() =>
  roundUp(((wallSheathingSF + gableSF) / 32) * 1.1)
  );

/**

- Tyvek rolls — 1425 SF per roll (blended 9’×150’ and 10’×150’ coverage).
- Uses wallSheathingSF + gableSF for same reason as OSB.
- Formula: ROUNDUP((gableSF + wallSheathingSF) / 1425)
  */
  const tyvekRolls = iferror(() =>
  roundUp((gableSF + wallSheathingSF) / 1425)
  );

/**

- Tyvek tape rolls — 2 rolls per tyvek roll.
  */
  const tyvekTapeRolls = tyvekRolls * 2;

/**

- Rafter tie straps — 2 per overhead door (one each side of opening).
  */
  const rafterTieStraps = overheadDoors * 2;

/**

- Bearing plates — 2 per overhead door.
  */
  const bearingPlates = overheadDoors * 2;

/**

- Roof sheathing OSB (4×8 sheets = 32 SF each), +10% waste.
- Formula: ROUNDUP((roofSF / 32) × 1.1)
  */
  const roofSheathingOSB = iferror(() =>
  roundUp((roofSF / 32) * 1.1)
  );

/**

- Plywood clips (H-clips) — 1 bag per 2400 SF of roof.
- Formula: ROUNDUP(roofSF / 2400)
  */
  const plyClipBags = iferror(() =>
  roundUp(roofSF / 2400)
  );

/**

- Hurricane/rafter ties — one per rafter, roughly 1 per foot of length + 10%.
- Formula: ROUNDUP(length × 1.1)
  */
  const hurricaneTies = roundUp(length * 1.1);

/**

- Flashing tape (for around window rough openings) — 1 roll if any windows.
  */
  const flashingTapeRolls = windows > 0 ? 1 : 0;

/**

- Dupont window sealant — 1 tube if any windows.
  */
  const dupontSealantTubes = windows > 0 ? 1 : 0;

/**

- Truss hardware pack — 1 pack if roof sheathing is included (always 1 for valid roofs).
  */
  const trussPacks = roofSheathingOSB > 0 ? 1 : 0;

// –––––––––––––––––––––––––––––
// SHINGLES QUANTITIES  (only calculated if includeShingles = true)
// –––––––––––––––––––––––––––––

/**

- Shingle bundles — 3 bundles per square (100 SF), rounded up.
- Formula: ROUNDUP((roofSF / 100) × 3)
  */
  const shingleBundles = includeShingles
  ? roundUp((roofSF / 100) * 3)
  : 0;

/**

- Felt rolls — 1 roll per 6 bundles of shingles.
- Formula: ROUNDUP(shingleBundles / 6)
  */
  const feltRolls = includeShingles
  ? roundUp(shingleBundles / 6)
  : 0;

/**

- Hip & ridge shingle bundles — 1 bundle per 33 LF of ridge/hip.
- Formula: ROUNDUP((length + 2) / 33)
  */
  const hipRidgeBundles = includeShingles
  ? roundUp((length + 2) / 33)
  : 0;

/**

- Ridge cap vent pieces — 1 piece per 20 LF of ridge.
- Formula: ROUNDUP((length + 2) / 20)
  */
  const ridgeCapVentPieces = includeShingles
  ? roundUp((length + 2) / 20)
  : 0;

/**

- Starter strip rolls — 1 roll per 117 LF of eave.
- Formula: ROUNDUP(soffitLF / 117)
  */
  const starterRolls = includeShingles
  ? roundUp(soffitLF / 117)
  : 0;

/**

- ODE (eave/drip edge) pieces — covers both eaves (soffitLF) and rakes (rakeLF).
- Formula: ROUNDUP((soffitLF + rakeLF) / 12)  [12 LF per piece]
  */
  const odePieces = includeShingles
  ? roundUp((soffitLF + rakeLF) / 12)
  : 0;

// –––––––––––––––––––––––––––––
// SIDING QUANTITIES
// –––––––––––––––––––––––––––––

let lapSidingBoards      = 0;
let soffitVentBoards     = 0;  // qty for selected overhang size
let rakeBoards           = 0;
let vinylJChannelPcs     = 0;
let metalStarterPcs      = 0;
let singleUnderSillPcs   = 0;
let rollexStarterPcs     = 0;
let mdDividerPcs         = 0;
let steelNailsBags       = 0;
let vinylLinealPcs       = 0;
let boards1x6            = 0;
let boards1x8            = 0;
let boards5_4x6          = 0;
let tinShingles          = 0;
let zFlashPcs            = 0;
let caulkTubes           = 0;
let nails10dLbs          = 0;
let nails16dLbs          = 0;
let roofingNailsLbs      = 0;

if (hasSiding) {
const {
boardLengthLF,
sfPerBoard,
tinShinglesPerBoard,
zFlashLFPerPiece,
wasteFactor,
} = siding;

```
/**
 * Lap siding boards (8" exposure) — total wall + gable SF divided by SF per board.
 * Formula: ROUNDUP((wallSheathingSF + gableSF) / sfPerBoard)
 */
lapSidingBoards = iferror(() =>
  roundUp((wallSheathingSF + gableSF) / sfPerBoard)
);

/**
 * Soffit vent boards — coverage depends on overhang size selected.
 * soffitLF divided by board length in LF, multiplied by siding waste factor.
 * For 24" overhang a flat ×1.2 is used (hardcoded in original spreadsheet).
 * Formula:
 *   12" or 16" overhang: ROUNDUP((soffitLF / boardLengthLF) × wasteFactor)
 *   24" overhang:        ROUNDUP((soffitLF / boardLengthLF) × 1.2)
 */
soffitVentBoards = iferror(() =>
  roundUp((soffitLF / boardLengthLF) * wasteFactor)
);

/**
 * Rake boards — rake LF divided by board length, +20% waste.
 * Formula: ROUNDUP((rakeLF / boardLengthLF) × 1.2)
 */
rakeBoards = iferror(() =>
  roundUp((rakeLF / boardLengthLF) * 1.2)
);

if (isVinyl) {
  /**
   * Vinyl J-channel pieces — runs all soffit, rake, and around each door/window.
   * 15 LF assumed per door/window opening; pieces are 12 LF each.
   * Formula: ROUNDUP((rakeLF + soffitLF + (serviceDoors + windows) × 15) / 12)
   */
  vinylJChannelPcs = roundUp(
    (rakeLF + soffitLF + (serviceDoors + windows) * 15) / 12
  );

  /**
   * Metal starter strip — runs full perimeter (both long walls + both gable ends).
   * Formula: ROUNDUP(((width + length) × 2) / 12)  [12 LF per piece]
   */
  metalStarterPcs = roundUp(((width + length) * 2) / 12);

  /**
   * Single under-sill trim — 5 LF per window opening.
   * Formula: ROUNDUP((windows × 5) / 12)  [12 LF per piece]
   */
  singleUnderSillPcs = roundUp((windows * 5) / 12);

  /**
   * Rollex starter pieces — runs all soffit and rake edges.
   * Formula: ROUNDUP((rakeLF + soffitLF) / 12)
   */
  rollexStarterPcs = roundUp((rakeLF + soffitLF) / 12);

  /**
   * MD divider — 1 flat piece for any Vinyl siding job.
   */
  mdDividerPcs = 1;

  /**
   * Steel nails (Vinyl) — 1 bag flat for any Vinyl siding job.
   */
  steelNailsBags = 1;

  /**
   * Vinyl lineal pieces (window surrounds) — only if wrapWindows = true.
   * 15 LF assumed per door or window; pieces are 20 LF each.
   * Formula: ROUNDUP(((serviceDoors + windows) × 15) / 20)
   */
  vinylLinealPcs = wrapWindows
    ? roundUp(((serviceDoors + windows) * 15) / 20)
    : 0;
}

/**
 * 1×6 fascia boards — runs all overhead door openings (32 LF RO perimeter per door).
 * Formula: ROUNDUP((overheadDoors × 32) / boardLengthLF)
 */
boards1x6 = roundUp((overheadDoors * 32) / boardLengthLF);

/**
 * 1×8 boards — runs all soffit and rake edges, +20% waste.
 * Formula: ROUNDUP(((soffitLF + rakeLF) / boardLengthLF) × 1.2)
 */
boards1x8 = iferror(() =>
  roundUp(((soffitLF + rakeLF) / boardLengthLF) * 1.2)
);

/**
 * 5/4×6 boards — corner boards, window/door trim, overhead door surrounds.
 * LP/Hardie: 8 base + door surrounds + (window trim if wrapWindows) + OH door perimeter.
 * Vinyl:     flat 4 pieces.
 * Formula (LP/Hardie):
 *   ROUNDUP(8 + (serviceDoors×17 + (wrapWindows ? windows×16 : 0) + overheadDoors×32) / boardLengthLF)
 */
boards5_4x6 = isBoardSiding
  ? roundUp(
      8 + (
        serviceDoors * 17 +
        (wrapWindows ? windows * 16 : 0) +
        overheadDoors * 32
      ) / boardLengthLF
    )
  : isVinyl
    ? 4
    : 0;

/**
 * Tin shingles (step flashing at siding-to-roof junction).
 * One tin shingle per lap siding board at roof intersection.
 * Formula: ROUNDUP(lapSidingBoards / tinShinglesPerBoard)  [0 for Vinyl]
 */
tinShingles = tinShinglesPerBoard > 0
  ? roundUp(iferror(() => lapSidingBoards / tinShinglesPerBoard))
  : 0;

/**
 * Z-flashing pieces — used at horizontal joints around doors/windows/overheads.
 * 16 LF per overhead door, 4 LF per window, 3 LF per service door.
 * Formula: ROUNDUP((overheadDoors×16 + windows×4 + serviceDoors×3) / zFlashLFPerPiece)
 * Not used for Vinyl (zFlashLFPerPiece = 0).
 */
zFlashPcs = zFlashLFPerPiece > 0
  ? roundUp(
      iferror(() =>
        (overheadDoors * 16 + windows * 4 + serviceDoors * 3) / zFlashLFPerPiece
      )
    )
  : 0;

/**
 * Caulk tubes — flat 20 for any siding type.
 */
caulkTubes = 20;

/**
 * 10d galvanized box nails — flat 5 lbs for any siding type.
 */
nails10dLbs = 5;

/**
 * 16d galvanized box nails — flat 5 lbs for any siding type.
 */
nails16dLbs = 5;

/**
 * Roofing nails (for siding attachment) — 10 lbs for LP/Hardie, 20 lbs for Vinyl.
 */
roofingNailsLbs = isBoardSiding ? 10 : isVinyl ? 20 : 0;
```

}

// –––––––––––––––––––––––––––––
// RETURN ALL QUANTITIES
// –––––––––––––––––––––––––––––

return {
// — FRAMING —
sillSealRolls,
treatedMudsillEach,     // order 3 equal lengths of this count each
studCount,
windWashFramingCount,   // order 3 equal lengths of this count each (rows 7–9)
headers2x12,
lvlLF,
wallSheathingOSB,
tyvekRolls,
tyvekTapeRolls,
rafterTieStraps,
bearingPlates,
roofSheathingOSB,
plyClipBags,
windWash2x4Count,       // order in 12’, 14’, and 16’ lengths (same count each)
windWash2x6Count,       // order in 12’, 14’, and 16’ lengths (same count each)
hurricaneTies,
flashingTapeRolls,
dupontSealantTubes,
trussPacks,

```
// --- SHINGLES ---
shingleBundles,
feltRolls,
hipRidgeBundles,
ridgeCapVentPieces,
starterRolls,
odePieces,

// --- SIDING ---
lapSidingBoards,
soffitVentBoards,
rakeBoards,
vinylJChannelPcs,
metalStarterPcs,
singleUnderSillPcs,
rollexStarterPcs,
mdDividerPcs,
steelNailsBags,
vinylLinealPcs,
boards1x6,
boards1x8,
boards5_4x6,
tinShingles,
zFlashPcs,
caulkTubes,
nails10dLbs,
nails16dLbs,
roofingNailsLbs,

// --- WINDOWS & DOORS ---
vinylWindows: windows,
serviceDoors,

// --- INTERMEDIATE GEOMETRY (exposed for UI display or debugging) ---
_geometry: {
  perimeterLF:      +perimeterLF.toFixed(2),
  soffitLF:         +soffitLF.toFixed(2),
  rakeLF:           +rakeLF.toFixed(2),
  roofSF:           +roofSF.toFixed(2),
  gableSF:          +gableSF.toFixed(2),
  wallSheathingSF:  +wallSheathingSF.toFixed(2),
  roLengthLF:       +roLengthLF.toFixed(2),
  lvlLF:            +lvlLF.toFixed(2),
},
```

};
}

// ============================================================
// VALIDATION  — call this before calculateGarage()
// ============================================================

/**

- Validates user inputs against the constraints built into the spreadsheet.
- Returns an array of error strings (empty = valid).
- 
- @param {GarageInputs} inputs
- @returns {string[]}
  */
  export function validateGarageInputs(inputs) {
  const errors = [];
  const { width, length, overheadDoors, roofPitch, roofOverhangInches,
  wallThickness, wallHeight, sidingType, serviceDoors, windows } = inputs;

if (!width || width < 1 || width > 34)
errors.push(‘Width must be between 1 and 34 feet.’);
if (!length || length < 1 || length > 50)
errors.push(‘Length must be between 1 and 50 feet.’);
if (![8, 9, 10, 12, 14].includes(wallHeight))
errors.push(‘Wall height must be 8, 9, 10, 12, or 14 feet.’);
if (![‘2x4’, ‘2x6’].includes(wallThickness))
errors.push(“Wall thickness must be ‘2x4’ or ‘2x6’.”);
if (![0, 1, 2].includes(overheadDoors))
errors.push(‘Overhead doors must be 0, 1, or 2.’);
if (![‘4/12’, ‘6/12’, ‘8/12’].includes(roofPitch))
errors.push(“Roof pitch must be ‘4/12’, ‘6/12’, or ‘8/12’.”);
if (![12, 16, 24].includes(roofOverhangInches))
errors.push(‘Roof overhang must be 12, 16, or 24 inches.’);
if (![‘LP’, ‘Hardie’, ‘Vinyl’, ‘N/A’].includes(sidingType))
errors.push(“Siding type must be ‘LP’, ‘Hardie’, ‘Vinyl’, or ‘N/A’.”);
if (![0, 1, 2].includes(serviceDoors))
errors.push(‘Service doors must be 0, 1, or 2.’);
if (windows < 0 || windows > 6)
errors.push(‘Window count must be between 0 and 6.’);

return errors;
}

// ============================================================
// HELPERS
// ============================================================

/** Equivalent to Excel ROUNDUP() — always rounds away from zero. */
function roundUp(value, decimals = 0) {
const factor = 10 ** decimals;
return Math.ceil(value * factor) / factor;
}

/** Equivalent to Excel IFERROR() — returns fallback on any error or non-finite result. */
function iferror(fn, fallback = 0) {
try {
const result = fn();
return isFinite(result) ? result : fallback;
} catch {
return fallback;
}
}