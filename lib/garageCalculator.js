// ============================================================
// Garage Estimator — Calculation Engine
// Converted from GARAGE_TAKEOFF_11_10_25.xlsm
// Beisser Lumber — For Gabled Garages Only
// ============================================================

// ============================================================
// LOOKUP TABLES
// ============================================================

export const ROOF_PITCH_DATA = {
  '4/12': { multiplier: 1.05, slope: 4 / 12 },
  '6/12': { multiplier: 1.12, slope: 6 / 12 },
  '8/12': { multiplier: 1.20, slope: 8 / 12 },
};

export const SIDING_DATA = {
  LP: {
    boardLengthLF:       16,
    sfPerBoard:          9.33,
    tinShinglesPerBoard: 2,
    zFlashLFPerPiece:    10,
    wasteFactor:         1.2,
  },
  Hardie: {
    boardLengthLF:       12,
    sfPerBoard:          7,
    tinShinglesPerBoard: 2,
    zFlashLFPerPiece:    10,
    wasteFactor:         1.2,
  },
  Vinyl: {
    boardLengthLF:       12,
    sfPerBoard:          8.33,
    tinShinglesPerBoard: 0,
    zFlashLFPerPiece:    0,
    wasteFactor:         1.05,
  },
};

// ============================================================
// ITEM CODE TABLES
// ============================================================

export const STUD_CODES = {
  '2x4': { 8: '0204studfir08', 9: '0204studfir09', 10: '0204studfir10', 12: '0204fir12', 14: '0204fir14' },
  '2x6': { 8: '0206studfir08', 9: '0206studfir09', 10: '0206studfir10', 12: '0206fir12', 14: '0206fir14' },
};

export const SILL_SEAL_CODES = {
  '2x4': 'sillseal3121450',
  '2x6': 'sillseal5121450',
};

export const TREATED_CODES = {
  '2x4': { 12: '0204tre12', 14: '0204tre14', 16: '0204tre16' },
  '2x6': { 12: '0206tre12', 14: '0206tre14', 16: '0206tre16' },
};

export const WIND_WASH_CODES = {
  '2x4': { 12: '0204ww12', 14: '0204ww14', 16: '0204ww16' },
  '2x6': { 12: '0206ww12', 14: '0206ww14', 16: '0206ww16' },
};

export function tyvekCode(wallHeight) {
  return (wallHeight === 8 || wallHeight === 9) ? 'tyvhw09150' : 'tyvhw101050';
}

export const SIDING_CODES = {
  LP: {
    'Lap Siding':    'lpsidtxt0816',
    '12" Soffit':    'lpsoftxt1216',
    '16" Soffit':    'lpsoftxt1616',
    '24" Soffit':    'lpsoftxt2416',
    'Rake Board':    'lpsidtxt1216',
    '1x6':           'lptrimtxt010616',
    '1x8':           'lptrimtxt010816',
    '5/4x6':         'lptrimtxt540616',
    'Tin Shingle':   'flashtsb611',
    'Z-Flash':       'flashzgalvz110',
    'Caulk':         'caulkquad461',
    '10d Nails':     'nailgalvbox10d',
    '16d Nails':     'nailgalvbox16d',
    'Roofing Nails': 'nailroofeg2',
  },
  Hardie: {
    'Lap Siding':    'jhsidtxt081412',
    '12" Soffit':    'jhsoftxt16144',
    '16" Soffit':    'jhsoftxt16144',
    '24" Soffit':    'jhsoftxt2496',
    'Rake Board':    'jhsidtxt1212',
    '1x6':           'jhtrimtx4405',
    '1x8':           'jhtrimtx44075',
    '5/4x6':         'jhtrimtx5405',
    'Tin Shingle':   'flashtsb611',
    'Z-Flash':       'flashzgalvz110',
    'Caulk':         'caulkquad461',
    '10d Nails':     'nailgalvbox10d',
    '16d Nails':     'nailgalvbox16d',
    'Roofing Nails': 'nailroofeg2',
  },
  Vinyl: {
    'Lap Siding':    'vinclay1sidmsd4',
    '12" Soffit':    'rollexwht316cv',
    '16" Soffit':    'rollexwht316cv',
    '24" Soffit':    'rollexwht316cv',
    'Rake Board':    'rollexwht316',
    'J-Channel':     'vinclayjchan34',
    'Metal Starter': 'vinstarterm212',
    'Single Under':  'vinclayuss',
    'Rollex Start':  'rollexwhtrs',
    'MD Divider':    'rollexwhtmd12',
    'Steel Nails':   'rollexwhtnal114',
    'Vinyl Lineal':  'ct5natclaylin20',
    '1x6':           'rollexbrzcl2450',
    '1x8':           'rollexwhtsl6',
    '5/4x6':         'vinclayoc',
    'Caulk':         'caulkquad461',
    '10d Nails':     'nailgalvbox10d',
    '16d Nails':     'nailgalvbox16d',
    'Roofing Nails': 'nailroofeg2',
  },
};

// ============================================================
// MAIN CALCULATION FUNCTION
// ============================================================

export function calculateGarage(inputs) {
  const {
    wallThickness, wallHeight, width, length,
    overheadDoors, roofPitch, roofOverhangInches,
    includeShingles, sidingType, wrapWindows,
    serviceDoors, windows,
  } = inputs;

  const pitchData      = ROOF_PITCH_DATA[roofPitch];
  const roofMultiplier = pitchData.multiplier;
  const roofSlope      = pitchData.slope;
  const overhangFt     = roofOverhangInches / 12;
  const siding         = SIDING_DATA[sidingType] ?? null;
  const hasSiding      = siding !== null;
  const isLP           = sidingType === 'LP';
  const isHardie       = sidingType === 'Hardie';
  const isVinyl        = sidingType === 'Vinyl';
  const isBoardSiding  = isLP || isHardie;

  const snappedWidth = width <= 28 ? 28 : 34;

  // INTERMEDIATE GEOMETRY
  const perimeterLF     = (length + width) * 2;
  const soffitLF        = roundUp(((length * 2) + 2) * 1.05);
  const rakeHalfRise    = roofSlope * (width / 2);
  const rakeHalfRun     = (width / 2) + overhangFt;
  const rakeLF          = Math.sqrt(rakeHalfRise ** 2 + rakeHalfRun ** 2) * 4;
  const roofSF          = (length + 1) * (width + (overhangFt * 2)) * roofMultiplier;
  const gableSF         = (width / 2) * roofSlope * ((width + overhangFt) / 2) * 2;
  const wallSheathingSF = (perimeterLF * wallHeight) + gableSF;
  const roLengthLF      = (serviceDoors * 3 + windows * 4) * 2.5;
  const lvlLF           = overheadDoors * width * 2;
  const windWash2x4Count = roundUp(
    (((roofSF / 3000) * 1000) + (soffitLF * overhangFt)) / 14 / 3
  );
  const windWash2x6Count = roundUp(
    (((rakeLF * 3 * 1.05) + (soffitLF * 1.05)) / 14) / 3
  );
  const floorSF = width * length;

  // FRAMING
  const sillSealRolls        = roundUp((perimeterLF / 50) * 1.05);
  const treatedMudsillEach   = roundUp(((perimeterLF * 1.2) / 14) / 3);
  const studCount            = roundUp(perimeterLF * 1.2);
  const windWashFramingCount = roundUp(((perimeterLF * 3) / 14) / 3);
  const headers2x12          = roundUp(roLengthLF / 12);
  const wallSheathingOSB     = iferror(() => roundUp(((wallSheathingSF + gableSF) / 32) * 1.1));
  const tyvekRolls           = iferror(() => roundUp((gableSF + wallSheathingSF) / 1425));
  const tyvekTapeRolls       = tyvekRolls * 2;
  const rafterTieStraps      = overheadDoors * 2;
  const bearingPlates        = overheadDoors * 2;
  const roofSheathingOSB     = iferror(() => roundUp((roofSF / 32) * 1.1));
  const plyClipBags          = iferror(() => roundUp(roofSF / 2400));
  const hurricaneTies        = roundUp(length * 1.1);
  const flashingTapeRolls    = windows > 0 ? 1 : 0;
  const dupontSealantTubes   = windows > 0 ? 1 : 0;
  const trussPacks           = roofSheathingOSB > 0 ? 1 : 0;

  // SHINGLES
  const shingleBundles     = includeShingles ? roundUp((roofSF / 100) * 3) : 0;
  const feltRolls          = includeShingles ? roundUp(shingleBundles / 6) : 0;
  const hipRidgeBundles    = includeShingles ? roundUp((length + 2) / 33) : 0;
  const ridgeCapVentPieces = includeShingles ? roundUp((length + 2) / 20) : 0;
  const starterRolls       = includeShingles ? roundUp(soffitLF / 117) : 0;
  const odePieces          = includeShingles ? roundUp((soffitLF + rakeLF) / 12) : 0;

  // SIDING
  let lapSidingBoards = 0, soffitVentBoards = 0, rakeBoards = 0;
  let vinylJChannelPcs = 0, metalStarterPcs = 0, singleUnderSillPcs = 0;
  let rollexStarterPcs = 0, mdDividerPcs = 0, steelNailsBags = 0, vinylLinealPcs = 0;
  let boards1x6 = 0, boards1x8 = 0, boards5_4x6 = 0;
  let tinShingles = 0, zFlashPcs = 0, caulkTubes = 0;
  let nails10dLbs = 0, nails16dLbs = 0, roofingNailsLbs = 0;

  if (hasSiding) {
    const { boardLengthLF, sfPerBoard, tinShinglesPerBoard, zFlashLFPerPiece, wasteFactor } = siding;

    lapSidingBoards  = iferror(() => roundUp((wallSheathingSF + gableSF) / sfPerBoard));
    soffitVentBoards = iferror(() => roundUp((soffitLF / boardLengthLF) * wasteFactor));
    rakeBoards       = iferror(() => roundUp((rakeLF / boardLengthLF) * 1.2));

    if (isVinyl) {
      vinylJChannelPcs   = roundUp((rakeLF + soffitLF + (serviceDoors + windows) * 15) / 12);
      metalStarterPcs    = roundUp(((width + length) * 2) / 12);
      singleUnderSillPcs = roundUp((windows * 5) / 12);
      rollexStarterPcs   = roundUp((rakeLF + soffitLF) / 12);
      mdDividerPcs       = 1;
      steelNailsBags     = 1;
      vinylLinealPcs     = wrapWindows ? roundUp(((serviceDoors + windows) * 15) / 20) : 0;
    }

    boards1x6   = roundUp((overheadDoors * 32) / boardLengthLF);
    boards1x8   = iferror(() => roundUp(((soffitLF + rakeLF) / boardLengthLF) * 1.2));
    boards5_4x6 = isBoardSiding
      ? roundUp(8 + (serviceDoors * 17 + (wrapWindows ? windows * 16 : 0) + overheadDoors * 32) / boardLengthLF)
      : isVinyl ? 4 : 0;

    tinShingles     = tinShinglesPerBoard > 0 ? roundUp(iferror(() => lapSidingBoards / tinShinglesPerBoard)) : 0;
    zFlashPcs       = zFlashLFPerPiece > 0 ? roundUp(iferror(() => (overheadDoors * 16 + windows * 4 + serviceDoors * 3) / zFlashLFPerPiece)) : 0;
    caulkTubes      = 20;
    nails10dLbs     = 5;
    nails16dLbs     = 5;
    roofingNailsLbs = isBoardSiding ? 10 : isVinyl ? 20 : 0;
  }

  return {
    sillSealRolls, treatedMudsillEach, studCount, windWashFramingCount,
    headers2x12, lvlLF, wallSheathingOSB, tyvekRolls, tyvekTapeRolls,
    rafterTieStraps, bearingPlates, roofSheathingOSB, plyClipBags,
    windWash2x4Count, windWash2x6Count, hurricaneTies, flashingTapeRolls,
    dupontSealantTubes, trussPacks,
    shingleBundles, feltRolls, hipRidgeBundles, ridgeCapVentPieces,
    starterRolls, odePieces,
    lapSidingBoards, soffitVentBoards, rakeBoards,
    vinylJChannelPcs, metalStarterPcs, singleUnderSillPcs,
    rollexStarterPcs, mdDividerPcs, steelNailsBags, vinylLinealPcs,
    boards1x6, boards1x8, boards5_4x6,
    tinShingles, zFlashPcs, caulkTubes,
    nails10dLbs, nails16dLbs, roofingNailsLbs,
    vinylWindows: windows,
    serviceDoors,
    _inputs: inputs,
    _geometry: {
      perimeterLF:     +perimeterLF.toFixed(2),
      soffitLF:        +soffitLF.toFixed(2),
      rakeLF:          +rakeLF.toFixed(2),
      roofSF:          +roofSF.toFixed(2),
      gableSF:         +gableSF.toFixed(2),
      wallSheathingSF: +wallSheathingSF.toFixed(2),
      roLengthLF:      +roLengthLF.toFixed(2),
      floorSF:         +floorSF.toFixed(2),
      snappedWidth,
    },
  };
}

// ============================================================
// VALIDATION
// ============================================================

export function validateGarageInputs(inputs) {
  const errors = [];
  const { width, length, wallHeight, wallThickness, overheadDoors,
          roofPitch, roofOverhangInches, sidingType, serviceDoors, windows } = inputs;

  if (!width  || width  < 1 || width  > 34) errors.push('Width must be between 1 and 34 feet.');
  if (!length || length < 1 || length > 50) errors.push('Length must be between 1 and 50 feet.');
  if (![8, 9, 10, 12, 14].includes(Number(wallHeight)))  errors.push('Wall height must be 8, 9, 10, 12, or 14 feet.');
  if (!['2x4', '2x6'].includes(wallThickness))           errors.push("Wall thickness must be '2x4' or '2x6'.");
  if (![0, 1, 2].includes(Number(overheadDoors)))        errors.push('Overhead doors must be 0, 1, or 2.');
  if (!['4/12', '6/12', '8/12'].includes(roofPitch))     errors.push("Roof pitch must be '4/12', '6/12', or '8/12'.");
  if (![12, 16, 24].includes(Number(roofOverhangInches))) errors.push('Roof overhang must be 12, 16, or 24 inches.');
  if (!['LP', 'Hardie', 'Vinyl', 'N/A'].includes(sidingType)) errors.push("Siding type must be 'LP', 'Hardie', 'Vinyl', or 'N/A'.");
  if (![0, 1, 2].includes(Number(serviceDoors)))         errors.push('Service doors must be 0, 1, or 2.');
  if (windows < 0 || windows > 6)                        errors.push('Window count must be between 0 and 6.');

  return errors;
}

// ============================================================
// HELPERS
// ============================================================

function roundUp(value) {
  return Math.ceil(value);
}

function iferror(fn, fallback = 0) {
  try {
    const result = fn();
    return isFinite(result) ? result : fallback;
  } catch {
    return fallback;
  }
}
