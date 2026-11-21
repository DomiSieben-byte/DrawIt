/* DrawIt – eigene Weihnachts-Sticker, Rahmen und Ausmalbilder (alles selbst gezeichnete Vektorgrafiken) */
(function () {
  'use strict';
  const R = Math.PI / 180;
  const f1 = n => Math.round(n * 10) / 10;
  const star = (cx, cy, Ro, Ri, n = 5, rot = -90) => {
    const p = [];
    for (let i = 0; i < n * 2; i++) { const a = (rot + i * 180 / n) * R, r = i % 2 ? Ri : Ro; p.push(f1(cx + r * Math.cos(a)) + ',' + f1(cy + r * Math.sin(a))); }
    return 'M' + p.join('L') + 'Z';
  };
  const OL = '#4a2f27';
  const holly = () => {
    const leaf = '<path d="M0 0 Q8 -13 22 -11 L27 -19 L34 -9 L45 -13 L44 -4 L57 0 L44 4 L45 13 L34 9 L27 19 L22 11 Q8 13 0 0Z" fill="#2f8f4e" stroke="#1d6b38" stroke-width="2" stroke-linejoin="round"/><path d="M4 0 H48" stroke="#1d6b38" stroke-width="1.6" stroke-linecap="round"/>';
    return `<g transform="translate(50,60) rotate(-32)">${leaf}</g><g transform="translate(50,60) rotate(-148)">${leaf}</g>` +
      '<circle cx="42" cy="62" r="8" fill="#c62d2d" stroke="#8f1d1d" stroke-width="2"/><circle cx="58" cy="62" r="8" fill="#c62d2d" stroke="#8f1d1d" stroke-width="2"/><circle cx="50" cy="52" r="8" fill="#d63a3a" stroke="#8f1d1d" stroke-width="2"/>' +
      '<circle cx="47" cy="49" r="2" fill="#fff" opacity=".7"/><circle cx="39" cy="59" r="2" fill="#fff" opacity=".7"/><circle cx="55" cy="59" r="2" fill="#fff" opacity=".7"/>';
  };
  const snowflake = (col, sw) => {
    let g = '';
    for (let k = 0; k < 3; k++) {
      g += `<g transform="rotate(${k * 60} 50 50)"><path d="M50 8 V92 M50 24 L40 12 M50 24 L60 12 M50 76 L40 88 M50 76 L60 88 M50 40 L42 32 M50 40 L58 32 M50 60 L42 68 M50 60 L58 68" /></g>`;
    }
    return `<g fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${g}<circle cx="50" cy="50" r="5" fill="${col}" stroke="none"/></g>`;
  };
  const bulbs = (W, y0, amp, n, cols) => {
    let path = `M0 ${y0}`, g = '';
    const pts = [];
    for (let i = 0; i <= 60; i++) { const x = W * i / 60, y = y0 + amp * Math.sin(i / 60 * n * Math.PI); pts.push([x, y]); }
    path = 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L');
    for (let i = 0; i < n; i++) {
      const x = W * (i + 0.5) / n, y = y0 + amp * Math.sin((i + 0.5) / n * n * Math.PI), c = cols[i % cols.length];
      g += `<rect x="${f1(x - 3)}" y="${f1(y - 1)}" width="6" height="7" fill="#555"/><path d="M${f1(x - 7)} ${f1(y + 6)} Q${f1(x)} ${f1(y + 30)} ${f1(x + 7)} ${f1(y + 6)}Z" fill="${c}" stroke="#0003" stroke-width="1"/><ellipse cx="${f1(x - 2)}" cy="${f1(y + 12)}" rx="1.8" ry="3" fill="#fff" opacity=".6"/>`;
    }
    return `<path d="${path}" fill="none" stroke="#444" stroke-width="2.2"/>${g}`;
  };

  const STICKERS = [
    { k: 'tree', n: 'Tannenbaum', body: `<path d="M50 6 L70 34 H60 L80 60 H67 L90 88 H10 L33 60 H20 L40 34 H30Z" fill="#2f8f4e" stroke="#1d6b38" stroke-width="2.5" stroke-linejoin="round"/><rect x="44" y="88" width="12" height="9" rx="1" fill="#7a4a2a"/><path d="${star(50, 9, 8, 3.4)}" fill="#f2b632" stroke="#c98a12" stroke-width="1.5" stroke-linejoin="round"/><circle cx="46" cy="44" r="3.4" fill="#c62d2d"/><circle cx="58" cy="62" r="3.4" fill="#f2b632"/><circle cx="38" cy="76" r="3.4" fill="#f2b632"/><circle cx="64" cy="80" r="3.4" fill="#c62d2d"/><circle cx="46" cy="64" r="3" fill="#c62d2d"/><circle cx="52" cy="26" r="3" fill="#c62d2d"/>` },
    { k: 'star', n: 'Stern', body: `<path d="${star(50, 53, 45, 19)}" fill="#f2b632" stroke="#c98a12" stroke-width="3.5" stroke-linejoin="round"/><path d="${star(50, 53, 27, 11)}" fill="#ffd966"/>` },
    { k: 'flake', n: 'Schneeflocke', body: snowflake('#5aaee0', 4.5) },
    { k: 'bauble', n: 'Kugel', body: `<path d="M50 20 V9" stroke="#c98a12" stroke-width="3" fill="none"/><rect x="42" y="17" width="16" height="11" rx="2.5" fill="#f2b632" stroke="#c98a12" stroke-width="1.8"/><circle cx="50" cy="60" r="33" fill="#c62d2d" stroke="#8f1d1d" stroke-width="2.5"/><path d="M19 52 Q50 70 81 52 M20 66 Q50 84 80 66" fill="none" stroke="#f2b632" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="38" cy="45" rx="8" ry="12" fill="#fff" opacity=".4" transform="rotate(25 38 45)"/>` },
    { k: 'gift', n: 'Geschenk', body: `<rect x="14" y="44" width="72" height="46" rx="2" fill="#c62d2d" stroke="${OL}" stroke-width="2.2"/><rect x="9" y="32" width="82" height="15" rx="2.5" fill="#a82424" stroke="${OL}" stroke-width="2.2"/><rect x="43" y="32" width="14" height="58" fill="#f2b632" stroke="${OL}" stroke-width="1.8"/><path d="M50 32 C28 4 8 22 38 32Z M50 32 C72 4 92 22 62 32Z" fill="#f2b632" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="50" cy="31" r="4" fill="#d99a14"/>` },
    { k: 'holly', n: 'Stechpalme', body: holly() },
    { k: 'cane', n: 'Zuckerstange', body: `<path d="M64 92 V38 A16 16 0 1 0 28 38" fill="none" stroke="#8f1d1d" stroke-width="19" stroke-linecap="round"/><path d="M64 92 V38 A16 16 0 1 0 28 38" fill="none" stroke="#fff" stroke-width="14.5" stroke-linecap="round"/><path d="M64 92 V38 A16 16 0 1 0 28 38" fill="none" stroke="#c62d2d" stroke-width="14.5" stroke-dasharray="9 12" stroke-dashoffset="-3"/>` },
    { k: 'bell', n: 'Glocke', body: `<path d="M50 14 C34 14 28 30 28 46 C28 62 18 66 14 76 H86 C82 66 72 62 72 46 C72 30 66 14 50 14Z" fill="#f2b632" stroke="#b9800f" stroke-width="3" stroke-linejoin="round"/><path d="M36 30 C32 40 32 54 34 62" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/><circle cx="50" cy="84" r="8" fill="#d99a14" stroke="#b9800f" stroke-width="2.5"/><path d="M50 14 C48 8 52 4 56 8" fill="none" stroke="#b9800f" stroke-width="3"/><path d="M50 18 L30 10 L34 28Z M50 18 L70 10 L66 28Z" fill="#c62d2d" stroke="#8f1d1d" stroke-width="2" stroke-linejoin="round"/><circle cx="50" cy="19" r="5" fill="#d63a3a" stroke="#8f1d1d" stroke-width="2"/>` },
    { k: 'candle', n: 'Kerze', body: `<path d="M50 6 C60 20 60 32 50 38 C40 32 40 20 50 6Z" fill="#ff9a1f" stroke="#d9741a" stroke-width="2"/><path d="M50 18 C55 26 55 32 50 35 C45 32 45 26 50 18Z" fill="#ffe27a"/><rect x="48.5" y="36" width="3" height="8" fill="#444"/><path d="M36 44 H64 V86 H36Z" fill="#fff7e6" stroke="${OL}" stroke-width="2.2"/><path d="M36 52 Q41 62 46 52 Q52 70 58 52 H64" fill="#fff" stroke="none"/><path d="M24 86 H76 L70 94 H30Z" fill="#c62d2d" stroke="#8f1d1d" stroke-width="2.2" stroke-linejoin="round"/>` },
    { k: 'snowman', n: 'Schneemann', body: `<circle cx="50" cy="78" r="20" fill="#fff" stroke="#8fb6cc" stroke-width="2.5"/><circle cx="50" cy="52" r="15" fill="#fff" stroke="#8fb6cc" stroke-width="2.5"/><circle cx="50" cy="29" r="12" fill="#fff" stroke="#8fb6cc" stroke-width="2.5"/><rect x="39" y="6" width="22" height="14" rx="2" fill="#2a2a2a"/><rect x="33" y="17" width="34" height="5" rx="2.5" fill="#2a2a2a"/><rect x="39" y="14" width="22" height="3" fill="#c62d2d"/><circle cx="46" cy="27" r="1.8" fill="#222"/><circle cx="54" cy="27" r="1.8" fill="#222"/><path d="M50 31 L64 34 L50 36Z" fill="#ff8a1f"/><path d="M38 40 Q50 48 62 40 L62 46 Q50 54 38 46Z" fill="#c62d2d"/><path d="M58 44 L66 58 L58 56Z" fill="#a82424"/><circle cx="50" cy="60" r="2.2" fill="#222"/><circle cx="50" cy="70" r="2.2" fill="#222"/><circle cx="50" cy="80" r="2.2" fill="#222"/><path d="M36 52 L16 40 M64 52 L84 40" stroke="#7a4a2a" stroke-width="3" stroke-linecap="round"/>` },
    { k: 'ginger', n: 'Lebkuchenmann', body: `<path d="M38 36 H62 L84 36 Q91 43 84 50 L68 54 L75 84 Q70 91 61 88 L50 72 L39 88 Q30 91 25 84 L32 54 L16 50 Q9 43 16 36Z" fill="#c68642" stroke="#8a5a2a" stroke-width="2.5" stroke-linejoin="round"/><circle cx="50" cy="24" r="14" fill="#c68642" stroke="#8a5a2a" stroke-width="2.5"/><path d="M40 36 H60" stroke="#c68642" stroke-width="6"/><circle cx="45" cy="22" r="1.8" fill="#fff"/><circle cx="55" cy="22" r="1.8" fill="#fff"/><path d="M44 29 Q50 34 56 29" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="50" cy="50" r="2.6" fill="#c62d2d"/><circle cx="50" cy="60" r="2.6" fill="#2f8f4e"/><path d="M18 40 L12 42 M82 40 L88 42 M30 84 L34 80 M70 84 L66 80" stroke="#fff" stroke-width="2" stroke-linecap="round"/>` },
    { k: 'heart', n: 'Herz', body: `<path d="M50 88 C10 58 6 30 28 22 C40 18 48 26 50 33 C52 26 60 18 72 22 C94 30 90 58 50 88Z" fill="#d63a3a" stroke="#8f1d1d" stroke-width="3" stroke-linejoin="round"/><path d="M26 34 Q30 26 38 28" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/>` },
    { k: 'hat', n: 'Weihnachtsmütze', body: `<path d="M14 76 C16 36 40 14 64 20 C78 24 82 40 90 60 L90 76Z" fill="#c62d2d" stroke="#8f1d1d" stroke-width="2.5" stroke-linejoin="round"/><rect x="8" y="68" width="84" height="20" rx="10" fill="#fff" stroke="#c9d4dc" stroke-width="2"/><circle cx="90" cy="56" r="9" fill="#fff" stroke="#c9d4dc" stroke-width="2"/>` },
    { k: 'sock', n: 'Nikolausstiefel', body: `<path d="M30 12 H62 V48 L82 64 Q92 74 82 85 Q72 92 62 84 L34 64 Q30 60 30 54Z" fill="#c62d2d" stroke="#8f1d1d" stroke-width="2.5" stroke-linejoin="round"/><rect x="26" y="8" width="40" height="15" rx="6" fill="#fff" stroke="#c9d4dc" stroke-width="2"/><path d="M74 66 Q90 76 82 85 Q74 90 68 84Z" fill="#fff"/><path d="M30 34 H62 M30 44 H62" stroke="#f2b632" stroke-width="4"/>` },
    { k: 'wreath', n: 'Kranz', body: (() => { let g = ''; for (let i = 0; i < 24; i++) { const a = i * 15; g += `<ellipse cx="50" cy="${i % 2 ? 22 : 18}" rx="${i % 2 ? 6 : 7}" ry="12" transform="rotate(${a} 50 50)" fill="${i % 2 ? '#2f8f4e' : '#1d6b38'}" stroke="#14502a" stroke-width="1.2"/>`; } for (let i = 0; i < 6; i++) g += `<circle cx="50" cy="19" r="3.2" fill="#c62d2d" transform="rotate(${i * 60 + 20} 50 50)"/>`; return g + '<path d="M50 84 L36 98 L44 80Z M50 84 L64 98 L56 80Z" fill="#c62d2d" stroke="#8f1d1d" stroke-width="1.8" stroke-linejoin="round"/><circle cx="50" cy="83" r="6" fill="#d63a3a" stroke="#8f1d1d" stroke-width="2"/>'; })() },
    { k: 'lights', n: 'Lichterkette', vb: [200, 50], sz: 4, body: bulbs(200, 10, 8, 9, ['#c62d2d', '#f2b632', '#2f8f4e', '#2a7fd0']) },
    { k: 'branch', n: 'Tannenzweig', vb: [160, 60], sz: 3, body: (() => { let g = '<path d="M4 34 Q80 22 156 30" fill="none" stroke="#6b4a2a" stroke-width="3.5" stroke-linecap="round"/>'; for (let i = 0; i < 16; i++) { const x = 14 + i * 9, y = 33 - i * 0.2 - Math.sin(i / 2) * 2; g += `<path d="M${f1(x)} ${f1(y)} L${f1(x + 10)} ${f1(y - 22 + i * 0.4)} M${f1(x)} ${f1(y)} L${f1(x + 10)} ${f1(y + 22 - i * 0.4)}" stroke="${i % 2 ? '#2f8f4e' : '#1d6b38'}" stroke-width="4.2" stroke-linecap="round"/>`; } return g + '<circle cx="46" cy="30" r="4.5" fill="#c62d2d"/><circle cx="54" cy="34" r="4.5" fill="#c62d2d"/><circle cx="100" cy="31" r="4.5" fill="#c62d2d"/><ellipse cx="130" cy="30" rx="7" ry="10" fill="#8a5a2a" stroke="#5a3a1a" stroke-width="1.5"/>'; })() },
    { k: 'reindeer', n: 'Rentier', body: `<path d="M34 34 L22 12 M28 22 L14 20 M24 16 L26 6 M66 34 L78 12 M72 22 L86 20 M76 16 L74 6" fill="none" stroke="#7a4a2a" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="22" cy="46" rx="11" ry="6" fill="#a86f3c" transform="rotate(-20 22 46)"/><ellipse cx="78" cy="46" rx="11" ry="6" fill="#a86f3c" transform="rotate(20 78 46)"/><path d="M30 34 H70 Q76 62 60 82 Q50 92 40 82 Q24 62 30 34Z" fill="#b57a45" stroke="#7a4a2a" stroke-width="2.8" stroke-linejoin="round"/><circle cx="41" cy="52" r="3.6" fill="#2a1a10"/><circle cx="59" cy="52" r="3.6" fill="#2a1a10"/><circle cx="42" cy="51" r="1.2" fill="#fff"/><circle cx="60" cy="51" r="1.2" fill="#fff"/><ellipse cx="50" cy="74" rx="14" ry="10" fill="#d4a373"/><circle cx="50" cy="70" r="7" fill="#d63a3a" stroke="#8f1d1d" stroke-width="2"/><circle cx="48" cy="68" r="2" fill="#fff" opacity=".7"/>` },
    { k: 'sparkle', n: 'Funkeln', body: `<path d="M50 4 Q54 46 96 50 Q54 54 50 96 Q46 54 4 50 Q46 46 50 4Z" fill="#f2c94c" stroke="#d9a21a" stroke-width="2.5" stroke-linejoin="round"/>` },
    { k: 'mitten', n: 'Handschuh', body: `<path d="M30 88 V50 C22 44 24 30 34 32 L38 40 V22 C38 10 56 10 56 22 V16 C56 6 72 6 72 16 V32 C80 34 78 48 72 52 V88Z" fill="#c62d2d" stroke="#8f1d1d" stroke-width="2.5" stroke-linejoin="round"/><rect x="26" y="78" width="50" height="14" rx="4" fill="#fff" stroke="#c9d4dc" stroke-width="2"/><path d="M44 36 l4 4 -4 4 -4 -4Z M56 52 l4 4 -4 4 -4 -4Z M44 62 l4 4 -4 4 -4 -4Z" fill="#fff"/>` },
  ];

  const FRAMES = [
    { k: 'holly', n: 'Stechpalmen', gen: (W, H) => {
      let g = ''; const k = 1.15, step = 120, m = 56;
      const put = (x, y, rot) => { g += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${k}) translate(-50 -55)">${holly()}</g>`; };
      for (let x = m + 40; x < W - m - 20; x += step) { put(x, m, 0); put(x, H - m, 180); }
      for (let y = m + 100; y < H - m - 50; y += step) { put(m, y, -90); put(W - m, y, 90); }
      put(m, m, -45); put(W - m, m, 45); put(m, H - m, -135); put(W - m, H - m, 135);
      return g; } },
    { k: 'stars', n: 'Sternenrand', gen: (W, H) => {
      let g = `<rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="14" fill="none" stroke="#d4a017" stroke-width="3"/><rect x="48" y="48" width="${W - 96}" height="${H - 96}" rx="8" fill="none" stroke="#d4a017" stroke-width="1.5"/>`;
      const pts = []; for (let x = 70; x < W - 40; x += 90) { pts.push([x, 34], [x, H - 34]); } for (let y = 124; y < H - 60; y += 90) { pts.push([34, y], [W - 34, y]); }
      pts.forEach(([x, y], i) => { g += `<path d="${star(x, y, i % 2 ? 21 : 15, i % 2 ? 8.5 : 6.2)}" fill="${i % 2 ? '#f2b632' : '#ffe08a'}" stroke="#c98a12" stroke-width="1.5" stroke-linejoin="round"/>`; });
      [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]].forEach(([x, y]) => { g += `<path d="${star(x, y, 40, 16)}" fill="#f2b632" stroke="#c98a12" stroke-width="2.5" stroke-linejoin="round"/>`; });
      return g; } },
    { k: 'snow', n: 'Schneelandschaft', gen: (W, H) => {
      const y0 = H - 260; let d = `M0 ${y0 + 20}`;
      for (let x = 0; x <= W; x += 20) d += ` L${x} ${f1(y0 + 25 * Math.sin(x / W * Math.PI * 3.2) + 10 * Math.sin(x / 40))}`;
      d += ` L${W} ${H} L0 ${H}Z`;
      let g = `<path d="${d}" fill="#f4fbff" stroke="#9ec9e2" stroke-width="3"/>`;
      let d2 = `M0 ${H - 90}`; for (let x = 0; x <= W; x += 20) d2 += ` L${x} ${f1(H - 120 + 26 * Math.sin(x / W * Math.PI * 2.4 + 1.5))}`; d2 += ` L${W} ${H} L0 ${H}Z`;
      g += `<path d="${d2}" fill="#e3f1fa" stroke="#9ec9e2" stroke-width="2.5"/>`;
      const fl = [[90, 70, 46], [W - 100, 110, 38], [W * 0.5, 50, 30], [W * 0.25, 160, 26], [W * 0.78, 220, 30], [60, 240, 24], [W * 0.62, 150, 22]];
      fl.forEach(([x, y, s]) => { g += `<g transform="translate(${f1(x - s)} ${f1(y - s)}) scale(${f1(s * 2 / 100)})">${snowflake('#8fc7ea', 4)}</g>`; });
      return g; } },
    { k: 'lights', n: 'Lichterkette', gen: (W, H) => `<g transform="translate(0 10) scale(1)">${bulbs(W, 40, 34, Math.max(5, Math.round(W / 130)), ['#c62d2d', '#f2b632', '#2f8f4e', '#2a7fd0'])}</g>` },
    { k: 'candy', n: 'Zuckerstreifen', gen: (W, H) => `<defs><pattern id="cs" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="44" height="44" fill="#fff"/><rect width="22" height="44" fill="#c62d2d"/></pattern></defs><path fill-rule="evenodd" fill="url(#cs)" stroke="#8f1d1d" stroke-width="3" d="M0 0 H${W} V${H} H0Z M34 34 V${H - 34} H${W - 34} V34Z"/>` },
    { k: 'gold', n: 'Goldrahmen', gen: (W, H) => {
      let g = `<rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="#d4a017" stroke-width="5"/><rect x="46" y="46" width="${W - 92}" height="${H - 92}" fill="none" stroke="#d4a017" stroke-width="2"/>`;
      [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]].forEach(([x, y]) => { g += `<circle cx="${x}" cy="${y}" r="20" fill="#fff" stroke="#d4a017" stroke-width="4"/><path d="${star(x, y, 14, 6)}" fill="#c62d2d"/>`; });
      return g; } },
  ];

  const LN = '#222', lw = 1.15;
  const L = inner => `<g fill="none" stroke="${LN}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  const COLORS = [
    { k: 'tree', n: 'Tannenbaum', body: L(`<path d="M50 22 L64 44 H36Z M36 44 H64 L74 64 H26Z M26 64 H74 L85 86 H15Z"/><rect x="42" y="86" width="16" height="10"/><path d="${star(50, 12, 9, 3.8)}"/><circle cx="48" cy="36" r="3.5"/><circle cx="43" cy="54" r="3.5"/><circle cx="58" cy="54" r="3.5"/><circle cx="35" cy="75" r="3.5"/><circle cx="50" cy="73" r="3.5"/><circle cx="65" cy="75" r="3.5"/>`) },
    { k: 'star', n: 'Stern', body: L(`<path d="${star(50, 53, 44, 18)}"/><path d="M50 9 L50 53 M5.5 40.5 L50 53 M22.5 94 L50 53 M77.5 94 L50 53 M94.5 40.5 L50 53"/>`) },
    { k: 'snowman', n: 'Schneemann', body: L(`<circle cx="50" cy="79" r="19"/><circle cx="50" cy="53" r="14"/><circle cx="50" cy="32" r="11"/><path d="M40 22 V9 H60 V22Z M35 22 H65"/><circle cx="46" cy="30" r="1.4"/><circle cx="54" cy="30" r="1.4"/><path d="M50 34 L62 37 L50 39Z M44 43 Q50 47 56 43"/><circle cx="50" cy="55" r="2"/><circle cx="50" cy="64" r="2"/><circle cx="50" cy="73" r="2"/><path d="M37 53 L18 41 M63 53 L82 41 M18 41 L14 34 M18 41 L12 41"/>`) },
    { k: 'bell', n: 'Glocke', body: L(`<path d="M50 14 C34 14 28 30 28 46 C28 62 18 66 14 76 H86 C82 66 72 62 72 46 C72 30 66 14 50 14Z"/><circle cx="50" cy="85" r="8"/><path d="M50 14 C48 8 52 4 56 8 M30 10 L50 19 L70 10 L66 28 L50 19 L34 28Z M36 76 C34 62 40 50 40 38 M64 76 C66 62 60 50 60 38"/>`) },
    { k: 'gift', n: 'Geschenk', body: L(`<rect x="14" y="44" width="72" height="46"/><rect x="9" y="32" width="82" height="13"/><path d="M43 32 V90 M57 32 V90 M43 44 H57"/><path d="M50 32 C28 4 8 22 38 32 M50 32 C72 4 92 22 62 32"/>`) },
    { k: 'bauble', n: 'Weihnachtskugel', body: L(`<rect x="42" y="14" width="16" height="12" rx="2"/><path d="M50 14 V6 M42 26 L38 32 M58 26 L62 32"/><circle cx="50" cy="60" r="32"/><path d="M19 52 Q50 70 81 52 M20 68 Q50 86 80 68"/><path d="M26 40 Q50 50 74 40"/>`) },
    { k: 'cane', n: 'Zuckerstange', body: L(`<path d="M62 94 V38 A14 14 0 0 0 34 38 V46 H44 V38 A4 4 0 0 1 52 38 V94Z"/><path d="M44 46 L52 56 M44 62 L52 72 M44 78 L52 88 M62 58 L52 66 M62 74 L52 82"/>`) },
    { k: 'ginger', n: 'Lebkuchenmann', body: L(`<circle cx="50" cy="24" r="13"/><path d="M38 38 H62 L84 36 Q91 43 84 50 L68 54 L75 84 Q70 91 61 88 L50 72 L39 88 Q30 91 25 84 L32 54 L16 50 Q9 43 16 36Z"/><circle cx="45" cy="22" r="1.5"/><circle cx="55" cy="22" r="1.5"/><path d="M44 29 Q50 34 56 29"/><circle cx="50" cy="50" r="3"/><circle cx="50" cy="60" r="3"/>`) },
    { k: 'sock', n: 'Nikolausstiefel', body: L(`<path d="M30 22 H62 V48 L82 64 Q92 74 82 85 Q72 92 62 84 L34 64 Q30 60 30 54Z"/><rect x="26" y="8" width="40" height="14" rx="6"/><path d="M30 34 H62 M30 44 H62 M70 66 Q86 76 78 86"/>`) },
    { k: 'wreath', n: 'Kranz', body: (() => { let g = '<circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="22"/>'; for (let i = 0; i < 8; i++) g += `<ellipse cx="50" cy="19" rx="5" ry="9" transform="rotate(${i * 45} 50 50)"/>`; return L(g + '<path d="M50 88 L38 98 L46 84Z M50 88 L62 98 L54 84Z"/><circle cx="50" cy="86" r="4.5"/>'); })() },
    { k: 'flake', n: 'Schneeflocke', body: L(`<circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="9"/>` + (() => { let g = ''; for (let k = 0; k < 6; k++) g += `<g transform="rotate(${k * 60} 50 50)"><path d="M50 41 V12 M50 26 L42 16 M50 26 L58 16 M50 34 L44 30 M50 34 L56 30"/></g>`; return g; })()) },
    { k: 'reindeer', n: 'Rentier', body: L(`<path d="M34 34 L22 12 M28 22 L14 20 M24 16 L26 6 M66 34 L78 12 M72 22 L86 20 M76 16 L74 6"/><ellipse cx="22" cy="46" rx="11" ry="6" transform="rotate(-20 22 46)"/><ellipse cx="78" cy="46" rx="11" ry="6" transform="rotate(20 78 46)"/><path d="M30 34 H70 Q76 62 60 82 Q50 92 40 82 Q24 62 30 34Z"/><circle cx="41" cy="52" r="3"/><circle cx="59" cy="52" r="3"/><ellipse cx="50" cy="75" rx="13" ry="9"/><circle cx="50" cy="70" r="6"/>`) },
    { k: 'hat', n: 'Mütze', body: L(`<path d="M14 76 C16 36 40 14 64 20 C78 24 82 40 90 60 L90 76Z"/><rect x="8" y="68" width="84" height="20" rx="10"/><circle cx="90" cy="56" r="9"/>`) },
    { k: 'candle', n: 'Kerze', body: L(`<path d="M50 6 C60 20 60 32 50 38 C40 32 40 20 50 6Z M50 18 C55 26 55 32 50 35 C45 32 45 26 50 18Z"/><path d="M36 44 H64 V86 H36Z M24 86 H76 L70 94 H30Z"/>`) },
  ];

  window.DRAWIT_LIB = { sticker: STICKERS, frame: FRAMES, color: COLORS };
})();
