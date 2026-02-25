'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ── Inline calc engine (client-side, no bundler issues) ─────────────────────

const ROOF_PITCH_DATA = {
  '4/12': { multiplier: 1.05, slope: 4 / 12 },
  '6/12': { multiplier: 1.12, slope: 6 / 12 },
  '8/12': { multiplier: 1.20, slope: 8 / 12 },
};
const SIDING_DATA = {
  LP:     { boardLengthLF: 16, sfPerBoard: 9.33,  tinShinglesPerBoard: 2, zFlashLFPerPiece: 10, wasteFactor: 1.2 },
  Hardie: { boardLengthLF: 12, sfPerBoard: 7,     tinShinglesPerBoard: 2, zFlashLFPerPiece: 10, wasteFactor: 1.2 },
  Vinyl:  { boardLengthLF: 12, sfPerBoard: 8.33,  tinShinglesPerBoard: 0, zFlashLFPerPiece: 0,  wasteFactor: 1.05 },
};
const STUD_CODES = {
  '2x4': { 8:'0204studfir08',9:'0204studfir09',10:'0204studfir10',12:'0204fir12',14:'0204fir14' },
  '2x6': { 8:'0206studfir08',9:'0206studfir09',10:'0206studfir10',12:'0206fir12',14:'0206fir14' },
};
const SILL_SEAL_CODES = { '2x4':'sillseal3121450','2x6':'sillseal5121450' };
const TREATED_CODES = {
  '2x4':{12:'0204tre12',14:'0204tre14',16:'0204tre16'},
  '2x6':{12:'0206tre12',14:'0206tre14',16:'0206tre16'},
};
const WIND_WASH_CODES = {
  '2x4':{12:'0204ww12',14:'0204ww14',16:'0204ww16'},
  '2x6':{12:'0206ww12',14:'0206ww14',16:'0206ww16'},
};
const SIDING_CODES = {
  LP:{
    'Lap Siding':'lpsidtxt0816','12" Soffit':'lpsoftxt1216','16" Soffit':'lpsoftxt1616',
    '24" Soffit':'lpsoftxt2416','Rake Board':'lpsidtxt1216','1x6':'lptrimtxt010616',
    '1x8':'lptrimtxt010816','5/4x6':'lptrimtxt540616','Tin Shingle':'flashtsb611',
    'Z-Flash':'flashzgalvz110','Caulk':'caulkquad461','10d Nails':'nailgalvbox10d',
    '16d Nails':'nailgalvbox16d','Roofing Nails':'nailroofeg2',
  },
  Hardie:{
    'Lap Siding':'jhsidtxt081412','12" Soffit':'jhsoftxt16144','16" Soffit':'jhsoftxt16144',
    '24" Soffit':'jhsoftxt2496','Rake Board':'jhsidtxt1212','1x6':'jhtrimtx4405',
    '1x8':'jhtrimtx44075','5/4x6':'jhtrimtx5405','Tin Shingle':'flashtsb611',
    'Z-Flash':'flashzgalvz110','Caulk':'caulkquad461','10d Nails':'nailgalvbox10d',
    '16d Nails':'nailgalvbox16d','Roofing Nails':'nailroofeg2',
  },
  Vinyl:{
    'Lap Siding':'vinclay1sidmsd4','12" Soffit':'rollexwht316cv','16" Soffit':'rollexwht316cv',
    '24" Soffit':'rollexwht316cv','Rake Board':'rollexwht316','J-Channel':'vinclayjchan34',
    'Metal Starter':'vinstarterm212','Single Under':'vinclayuss','Rollex Start':'rollexwhtrs',
    'MD Divider':'rollexwhtmd12','Steel Nails':'rollexwhtnal114','Vinyl Lineal':'ct5natclaylin20',
    '1x6':'rollexbrzcl2450','1x8':'rollexwhtsl6','5/4x6':'vinclayoc',
    'Caulk':'caulkquad461','10d Nails':'nailgalvbox10d','16d Nails':'nailgalvbox16d',
    'Roofing Nails':'nailroofeg2',
  },
};
function tyvekCode(h){return(h===8||h===9)?'tyvhw09150':'tyvhw101050';}
function ru(v){return Math.ceil(v);}
function ife(fn,fb=0){try{const r=fn();return isFinite(r)?r:fb;}catch{return fb;}}

function calculateGarage(inp) {
  const {wallThickness:wt,wallHeight:wh,width:W,length:L,overheadDoors:od,
         roofPitch,roofOverhangInches:oi,includeShingles:sh,sidingType:st,
         wrapWindows:ww,serviceDoors:sd,windows:win} = inp;
  const pd=ROOF_PITCH_DATA[roofPitch];
  const rm=pd.multiplier,rs=pd.slope,ohFt=oi/12;
  const sid=SIDING_DATA[st]??null,has=!!sid;
  const isLP=st==='LP',isH=st==='Hardie',isV=st==='Vinyl',isB=isLP||isH;
  const pLF=(L+W)*2,sofLF=ru(((L*2)+2)*1.05);
  const rkR=rs*(W/2),rkRn=(W/2)+ohFt,rakeLF=Math.sqrt(rkR**2+rkRn**2)*4;
  const roofSF=(L+1)*(W+(ohFt*2))*rm;
  const gSF=(W/2)*rs*((W+ohFt)/2)*2;
  const wsSF=(pLF*wh)+gSF;
  const roLF=(sd*3+win*4)*2.5,lvlLF=od*W*2;
  const ww2x4=ru((((roofSF/3000)*1000)+(sofLF*ohFt))/14/3);
  const ww2x6=ru((((rakeLF*3*1.05)+(sofLF*1.05))/14)/3);
  const flSF=W*L,snW=W<=28?28:34;
  const sillR=ru((pLF/50)*1.05),tmE=ru(((pLF*1.2)/14)/3),studs=ru(pLF*1.2);
  const wwF=ru(((pLF*3)/14)/3),hdr=ru(roLF/12);
  const wsOSB=ife(()=>ru(((wsSF+gSF)/32)*1.1));
  const tyvR=ife(()=>ru((gSF+wsSF)/1425)),tyvT=tyvR*2;
  const rts=od*2,bp=od*2,rsOSB=ife(()=>ru((roofSF/32)*1.1));
  const plyCB=ife(()=>ru(roofSF/2400)),hurr=ru(L*1.1);
  const ftR=win>0?1:0,dsT=win>0?1:0,trussP=rsOSB>0?1:0;
  const shB=sh?ru((roofSF/100)*3):0,felt=sh?ru(shB/6):0;
  const hipR=sh?ru((L+2)/33):0,ridgeV=sh?ru((L+2)/20):0;
  const start=sh?ru(sofLF/117):0,ode=sh?ru((sofLF+rakeLF)/12):0;
  let lapB=0,sofB=0,rkB=0,vjc=0,ms=0,sus=0,rs2=0,mdd=0,snb=0,vlp=0;
  let b16=0,b18=0,b54=0,tin=0,zf=0,caulk=0,n10=0,n16=0,rnl=0;
  if(has){
    const{boardLengthLF:bl,sfPerBoard:spb,tinShinglesPerBoard:tspb,zFlashLFPerPiece:zflp,wasteFactor:wf}=sid;
    lapB=ife(()=>ru((wsSF+gSF)/spb));
    sofB=ife(()=>ru((sofLF/bl)*wf));
    rkB=ife(()=>ru((rakeLF/bl)*1.2));
    if(isV){
      vjc=ru((rakeLF+sofLF+(sd+win)*15)/12);
      ms=ru(((W+L)*2)/12);
      sus=ru((win*5)/12);
      rs2=ru((rakeLF+sofLF)/12);
      mdd=1;snb=1;
      vlp=ww?ru(((sd+win)*15)/20):0;
    }
    b16=ru((od*32)/bl);
    b18=ife(()=>ru(((sofLF+rakeLF)/bl)*1.2));
    b54=isB?ru(8+(sd*17+(ww?win*16:0)+od*32)/bl):isV?4:0;
    tin=tspb>0?ru(ife(()=>lapB/tspb)):0;
    zf=zflp>0?ru(ife(()=>(od*16+win*4+sd*3)/zflp)):0;
    caulk=20;n10=5;n16=5;rnl=isB?10:isV?20:0;
  }
  return {
    sillSealRolls:sillR,treatedMudsillEach:tmE,studCount:studs,windWashFramingCount:wwF,
    headers2x12:hdr,lvlLF,wallSheathingOSB:wsOSB,tyvekRolls:tyvR,tyvekTapeRolls:tyvT,
    rafterTieStraps:rts,bearingPlates:bp,roofSheathingOSB:rsOSB,plyClipBags:plyCB,
    windWash2x4Count:ww2x4,windWash2x6Count:ww2x6,hurricaneTies:hurr,
    flashingTapeRolls:ftR,dupontSealantTubes:dsT,trussPacks:trussP,
    shingleBundles:shB,feltRolls:felt,hipRidgeBundles:hipR,ridgeCapVentPieces:ridgeV,
    starterRolls:start,odePieces:ode,
    lapSidingBoards:lapB,soffitVentBoards:sofB,rakeBoards:rkB,
    vinylJChannelPcs:vjc,metalStarterPcs:ms,singleUnderSillPcs:sus,
    rollexStarterPcs:rs2,mdDividerPcs:mdd,steelNailsBags:snb,vinylLinealPcs:vlp,
    boards1x6:b16,boards1x8:b18,boards5_4x6:b54,
    tinShingles:tin,zFlashPcs:zf,caulkTubes:caulk,nails10dLbs:n10,nails16dLbs:n16,roofingNailsLbs:rnl,
    vinylWindows:win,serviceDoors:sd,
    _geometry:{
      perimeterLF:+pLF.toFixed(2),soffitLF:+sofLF.toFixed(2),rakeLF:+rakeLF.toFixed(2),
      roofSF:+roofSF.toFixed(2),gableSF:+gSF.toFixed(2),wallSheathingSF:+wsSF.toFixed(2),
      floorSF:+flSF.toFixed(2),snappedWidth:snW,
    },
  };
}

function buildRows(inputs,result){
  const{wallThickness:wt,wallHeight:wh,roofOverhangInches:oi,sidingType:st}=inputs;
  const sc=SIDING_CODES[st]??{};
  const sfKey=`${oi}" Soffit`;
  const all=[
    ['Framing','Sill Seal','Each',SILL_SEAL_CODES[wt],result.sillSealRolls],
    ['Framing',"Treated Mudsill 12'",'Each',TREATED_CODES[wt][12],result.treatedMudsillEach],
    ['Framing',"Treated Mudsill 14'",'Each',TREATED_CODES[wt][14],result.treatedMudsillEach],
    ['Framing',"Treated Mudsill 16'",'Each',TREATED_CODES[wt][16],result.treatedMudsillEach],
    ['Framing','Wall Studs','Each',STUD_CODES[wt][wh],result.studCount],
    ['Framing',"Wall Wind Wash 12'",'Each',WIND_WASH_CODES[wt][12],result.windWashFramingCount],
    ['Framing',"Wall Wind Wash 14'",'Each',WIND_WASH_CODES[wt][14],result.windWashFramingCount],
    ['Framing',"Wall Wind Wash 16'",'Each',WIND_WASH_CODES[wt][16],result.windWashFramingCount],
    ['Framing','2x12 Header','Each','0212fir12',result.headers2x12],
    ['Framing','LVL','LF','11lvl00',result.lvlLF],
    ['Framing','Wall Sheathing OSB (4x8)','Each','osb4843',result.wallSheathingOSB],
    ['Framing','Tyvek Housewrap','Each',tyvekCode(wh),result.tyvekRolls],
    ['Framing','Tyvek Tape','Each','tyvtapehw255',result.tyvekTapeRolls],
    ['Framing','Rafter Tie Strap','Each','simlsta24',result.rafterTieStraps],
    ['Framing','Bearing Plate','Each','simbps583hdg',result.bearingPlates],
    ['Framing','Roof Sheathing OSB (4x8)','Each','osb4850',result.roofSheathingOSB],
    ['Framing','Plywood Clips (H-Clips)','Each','simpscl12',result.plyClipBags],
    ['Framing',"Soffit Wind Wash 2x4 12'",'Each','0204ww12',result.windWash2x4Count],
    ['Framing',"Soffit Wind Wash 2x4 14'",'Each','0204ww14',result.windWash2x4Count],
    ['Framing',"Soffit Wind Wash 2x4 16'",'Each','0204ww16',result.windWash2x4Count],
    ['Framing',"Rake Wind Wash 2x6 12'",'Each','0206ww12',result.windWash2x6Count],
    ['Framing',"Rake Wind Wash 2x6 14'",'Each','0206ww14',result.windWash2x6Count],
    ['Framing',"Rake Wind Wash 2x6 16'",'Each','0206ww16',result.windWash2x6Count],
    ['Framing','Hurricane Ties','Each','simh25a',result.hurricaneTies],
    ['Framing','Flashing Tape (Window)','Each','tyvtapedup4x75',result.flashingTapeRolls],
    ['Framing','Dupont Window Sealant','Each','caulkdupac10',result.dupontSealantTubes],
    ['Framing','Truss Pack','Each','nsbeisser',result.trussPacks],
    ['Shingles','Shingles','Each','shinocdurdw',result.shingleBundles],
    ['Shingles','Felt','Each','felt302sq',result.feltRolls],
    ['Shingles','Hip & Ridge','Each','shinocdurdwa',result.hipRidgeBundles],
    ['Shingles','Ridge Cap Vent','Each','ridgevent20',result.ridgeCapVentPieces],
    ['Shingles','Starter Strip','Each','shincertstart',result.starterRolls],
    ['Shingles','Drip Edge (ODE)','Each','rollexwhtode12',result.odePieces],
    ['Siding','8" Lap Siding','Each',sc['Lap Siding']??'',result.lapSidingBoards],
    ['Siding',`${oi}" Soffit Vent`,'Each',sc[sfKey]??'',result.soffitVentBoards],
    ['Siding','12" Rake Board','Each',sc['Rake Board']??'',result.rakeBoards],
    ['Siding','Vinyl J-Channel','Each',sc['J-Channel']??'',result.vinylJChannelPcs],
    ['Siding','Metal Starter Strip','Each',sc['Metal Starter']??'',result.metalStarterPcs],
    ['Siding','Single Under-Sill','Each',sc['Single Under']??'',result.singleUnderSillPcs],
    ['Siding','Rollex Starter','Each',sc['Rollex Start']??'',result.rollexStarterPcs],
    ['Siding','MD Divider','Each',sc['MD Divider']??'',result.mdDividerPcs],
    ['Siding','Steel Nails','Each',sc['Steel Nails']??'',result.steelNailsBags],
    ['Siding','Vinyl Lineal (Window Wrap)','Each',sc['Vinyl Lineal']??'',result.vinylLinealPcs],
    ['Siding','1x6 Fascia/Trim','Each',sc['1x6']??'',result.boards1x6],
    ['Siding','1x8 Soffit/Rake Trim','Each',sc['1x8']??'',result.boards1x8],
    ['Siding','5/4x6 Corner/Door Trim','Each',sc['5/4x6']??'',result.boards5_4x6],
    ['Siding','Tin Step Flashing','Each','flashtsb611',result.tinShingles],
    ['Siding','Z-Flashing','Each','flashzgalvz110',result.zFlashPcs],
    ['Siding','Caulk','Each','caulkquad461',result.caulkTubes],
    ['Siding','10d Galvanized Nails','lb','nailgalvbox10d',result.nails10dLbs],
    ['Siding','16d Galvanized Nails','lb','nailgalvbox16d',result.nails16dLbs],
    ['Siding','Roofing Nails','lb','nailroofeg2',result.roofingNailsLbs],
    ['Windows & Doors','Vinyl Window','Each','zzgr0000143476',result.vinylWindows],
    ['Windows & Doors','Steel Service Door','Each','zzgr0000143477',result.serviceDoors],
  ];
  return all.filter(([,,,,q])=>q>0).map(([g,d,u,c,q])=>({group:g,description:d,uom:u,itemCode:c,qty:q}));
}

function toCSV(rows,inputs,geo){
  const date=new Date().toLocaleDateString('en-US');
  const esc=v=>/[",\r\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:`${v}`;
  const lines=[
    ['Beisser Lumber \u2014 Garage Material Takeoff'],[],
    ['Job Name',inputs.jobName??''],['Branch',inputs.branch??''],
    ['Sales Agent',inputs.salesAgent??''],['Date',date],[],
    ['Width',`${inputs.width} ft`],['Length',`${inputs.length} ft`],
    ['Wall Thickness',inputs.wallThickness],['Wall Height',`${inputs.wallHeight} ft`],
    ['Roof Pitch',inputs.roofPitch],['Overhang',`${inputs.roofOverhangInches}"`],
    ['Siding',inputs.sidingType],['Shingles',inputs.includeShingles?'Yes':'No'],[],
    ['Perimeter',`${geo.perimeterLF} LF`],['Roof SF',`${geo.roofSF} SF`],
    ['Wall+Gable SF',`${geo.wallSheathingSF} SF`],[],
    ['Group','Description','UOM','Item Code','Qty'],
    ...rows.map(r=>[r.group,r.description,r.uom,r.itemCode,r.qty]),
  ];
  return lines.map(row=>row.map(c=>esc(String(c??''))).join(',')).join('\r\n');
}

// ── TAKEOFF GROUP (extracted to allow key on fragment) ───────────────────────

function TakeoffGroup({ group, rows }) {
  return (
    <>
      <tr className="group-row">
        <td colSpan={4}>{group}</td>
      </tr>
      {rows.map((r, i) => (
        <tr key={`${group}-${i}`}>
          <td className="description">{r.description}</td>
          <td className="uom">{r.uom}</td>
          <td className="code">{r.itemCode}</td>
          <td className="qty">{r.qty}</td>
        </tr>
      ))}
    </>
  );
}

// ── GARAGE SVG SKETCH ────────────────────────────────────────────────────────

function GarageSketch({ inputs }) {
  const { width, length, wallHeight, roofPitch, roofOverhangInches,
          overheadDoors, serviceDoors, windows, sidingType } = inputs;

  const W = Number(width) || 24;
  const L = Number(length) || 32;
  const H = Number(wallHeight) || 8;
  const pitch = roofPitch || '4/12';
  const slope = ROOF_PITCH_DATA[pitch]?.slope ?? (4/12);
  const ohFt = (Number(roofOverhangInches) || 12) / 12;
  const od = Number(overheadDoors) || 0;
  const sd = Number(serviceDoors) || 0;
  const win = Number(windows) || 0;

  // SVG canvas
  const vw = 440, vh = 320;
  const pad = 30;
  const unitPx = Math.min((vw - pad*2) / (W + L*0.4 + ohFt*2 + 4), 10);

  // Front face (gable end) — centered
  const fW = W * unitPx;
  const fH = H * unitPx;
  const riseH = slope * (W / 2) * unitPx;
  const ohPx = ohFt * unitPx;
  const peakX = vw/2;
  const wallTop = vh - pad - fH;
  const wallBot = vh - pad;
  const wallL = peakX - fW/2;
  const wallR = peakX + fW/2;

  // Side face (perspective offset)
  const sideDX = L * unitPx * 0.35;
  const sideDY = L * unitPx * 0.18;
  const sideDepth = Math.min(sideDX, 120);
  const sDepth = sideDepth;
  const sDY = sideDY * (sideDepth / sideDX);

  const roofPeakX = peakX + sDepth;
  const roofPeakY = wallTop - riseH - ohPx*slope;

  // Overhead door dimensions
  const odW = od > 0 ? Math.min(fW * 0.42, fW / (od + 0.3)) : 0;
  const odH = fH * 0.75;
  const odY = wallTop + fH - odH;
  const odCenters = od === 1
    ? [peakX]
    : od === 2
    ? [peakX - fW * 0.26, peakX + fW * 0.26]
    : [];

  // Service door on right side face
  const sdoorW = 1 * unitPx;
  const sdoorH = 7 * unitPx * 0.8;

  // Windows on side face
  const winW = 2.5 * unitPx;
  const winH = 1.8 * unitPx;

  const sidingLabel = sidingType !== 'N/A' ? sidingType : '';

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} style={{ background: '#fafafa', borderRadius: 4 }} aria-label="Garage diagram">
      <defs>
        <pattern id="siding-lp" patternUnits="userSpaceOnUse" width="4" height="8">
          <rect width="4" height="8" fill="#e8dcc8" />
          <line x1="0" y1="0" x2="4" y2="0" stroke="#c9b89a" strokeWidth="0.8" />
          <line x1="0" y1="4" x2="4" y2="4" stroke="#c9b89a" strokeWidth="0.8" />
        </pattern>
        <pattern id="siding-vinyl" patternUnits="userSpaceOnUse" width="4" height="6">
          <rect width="4" height="6" fill="#d8e4f0" />
          <line x1="0" y1="0" x2="4" y2="0" stroke="#b8c9dd" strokeWidth="0.7" />
          <line x1="0" y1="3" x2="4" y2="3" stroke="#b8c9dd" strokeWidth="0.7" />
        </pattern>
        <pattern id="siding-hardie" patternUnits="userSpaceOnUse" width="4" height="7">
          <rect width="4" height="7" fill="#d0cfc8" />
          <line x1="0" y1="0" x2="4" y2="0" stroke="#b0afa8" strokeWidth="0.7" />
          <line x1="0" y1="3.5" x2="4" y2="3.5" stroke="#b0afa8" strokeWidth="0.7" />
        </pattern>
      </defs>

      {/* ── SIDE FACE (right, perspective) ── */}
      {/* Side wall */}
      <polygon
        points={`${wallR},${wallTop} ${wallR+sDepth},${wallTop-sDY} ${wallR+sDepth},${wallBot-sDY} ${wallR},${wallBot}`}
        fill={sidingType==='LP'?'url(#siding-lp)':sidingType==='Vinyl'?'url(#siding-vinyl)':sidingType==='Hardie'?'url(#siding-hardie)':'#ccc'}
        stroke="#666" strokeWidth="1"
      />
      {/* Roof right side */}
      <polygon
        points={`${wallR},${wallTop-riseH} ${wallR+sDepth},${wallTop-riseH-sDY} ${wallR+sDepth+ohPx},${wallTop-riseH-sDY+ohPx*0.1} ${wallR+ohPx},${wallTop-riseH+ohPx*0.1}`}
        fill="#6b7280" stroke="#444" strokeWidth="1"
      />
      {/* Soffit / eave right */}
      <line x1={wallR} y1={wallTop} x2={wallR+ohPx} y2={wallTop-ohPx*0.1} stroke="#555" strokeWidth="1.5" />

      {/* Service door on side */}
      {sd > 0 && (
        <rect
          x={wallR + sDepth*0.4}
          y={wallBot - sDY*0.4 - sdoorH}
          width={sdoorW}
          height={sdoorH}
          fill="#8BAABF"
          stroke="#555"
          strokeWidth="1"
          transform={`skewX(-${Math.atan(sDY/sDepth) * 180 / Math.PI})`}
        />
      )}

      {/* Windows on side */}
      {Array.from({length: win}).map((_, i) => {
        const wx = wallR + sDepth * (0.25 + i * (0.5 / Math.max(win, 1)));
        const wy = wallBot - sDY * (0.25 + i * (0.5 / Math.max(win, 1))) - winH - fH*0.25;
        return (
          <rect key={i} x={wx} y={wy} width={winW} height={winH}
            fill="#BDE0F0" stroke="#555" strokeWidth="1" opacity="0.8" />
        );
      })}

      {/* ── FRONT FACE (gable end) ── */}
      {/* Front wall */}
      <rect
        x={wallL} y={wallTop} width={fW} height={fH}
        fill={sidingType==='LP'?'url(#siding-lp)':sidingType==='Vinyl'?'url(#siding-vinyl)':sidingType==='Hardie'?'url(#siding-hardie)':'#ddd'}
        stroke="#555" strokeWidth="1.5"
      />

      {/* Overhead door openings */}
      {odCenters.map((cx, i) => (
        <g key={i}>
          <rect
            x={cx - odW/2} y={odY} width={odW} height={odH}
            fill="#7899B0" stroke="#445" strokeWidth="1.2"
          />
          {/* Panel lines */}
          <line x1={cx - odW/2} y1={odY + odH*0.33} x2={cx + odW/2} y2={odY + odH*0.33} stroke="#556" strokeWidth="0.7" />
          <line x1={cx - odW/2} y1={odY + odH*0.66} x2={cx + odW/2} y2={odY + odH*0.66} stroke="#556" strokeWidth="0.7" />
        </g>
      ))}

      {/* ── ROOF ── */}
      {/* Roof gable triangle */}
      <polygon
        points={`${wallL-ohPx},${wallTop} ${peakX},${wallTop-riseH-ohPx*slope} ${wallR+ohPx},${wallTop}`}
        fill="#555" stroke="#333" strokeWidth="1.5"
      />
      {/* Rake overhangs */}
      <line x1={wallL-ohPx} y1={wallTop} x2={peakX} y2={wallTop-riseH-ohPx*slope} stroke="#444" strokeWidth="2" />
      <line x1={wallR+ohPx} y1={wallTop} x2={peakX} y2={wallTop-riseH-ohPx*slope} stroke="#444" strokeWidth="2" />
      {/* Eave soffit */}
      <line x1={wallL-ohPx} y1={wallTop} x2={wallR+ohPx} y2={wallTop} stroke="#666" strokeWidth="2.5" />

      {/* ── DIMENSION LABELS ── */}
      <g fill="#374151" fontSize="11" fontFamily="Georgia,serif">
        {/* Width */}
        <line x1={wallL} y1={wallBot+14} x2={wallR} y2={wallBot+14} stroke="#C8181E" strokeWidth="1" markerEnd="url(#arr)" />
        <text x={peakX} y={wallBot+24} textAnchor="middle" fontWeight="bold" fill="#C8181E" fontSize="12">{W}&apos;</text>
        {/* Height */}
        <line x1={wallL-16} y1={wallTop} x2={wallL-16} y2={wallBot} stroke="#C8181E" strokeWidth="1" />
        <text x={wallL-20} y={(wallTop+wallBot)/2} textAnchor="end" fill="#C8181E" fontSize="11">{H}&apos;</text>
        {/* Pitch label */}
        <text x={peakX} y={wallTop-riseH-ohPx*slope-10} textAnchor="middle" fill="#6b7280" fontSize="10">{pitch}</text>
        {/* Length hint */}
        <text x={wallR+sDepth/2+4} y={wallBot-sDY/2} fill="#6b7280" fontSize="10" transform={`rotate(-${Math.atan(sDY/sDepth)*180/Math.PI}, ${wallR+sDepth/2+4}, ${wallBot-sDY/2})`}>{L}&apos;</text>
      </g>

      {/* Siding label */}
      {sidingLabel && (
        <text x={wallL+4} y={wallTop+14} fontSize="9" fill="rgba(0,0,0,0.35)" fontFamily="sans-serif">{sidingLabel}</text>
      )}
    </svg>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────

const DEFAULT_INPUTS = {
  jobName: '',
  branch: 'Grimes',
  agentId: '',
  agentPin: '',
  wallThickness: '2x4',
  wallHeight: 8,
  width: '',
  length: '',
  roofPitch: '4/12',
  roofOverhangInches: 12,
  includeShingles: false,
  sidingType: 'LP',
  wrapWindows: true,
  overheadDoors: 1,
  serviceDoors: 0,
  windows: 0,
};

export default function CalculatorPage() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [agents, setAgents] = useState([]);
  const [result, setResult] = useState(null);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [saveMsg, setSaveMsg] = useState('');

  // Load agents from API
  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAgents(data);
      })
      .catch(() => {});
  }, []);

  // Filter agents by branch
  const branchAgents = agents.filter(a => a.branch === inputs.branch);

  // Recalculate on every input change
  useEffect(() => {
    const w = Number(inputs.width);
    const l = Number(inputs.length);
    if (!w || !l || w < 1 || w > 34 || l < 1 || l > 50) {
      setResult(null);
      setRows([]);
      return;
    }
    try {
      const calcInputs = {
        ...inputs,
        wallHeight: Number(inputs.wallHeight),
        width: w,
        length: l,
        roofOverhangInches: Number(inputs.roofOverhangInches),
        overheadDoors: Number(inputs.overheadDoors),
        serviceDoors: Number(inputs.serviceDoors),
        windows: Number(inputs.windows),
      };
      const res = calculateGarage(calcInputs);
      const r = buildRows(calcInputs, res);
      setResult(res);
      setRows(r);
    } catch {
      setResult(null);
      setRows([]);
    }
  }, [inputs]);

  const set = (key, val) => setInputs(prev => ({ ...prev, [key]: val }));

  const handleSaveExport = async () => {
    // Validate
    const errs = [];
    if (!inputs.jobName.trim()) errs.push('Job name is required.');
    if (!inputs.agentId) errs.push('Select a sales agent.');
    if (!inputs.agentPin || !/^\d{4}$/.test(inputs.agentPin)) errs.push('PIN must be 4 digits.');
    if (!inputs.width || Number(inputs.width) < 1 || Number(inputs.width) > 34) errs.push('Width must be 1–34 ft.');
    if (!inputs.length || Number(inputs.length) < 1 || Number(inputs.length) > 50) errs.push('Length must be 1–50 ft.');
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);

    const agent = agents.find(a => a.id === Number(inputs.agentId));
    const calcInputs = {
      ...inputs,
      salesAgent: agent?.name ?? '',
      wallHeight: Number(inputs.wallHeight),
      width: Number(inputs.width),
      length: Number(inputs.length),
      roofOverhangInches: Number(inputs.roofOverhangInches),
      overheadDoors: Number(inputs.overheadDoors),
      serviceDoors: Number(inputs.serviceDoors),
      windows: Number(inputs.windows),
    };

    setSaveStatus('saving');

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...calcInputs,
          agentPin: inputs.agentPin,
          geometry: result?._geometry,
          takeoffRows: rows,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveStatus('error');
        setSaveMsg(data.error || 'Save failed');
        return;
      }
      setSaveStatus('saved');
      setSaveMsg(`Quote #${data.quoteId} saved.`);

      // Trigger CSV download
      const csv = toCSV(rows, calcInputs, result._geometry);
      const slug = (calcInputs.jobName || 'takeoff').replace(/\s+/g, '_').toLowerCase();
      const date = new Date().toISOString().slice(0, 10);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${slug}_${date}.csv`; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch {
      setSaveStatus('error');
      setSaveMsg('Network error — check connection.');
    }
  };

  const geo = result?._geometry;
  const hasResult = result !== null && rows.length > 0;

  // Group rows by section
  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.group]) grouped[r.group] = [];
    grouped[r.group].push(r);
  }

  return (
    <>
      <header className="site-header">
        <a href="/" className="logo"><strong>Beisser</strong> Lumber — Garage Estimator</a>
        <div className="badge">Gabled Garages Only</div>
        <nav style={{ marginLeft: 'auto' }}>
          <Link href="/admin">Admin</Link>
        </nav>
      </header>

      <div className="page">
        <div className="two-col">

          {/* ── LEFT: FORM ── */}
          <div className="card">
            <div className="card-head"><h2>Project Details</h2></div>
            <div className="card-body">

              <div className="section-label">Job Info</div>

              <div className="field">
                <label>Job Name <span style={{fontWeight:400,color:'var(--gray-5)'}}>(max 20 chars)</span></label>
                <input type="text" maxLength={20} placeholder="Smith Garage"
                  value={inputs.jobName}
                  onChange={e => set('jobName', e.target.value)} />
              </div>

              <div className="field">
                <label>Branch</label>
                <select value={inputs.branch} onChange={e => { set('branch', e.target.value); set('agentId', ''); }}>
                  <option value="Grimes">Grimes</option>
                  <option value="Coralville">Coralville</option>
                  <option value="Fort_Dodge">Fort Dodge</option>
                </select>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Sales Agent</label>
                  <select value={inputs.agentId} onChange={e => set('agentId', e.target.value)}>
                    <option value="">— select —</option>
                    {branchAgents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Agent PIN</label>
                  <input type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                    className="pin-input"
                    value={inputs.agentPin}
                    onChange={e => set('agentPin', e.target.value.replace(/\D/g, '').slice(0,4))} />
                </div>
              </div>

              <div className="section-label">Dimensions</div>

              <div className="field-row">
                <div className="field">
                  <label>Width — Gable End (ft)</label>
                  <input type="number" min={1} max={34} step={1} placeholder="28"
                    value={inputs.width}
                    onChange={e => set('width', e.target.value)} />
                </div>
                <div className="field">
                  <label>Length (ft)</label>
                  <input type="number" min={1} max={50} step={1} placeholder="32"
                    value={inputs.length}
                    onChange={e => set('length', e.target.value)} />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Wall Thickness</label>
                  <select value={inputs.wallThickness} onChange={e => set('wallThickness', e.target.value)}>
                    <option value="2x4">2x4</option>
                    <option value="2x6">2x6</option>
                  </select>
                </div>
                <div className="field">
                  <label>Wall Height (ft)</label>
                  <select value={inputs.wallHeight} onChange={e => set('wallHeight', Number(e.target.value))}>
                    {[8,9,10,12,14].map(h => <option key={h} value={h}>{h}&apos;</option>)}
                  </select>
                </div>
              </div>

              <div className="section-label">Roof</div>

              <div className="field-row">
                <div className="field">
                  <label>Roof Pitch</label>
                  <select value={inputs.roofPitch} onChange={e => set('roofPitch', e.target.value)}>
                    <option value="4/12">4/12</option>
                    <option value="6/12">6/12</option>
                    <option value="8/12">8/12</option>
                  </select>
                </div>
                <div className="field">
                  <label>Overhang</label>
                  <select value={inputs.roofOverhangInches} onChange={e => set('roofOverhangInches', Number(e.target.value))}>
                    <option value={12}>12&quot;</option>
                    <option value={16}>16&quot;</option>
                    <option value={24}>24&quot;</option>
                  </select>
                </div>
              </div>

              <div className="check-row">
                <input type="checkbox" id="shingles" checked={inputs.includeShingles}
                  onChange={e => set('includeShingles', e.target.checked)} />
                <label htmlFor="shingles">Include shingles in takeoff</label>
              </div>

              <div className="section-label">Siding</div>

              <div className="field">
                <label>Siding Type</label>
                <select value={inputs.sidingType} onChange={e => set('sidingType', e.target.value)}>
                  <option value="LP">LP SmartSide</option>
                  <option value="Hardie">James Hardie</option>
                  <option value="Vinyl">Vinyl</option>
                  <option value="N/A">None / N/A</option>
                </select>
              </div>

              {inputs.sidingType !== 'N/A' && (
                <div className="check-row">
                  <input type="checkbox" id="wrapW" checked={inputs.wrapWindows}
                    onChange={e => set('wrapWindows', e.target.checked)} />
                  <label htmlFor="wrapW">Wrap windows with trim</label>
                </div>
              )}

              <div className="section-label">Doors & Windows</div>

              <div className="field-row">
                <div className="field">
                  <label># Overhead Doors</label>
                  <select value={inputs.overheadDoors} onChange={e => set('overheadDoors', Number(e.target.value))}>
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </div>
                <div className="field">
                  <label># Service Doors</label>
                  <select value={inputs.serviceDoors} onChange={e => set('serviceDoors', Number(e.target.value))}>
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label># Vinyl Windows</label>
                <select value={inputs.windows} onChange={e => set('windows', Number(e.target.value))}>
                  {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {errors.length > 0 && (
                <div className="error-box" style={{marginTop:10}}>
                  <p>Please fix the following:</p>
                  <ul>{errors.map((e,i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="success-box" style={{marginTop:10}}>{saveMsg}</div>
              )}
              {saveStatus === 'error' && (
                <div className="error-box" style={{marginTop:10}}><p>{saveMsg}</p></div>
              )}

              <button
                className="btn btn-primary"
                style={{marginTop:14}}
                onClick={handleSaveExport}
                disabled={!hasResult || saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving…' : '⬇ Save & Export CSV'}
              </button>
            </div>
          </div>

          {/* ── RIGHT: SKETCH + TABLE ── */}
          <div>
            {/* Garage Sketch */}
            <div className="sketch-wrap">
              <GarageSketch inputs={inputs} />
            </div>

            {/* Geometry pills */}
            {geo && (
              <div className="geo-bar">
                {[
                  ['Perimeter', `${geo.perimeterLF} LF`],
                  ['Roof SF', `${geo.roofSF} SF`],
                  ['Wall SF', `${geo.wallSheathingSF} SF`],
                  ['Soffit', `${geo.soffitLF} LF`],
                  ['Rake', `${geo.rakeLF} LF`],
                ].map(([label, val]) => (
                  <div key={label} className="geo-pill">
                    <strong>{val}</strong> {label}
                  </div>
                ))}
              </div>
            )}

            {/* Takeoff table or empty state */}
            {!hasResult ? (
              <div className="card">
                <div className="empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  <p>Enter dimensions to see the takeoff</p>
                  <small>Gabled garages only · max 34&apos; wide · max 50&apos; long</small>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-head">
                  <h2>{inputs.jobName || 'Takeoff'} &mdash; {rows.length} line items</h2>
                  <span style={{fontSize:12,color:'var(--gray-5)'}}>
                    {inputs.width}&apos; × {inputs.length}&apos; · {inputs.wallThickness} · {inputs.roofPitch} · {inputs.sidingType}
                  </span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>UOM</th>
                        <th>Item Code</th>
                        <th className="right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(grouped).map(([group, groupRows]) => (
                        <TakeoffGroup key={group} group={group} rows={groupRows} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
