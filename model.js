/* ═══════════════════════════════════════════════════════════════════
   DJI OSMO ACTION 4 — PROCEDURAL MODEL
   Every surface below is generated in code: no external 3D assets,
   no image files. Canvas textures are painted at runtime.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PARTS } from './data.js';

const TAU = Math.PI * 2;
const ACCENT = 0x58e6ff;

/* ───────────────────────── canvas helpers ───────────────────────── */

function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mono(g, size, color, weight = 400) {
  g.font = `${weight} ${size}px "Cascadia Mono", Consolas, monospace`;
  g.fillStyle = color;
}

function text(g, str, x, y, size, color, align = 'left', weight = 400, font = 'mono') {
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.font = font === 'display'
    ? `${weight} ${size}px "Bahnschrift", "Segoe UI", sans-serif`
    : `${weight} ${size}px "Cascadia Mono", Consolas, monospace`;
  g.fillStyle = color;
  g.fillText(str, x, y);
}

/* ───────────────────────── procedural textures ───────────────────────── */

function texFrontScreen() {
  return makeCanvas(512, 512, (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#07222b');
    sky.addColorStop(0.42, '#0c3d4b');
    sky.addColorStop(0.7, '#061c24');
    sky.addColorStop(1, '#02090c');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    const glow = g.createRadialGradient(330, 210, 10, 330, 230, 280);
    glow.addColorStop(0, 'rgba(104, 232, 255, 0.24)');
    glow.addColorStop(0.45, 'rgba(44, 140, 166, 0.08)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);

    // distant horizon & grid
    g.strokeStyle = 'rgba(126, 244, 255, 0.07)';
    g.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      g.moveTo(0, 150 + i * 40);
      g.lineTo(W, 150 + i * 40);
      g.stroke();
    }
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.moveTo(i * 64, 120);
      g.lineTo(i * 64, H);
      g.stroke();
    }

    // top bar
    g.fillStyle = 'rgba(2, 8, 11, 0.55)';
    g.fillRect(0, 0, W, 58);
    g.fillStyle = '#ff5c3d';
    g.beginPath();
    g.arc(30, 29, 6, 0, TAU);
    g.fill();
    text(g, 'REC', 46, 30, 17, '#ffb4a2', 'left', 600);
    text(g, '4K 120', W / 2, 30, 17, '#eafcff', 'center', 600);
    // battery
    g.strokeStyle = 'rgba(214, 247, 255, 0.6)';
    g.lineWidth = 2;
    g.strokeRect(438, 21, 38, 16);
    g.fillStyle = 'rgba(214, 247, 255, 0.8)';
    g.fillRect(476, 26, 4, 6);
    g.fillStyle = 'rgba(120, 240, 255, 0.7)';
    g.fillRect(442, 25, 24, 8);
    text(g, '86%', 428, 30, 12, 'rgba(214,247,255,.8)', 'right');

    // corner brackets
    g.strokeStyle = 'rgba(142, 250, 255, 0.55)';
    g.lineWidth = 2;
    const inset = 42, len = 30;
    [[inset, inset, 1, 1], [W - inset, inset, -1, 1], [inset, H - inset, 1, -1], [W - inset, H - inset, -1, -1]].forEach(([x, y, dx, dy]) => {
      g.beginPath();
      g.moveTo(x, y + dy * len);
      g.lineTo(x, y);
      g.lineTo(x + dx * len, y);
      g.stroke();
    });

    // focus bracket
    g.strokeStyle = 'rgba(158, 250, 255, 0.4)';
    g.lineWidth = 1.5;
    const cx = W / 2, cy = 238, fw = 56, fh = 44;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      g.beginPath();
      g.moveTo(cx + sx * fw, cy + sy * (fh - 14));
      g.lineTo(cx + sx * fw, cy + sy * fh);
      g.lineTo(cx + sx * (fw - 14), cy + sy * fh);
      g.stroke();
    });
    g.beginPath();
    g.arc(cx, cy, 4, 0, TAU);
    g.fillStyle = 'rgba(158, 250, 255, 0.75)';
    g.fill();

    // reticle ticks
    g.strokeStyle = 'rgba(158, 250, 255, 0.22)';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(cx, cy, 78, 0, TAU);
    g.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const r1 = 82, r2 = i % 6 === 0 ? 92 : 87;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      g.stroke();
    }

    // bottom data
    g.fillStyle = 'rgba(2, 8, 11, 0.5)';
    g.fillRect(0, H - 74, W, 74);
    g.fillStyle = 'rgba(88, 230, 255, 0.12)';
    rr(g, 26, H - 58, 94, 30, 4);
    g.fill();
    text(g, 'D-LOG M', 73, H - 43, 12, '#9ff6ff', 'center', 600);
    text(g, '00:12:48', W / 2, H - 43, 20, '#f0feff', 'center', 500);
    text(g, 'f/2.8   1/240', W - 26, H - 43, 11, 'rgba(190,240,248,.6)', 'right');
    text(g, '155°  ULTRA WIDE', W - 26, H - 22, 9, 'rgba(130,180,192,.45)', 'right');

    // screen sheen
    const sheen = g.createLinearGradient(0, 0, W, H);
    sheen.addColorStop(0, 'rgba(255,255,255,0.055)');
    sheen.addColorStop(0.28, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.72, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(120,220,255,0.035)');
    g.fillStyle = sheen;
    g.fillRect(0, 0, W, H);
  });
}

function texRearScreen() {
  return makeCanvas(1024, 576, (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, 430);
    sky.addColorStop(0, '#04141c');
    sky.addColorStop(0.32, '#0b3544');
    sky.addColorStop(0.62, '#1d5964');
    sky.addColorStop(0.82, '#3d6a6a');
    sky.addColorStop(1, '#071013');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    // sun glow
    const sun = g.createRadialGradient(716, 238, 8, 716, 238, 300);
    sun.addColorStop(0, 'rgba(255, 218, 170, 0.92)');
    sun.addColorStop(0.08, 'rgba(255, 190, 130, 0.66)');
    sun.addColorStop(0.34, 'rgba(255, 146, 92, 0.16)');
    sun.addColorStop(1, 'rgba(255, 120, 70, 0)');
    g.fillStyle = sun;
    g.fillRect(0, 0, W, H);

    // clouds
    g.save();
    g.filter = 'blur(18px)';
    for (let i = 0; i < 7; i++) {
      g.fillStyle = `rgba(${180 + i * 6}, ${150 + i * 4}, 140, ${0.05 + i * 0.006})`;
      g.beginPath();
      g.ellipse(140 + i * 132, 146 + (i % 3) * 38, 120 + i * 10, 12 + (i % 3) * 7, -0.08, 0, TAU);
      g.fill();
    }
    g.restore();

    // far mountains
    g.fillStyle = '#082028';
    g.beginPath();
    g.moveTo(0, 356);
    g.lineTo(0, 318);
    g.lineTo(88, 292);
    g.lineTo(148, 318);
    g.lineTo(236, 272);
    g.lineTo(318, 322);
    g.lineTo(402, 300);
    g.lineTo(486, 338);
    g.lineTo(570, 310);
    g.lineTo(664, 344);
    g.lineTo(742, 306);
    g.lineTo(836, 336);
    g.lineTo(930, 300);
    g.lineTo(1024, 334);
    g.lineTo(1024, 356);
    g.closePath();
    g.fill();

    // near ridge
    g.fillStyle = '#041318';
    g.beginPath();
    g.moveTo(0, 392);
    g.lineTo(0, 358);
    g.lineTo(120, 340);
    g.lineTo(214, 366);
    g.lineTo(330, 332);
    g.lineTo(438, 372);
    g.lineTo(544, 352);
    g.lineTo(672, 384);
    g.lineTo(790, 346);
    g.lineTo(892, 378);
    g.lineTo(1024, 352);
    g.lineTo(1024, 400);
    g.closePath();
    g.fill();

    // water
    const water = g.createLinearGradient(0, 384, 0, H);
    water.addColorStop(0, '#0a2a30');
    water.addColorStop(0.28, '#05181d');
    water.addColorStop(1, '#010709');
    g.fillStyle = water;
    g.fillRect(0, 384, W, H - 384);

    // reflections
    const refl = g.createLinearGradient(0, 384, 0, H);
    refl.addColorStop(0, 'rgba(255, 172, 112, 0.42)');
    refl.addColorStop(0.5, 'rgba(255, 140, 88, 0.12)');
    refl.addColorStop(1, 'rgba(255, 120, 70, 0)');
    g.fillStyle = refl;
    g.fillRect(640, 384, 150, 170);
    g.strokeStyle = 'rgba(255, 186, 128, 0.24)';
    g.lineWidth = 1.4;
    const rnd = mulberry32(19);
    for (let i = 0; i < 26; i++) {
      const y = 392 + i * 7 + rnd() * 3;
      const w = 50 + rnd() * 180;
      g.beginPath();
      g.moveTo(716 - w / 2, y);
      g.lineTo(716 + w / 2, y);
      g.stroke();
    }

    // thirds grid
    g.strokeStyle = 'rgba(220, 255, 255, 0.06)';
    g.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      g.beginPath();
      g.moveTo((W / 3) * i, 0);
      g.lineTo((W / 3) * i, H);
      g.stroke();
      g.beginPath();
      g.moveTo(0, (H / 3) * i);
      g.lineTo(W, (H / 3) * i);
      g.stroke();
    }

    // corner brackets
    g.strokeStyle = 'rgba(160, 250, 255, 0.5)';
    g.lineWidth = 2;
    const inset = 30, len = 28;
    [[inset, inset, 1, 1], [W - inset, inset, -1, 1], [inset, H - inset, 1, -1], [W - inset, H - inset, -1, -1]].forEach(([x, y, dx, dy]) => {
      g.beginPath();
      g.moveTo(x, y + dy * len);
      g.lineTo(x, y);
      g.lineTo(x + dx * len, y);
      g.stroke();
    });

    // focus box
    g.strokeStyle = 'rgba(190, 255, 255, 0.4)';
    g.lineWidth = 1.6;
    const fw = 82, fh = 60, cx = W / 2, cy = 250;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      g.beginPath();
      g.moveTo(cx + sx * fw, cy + sy * (fh - 18));
      g.lineTo(cx + sx * fw, cy + sy * fh);
      g.lineTo(cx + sx * (fw - 18), cy + sy * fh);
      g.stroke();
    });

    // top hud
    g.fillStyle = 'rgba(1, 7, 10, 0.35)';
    g.fillRect(0, 0, W, 46);
    g.fillStyle = '#ff5c3d';
    g.beginPath();
    g.arc(36, 23, 6, 0, TAU);
    g.fill();
    text(g, 'REC', 52, 24, 15, '#ffb4a2', 'left', 600);
    text(g, '00:04:12', 108, 24, 15, 'rgba(240,254,255,.9)', 'left', 500);
    text(g, '4K 120  ·  16:9', W / 2, 24, 14, 'rgba(228,250,255,.72)', 'center', 500);
    g.strokeStyle = 'rgba(210, 245, 255, 0.55)';
    g.lineWidth = 2;
    g.strokeRect(W - 122, 16, 36, 15);
    g.fillStyle = 'rgba(210, 245, 255, 0.75)';
    g.fillRect(W - 84, 21, 4, 5);
    g.fillStyle = 'rgba(120, 240, 255, 0.7)';
    g.fillRect(W - 118, 20, 24, 7);
    text(g, '88%', W - 132, 24, 11, 'rgba(210,245,255,.75)', 'right');

    // bottom hud
    g.fillStyle = 'rgba(1, 6, 8, 0.5)';
    g.fillRect(0, H - 64, W, 64);
    g.fillStyle = 'rgba(88, 230, 255, 0.12)';
    rr(g, 26, H - 48, 92, 26, 4);
    g.fill();
    text(g, 'D-LOG M', 72, H - 34, 11, '#9ff6ff', 'center', 600);
    text(g, '1/240   f/2.8   ISO 100', W / 2, H - 35, 12, 'rgba(210,245,255,.68)', 'center', 500);
    text(g, '4K 120', W - 26, H - 35, 18, '#f0feff', 'right', 600);
    text(g, '130 Mbps', W - 26, H - 16, 9, 'rgba(140,190,200,.5)', 'right');

    // vignette + sheen
    const vig = g.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 620);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,4,7,0.5)');
    g.fillStyle = vig;
    g.fillRect(0, 0, W, H);
    const sheen = g.createLinearGradient(0, 0, W, H);
    sheen.addColorStop(0, 'rgba(255,255,255,0.045)');
    sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(120,220,255,0.03)');
    g.fillStyle = sheen;
    g.fillRect(0, 0, W, H);
  });
}

function texPCB() {
  return makeCanvas(1024, 640, (g, W, H) => {
    g.fillStyle = '#08211a';
    g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(360, 300, 40, 360, 300, 520);
    glow.addColorStop(0, 'rgba(30, 90, 70, 0.35)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);

    g.strokeStyle = 'rgba(90, 210, 160, 0.05)';
    g.lineWidth = 1;
    for (let x = 0; x < W; x += 32) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    }
    for (let y = 0; y < H; y += 32) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }

    const rnd = mulberry32(42);
    // copper traces
    for (let i = 0; i < 120; i++) {
      let x = Math.floor(rnd() * 40) * 16;
      let y = Math.floor(rnd() * 30) * 16;
      g.strokeStyle = i % 9 === 0 ? 'rgba(208, 168, 96, 0.5)' : 'rgba(168, 140, 82, 0.28)';
      g.lineWidth = i % 9 === 0 ? 2.2 : 1;
      g.beginPath();
      g.moveTo(x, y);
      const segs = 2 + Math.floor(rnd() * 5);
      for (let s = 0; s < segs; s++) {
        const dir = Math.floor(rnd() * 4);
        const len = 16 * (1 + Math.floor(rnd() * 6));
        if (dir === 0) x += len;
        else if (dir === 1) x -= len;
        else if (dir === 2) y += len;
        else y -= len;
        x = Math.max(6, Math.min(W - 6, x));
        y = Math.max(6, Math.min(H - 6, y));
        g.lineTo(x, y);
      }
      g.stroke();
      if (i % 3 === 0) {
        g.fillStyle = 'rgba(214, 178, 106, 0.7)';
        g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill();
      }
    }

    // copper pour outlines
    g.strokeStyle = 'rgba(180, 146, 82, 0.32)';
    g.lineWidth = 1.4;
    for (let i = 0; i < 7; i++) {
      const x = 40 + rnd() * 700;
      const y = 40 + rnd() * 460;
      const w = 90 + rnd() * 170;
      const h = 60 + rnd() * 130;
      g.strokeRect(x, y, w, h);
    }

    // vias
    for (let i = 0; i < 230; i++) {
      g.fillStyle = i % 4 === 0 ? 'rgba(228, 198, 132, 0.85)' : 'rgba(190, 160, 96, 0.6)';
      g.beginPath();
      g.arc(rnd() * W, rnd() * H, 1.4 + rnd() * 1.2, 0, TAU);
      g.fill();
    }

    // pads
    for (let i = 0; i < 2; i++) {
      const px = i === 0 ? W - 120 : 30;
      for (let j = 0; j < 12; j++) {
        g.fillStyle = 'rgba(226, 190, 110, 0.8)';
        g.fillRect(px + 8, 90 + j * 15, 38, 7);
      }
    }

    // silkscreen
    mono(g, 15, 'rgba(196, 226, 212, 0.5)', 600);
    g.fillText('DJI  ACTION 4', 64, 74);
    mono(g, 11, 'rgba(170, 205, 190, 0.4)');
    g.fillText('MAIN BOARD  V1.2', 64, 96);
    g.fillText('MADE IN CHINA', 64, H - 52);
    mono(g, 18, 'rgba(186, 222, 208, 0.45)', 600);
    g.fillText('IMU', 560, 470);
    g.fillText('DDR', 730, 300);
    g.fillText('U7', 268, 404);
    mono(g, 13, 'rgba(170, 205, 190, 0.34)');
    for (let i = 0; i < 9; i++) {
      g.fillText(`TP${i + 1}`, 300 + i * 42, 560);
    }
    g.strokeStyle = 'rgba(180, 220, 200, 0.3)';
    g.lineWidth = 1.5;
    g.strokeRect(22, 22, W - 44, H - 44);
    g.strokeStyle = 'rgba(180, 220, 200, 0.16)';
    g.strokeRect(34, 34, W - 68, H - 68);
  });
}

function texBattery() {
  return makeCanvas(512, 640, (g, W, H) => {
    g.fillStyle = '#0a0c0f';
    g.fillRect(0, 0, W, H);
    const metal = g.createLinearGradient(0, 0, W, H);
    metal.addColorStop(0, 'rgba(255,255,255,0.08)');
    metal.addColorStop(0.25, 'rgba(255,255,255,0.01)');
    metal.addColorStop(0.55, 'rgba(255,255,255,0.05)');
    metal.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = metal;
    g.fillRect(0, 0, W, H);

    // gold top band
    g.fillStyle = 'rgba(199, 163, 106, 0.85)';
    g.fillRect(0, 0, W, 4);
    g.fillStyle = 'rgba(199, 163, 106, 0.18)';
    g.fillRect(0, 4, W, 1);
    rr(g, 40, 44, W - 80, 1, 0);
    text(g, 'DJI', 40, 84, 40, '#f1f7f9', 'left', 700, 'display');
    text(g, 'INTELLIGENT BATTERY', 42, 114, 11, 'rgba(178,196,204,.6)', 'left', 600);

    // subtle tech lines
    g.strokeStyle = 'rgba(110, 200, 220, 0.12)';
    g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(W - 150 + i * 18, 150);
      g.lineTo(W - 40, 150 + i * 18);
      g.stroke();
    }

    text(g, '1770', 40, 292, 104, '#f4fbfc', 'left', 600, 'display');
    text(g, 'mAh', 44, 360, 26, '#9fc3cd', 'left', 500);
    text(g, '3.85 V   ·   6.8 Wh   ·   Li-ion', 42, 404, 15, 'rgba(196,216,222,.72)', 'left', 500);
    text(g, 'OSMO ACTION 4', 42, 442, 11, 'rgba(120,150,160,.6)', 'left', 600);

    // warning
    g.strokeStyle = 'rgba(255, 150, 110, 0.55)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(52, 500); g.lineTo(66, 474); g.lineTo(80, 500); g.closePath();
    g.stroke();
    text(g, '!', 66, 492, 12, 'rgba(255,170,140,.8)', 'center', 700);
    text(g, 'DO NOT PUNCTURE / DISASSEMBLE', 92, 490, 9, 'rgba(255,180,150,.55)', 'left', 500);
    text(g, 'DO NOT EXPOSE TO FIRE OR HIGH TEMPERATURE', 42, 516, 8, 'rgba(150,170,178,.45)', 'left');

    // barcode
    const rnd = mulberry32(8);
    let x = 42;
    while (x < 210) {
      const w = 1 + Math.floor(rnd() * 4);
      g.fillStyle = rnd() > 0.5 ? 'rgba(220,235,240,.85)' : 'rgba(220,235,240,.25)';
      g.fillRect(x, 552, w, 40);
      x += w + 2;
    }
    mono(g, 9, 'rgba(170,190,198,.5)');
    g.fillText('DJI-A4-BAT-1770', 42, 608);
    g.fillText('SN 7X4A9K2M', 42, 622);
    g.strokeStyle = 'rgba(199,163,106,.35)';
    g.strokeRect(28, 28, W - 56, H - 56);
  });
}

function texSpeaker() {
  return makeCanvas(256, 256, (g, W, H) => {
    g.fillStyle = '#161b1f';
    g.fillRect(0, 0, W, H);
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(255,255,255,0.035)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#04070a';
    for (let y = 26; y < H - 22; y += 13) {
      for (let x = 26; x < W - 22; x += 13) {
        g.beginPath();
        g.arc(x, y, 2.6, 0, TAU);
        g.fill();
      }
    }
    g.strokeStyle = 'rgba(140,170,180,0.16)';
    g.lineWidth = 1;
    rr(g, 14, 14, W - 28, H - 28, 14);
    g.stroke();
  });
}

function texLens() {
  return makeCanvas(512, 512, (g, W, H) => {
    const c = W / 2;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#030506';
    g.beginPath(); g.arc(c, c, 250, 0, TAU); g.fill();

    const layers = [
      [250, '#05070a'], [232, '#0b0f15'], [214, '#071b26'], [188, '#0a3d4e'],
      [158, '#102b46'], [130, '#241847'], [104, '#061420'], [78, '#010305']
    ];
    layers.forEach(([r, col]) => {
      g.fillStyle = col;
      g.beginPath(); g.arc(c, c, r, 0, TAU); g.fill();
    });

    // aperture blades
    g.save();
    g.translate(c, c);
    for (let i = 0; i < 7; i++) {
      g.rotate(TAU / 7);
      g.strokeStyle = 'rgba(120, 220, 240, 0.13)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, 112, 0.1, 1.02);
      g.stroke();
    }
    g.restore();

    // coating bloom
    const coat = g.createRadialGradient(c - 34, c - 40, 8, c, c, 230);
    coat.addColorStop(0, 'rgba(190, 245, 255, 0.7)');
    coat.addColorStop(0.12, 'rgba(110, 210, 245, 0.24)');
    coat.addColorStop(0.38, 'rgba(120, 100, 230, 0.13)');
    coat.addColorStop(0.7, 'rgba(20, 80, 120, 0.06)');
    coat.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = coat;
    g.beginPath(); g.arc(c, c, 250, 0, TAU); g.fill();

    // reflection arcs
    g.strokeStyle = 'rgba(225, 250, 255, 0.55)';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(c, c, 190, 3.72, 4.55);
    g.stroke();
    g.strokeStyle = 'rgba(150, 240, 255, 0.24)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(c, c, 160, 3.9, 4.42);
    g.stroke();

    // tiny glint
    g.fillStyle = 'rgba(240, 253, 255, 0.85)';
    g.beginPath();
    g.ellipse(c - 62, c - 74, 15, 7, -0.66, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(240, 253, 255, 0.5)';
    g.beginPath();
    g.arc(c + 74, c + 58, 3.2, 0, TAU);
    g.fill();

    // outer rim
    g.strokeStyle = 'rgba(90, 120, 132, 0.5)';
    g.lineWidth = 4;
    g.beginPath(); g.arc(c, c, 248, 0, TAU); g.stroke();
  });
}

function texSensorDie() {
  return makeCanvas(256, 220, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0c2f33');
    grad.addColorStop(0.3, '#1e4a5a');
    grad.addColorStop(0.52, '#3b2c5e');
    grad.addColorStop(0.74, '#12404b');
    grad.addColorStop(1, '#08161a');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(120, 240, 255, 0.08)';
    for (let y = 4; y < H; y += 12) {
      for (let x = 4; x < W; x += 12) {
        g.fillRect(x, y, 7, 7);
      }
    }
    g.strokeStyle = 'rgba(180, 250, 255, 0.18)';
    g.strokeRect(6, 6, W - 12, H - 12);
    const shine = g.createLinearGradient(0, 0, W, H);
    shine.addColorStop(0, 'rgba(255,255,255,0.22)');
    shine.addColorStop(0.35, 'rgba(255,255,255,0.02)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = shine;
    g.fillRect(0, 0, W, H);
  });
}

function texWord(str, size = 44, color = '#dfeef2', w = 512, h = 128) {
  return makeCanvas(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `600 ${size}px "Bahnschrift", "Segoe UI", Arial, sans-serif`;
    g.fillStyle = color;
    g.fillText(str, w / 2, h / 2 + 2);
  });
}

function texShadow() {
  return makeCanvas(256, 256, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    const grad = g.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0.85)');
    grad.addColorStop(0.42, 'rgba(0,0,0,0.5)');
    grad.addColorStop(0.72, 'rgba(0,0,0,0.16)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  });
}

function texGlow() {
  return makeCanvas(128, 128, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    const grad = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, 'rgba(190,250,255,0.8)');
    grad.addColorStop(0.48, 'rgba(88,230,255,0.22)');
    grad.addColorStop(1, 'rgba(88,230,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  });
}

export function createTextures() {
  return {
    front: texFrontScreen(),
    rear: texRearScreen(),
    pcb: texPCB(),
    battery: texBattery(),
    speaker: texSpeaker(),
    lens: texLens(),
    die: texSensorDie(),
    shadow: texShadow(),
    glow: texGlow(),
    wordAction: texWord('ACTION 4', 46, '#e6f3f6', 512, 128),
    wordDji: texWord('DJI', 60, '#e6f3f6', 256, 128),
    wordLogo: texWord('DJI  OSMO', 40, '#dceef2', 512, 96)
  };
}

/* ───────────────────────── materials ───────────────────────── */

function createMaterials(textures) {
  return {
    shell: new THREE.MeshStandardMaterial({ color: 0x2a3339, metalness: 0.58, roughness: 0.34, envMapIntensity: 1.4 }),
    shellEdge: new THREE.MeshStandardMaterial({ color: 0x3a454d, metalness: 0.72, roughness: 0.46, envMapIntensity: 1.05 }),
    alu: new THREE.MeshStandardMaterial({ color: 0x46515a, metalness: 0.94, roughness: 0.27, envMapIntensity: 1.5 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0a0d10, metalness: 0.4, roughness: 0.52, envMapIntensity: 0.8 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x07090b, metalness: 0.05, roughness: 0.96, envMapIntensity: 0.35 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0x17191b, metalness: 0.35, roughness: 0.58, envMapIntensity: 0.8 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb06a3c, metalness: 0.95, roughness: 0.3, envMapIntensity: 1.4 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd2ad68, metalness: 1, roughness: 0.24, envMapIntensity: 1.5 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x0a2119, metalness: 0.25, roughness: 0.66, envMapIntensity: 0.7 }),
    black: new THREE.MeshStandardMaterial({ color: 0x010203, metalness: 0.25, roughness: 0.5, envMapIntensity: 0.4 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x03080b, metalness: 0.05, roughness: 0.05, transparent: true, opacity: 0.42,
      envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false
    }),
    lensGlass: new THREE.MeshPhysicalMaterial({
      color: 0x06131c, metalness: 0.12, roughness: 0.38, transparent: true, opacity: 0.14,
      envMapIntensity: 0.03, clearcoat: 0.5, clearcoatRoughness: 0.18, depthWrite: false
    }),
    hot: new THREE.MeshStandardMaterial({
      color: 0xff5c3d, metalness: 0.4, roughness: 0.4, emissive: 0xff2a0a, emissiveIntensity: 0.55
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0x58e6ff, metalness: 0.3, roughness: 0.3, emissive: 0x58e6ff, emissiveIntensity: 1.4
    }),
    die: new THREE.MeshStandardMaterial({
      map: textures.die, emissive: 0x1b4f55, emissiveMap: textures.die,
      emissiveIntensity: 0.55, metalness: 0.55, roughness: 0.24, envMapIntensity: 1.2
    }),
    pcbFace: new THREE.MeshStandardMaterial({
      map: textures.pcb, emissive: 0x0a241a, emissiveMap: textures.pcb,
      emissiveIntensity: 0.3, metalness: 0.2, roughness: 0.62, envMapIntensity: 0.6
    }),
    batteryFace: new THREE.MeshStandardMaterial({
      map: textures.battery, roughness: 0.48, metalness: 0.2, envMapIntensity: 0.8
    }),
    speaker: new THREE.MeshStandardMaterial({
      map: textures.speaker, color: 0x8e9ba2, roughness: 0.62, metalness: 0.55, envMapIntensity: 0.9
    }),
    lensFace: new THREE.MeshBasicMaterial({ map: textures.lens, transparent: true }),
    flex: new THREE.MeshStandardMaterial({ color: 0x8a4a1e, metalness: 0.25, roughness: 0.7, envMapIntensity: 0.5 }),
    thermal: new THREE.MeshStandardMaterial({ color: 0x0d3436, metalness: 0.15, roughness: 0.82, envMapIntensity: 0.4 })
  };
}

/* ───────────────────────── geometry helpers ───────────────────────── */

function roundedRectShape(w, h, r, cx = 0, cy = 0, clockwise = false) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const p = clockwise ? new THREE.Path() : new THREE.Shape();
  if (!clockwise) {
    p.moveTo(x + r, y);
    p.lineTo(x + w - r, y);
    p.quadraticCurveTo(x + w, y, x + w, y + r);
    p.lineTo(x + w, y + h - r);
    p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    p.lineTo(x + r, y + h);
    p.quadraticCurveTo(x, y + h, x, y + h - r);
    p.lineTo(x, y + r);
    p.quadraticCurveTo(x, y, x + r, y);
  } else {
    p.moveTo(x + r, y);
    p.quadraticCurveTo(x, y, x, y + r);
    p.lineTo(x, y + h - r);
    p.quadraticCurveTo(x, y + h, x + r, y + h);
    p.lineTo(x + w - r, y + h);
    p.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
    p.lineTo(x + w, y + r);
    p.quadraticCurveTo(x + w, y, x + w - r, y);
    p.lineTo(x + r, y);
  }
  return p;
}

function circlePath(cx, cy, r) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, TAU, true);
  return p;
}

const cache = new Map();
function rb(w, h, d, r = 0.06, seg = 3) {
  const key = `rb|${w}|${h}|${d}|${r}|${seg}`;
  if (!cache.has(key)) cache.set(key, new RoundedBoxGeometry(w, h, d, seg, r));
  return cache.get(key);
}
function cyl(rt, rbh, h, seg = 48, open = false) {
  const key = `cy|${rt}|${rbh}|${h}|${seg}|${open}`;
  if (!cache.has(key)) cache.set(key, new THREE.CylinderGeometry(rt, rbh, h, seg, 1, open));
  return cache.get(key);
}
function torus(r, tube, seg = 64, tubeSeg = 12) {
  const key = `to|${r}|${tube}|${seg}|${tubeSeg}`;
  if (!cache.has(key)) cache.set(key, new THREE.TorusGeometry(r, tube, tubeSeg, seg));
  return cache.get(key);
}
function plane(w, h) {
  const key = `pl|${w}|${h}`;
  if (!cache.has(key)) cache.set(key, new THREE.PlaneGeometry(w, h));
  return cache.get(key);
}

function add(group, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(pos[0], pos[1], pos[2]);
  m.rotation.set(rot[0], rot[1], rot[2]);
  if (opts.renderOrder !== undefined) m.renderOrder = opts.renderOrder;
  if (opts.noPick) m.userData.noPick = true;
  group.add(m);
  return m;
}

function addScrew(group, M, x, y, z, axis = 'z', r = 0.055) {
  const geo = cyl(r, r, 0.024, 20);
  const rot = axis === 'z' ? [Math.PI / 2, 0, 0] : axis === 'y' ? [0, 0, 0] : [0, 0, Math.PI / 2];
  add(group, geo, M.alu, [x, y, z], rot);
  const slotGeo = new THREE.BoxGeometry(r * 1.35, r * 0.2, 0.005);
  add(group, slotGeo, M.black, [x, y, z + (axis === 'z' ? 0.014 : 0)], axis === 'z' ? [0, 0, 0] : [0, 0, 0]);
  add(group, slotGeo, M.black, [x, y, z + (axis === 'z' ? 0.014 : 0)], axis === 'z' ? [0, 0, Math.PI / 2] : [0, 0, Math.PI / 2]);
}

/* ───────────────────────── part builders ───────────────────────── */

function buildFrontShell(M, T) {
  const g = new THREE.Group();

  const shape = roundedRectShape(7.05, 4.42, 0.62);
  shape.holes.push(circlePath(-1.4, 0.4, 1.235));
  shape.holes.push(roundedRectShape(3.0, 2.98, 0.36, 1.8, 0.1, true));
  const plateGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.34, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.045,
    bevelSegments: 2, curveSegments: 30
  });
  plateGeo.translate(0, 0, -0.17);
  add(g, plateGeo, M.shell, [0, 0, 1.45]);

  // lens barrel
  add(g, cyl(1.35, 1.37, 0.36, 64), M.shellEdge, [-1.4, 0.4, 1.62], [Math.PI / 2, 0, 0]);
  add(g, cyl(1.21, 1.26, 0.3, 64), M.shell, [-1.4, 0.4, 1.84], [Math.PI / 2, 0, 0]);
  add(g, torus(1.205, 0.036, 64), M.alu, [-1.4, 0.4, 1.74]);
  add(g, torus(1.12, 0.028, 64), M.alu, [-1.4, 0.4, 1.93]);
  add(g, cyl(1.02, 1.02, 0.1, 64), M.dark, [-1.4, 0.4, 2.0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.RingGeometry(0.92, 1.02, 64), M.alu, [-1.4, 0.4, 2.06]);
  add(g, new THREE.CircleGeometry(0.92, 64), M.lensFace, [-1.4, 0.4, 2.015]);
  const dome = new THREE.SphereGeometry(0.92, 40, 18, 0, TAU, 0, Math.PI / 2.45);
  add(g, dome, M.lensGlass, [-1.4, 0.4, 2.03], [Math.PI / 2, 0, 0], { renderOrder: 3 });

  // lens ridge details
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    add(g, new THREE.BoxGeometry(0.055, 0.035, 0.2), M.alu,
      [-1.4 + Math.cos(a) * 1.275, 0.4 + Math.sin(a) * 1.275, 1.8],
      [0, 0, a + Math.PI / 2]);
  }

  // front decals
  add(g, plane(1.72, 0.4), new THREE.MeshBasicMaterial({
    map: T.wordAction, transparent: true, opacity: 0.5, depthWrite: false
  }), [1.85, -1.76, 1.663]);
  add(g, plane(0.52, 0.26), new THREE.MeshBasicMaterial({
    map: T.wordDji, transparent: true, opacity: 0.42, depthWrite: false
  }), [-2.72, -1.72, 1.663]);

  // low accent seam
  add(g, new THREE.BoxGeometry(5.5, 0.01, 0.008), new THREE.MeshBasicMaterial({
    color: 0x2bb7c9, transparent: true, opacity: 0.42, depthWrite: false
  }), [0, -2.06, 1.665]);
  // indicator led
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.02, 18), M.hot, [-3.02, -1.55, 1.665], [Math.PI / 2, 0, 0]);
  // tiny mic port
  add(g, new THREE.CircleGeometry(0.045, 16), M.black, [-2.92, -1.86, 1.666]);

  return g;
}

function buildSensor(M, T) {
  const g = new THREE.Group();
  add(g, rb(1.68, 1.44, 0.2, 0.045, 2), M.ceramic, [-1.4, 0.4, 0.94]);
  add(g, rb(1.5, 1.26, 0.06, 0.02, 2), M.dark, [-1.4, 0.4, 1.055]);
  add(g, plane(1.08, 0.86), M.die, [-1.4, 0.4, 1.09]);

  // gold die frame
  const goldStrip = new THREE.BoxGeometry(1.16, 0.035, 0.02);
  add(g, goldStrip, M.gold, [-1.4, 0.852, 1.095]);
  add(g, goldStrip, M.gold, [-1.4, -0.052, 1.095]);
  const goldStripV = new THREE.BoxGeometry(0.035, 0.92, 0.02);
  add(g, goldStripV, M.gold, [-1.975, 0.4, 1.095]);
  add(g, goldStripV, M.gold, [-0.825, 0.4, 1.095]);

  // package pins
  for (let i = 0; i < 7; i++) {
    const x = -1.92 + i * 0.17;
    add(g, new THREE.BoxGeometry(0.075, 0.16, 0.05), M.gold, [x, -0.27, 0.98]);
    add(g, new THREE.BoxGeometry(0.075, 0.16, 0.05), M.gold, [x, 1.07, 0.98]);
  }

  // shielding rim
  const rimMat = M.alu;
  add(g, new THREE.BoxGeometry(1.75, 0.05, 0.1), rimMat, [-1.4, 1.1, 1.06]);
  add(g, new THREE.BoxGeometry(1.75, 0.05, 0.1), rimMat, [-1.4, -0.3, 1.06]);

  // flex tail
  add(g, new THREE.BoxGeometry(0.72, 0.52, 0.025), M.flex, [-0.98, -0.32, 0.83], [0.12, 0, 0.14]);
  for (let i = 0; i < 5; i++) {
    add(g, new THREE.BoxGeometry(0.09, 0.26, 0.012), M.gold, [-1.18 + i * 0.1, -0.42, 0.84], [0.12, 0, 0.14]);
  }

  // alignment notch
  add(g, new THREE.BoxGeometry(0.18, 0.06, 0.03), M.accent, [-2.15, 1.02, 0.95]);
  return g;
}

function buildFrontScreen(M, T) {
  const g = new THREE.Group();
  add(g, rb(2.98, 2.94, 0.16, 0.18, 3), M.rubber, [1.8, 0.1, 1.42]);
  add(g, rb(2.8, 2.76, 0.06, 0.08, 2), M.dark, [1.8, 0.1, 1.515]);
  add(g, plane(2.6, 2.56), new THREE.MeshBasicMaterial({ map: T.front, toneMapped: false }), [1.8, 0.1, 1.552]);
  add(g, rb(2.72, 2.68, 0.035, 0.1, 3), M.glass, [1.8, 0.1, 1.565], [0, 0, 0], { renderOrder: 4 });
  add(g, new THREE.BoxGeometry(2.94, 0.018, 0.01), M.accent, [1.8, -1.44, 1.42]);
  return g;
}

function buildMainboard(M, T) {
  const g = new THREE.Group();
  add(g, rb(4.95, 3.05, 0.1, 0.045, 2), M.pcb, [-0.7, -0.1, 0.12]);
  add(g, plane(4.88, 2.98), M.pcbFace, [-0.7, -0.1, 0.176]);

  // main SoC
  add(g, rb(1.15, 0.95, 0.14, 0.02, 2), M.black, [-1.5, 0.36, 0.26]);
  add(g, plane(0.92, 0.72), new THREE.MeshStandardMaterial({
    color: 0x151a1e, metalness: 0.8, roughness: 0.35
  }), [-1.5, 0.36, 0.334]);
  add(g, plane(0.42, 0.24), new THREE.MeshBasicMaterial({
    map: texWord('A4', 30, 'rgba(190,220,228,.5)', 128, 64), transparent: true, depthWrite: false
  }), [-1.5, 0.36, 0.338]);

  // RAM / flash
  add(g, rb(0.68, 0.52, 0.1, 0.015, 2), M.black, [-0.28, 0.62, 0.24]);
  add(g, rb(0.5, 0.45, 0.1, 0.015, 2), M.black, [0.28, 0.72, 0.24]);

  // shield can
  add(g, rb(1.32, 0.88, 0.09, 0.035, 2), M.alu, [-1.92, -0.76, 0.24]);
  for (let i = 0; i < 4; i++) {
    add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.12, 12),
      M.alu, [-2.28 + i * 0.24, -0.76, 0.29], [Math.PI / 2, 0, 0]);
  }

  // power inductors + capacitors
  for (let i = 0; i < 3; i++) {
    add(g, rb(0.24, 0.24, 0.14, 0.02, 2), M.dark, [1.15, 0.32 + i * 0.32, 0.25]);
  }
  for (let i = 0; i < 5; i++) {
    add(g, cyl(0.075, 0.075, 0.2, 16), M.alu, [-0.66 + i * 0.2, -0.86, 0.24], [Math.PI / 2, 0, 0]);
  }

  // microSD / flex connector
  add(g, rb(0.88, 0.22, 0.16, 0.02, 2), M.alu, [1.2, -1.16, 0.24]);
  add(g, rb(1.15, 0.2, 0.14, 0.02, 2), M.gold, [1.08, 1.15, 0.24]);

  // PCB leds
  add(g, new THREE.SphereGeometry(0.045, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x8ef9ff }), [1.62, 1.38, 0.27]);
  add(g, new THREE.SphereGeometry(0.035, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xff6a42 }), [-0.05, -1.16, 0.27]);

  // thin mounting rail
  add(g, new THREE.BoxGeometry(4.3, 0.06, 0.05), M.alu, [-0.7, -1.46, 0.16]);
  return g;
}

function buildCooling(M, T) {
  const g = new THREE.Group();
  add(g, rb(3.55, 2.15, 0.045, 0.02, 2), M.thermal, [-1.2, 1.25, -0.2]);
  add(g, rb(2.95, 1.8, 0.055, 0.03, 2), M.copper, [-1.1, 1.25, 0.0]);

  // fin stack
  for (let i = 0; i < 9; i++) {
    add(g, new THREE.BoxGeometry(0.05, 1.38, 0.72), M.copper,
      [-2.28 + i * 0.185, 1.3, -0.55]);
  }
  add(g, new THREE.BoxGeometry(1.62, 0.08, 0.76), M.copper, [-1.54, 1.98, -0.55]);

  // heat pipe
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.25, 0.62, 0.12),
    new THREE.Vector3(-1.72, 1.05, 0.16),
    new THREE.Vector3(-0.6, 1.55, 0.14),
    new THREE.Vector3(0.28, 1.12, 0.08),
    new THREE.Vector3(0.58, 0.35, 0.02)
  ]);
  add(g, new THREE.TubeGeometry(curve, 40, 0.062, 8, false), M.copper);

  // vapor chamber + pad
  add(g, rb(1.18, 0.88, 0.09, 0.03, 2), M.copper, [0.28, 0.92, 0.04]);
  add(g, rb(1.0, 0.72, 0.03, 0.02, 2), M.thermal, [0.28, 0.92, 0.11]);
  add(g, new THREE.BoxGeometry(0.62, 0.018, 0.04), M.accent, [-1.2, 0.2, 0.14]);

  // mounting tabs
  for (let i = 0; i < 3; i++) {
    addScrew(g, M, -2.55 + i * 1.9, 0.44, 0.03, 'z', 0.045);
  }
  return g;
}

function buildBattery(M, T) {
  const g = new THREE.Group();
  add(g, rb(2.1, 3.08, 0.72, 0.14, 3), M.dark, [2.35, -0.55, 0.35]);
  add(g, plane(1.9, 2.86), M.batteryFace, [2.35, -0.56, 0.716]);
  add(g, rb(1.36, 0.28, 0.52, 0.05, 2), M.black, [2.35, 1.03, 0.35]);
  for (let i = 0; i < 3; i++) {
    add(g, new THREE.BoxGeometry(0.26, 0.08, 0.3), M.gold, [1.86 + i * 0.46, 1.18, 0.35]);
  }
  // pull tab
  add(g, rb(1.12, 0.36, 0.035, 0.03, 2), M.hot, [2.35, -2.02, 0.55], [0.28, 0, 0]);
  add(g, new THREE.BoxGeometry(0.56, 0.02, 0.02), M.accent, [2.35, -2.17, 0.68], [0.28, 0, 0]);
  // side ribs
  for (let i = 0; i < 5; i++) {
    add(g, new THREE.BoxGeometry(0.02, 2.4, 0.035), M.shellEdge, [1.29, -0.55, -0.02 + i * 0.18]);
  }
  // temperature sensor flex
  add(g, new THREE.BoxGeometry(0.32, 0.04, 0.62), M.flex, [1.62, 1.18, 0.35]);
  return g;
}

function buildRearScreen(M, T) {
  const g = new THREE.Group();
  add(g, rb(5.55, 3.5, 0.2, 0.18, 3), M.rubber, [0, 0.05, -1.57]);
  add(g, rb(5.25, 3.2, 0.07, 0.1, 2), M.dark, [0, 0.05, -1.68]);
  add(g, plane(4.95, 2.79), new THREE.MeshBasicMaterial({ map: T.rear, toneMapped: false }),
    [0, 0.05, -1.689], [0, Math.PI, 0]);
  add(g, rb(5.12, 3.08, 0.035, 0.11, 3), M.glass, [0, 0.05, -1.706], [0, 0, 0], { renderOrder: 4 });
  // rear logo
  add(g, plane(1.15, 0.22), new THREE.MeshBasicMaterial({
    map: T.wordLogo, transparent: true, opacity: 0.32, depthWrite: false
  }), [-1.55, -1.53, -1.69], [0, Math.PI, 0]);
  add(g, new THREE.BoxGeometry(5.35, 0.012, 0.008), M.hot, [0, -1.64, -1.69]);
  return g;
}

function buildFrame(M, T) {
  const g = new THREE.Group();
  const shape = roundedRectShape(7.05, 4.42, 0.6);
  shape.holes.push(roundedRectShape(6.5, 3.88, 0.47, 0, 0, true));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 3.0, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04,
    bevelSegments: 2, curveSegments: 30
  });
  geo.translate(0, 0, -1.5);
  add(g, geo, M.shell, [0, 0, 0]);

  // top / bottom rails
  add(g, rb(6.5, 0.15, 0.5, 0.05, 2), M.shellEdge, [0, 2.1, 0.2]);
  add(g, rb(6.5, 0.15, 0.5, 0.05, 2), M.shellEdge, [0, -2.1, 0.2]);

  // side grip ridges (right hand side)
  for (let i = 0; i < 11; i++) {
    add(g, new THREE.BoxGeometry(0.04, 2.55, 0.1), M.rubber,
      [3.43, 0, -1.18 + i * 0.235]);
  }
  // left side clean trim
  add(g, new THREE.BoxGeometry(0.035, 2.9, 0.09), M.shellEdge, [-3.43, 0, 0.1]);

  // inner ribs
  add(g, new THREE.BoxGeometry(0.1, 3.55, 0.16), M.alu, [-2.2, 0, -0.95]);
  add(g, new THREE.BoxGeometry(0.1, 3.55, 0.16), M.alu, [1.6, 0, -0.95]);
  add(g, new THREE.BoxGeometry(4.2, 0.1, 0.16), M.alu, [-0.3, -1.72, -0.95]);

  // corner screws (rear face)
  [[-3.02, 1.86], [3.02, 1.86], [-3.02, -1.86], [3.02, -1.86]].forEach(([x, y], i) => {
    addScrew(g, M, x, y, -1.53, 'z', 0.055);
    add(g, torus(0.09, 0.008, 24), M.alu, [x, y, -1.548]);
  });

  // battery latch detail
  add(g, new THREE.BoxGeometry(0.42, 0.09, 0.06), M.shellEdge, [3.35, 0.35, -0.2]);
  // magnetic alignment notch at bottom
  add(g, new THREE.BoxGeometry(0.5, 0.05, 0.14), M.dark, [0, -2.18, 0.1]);
  // front seam accent
  add(g, new THREE.BoxGeometry(6.32, 0.012, 0.008), M.accent, [0, 2.02, 1.54]);
  return g;
}

function buildTopControls(M, T) {
  const g = new THREE.Group();
  add(g, rb(3.0, 0.34, 1.46, 0.1, 2), M.shellEdge, [0.35, 2.03, 0.2]);
  // shutter seat
  add(g, cyl(0.48, 0.48, 0.12, 48), M.alu, [1.52, 2.2, 0.55]);
  add(g, cyl(0.37, 0.37, 0.08, 48), M.dark, [1.52, 2.28, 0.55]);
  add(g, torus(0.4, 0.045, 64), M.hot, [1.52, 2.315, 0.55], [Math.PI / 2, 0, 0]);
  add(g, cyl(0.29, 0.3, 0.12, 48), M.alu, [1.52, 2.34, 0.55]);
  add(g, cyl(0.16, 0.16, 0.02, 32), M.dark, [1.52, 2.405, 0.55]);

  // QS button
  add(g, cyl(0.26, 0.26, 0.1, 40), M.dark, [-0.35, 2.25, 0.56]);
  add(g, cyl(0.18, 0.18, 0.04, 36), M.shellEdge, [-0.35, 2.32, 0.56]);
  add(g, new THREE.BoxGeometry(0.18, 0.012, 0.012), M.accent, [-0.35, 2.343, 0.56]);

  // mic grille
  add(g, plane(1.05, 0.58), M.speaker, [-1.45, 2.205, 0.25], [-Math.PI / 2, 0, 0]);
  add(g, new THREE.CircleGeometry(0.045, 16), M.black, [-2.18, 2.205, 0.62], [-Math.PI / 2, 0, 0]);
  add(g, new THREE.SphereGeometry(0.035, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x8ef9ff }), [2.38, 2.21, 0.75]);
  // top accent line
  add(g, new THREE.BoxGeometry(2.5, 0.012, 0.01), M.accent, [0.3, 2.21, 0.92]);
  return g;
}

function buildMount(M, T) {
  const g = new THREE.Group();
  add(g, rb(3.78, 0.28, 2.38, 0.09, 2), M.alu, [0, -2.36, 0.05]);
  add(g, rb(3.45, 0.08, 2.05, 0.05, 2), M.dark, [0, -2.5, 0.05]);

  // magnets
  [-1.12, 1.12].forEach((x) => {
    add(g, cyl(0.42, 0.42, 0.08, 36), M.dark, [x, -2.52, 0.32]);
    add(g, torus(0.42, 0.022, 36), M.copper, [x, -2.48, 0.32], [Math.PI / 2, 0, 0]);
  });

  // locking tabs
  [-0.88, 0.88].forEach((x) => {
    add(g, rb(0.3, 0.32, 1.5, 0.04, 2), M.shellEdge, [x, -2.55, -0.32]);
    add(g, rb(0.18, 0.12, 0.5, 0.03, 2), M.dark, [x, -2.68, -0.62]);
  });

  // 1/4 screw insert
  add(g, cyl(0.3, 0.3, 0.12, 32), M.dark, [0, -2.55, 0.18]);
  add(g, torus(0.3, 0.022, 32), M.gold, [0, -2.6, 0.18], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.14, 0.14, 0.06, 24), M.black, [0, -2.6, 0.18]);
  add(g, new THREE.BoxGeometry(0.22, 0.012, 0.012), M.alu, [0, -2.63, 0.18]);

  // release lever
  add(g, rb(0.62, 0.14, 0.32, 0.03, 2), M.hot, [1.65, -2.33, 0.92], [0, 0.25, 0]);
  add(g, new THREE.BoxGeometry(0.36, 0.02, 0.02), M.accent, [1.65, -2.25, 0.92], [0, 0.25, 0]);
  return g;
}

function buildIO(M, T) {
  const g = new THREE.Group();
  add(g, rb(0.5, 2.7, 2.5, 0.08, 3), M.shellEdge, [-3.08, -0.3, 0]);

  // USB-C
  add(g, rb(0.13, 0.44, 0.9, 0.07, 2), M.alu, [-3.33, -0.35, 0.35]);
  add(g, rb(0.07, 0.24, 0.68, 0.05, 2), M.black, [-3.39, -0.35, 0.35]);
  add(g, new THREE.BoxGeometry(0.02, 0.04, 0.46), M.gold, [-3.425, -0.35, 0.35]);

  // speaker grille
  add(g, plane(1.45, 1.15), M.speaker, [-3.332, 0.65, 0.05], [0, -Math.PI / 2, 0]);
  add(g, new THREE.BoxGeometry(0.01, 1.22, 0.02), M.accent, [-3.338, 0.65, -0.56]);

  // microSD slot
  add(g, rb(0.07, 0.12, 0.58, 0.02, 2), M.black, [-3.37, 0.12, -0.92]);
  add(g, new THREE.BoxGeometry(0.02, 0.05, 0.34), M.gold, [-3.4, 0.12, -0.92]);

  // flex tail into board
  add(g, new THREE.BoxGeometry(0.035, 0.55, 0.95), M.flex, [-2.8, -1.4, 0.05], [0.2, 0, 0]);
  add(g, new THREE.BoxGeometry(0.03, 0.3, 0.78), M.gold, [-2.79, -1.68, 0.02], [0.2, 0, 0]);

  // port door seal
  add(g, new THREE.BoxGeometry(0.02, 0.58, 1.1), M.rubber, [-3.32, -0.35, 0.35]);
  return g;
}

const BUILDERS = {
  'front-shell': buildFrontShell,
  sensor: buildSensor,
  'front-screen': buildFrontScreen,
  mainboard: buildMainboard,
  cooling: buildCooling,
  battery: buildBattery,
  'rear-screen': buildRearScreen,
  frame: buildFrame,
  'top-controls': buildTopControls,
  mount: buildMount,
  io: buildIO
};

/* ───────────────────────── public API ───────────────────────── */

export function buildModel() {
  const textures = createTextures();
  const materials = createMaterials(textures);
  const root = new THREE.Group();
  root.name = 'osmo-action-4';
  const map = new Map();

  PARTS.forEach((def, index) => {
    const builder = BUILDERS[def.id];
    const group = builder(materials, textures);
    group.name = def.id;
    group.userData.index = index;
    group.traverse((o) => {
      if (o.isMesh) {
        o.userData.partIndex = index;
        o.userData.partId = def.id;
      }
    });
    root.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const anchor = def.anchor ? new THREE.Vector3(...def.anchor) : center.clone();
    map.set(def.id, { def, index, group, box, center, anchor: anchor.clone() });
  });

  return { root, map, textures, materials };
}
