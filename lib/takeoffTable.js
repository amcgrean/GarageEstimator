// ============================================================
// Garage Estimator — Takeoff Table Builder
// ============================================================

import {
  STUD_CODES,
  SILL_SEAL_CODES,
  TREATED_CODES,
  WIND_WASH_CODES,
  SIDING_CODES,
  tyvekCode,
} from './garageCalculator.js';

export function buildTakeoffRows(inputs, result) {
  const { wallThickness, wallHeight, roofOverhangInches, sidingType } = inputs;
  const sideCodes = SIDING_CODES[sidingType] ?? {};
  const soffitCode = sideCodes[`${roofOverhangInches}" Soffit`] ?? '';

  const allRows = [
    // FRAMING
    ['Framing', 'Sill Seal',                   'Each', SILL_SEAL_CODES[wallThickness],        result.sillSealRolls],
    ['Framing', "Treated Mudsill 12'",          'Each', TREATED_CODES[wallThickness][12],       result.treatedMudsillEach],
    ['Framing', "Treated Mudsill 14'",          'Each', TREATED_CODES[wallThickness][14],       result.treatedMudsillEach],
    ['Framing', "Treated Mudsill 16'",          'Each', TREATED_CODES[wallThickness][16],       result.treatedMudsillEach],
    ['Framing', 'Wall Studs',                   'Each', STUD_CODES[wallThickness][wallHeight],  result.studCount],
    ['Framing', "Wall Wind Wash 12'",           'Each', WIND_WASH_CODES[wallThickness][12],     result.windWashFramingCount],
    ['Framing', "Wall Wind Wash 14'",           'Each', WIND_WASH_CODES[wallThickness][14],     result.windWashFramingCount],
    ['Framing', "Wall Wind Wash 16'",           'Each', WIND_WASH_CODES[wallThickness][16],     result.windWashFramingCount],
    ['Framing', '2x12 Header',                  'Each', '0212fir12',                            result.headers2x12],
    ['Framing', 'LVL',                          'LF',   '11lvl00',                              result.lvlLF],
    ['Framing', 'Wall Sheathing OSB (4x8)',      'Each', 'osb4843',                              result.wallSheathingOSB],
    ['Framing', 'Tyvek Housewrap',              'Each', tyvekCode(wallHeight),                  result.tyvekRolls],
    ['Framing', 'Tyvek Tape',                   'Each', 'tyvtapehw255',                         result.tyvekTapeRolls],
    ['Framing', 'Rafter Tie Strap',             'Each', 'simlsta24',                            result.rafterTieStraps],
    ['Framing', 'Bearing Plate',                'Each', 'simbps583hdg',                         result.bearingPlates],
    ['Framing', 'Roof Sheathing OSB (4x8)',      'Each', 'osb4850',                              result.roofSheathingOSB],
    ['Framing', 'Plywood Clips (H-Clips)',       'Each', 'simpscl12',                            result.plyClipBags],
    ['Framing', "Soffit Wind Wash 2x4 12'",     'Each', '0204ww12',                             result.windWash2x4Count],
    ['Framing', "Soffit Wind Wash 2x4 14'",     'Each', '0204ww14',                             result.windWash2x4Count],
    ['Framing', "Soffit Wind Wash 2x4 16'",     'Each', '0204ww16',                             result.windWash2x4Count],
    ['Framing', "Rake Wind Wash 2x6 12'",       'Each', '0206ww12',                             result.windWash2x6Count],
    ['Framing', "Rake Wind Wash 2x6 14'",       'Each', '0206ww14',                             result.windWash2x6Count],
    ['Framing', "Rake Wind Wash 2x6 16'",       'Each', '0206ww16',                             result.windWash2x6Count],
    ['Framing', 'Hurricane Ties',               'Each', 'simh25a',                              result.hurricaneTies],
    ['Framing', 'Flashing Tape (Window)',        'Each', 'tyvtapedup4x75',                       result.flashingTapeRolls],
    ['Framing', 'Dupont Window Sealant',         'Each', 'caulkdupac10',                         result.dupontSealantTubes],
    ['Framing', 'Truss Pack',                   'Each', 'nsbeisser',                            result.trussPacks],

    // SHINGLES
    ['Shingles', 'Shingles',          'Each', 'shinocdurdw',    result.shingleBundles],
    ['Shingles', 'Felt',              'Each', 'felt302sq',      result.feltRolls],
    ['Shingles', 'Hip & Ridge',       'Each', 'shinocdurdwa',   result.hipRidgeBundles],
    ['Shingles', 'Ridge Cap Vent',    'Each', 'ridgevent20',    result.ridgeCapVentPieces],
    ['Shingles', 'Starter Strip',     'Each', 'shincertstart',  result.starterRolls],
    ['Shingles', 'Drip Edge (ODE)',   'Each', 'rollexwhtode12', result.odePieces],

    // SIDING
    ['Siding', '8" Lap Siding',              'Each', sideCodes['Lap Siding'] ?? '',   result.lapSidingBoards],
    ['Siding', `${roofOverhangInches}" Soffit Vent`, 'Each', soffitCode,              result.soffitVentBoards],
    ['Siding', '12" Rake Board',             'Each', sideCodes['Rake Board'] ?? '',   result.rakeBoards],
    ['Siding', 'Vinyl J-Channel',            'Each', sideCodes['J-Channel'] ?? '',    result.vinylJChannelPcs],
    ['Siding', 'Metal Starter Strip',        'Each', sideCodes['Metal Starter'] ?? '', result.metalStarterPcs],
    ['Siding', 'Single Under-Sill',          'Each', sideCodes['Single Under'] ?? '', result.singleUnderSillPcs],
    ['Siding', 'Rollex Starter',             'Each', sideCodes['Rollex Start'] ?? '', result.rollexStarterPcs],
    ['Siding', 'MD Divider',                 'Each', sideCodes['MD Divider'] ?? '',   result.mdDividerPcs],
    ['Siding', 'Steel Nails',                'Each', sideCodes['Steel Nails'] ?? '',  result.steelNailsBags],
    ['Siding', 'Vinyl Lineal (Window Wrap)', 'Each', sideCodes['Vinyl Lineal'] ?? '', result.vinylLinealPcs],
    ['Siding', '1x6 Fascia/Trim',            'Each', sideCodes['1x6'] ?? '',          result.boards1x6],
    ['Siding', '1x8 Soffit/Rake Trim',       'Each', sideCodes['1x8'] ?? '',          result.boards1x8],
    ['Siding', '5/4x6 Corner/Door Trim',     'Each', sideCodes['5/4x6'] ?? '',        result.boards5_4x6],
    ['Siding', 'Tin Step Flashing',          'Each', 'flashtsb611',                  result.tinShingles],
    ['Siding', 'Z-Flashing',                 'Each', 'flashzgalvz110',               result.zFlashPcs],
    ['Siding', 'Caulk',                      'Each', 'caulkquad461',                 result.caulkTubes],
    ['Siding', '10d Galvanized Nails',       'lb',   'nailgalvbox10d',               result.nails10dLbs],
    ['Siding', '16d Galvanized Nails',       'lb',   'nailgalvbox16d',               result.nails16dLbs],
    ['Siding', 'Roofing Nails',              'lb',   'nailroofeg2',                  result.roofingNailsLbs],

    // WINDOWS & DOORS
    ['Windows & Doors', 'Vinyl Window',        'Each', 'zzgr0000143476', result.vinylWindows],
    ['Windows & Doors', 'Steel Service Door',  'Each', 'zzgr0000143477', result.serviceDoors],
  ];

  return allRows
    .filter(([, , , , qty]) => qty > 0)
    .map(([group, description, uom, itemCode, qty]) => ({
      group, description, uom, itemCode, qty,
    }));
}

export function takeoffToCSV(rows, inputs, geometry) {
  const now = new Date().toLocaleDateString('en-US');

  const header = [
    ['Beisser Lumber \u2014 Garage Material Takeoff'],
    [],
    ['Job Name',      inputs.jobName      ?? ''],
    ['Branch',        inputs.branch       ?? ''],
    ['Sales Agent',   inputs.salesAgent   ?? ''],
    ['Date',          now],
    [],
    ['Garage Details'],
    ['Width',          `${inputs.width} ft`],
    ['Length',         `${inputs.length} ft`],
    ['Wall Thickness', inputs.wallThickness],
    ['Wall Height',    `${inputs.wallHeight} ft`],
    ['Roof Pitch',     inputs.roofPitch],
    ['Roof Overhang',  `${inputs.roofOverhangInches}"`],
    ['Siding Type',    inputs.sidingType],
    ['Shingles',       inputs.includeShingles ? 'Yes' : 'No'],
    ['Overhead Doors', inputs.overheadDoors],
    ['Service Doors',  inputs.serviceDoors],
    ['Windows',        inputs.windows],
    [],
    ['Calculated Geometry'],
    ['Perimeter',      `${geometry.perimeterLF} LF`],
    ['Roof SF',        `${geometry.roofSF} SF`],
    ['Wall+Gable SF',  `${geometry.wallSheathingSF} SF`],
    [],
    ['Group', 'Description', 'UOM', 'Item Code', 'Qty'],
  ];

  const dataRows = rows.map(r => [r.group, r.description, r.uom, r.itemCode, r.qty]);

  return [...header, ...dataRows]
    .map(row => row.map(cell => csvEscape(String(cell ?? ''))).join(','))
    .join('\r\n');
}

function csvEscape(value) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
