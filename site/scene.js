/* The WayStation — placeholder scene.
 * A carriage travels a winding night road to a lamplit lodge while the story is told
 * in captions. Low-res pixel art (320x150, scaled up with nearest-neighbour), 2 fps.
 * No dependencies, no network calls. */
(() => {
  'use strict';

  const W = 320, H = 150;
  const TICK_MS = 500;            // 2 fps
  const TICKS_PER_CAPTION = 4;    // a new caption every 2 s
  const CAPTIONS = [
    'Historically, a waystation was never the destination.',
    'It was a place along the journey',
    'where travellers stopped for a while.',
    'Where different paths crossed,',
    'stories were shared,',
    'connections were made,',
    'people rested, helped one another,',
    'and eventually continued on their way.',
    'That’s what we’re creating.',
    'A modern WayStation',
    'for travellers, wanderers, creatives, adventurers',
    'and people whose lives',
    'don’t necessarily follow one straight road.',
    'A place to connect, discover new places,',
    'share experiences',
    'and find a little bit of belonging',
    'wherever your journey happens to take you.',
    'You don’t have to stay.',
    'You don’t have to fit in.',
    'Your path just has to cross ours for a while.',
    '\u{1F9ED} Everyone arrives from a different path.',
    'Everyone leaves on their own path.',
    'But for a little while, we share the journey.',
  ];
  const JOURNEY = CAPTIONS.length * TICKS_PER_CAPTION;   // ticks until arrival
  const REVEAL_AT = 16;                                    // ending tick that shows the story
  const END_TICK = JOURNEY + 22;

  const C = {
    sky: ['#17120c', '#211a11', '#2d2317', '#3b2e1e', '#4d3b27', '#634c31'],
    star: '#f3e2bd', starDim: '#9c8563', moon: '#efdcb2',
    mtnFar: '#4a3a28', mtnFarHi: '#866b49', mtnNear: '#30251a', mtnNearHi: '#56422d',
    ground: '#221a11', groundHi: '#33271a', road: '#86694a', roadHi: '#a3875e', rut: '#614c36',
    pine: '#18120b', pineHi: '#2b2016',
    woodDk: '#20160d', wood: '#48331f', woodHi: '#77583a', stone: '#584a3b', stoneHi: '#7a6852',
    roof: '#30241a', roofHi: '#5e4a34', amber: '#f2c46b', amberHi: '#ffe6a8', amberDim: '#b8894a',
    horse: '#5e4127', horseHi: '#8a6844', horseDk: '#38261a',
    skin: '#caa67b', ink: '#120d08', coat: '#3a2b1c',
  };

  // ---------------------------------------------------------------- helpers
  function mulberry32(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const hash = (a, b) => {
    let h = Math.imul(a * 374761393 + b * 668265263, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const px = (g, x, y, c) => rect(g, x, y, 1, 1, c);
  function ellipse(g, cx, cy, rx, ry, c) {
    g.fillStyle = c;
    const r = Math.max(0.5, ry);
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
      const k = 1 - (dy * dy) / (r * r);
      if (k < 0) continue;
      const hw = rx * Math.sqrt(k);
      const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
      if (x1 >= x0) g.fillRect(x0, Math.round(cy + dy), x1 - x0 + 1, 1);
    }
  }
  function line(g, x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) px(g, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c);
  }
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [c, g];
  }

  // ---------------------------------------------------------------- road path
  const HORIZON = 80, ARRIVE_Y = 133;
  const scaleAt = (y) => Math.min(1, Math.max(0.18, 0.18 + (y - HORIZON) / (ARRIVE_Y - HORIZON) * 0.82));
  const ROAD_PTS = [[134, 80], [116, 84], [138, 90], [112, 97], [78, 106], [74, 116], [100, 126], [135, 132], [158, 133]];

  function catmullRom(pts, steps) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      for (let s = 0; s < steps; s++) {
        const t = s / steps, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  const ROAD = catmullRom(ROAD_PTS, 60);
  // Cumulative *world* distance: a screen pixel near the horizon covers more ground,
  // and vertical screen movement is foreshortened depth.
  const DIST = [0];
  for (let i = 1; i < ROAD.length; i++) {
    const [x0, y0] = ROAD[i - 1], [x1, y1] = ROAD[i];
    DIST.push(DIST[i - 1] + Math.hypot(x1 - x0, (y1 - y0) * 2.5) / scaleAt((y0 + y1) / 2));
  }
  function roadAt(u) {
    const target = Math.min(1, Math.max(0, u)) * DIST[DIST.length - 1];
    let i = 1;
    while (i < DIST.length - 1 && DIST[i] < target) i++;
    const k = (target - DIST[i - 1]) / ((DIST[i] - DIST[i - 1]) || 1);
    const a = ROAD[i - 1], b = ROAD[i];
    const j0 = Math.max(0, i - 8), j1 = Math.min(ROAD.length - 1, i + 8);
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, dx: ROAD[j1][0] - ROAD[j0][0] };
  }

  // ---------------------------------------------------------------- background
  const STARS = [];
  function pine(g, x, baseY, h, w) {
    rect(g, x - 1, baseY - 3, 2, 3, C.woodDk);
    for (let i = 0; i < h; i++) {
      const tier = 0.72 + 0.28 * ((i % 6) / 5);
      const hw = Math.max(0.5, (w / 2) * (1 - i / h) * tier);
      const y = baseY - 3 - i;
      rect(g, x - hw, y, hw * 2, 1, C.pine);
      if (hw > 1.5) px(g, x - hw, y, C.pineHi);
    }
  }
  function rock(g, cx, cy, rx, ry) {
    ellipse(g, cx, cy, rx, ry, C.stone);
    ellipse(g, cx - rx * 0.3, cy - ry * 0.35, rx * 0.5, ry * 0.4, C.stoneHi);
    rect(g, cx - rx, cy + ry - 1, rx * 2, 1, C.woodDk);
  }
  function ridge(pts, x) {
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      }
    }
    return pts[pts.length - 1][1];
  }

  function buildBackground() {
    const [c, g] = canvas(W, H);
    const rnd = mulberry32(20260919);
    const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

    // Sky: posterised bands with ordered dithering, glowing toward the horizon.
    for (let y = 0; y < HORIZON; y++) {
      const level = (y / HORIZON) ** 1.4 * (C.sky.length - 1);
      const base = Math.floor(level), frac = level - base;
      for (let x = 0; x < W; x++) {
        const hi = frac > bayer[y % 4][x % 4] / 16;
        px(g, x, y, C.sky[Math.min(C.sky.length - 1, base + (hi ? 1 : 0))]);
      }
    }
    // Stars
    for (let i = 0; i < 55; i++) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * 58);
      if (Math.hypot(x - 78, y - 20) < 11) continue;
      STARS.push({ x, y, big: i < 5 });
      px(g, x, y, C.starDim);
    }
    // Crescent moon
    for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
      if (Math.hypot(dx, dy) <= 6.5 && Math.hypot(dx - 3, dy + 2) > 6) px(g, 78 + dx, 20 + dy, C.moon);
    }

    // Far mountains, lit from the moon's side
    const far = [[0, 62], [20, 55], [38, 60], [60, 44], [80, 58], [100, 50], [118, 40], [135, 54], [150, 47],
      [170, 58], [190, 49], [215, 60], [240, 52], [265, 58], [290, 46], [320, 56]];
    let prev = ridge(far, 0);
    for (let x = 0; x < W; x++) {
      const y = Math.round(ridge(far, x));
      rect(g, x, y, 1, HORIZON - y, C.mtnFar);
      if (y <= prev) {                       // slope rising to the right: moonlit face
        const len = 1 + Math.floor(rnd() * 5);
        for (let k = 0; k < len; k++) if ((x + k) % 2 === 0 || k === 0) px(g, x, y + k, C.mtnFarHi);
      }
      prev = y;
    }
    const near = [[0, 70], [30, 66], [55, 71], [90, 67], [125, 74], [150, 70], [185, 66], [220, 72], [260, 68], [320, 71]];
    for (let x = 0; x < W; x++) {
      const y = Math.round(ridge(near, x));
      rect(g, x, y, 1, HORIZON - y, C.mtnNear);
      if (x % 3 === 0) px(g, x, y, C.mtnNearHi);
    }
    // Distant pines on the horizon
    for (const [x, h] of [[44, 8], [50, 11], [56, 7], [150, 9], [157, 12], [163, 8], [205, 10], [212, 7]]) pine(g, x, HORIZON + 2, h, h * 0.6);

    // Ground
    rect(g, 0, HORIZON, W, H - HORIZON, C.ground);
    for (let i = 0; i < 420; i++) {
      const y = HORIZON + Math.floor(rnd() * (H - HORIZON));
      px(g, Math.floor(rnd() * W), y, rnd() < 0.5 ? C.groundHi : C.pine);
    }

    // Road: perspective ellipse stamps along the path
    for (const [x, y] of ROAD) {
      const s = scaleAt(y), hw = 17 * s;
      ellipse(g, x, y, hw, Math.max(0.6, hw * 0.3), C.road);
    }
    for (let i = 0; i < ROAD.length; i += 2) {
      const [x, y] = ROAD[i], s = scaleAt(y), hw = 17 * s;
      if (s > 0.4) { px(g, x - hw * 0.45, y, C.rut); px(g, x + hw * 0.45, y, C.rut); }
      if (rnd() < 0.35) px(g, x + (rnd() - 0.5) * hw * 1.4, y + (rnd() - 0.5) * hw * 0.4, C.roadHi);
    }

    // Pines behind the lodge
    pine(g, 176, 96, 42, 18);
    pine(g, 314, 100, 62, 26);

    drawLodge(g);

    // Signpost with a hanging lantern (left foreground)
    rect(g, 30, 60, 3, 82, C.wood);
    rect(g, 30, 60, 1, 82, C.woodHi);
    const board = (x0, x1, y, pointRight) => {
      rect(g, x0, y, x1 - x0, 4, C.woodHi);
      rect(g, x0, y + 3, x1 - x0, 1, C.wood);
      const tip = pointRight ? x1 : x0 - 1;
      for (let k = 0; k < 2; k++) rect(g, pointRight ? tip + k : tip - k, y + k, 1, 4 - k * 2, C.woodHi);
      for (let k = x0 + 2; k < x1 - 2; k += 3) px(g, k, y + 1, C.wood);
    };
    board(16, 46, 66, true);
    board(18, 44, 74, false);
    board(22, 48, 82, true);
    rect(g, 33, 92, 12, 1, C.woodDk);
    rect(g, 43, 93, 1, 2, C.woodDk);

    // Foreground rocks and a tall pine at the left edge
    pine(g, 6, 144, 78, 30);
    rock(g, 52, 144, 12, 5);
    rock(g, 66, 146, 7, 3);
    rock(g, 306, 142, 14, 6);
    rock(g, 104, 112, 4, 2);
    rock(g, 196, 140, 6, 3);

    // Engraving hatch
    g.fillStyle = 'rgba(0,0,0,0.13)';
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    return c;
  }

  const WINDOWS = [[198, 98, 14, 12], [220, 98, 12, 12], [258, 98, 12, 12], [278, 98, 14, 12]];
  const DOOR = [239, 97, 12, 21];

  function drawLodge(g) {
    // Chimney behind the roof edge
    rect(g, 292, 48, 10, 40, C.stone);
    for (let y = 50; y < 86; y += 3) for (let x = 292 + (y % 2); x < 302; x += 4) px(g, x, y, C.stoneHi);
    rect(g, 290, 46, 14, 3, C.stoneHi);
    // Walls: horizontal logs
    for (let y = 84; y < 118; y++) rect(g, 190, y, 110, 1, y % 3 === 0 ? C.woodDk : (y % 3 === 1 ? C.woodHi : C.wood));
    // Roof: big A-frame with a boarded gable inside it
    g.fillStyle = C.roof;
    g.beginPath(); g.moveTo(177, 87); g.lineTo(245, 49); g.lineTo(313, 87); g.closePath(); g.fill();
    line(g, 177, 87, 245, 49, C.roofHi);
    line(g, 178, 87, 245, 50, C.roofHi);
    line(g, 245, 49, 313, 87, C.roofHi);
    g.fillStyle = C.wood;
    g.beginPath(); g.moveTo(194, 85); g.lineTo(245, 57); g.lineTo(296, 85); g.closePath(); g.fill();
    for (let x = 198; x < 294; x += 3) line(g, x, 85, x, 85 - Math.max(0, 28 - Math.abs(x - 245) * 0.55), C.woodDk);
    // Gable window
    glow(g, 239, 64, 12, 12);
    rect(g, 239, 64, 12, 12, C.amber);
    rect(g, 244, 64, 2, 12, C.woodDk); rect(g, 239, 69, 12, 2, C.woodDk);
    rect(g, 238, 63, 14, 1, C.woodDk); rect(g, 238, 76, 14, 1, C.woodDk);
    // Porch roof
    rect(g, 181, 86, 128, 6, C.roof);
    rect(g, 181, 86, 128, 1, C.roofHi);
    for (let x = 183; x < 308; x += 4) px(g, x, 90, C.roofHi);
    // Windows and door
    for (const [x, y, w, h] of WINDOWS) {
      glow(g, x, y, w, h);
      rect(g, x, y, w, h, C.amber);
      rect(g, x + (w >> 1) - 1, y, 2, h, C.woodDk);
      rect(g, x, y + (h >> 1) - 1, w, 1, C.woodDk);
      rect(g, x - 1, y - 1, w + 2, 1, C.woodDk);
      rect(g, x - 1, y + h, w + 2, 2, C.woodHi);
    }
    const [dx, dy, dw, dh] = DOOR;
    rect(g, dx - 1, dy - 1, dw + 2, dh + 1, C.woodDk);
    rect(g, dx, dy, dw, dh, C.wood);
    for (let x = dx + 2; x < dx + dw; x += 3) rect(g, x, dy, 1, dh, C.woodDk);
    px(g, dx + dw - 3, dy + 11, C.amber);
    // Name board over the door
    rect(g, 235, 92, 20, 4, C.woodHi);
    for (let x = 237; x < 253; x += 2) px(g, x, 93 + (x % 4 === 1 ? 1 : 0), C.woodDk);
    // Posts, porch floor, stone skirt and steps
    for (const x of [185, 214, 275, 304]) { rect(g, x, 92, 2, 26, C.woodHi); px(g, x + 1, 92, C.woodDk); }
    rect(g, 181, 118, 128, 3, C.woodHi);
    rect(g, 181, 121, 128, 1, C.woodDk);
    rect(g, 181, 122, 128, 5, C.stone);
    for (let x = 183; x < 308; x += 5) px(g, x, 124, C.stoneHi);
    rect(g, 228, 122, 36, 4, C.woodHi); rect(g, 228, 125, 36, 1, C.woodDk);
    rect(g, 224, 126, 44, 4, C.woodHi); rect(g, 224, 129, 44, 1, C.woodDk);
    // Bench on the porch
    rect(g, 196, 113, 14, 2, C.woodHi); rect(g, 197, 115, 1, 3, C.woodDk); rect(g, 208, 115, 1, 3, C.woodDk);
  }
  function glow(g, x, y, w, h) {
    g.fillStyle = 'rgba(242,196,107,0.12)';
    g.fillRect(x - 3, y - 3, w + 6, h + 6);
    g.fillStyle = 'rgba(242,196,107,0.10)';
    g.fillRect(x - 5, y - 2, w + 10, h + 4);
  }

  // ---------------------------------------------------------------- carriage sprite
  const SPR_W = 52, SPR_H = 31, LAMP = [32, 10];
  function wheel(g, cx, cy, r, frame) {
    for (let dy = -r - 1; dy <= r + 1; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) {
      if (Math.abs(Math.hypot(dx, dy) - r) < 0.6) px(g, cx + dx, cy + dy, C.ink);
    }
    const spokes = frame ? [[1, 1], [1, -1]] : [[1, 0], [0, 1]];
    for (const [ux, uy] of spokes) for (let k = -(r - 1); k <= r - 1; k++) {
      const n = Math.hypot(ux, uy);
      px(g, cx + Math.round(ux / n * k), cy + Math.round(uy / n * k), C.woodHi);
    }
    px(g, cx, cy, C.amberDim);
  }
  function buildCarriage(frame, passengers) {
    const [c, g] = canvas(SPR_W, SPR_H);
    // Horse — far-side legs darker
    const legs = frame
      ? [[38, 36, C.horseDk], [41, 42, C.horse], [46, 48, C.horseDk], [48, 46, C.horse]]
      : [[38, 38, C.horseDk], [40, 40, C.horse], [46, 46, C.horseDk], [48, 48, C.horse]];
    for (const [ux, lx, col] of legs) { rect(g, ux, 18, 1, 6, col); rect(g, lx, 24, 1, 6, col); px(g, lx, 30, C.ink); }
    rect(g, 35, 12, 2, 1, C.horseDk);
    rect(g, frame ? 34 : 35, 13, 1, 5, C.horseDk);
    rect(g, 37, 12, 12, 6, C.horse);
    rect(g, 38, 12, 10, 1, C.horseHi);
    rect(g, 38, 17, 10, 1, C.horseDk);
    rect(g, 49, 13, 1, 4, C.horse);
    rect(g, 46, 8, 3, 5, C.horse);
    rect(g, 47, 6, 3, 3, C.horse);
    rect(g, 48, 4, 4, 3, C.horse);
    rect(g, 51, 6, 1, 2, C.horseDk);
    px(g, 48, 3, C.horseDk);
    rect(g, 46, 5, 1, 7, C.horseDk);
    px(g, 50, 5, C.ink);
    rect(g, 45, 11, 1, 6, C.woodDk);        // collar
    rect(g, 32, 16, 14, 1, C.woodDk);       // shafts
    line(g, 36, 9, 48, 6, C.woodDk);        // reins
    // Cab
    rect(g, 7, 2, 10, 3, C.woodHi); rect(g, 11, 2, 1, 3, C.woodDk);
    rect(g, 2, 5, 30, 2, C.roof); rect(g, 3, 5, 28, 1, C.roofHi);
    rect(g, 3, 7, 28, 15, C.wood);
    rect(g, 3, 7, 28, 1, C.woodHi);
    rect(g, 3, 20, 28, 1, C.woodHi);
    rect(g, 4, 22, 26, 1, C.woodDk);
    rect(g, 6, 9, 11, 1, C.woodDk);
    rect(g, 6, 10, 11, 6, passengers ? C.amberDim : '#6a4b2a');
    rect(g, 11, 10, 1, 6, C.woodDk);
    if (passengers >= 1) { rect(g, 8, 12, 2, 3, C.ink); rect(g, 7, 15, 4, 1, C.ink); }
    if (passengers >= 2) { rect(g, 13, 12, 2, 3, C.ink); rect(g, 12, 15, 4, 1, C.ink); }
    rect(g, 19, 9, 7, 11, C.woodHi); rect(g, 20, 10, 5, 9, C.wood);
    rect(g, 20, 10, 5, 4, C.amberDim); px(g, 24, 15, C.amber);
    rect(g, 31, 8, 2, 1, C.woodDk); rect(g, 31, 9, 2, 3, C.amber);
    // Driver on the box
    rect(g, 30, 12, 6, 2, C.woodDk);
    rect(g, 32, 7, 3, 5, C.coat);
    rect(g, 32, 4, 3, 3, C.skin);
    rect(g, 31, 3, 5, 1, C.ink); rect(g, 32, 1, 3, 2, C.ink);
    rect(g, 35, 9, 2, 1, C.coat);
    // Wheels
    wheel(g, 9, 24, 6, frame);
    wheel(g, 26, 25, 5, frame);
    return c;
  }

  // ---------------------------------------------------------------- people
  const PEOPLE = {
    t1: { coat: '#6b4a2a', sleeve: '#553a20', hair: C.ink, hat: C.ink, pack: '#8a6d48' },
    t2: { coat: '#7c5c3a', sleeve: '#62472c', hair: '#3a2716', skirt: true, scarf: '#a3875e' },
    r1: { coat: '#b39469', sleeve: '#94774f', hair: '#4a3420', apron: '#d8c29a' },
    r2: { coat: '#8a6d48', sleeve: '#6f5536', hair: '#d8c29a', skirt: true },
  };
  // Waypoints in ending ticks: [tick, x, y]. Carriage stops at x=158.
  const WALKS = {
    r1: [[2, 244, 119], [4, 240, 126], [6, 231, 133], [9, 222, 136]],
    r2: [[3, 248, 119], [5, 245, 126], [7, 239, 134], [10, 236, 138]],
    t1: [[4, 160, 137], [11, 218, 136]],
    t2: [[6, 154, 138], [12, 232, 138]],
  };
  const FACING = { r1: -1, r2: -1, t1: 1, t2: 1 };
  const HUG_AT = { r1: 11, t1: 11, r2: 12, t2: 12 };

  function personAt(key, e) {
    const w = WALKS[key];
    if (e < w[0][0]) return null;
    for (let i = 1; i < w.length; i++) {
      if (e < w[i][0]) {
        const [t0, x0, y0] = w[i - 1], [t1, x1, y1] = w[i];
        const k = (e - t0) / (t1 - t0);
        return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, walking: true };
      }
    }
    const last = w[w.length - 1];
    return { x: last[1], y: last[2], walking: false };
  }
  function drawPerson(g, p, x, y, dir, walking, phase, hugging) {
    x = Math.round(x); y = Math.round(y);
    const legs = walking ? (phase ? [x - 2, x + 1] : [x - 1, x]) : [x - 1, x + 1];
    for (const lx of legs) rect(g, lx, y - 3, 1, 3, C.ink);
    rect(g, x - 2, y - 9, 4, 6, p.coat);
    if (p.skirt) rect(g, x - 3, y - 4, 6, 1, p.coat);
    if (p.apron) rect(g, dir > 0 ? x : x - 2, y - 7, 2, 4, p.apron);
    if (p.scarf) rect(g, x - 2, y - 9, 4, 1, p.scarf);
    rect(g, x - 1, y - 12, 3, 3, C.skin);
    rect(g, x - 1, y - 12, 3, 1, p.hair);
    px(g, dir > 0 ? x - 1 : x + 1, y - 11, p.hair);
    if (p.hat) { rect(g, x - 2, y - 12, 5, 1, p.hat); rect(g, x - 1, y - 13, 3, 1, p.hat); }
    if (p.pack && !hugging) rect(g, dir > 0 ? x - 4 : x + 2, y - 10, 2, 5, p.pack);
    if (!hugging) {
      const swing = walking && phase ? 1 : 0;
      rect(g, x - 3, y - 9 + swing, 1, 4, p.sleeve);
      rect(g, x + 2, y - 9 + (walking ? 1 - swing : 0), 1, 4, p.sleeve);
    }
  }
  function drawHugArms(g, p, x, y, dir) {
    x = Math.round(x); y = Math.round(y);
    rect(g, dir > 0 ? x + 2 : x - 5, y - 8, 3, 1, p.sleeve);
    px(g, dir > 0 ? x - 3 : x + 2, y - 8, p.sleeve);
  }

  // ---------------------------------------------------------------- frame
  let bg, sprites;
  function drawFrame(g, tick) {
    g.drawImage(bg, 0, 0);
    const e = tick - JOURNEY;            // ending tick (negative while travelling)

    // Twinkling stars
    for (let i = 0; i < STARS.length; i++) {
      const s = STARS[i], h = hash(i, tick);
      if (h > 0.72) px(g, s.x, s.y, C.star);
      if (s.big) {
        px(g, s.x, s.y, C.star);
        const r = h > 0.5 ? 2 : 1;
        g.fillStyle = 'rgba(243,226,189,0.55)';
        g.fillRect(s.x - r, s.y, r * 2 + 1, 1);
        g.fillRect(s.x, s.y - r, 1, r * 2 + 1);
      }
    }
    // Chimney smoke
    for (let k = 0; k < 4; k++) {
      const drift = (tick + k) % 2;
      ellipse(g, 297 + k * 3 + drift, 42 - k * 6 - (tick % 2), 1 + k * 0.6, 1 + k * 0.4, `rgba(200,180,150,${0.22 - k * 0.045})`);
    }
    // Signpost lantern and porch lanterns flicker
    const flick = hash(7, tick) > 0.5;
    ellipse(g, 44, 99, flick ? 6 : 5, flick ? 6 : 5, 'rgba(242,196,107,0.13)');
    rect(g, 42, 95, 5, 1, C.woodDk);
    rect(g, 42, 96, 5, 6, C.woodDk);
    rect(g, 43, 97, 3, 4, flick ? C.amberHi : C.amber);
    rect(g, 42, 102, 5, 1, C.woodDk);
    for (const x of [217, 272]) {
      ellipse(g, x + 1, 96, 3, 3, 'rgba(242,196,107,0.14)');
      rect(g, x, 95, 2, 3, hash(x, tick) > 0.4 ? C.amber : C.amberHi);
    }

    // Open door and light spilling down the steps once the carriage has arrived
    if (e >= 0) {
      const [dx, dy, dw, dh] = DOOR;
      g.fillStyle = 'rgba(242,196,107,0.22)';
      g.beginPath(); g.moveTo(dx, dy + dh); g.lineTo(dx + dw, dy + dh); g.lineTo(dx + dw + 10, 131); g.lineTo(dx + dw + 6, 140); g.lineTo(dx - 30, 140); g.lineTo(dx - 16, 131); g.closePath(); g.fill();
      rect(g, dx, dy, dw, dh, e >= 1 ? C.amberHi : C.amber);
      rect(g, dx, dy, 2, dh, C.wood);        // door swung inward
    }

    // Carriage
    const travelling = e < 0;
    const u = 1 - Math.pow(1 - Math.min(tick, JOURNEY) / JOURNEY, 1.35);
    const pos = roadAt(u);
    if (Math.abs(pos.dx) > 0.3) facing = pos.dx < 0 ? -1 : 1;
    const s = scaleAt(pos.y);
    const w = Math.max(3, Math.round(SPR_W * s)), h = Math.max(2, Math.round(SPR_H * s));
    const x0 = Math.round(pos.x - w / 2), y0 = Math.round(pos.y - h);
    const passengers = e < 4 ? 2 : e < 6 ? 1 : 0;
    const spr = sprites[passengers][travelling ? tick % 2 : 0];
    g.save();
    if (facing < 0) { g.translate(x0 + w, y0); g.scale(-1, 1); g.drawImage(spr, 0, 0, w, h); }
    else g.drawImage(spr, x0, y0, w, h);
    g.restore();
    const lampX = facing < 0 ? x0 + (SPR_W - LAMP[0]) * s : x0 + LAMP[0] * s;
    px(g, lampX, y0 + LAMP[1] * s, flick ? C.amberHi : C.amber);

    // Arrival: travellers step down, residents come out, everyone embraces
    if (e >= 0) {
      const people = [];
      for (const key of ['r1', 'r2', 't1', 't2']) {
        const at = personAt(key, e);
        if (at) people.push({ key, ...at, hug: e >= HUG_AT[key] });
      }
      const hugging = people.filter((p) => p.hug);
      if (hugging.length) {
        const cx = hugging.reduce((a, p) => a + p.x, 0) / hugging.length;
        ellipse(g, cx, 131, 22, 9, 'rgba(242,196,107,0.10)');
      }
      people.sort((a, b) => a.y - b.y);
      for (const p of people) drawPerson(g, PEOPLE[p.key], p.x, p.y, FACING[p.key], p.walking, e % 2, p.hug);
      for (const p of people) if (p.hug) drawHugArms(g, PEOPLE[p.key], p.x, p.y, FACING[p.key]);
    }
  }
  let facing = -1;

  // ---------------------------------------------------------------- page wiring
  function start() {
    const cv = document.getElementById('scene');
    if (!cv || !cv.getContext) return;
    document.documentElement.classList.replace('no-js', 'js');
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    bg = buildBackground();
    sprites = [0, 1, 2].map((p) => [buildCarriage(0, p), buildCarriage(1, p)]);

    const caption = document.getElementById('caption');
    const story = document.getElementById('story');
    const skip = document.getElementById('skip');
    const replay = document.getElementById('replay');
    let tick = 0, timer = null, shown = -1;

    const setCaption = (i) => {
      if (i === shown) return;
      shown = i;
      caption.classList.remove('show');
      void caption.offsetWidth;
      caption.textContent = CAPTIONS[i];
      caption.classList.add('show');
    };
    const reveal = (on) => {
      story.classList.toggle('pending', !on);
      skip.hidden = on;
      replay.hidden = !on;
    };
    const render = () => {
      drawFrame(g, tick);
      setCaption(Math.min(CAPTIONS.length - 1, Math.floor(tick / TICKS_PER_CAPTION)));
      if (tick - JOURNEY === REVEAL_AT) reveal(true);
    };
    const step = () => {
      render();
      // After the story is revealed the lights keep flickering; the scene holds on the embrace.
      tick++;
      timer = setTimeout(step, TICK_MS);
    };
    const stop = () => { clearTimeout(timer); timer = null; };
    const play = () => { if (!timer && !reduced) step(); };
    const jumpTo = (t) => {
      stop();
      tick = t;
      facing = -1;
      for (let i = 0; i <= t; i += 2) drawFrame(g, i);   // keep carriage facing consistent
      render();
      if (tick - JOURNEY >= REVEAL_AT) reveal(true);
      tick++;
      play();
    };

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    skip.addEventListener('click', () => jumpTo(END_TICK - 2));
    replay.addEventListener('click', () => { reveal(false); shown = -1; jumpTo(0); });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));

    if (reduced) {
      tick = END_TICK - 2;
      facing = -1;
      for (let i = 0; i <= tick; i += 2) drawFrame(g, i);
      render();
      caption.textContent = CAPTIONS[CAPTIONS.length - 1];
      caption.classList.add('show');
      reveal(true);
    } else {
      play();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
