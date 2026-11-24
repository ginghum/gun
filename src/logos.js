// Original SVG emblems. Colors reference official character art (see docs/decisions.md); artwork is not redistributed.
const CHAR_EMBLEMS = {
 c0: ['#d8f6ff','火花', '<path d="M33 8 23 27h9l-4 17 16-23H33l5-13Z"/><path d="m14 15 4 5m26 21 5 3M10 33h7m29-22-4 6"/>'],
 c1: ['#bba8e2','薬瓶', '<path d="M25 9h14m-12 0v12L17 41q-2 5 4 5h22q6 0 4-5L37 21V9M22 32h20"/><path d="M32 33v9m-4-5h8"/>'],
 c2: ['#d49bea','拳とハート', '<path d="M19 31v-9q0-5 5-3v-4q3-5 6 0 3-5 6 0 4-4 7 1v18l-7 12H23l-7-11q-3-7 3-8l8 9"/><path d="M12 13q-7-8-10 0 0 4 10 11 10-7 10-11-3-8-10 0Z" transform="translate(11 0) scale(.6)"/>'],
 c3: ['#c6b7b2','照準', '<circle cx="32" cy="28" r="16"/><circle cx="32" cy="28" r="7"/><path d="M32 7v9m0 24v10M11 28h9m24 0h9m-8 14 7 7"/>'],
 c4: ['#f28b53','送り火', '<path d="M31 7c4 15-12 14-9 27 2-5 7-6 10-12 1 8 13 11 10 21-4 12-26 8-27-4-2-13 10-17 16-32Z"/><path d="M33 35c-9 9-5 15 0 14 8-1 6-8 0-14Z"/>'],
 c5: ['#dfc462','結び目', '<path d="M32 17C9-7 4 30 32 48 60 30 55-7 32 17Z"/><path d="m19 29 9 6 11-12m-7 25v6"/>'],
 c6: ['#ed8265','七つ星', '<path d="m32 8 6 13 15 2-11 10 3 15-13-7-13 7 3-15-11-10 15-2Z"/><path d="M8 44v8m-4-4h8m40-33v8m-4-4h8"/>'],
 c7: ['#96b9ff','舞扇', '<path d="M9 19q23-21 46 0L32 49Z"/><path d="m17 14 15 35m-3-41 3 41m13-35L32 49M9 19q23 9 46 0"/>'],
 c8: ['#77ddc6','音の翼', '<path d="M34 10v29q-13-7-14 3-1 9 9 6 5-2 5-8V20l13-4v17q-10-4-11 4-1 8 7 6 4-1 4-9V9Z"/><path d="m8 24 4 4-4 4m48-7-4 4 4 4"/>'],
 c9: ['#b6d488','八角回路', '<path d="m22 9 20 0 13 13v16L42 51H22L9 38V22Z"/><path d="M23 20h18v20H23Zm9-11v11m0 20v11M9 30h14m18 0h14m-28-7 10 14m0-14L27 37"/>'],
 c10:['#ce9baf','紫電の針', '<path d="m36 7-14 23h12L23 51l22-27H32Z"/><path d="m12 18 5 4m-9 9h8m32 10 6 4M43 8l6 6"/>'],
 c11:['#a898eb','猫の鍵', '<path d="m17 24 1-15 12 10h6L48 9l1 15q8 24-16 25-25-1-16-25Z"/><path d="M24 29h2m13 0h2m-11 8h6m-4 0v5m-21-9h9m24 0h10"/>']
};
const GUN_EMBLEMS = {
 g0:['#a6c6c5','煙の連装銃','<path d="M10 24h32v10H10Zm9 10-4 13h10l5-13m12-12h13v14H42M13 15q6-8 12 0t12 0"/>'],
 g1:['#d5b86e','雷の砲身','<path d="M8 25h44v12H8Zm8 12-4 9h24l-2-9m3-28L26 23h10l-4 8 17-16H38l4-6Z"/>'],
 g2:['#a5b9a6','単眼の機構','<path d="M10 20h44v20H10Zm22-8v8m-18 6H5m54 0h-9"/><circle cx="32" cy="30" r="8"/><path d="m24 40-5 9h25l-5-9"/>'],
 g3:['#d99787','重なる銃口','<path d="M11 18h34v9H11Zm8 13h34v9H19ZM25 40l-5 9h10l6-9M45 16v13m8 0v13"/>'],
 g4:['#becbcd','白い面の盾','<path d="m15 12 17-5 17 5v23L32 51 15 35Z"/><path d="m23 23 6 4m12-4-6 4m-10 9h14M8 30h7m34 0h7"/>'],
 g5:['#a9b3d6','共鳴する砲口','<circle cx="32" cy="29" r="10"/><path d="M22 24H9v10h13m20-10h13v10H42M17 11q-12 18 0 36m30-36q12 18 0 36M32 39v11"/>'],
 g6:['#c49e8b','四連機関銃','<path d="M9 19h39v22H9Zm5 5h29m-29 6h29m-29 6h29m5-19h8v26h-8M22 41l-6 9h14l5-9"/>'],
 g7:['#df9f75','炎の砲口','<path d="M10 29h26v11H10Zm8 11-4 10h11l5-10m8-10c-8-9 10-15 8-25 18 19 11 29 2 33m-8-10c2-5 9-5 8-10"/>'],
 g8:['#a2bca3','破砕する杖','<path d="M27 10h10v33H27Zm-7 0h24v9H20Zm6 33-8 10h28l-8-10M10 21l8 5-8 7m44-12-8 5 8 7"/>'],
 g9:['#c6d1b7','鋭い小型銃','<path d="M9 20h42v12H30L20 49H10l9-17H9Zm42-3h6v18h-6m-35-9h25"/>'],
 g10:['#a8bdcf','環状の装填器','<circle cx="32" cy="29" r="21"/><circle cx="32" cy="29" r="7"/><path d="M32 9v12m0 16v13M12 29h12m16 0h12M18 15l9 9m10 10 9 9m0-28-9 9m-10 10-9 9"/>'],
 g11:['#c3b48b','双砲の巨銃','<path d="M8 15h46v12H8Zm0 17h46v12H8Zm9 12-3 8h30l-3-8M47 12v35M15 21h23m-23 17h23"/>'],
 g12:['#adbad1','六連の機構','<path d="m22 9 20 0 12 20-12 20H22L10 29Z"/><circle cx="24" cy="20" r="4"/><circle cx="40" cy="20" r="4"/><circle cx="18" cy="31" r="4"/><circle cx="46" cy="31" r="4"/><circle cx="26" cy="42" r="4"/><circle cx="38" cy="42" r="4"/>'],
 g13:['#b8a6c9','夢を断つ月','<path d="M44 9a23 23 0 1 0 10 33A19 19 0 0 1 44 9Z"/><path d="m27 20 10 5-12 11 12 3m7-25 2 3m-4 7 5 1"/>'],
 g14:['#99c4b8','反響する音叉','<path d="M21 9v21q0 12 11 12t11-12V9M32 42v12M10 19q-7 11 0 22m44-22q7 11 0 22"/>'],
 g15:['#a5c4a3','三つの眼','<path d="M6 30q8-13 17 0-8 13-17 0Zm17 0q9-13 18 0-9 13-18 0Zm18 0q9-13 17 0-8 13-17 0Z"/><path d="M15 28v4m17-4v4m17-4v4M21 13h22M21 47h22"/>'],
 g16:['#d5aa80','燃える歯車','<path d="m29 7 4 8 8-4 2 9 9 2-4 8 8 4-8 6 3 8-10 0-5 9-6-8-9 3-1-10-10-4 7-7-5-9 10-1Z"/><path d="M32 22c10 9 9 17 0 18-10-1-7-11 0-18Z"/>'],
 g17:['#a8acd4','パルスの回路','<path d="M7 30h12l6-14 10 29 6-15h16M10 12h12m20 0h12M10 48h12m20 0h12"/><circle cx="9" cy="12" r="2"/><circle cx="55" cy="48" r="2"/>']
};
export function emblem(kind,id){const entry=(kind==='character'?CHAR_EMBLEMS:GUN_EMBLEMS)[id];if(!entry)return '';const [color,label,paths]=entry;return `<svg class="emblem emblem-${kind}" viewBox="0 0 64 64" aria-hidden="true" focusable="false" style="--emblem-color:${color}"><rect class="emblem-bg" x="2" y="2" width="60" height="60" rx="12"/><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;}
export const EMBLEM_COUNTS={characters:Object.keys(CHAR_EMBLEMS).length,guns:Object.keys(GUN_EMBLEMS).length};

export function characterColor(id){return CHAR_EMBLEMS[id]?.[0]||'#d8f6ff';}
