'use strict';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const W = 800, H = 500;
const SEAL_SPEED     = 4;
const MAX_FISH               = 18;
const SPAWN_INTERVAL         = 900;  // ms between fish spawns
const POWERUP_SPAWN_INTERVAL = 7000; // ms between power-up spawns
const MAX_POWERUPS           = 2;
const SPEED_BOOST_MULTIPLIER = 2;
const MAGNET_RANGE           = 130;
const PARTICLE_LIFETIME = 700; // ms

const FISH_TYPES = [
  { name: 'Minnow',     emoji: '🐟', w: 24,  h: 16,  points: 1,  speed: 3.0, weight: 35 },
  { name: 'Clownfish',  emoji: '🐠', w: 38,  h: 26,  points: 2,  speed: 2.3, weight: 28 },
  { name: 'Pufferfish', emoji: '🐡', w: 50,  h: 38,  points: 3,  speed: 1.6, weight: 20 },
  { name: 'Prawn',      emoji: '🦐', w: 60,  h: 42,  points: 5,  speed: 2.8, weight: 12 },
  { name: 'Octopus',    emoji: '🐙', w: 76,  h: 58,  points: 10, speed: 1.1, weight: 5  },
  { name: 'Baby Shark', emoji: '🦈', w: 90,  h: 60,  points: 50, speed: 3.8, weight: 1  },
];

const POWERUP_TYPES = [
  { name: 'Speed Boost', emoji: '⚡', color: '#ffff44', duration: 5000, weight: 35, effect: 'speed'  },
  { name: 'Size Up',     emoji: '🔴', color: '#ff7777', duration: 5000, weight: 30, effect: 'sizeUp' },
  { name: '2× Points',   emoji: '⭐', color: '#ffd700', duration: 6000, weight: 25, effect: 'double' },
  { name: 'Magnet',      emoji: '🧲', color: '#cc88ff', duration: 5000, weight: 10, effect: 'magnet' },
];

const SEAL_TYPES = [
  { name: 'Standard', filter: '' },
  { name: 'Arctic',   filter: 'brightness(1.9) saturate(0.05)' },
  { name: 'Brown',    filter: 'sepia(1) saturate(1.8) brightness(0.9)' },
  { name: 'Spotted',  filter: 'hue-rotate(200deg) saturate(1.5)' },
  { name: 'Dark',     filter: 'brightness(0.35) saturate(0.5)' },
  { name: 'Golden',   filter: 'sepia(1) brightness(1.4) saturate(2.5)' },
];

const ACCESSORIES = [
  { name: 'None',        emoji: null,  region: null   },
  { name: 'Top Hat',     emoji: '🎩',  region: 'head' },
  { name: 'Crown',       emoji: '👑',  region: 'head' },
  { name: 'Sun Hat',     emoji: '👒',  region: 'head' },
  { name: 'Grad Cap',    emoji: '🎓',  region: 'head' },
  { name: 'Helmet',      emoji: '🪖',  region: 'head' },
  { name: 'Glasses',     emoji: '👓',  region: 'face' },
  { name: 'Sunglasses',  emoji: '🕶️', region: 'face' },
  { name: 'Bow Tie',     emoji: '🎀',  region: 'body' },
  { name: 'Scarf',       emoji: '🧣',  region: 'body' },
];

const ACCESSORY_COLORS = [
  { name: 'Default', filter: '' },
  { name: 'Red',     filter: 'hue-rotate(340deg) saturate(3)' },
  { name: 'Blue',    filter: 'hue-rotate(200deg) saturate(3)' },
  { name: 'Green',   filter: 'hue-rotate(110deg) saturate(3)' },
  { name: 'Purple',  filter: 'hue-rotate(270deg) saturate(3)' },
  { name: 'Gold',    filter: 'sepia(1) brightness(1.5) saturate(3)' },
];

const THEMES = [
  { name: 'Ocean',    emoji: '🌊', body: '#0d1b2a', draw: drawOceanBg },
  { name: 'Coral',    emoji: '🪸', body: '#1a0810', draw: drawCoralBg },
  { name: 'Deep Sea', emoji: '🌑', body: '#000005', draw: drawDeepSeaBg },
  { name: 'Arctic',   emoji: '🧊', body: '#7eafc9', draw: drawArcticBg },
  { name: 'Lava',     emoji: '🌋', body: '#1a0000', draw: drawLavaBg },
  { name: 'Custom',   emoji: '📁', body: '#0d1b2a', draw: null },
];

/* ═══════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════ */
let gameState    = 'menu';   // 'menu' | 'playing' | 'ended'
let score        = 0;
let caughtCount  = 0;
let timeLeft     = 120;
let gameDuration = 120;
let highScore    = parseInt(localStorage.getItem('sealHighScore') || '0', 10);
let timerAccum   = 0;
let spawnAccum   = 0;
let lastTs       = 0;
let rafId        = null;

const keys = {};

const seal = {
  x: W / 2 - 32,
  y: H / 2 - 24,
  w: 64, h: 48,
  facing: 1,    // 1 = right, -1 = left
  img: null,
  type: 0,           // index into SEAL_TYPES
  accessory: 0,      // index into ACCESSORIES (0 = none)
  accessoryColor: 0, // index into ACCESSORY_COLORS
};

const fishImages = Array(FISH_TYPES.length).fill(null); // one entry per FISH_TYPES entry

let currentTheme  = 0;
let bgCustomImage = null;

let fishes    = [];
let particles = [];
let powerups  = [];
let powerupAccum   = 0;
let activeEffects  = {}; // { effectName: { timeLeft, duration } }

const catchLog   = [];
const catchLogEl = document.getElementById('catch-log');

/* ═══════════════════════════════════════════════════════════
   CANVAS
═══════════════════════════════════════════════════════════ */
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');

/* ═══════════════════════════════════════════════════════════
   INPUT
═══════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */
function fmtTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function weightedRandom(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.weight; if (r <= 0) return item; }
  return items[items.length - 1];
}

function loadImageFromFile(file, onLoad) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => onLoad(img, e.target.result);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ═══════════════════════════════════════════════════════════
   SPAWNING
═══════════════════════════════════════════════════════════ */
function spawnFish() {
  if (fishes.length >= MAX_FISH) return;
  const type  = weightedRandom(FISH_TYPES);
  const tidx  = FISH_TYPES.indexOf(type);
  const edge  = Math.floor(Math.random() * 4);
  let x, y, dx, dy;

  switch (edge) {
    case 0: x = Math.random() * (W - type.w); y = -type.h;  dx = (Math.random()-0.5)*2; dy = Math.random()*0.5+0.5;  break;
    case 1: x = Math.random() * (W - type.w); y = H;         dx = (Math.random()-0.5)*2; dy = -(Math.random()*0.5+0.5); break;
    case 2: x = -type.w; y = Math.random()*(H-type.h);       dx = Math.random()*0.5+0.5; dy = (Math.random()-0.5)*2;   break;
    case 3: x = W;       y = Math.random()*(H-type.h);       dx = -(Math.random()*0.5+0.5); dy = (Math.random()-0.5)*2; break;
  }
  const mag = Math.sqrt(dx*dx + dy*dy);
  dx = (dx/mag) * type.speed;
  dy = (dy/mag) * type.speed;

  fishes.push({ type, tidx, x, y, dx, dy, w: type.w, h: type.h, wobble: Math.random()*Math.PI*2 });
}

function spawnPowerup() {
  if (powerups.length >= MAX_POWERUPS) return;
  const type  = weightedRandom(POWERUP_TYPES);
  const pw = 36, ph = 36;
  const edge  = Math.floor(Math.random() * 4);
  let x, y, dx, dy;
  const speed = 1.5;
  switch (edge) {
    case 0: x = Math.random()*(W-pw); y = -ph; dx = (Math.random()-0.5); dy = speed; break;
    case 1: x = Math.random()*(W-pw); y = H;   dx = (Math.random()-0.5); dy = -speed; break;
    case 2: x = -pw; y = Math.random()*(H-ph); dx = speed; dy = (Math.random()-0.5); break;
    default: x = W; y = Math.random()*(H-ph); dx = -speed; dy = (Math.random()-0.5); break;
  }
  powerups.push({ type, x, y, dx, dy, w: pw, h: ph, wobble: Math.random()*Math.PI*2 });
}

/* ═══════════════════════════════════════════════════════════
   PARTICLES
═══════════════════════════════════════════════════════════ */
function spawnParticles(cx, cy, emoji) {
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2.5 + 1;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
      life: PARTICLE_LIFETIME, maxLife: PARTICLE_LIFETIME,
      emoji,
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   UPDATE
═══════════════════════════════════════════════════════════ */
function updateSeal() {
  let moved = false;
  const spd = SEAL_SPEED * (activeEffects.speed ? SPEED_BOOST_MULTIPLIER : 1);
  if (keys['ArrowLeft'])  { seal.x -= spd; seal.facing = -1; moved = true; }
  if (keys['ArrowRight']) { seal.x += spd; seal.facing =  1; moved = true; }
  if (keys['ArrowUp'])    { seal.y -= spd; moved = true; }
  if (keys['ArrowDown'])  { seal.y += spd; moved = true; }
  seal.x = Math.max(0, Math.min(W - seal.w, seal.x));
  seal.y = Math.max(0, Math.min(H - seal.h, seal.y));
}

function updateFish() {
  for (const fish of fishes) {
    fish.x += fish.dx;
    fish.y += fish.dy;
    fish.wobble += 0.06;
    if (fish.x <= 0 || fish.x + fish.w >= W) { fish.dx *= -1; fish.x = Math.max(0, Math.min(W - fish.w, fish.x)); }
    if (fish.y <= 0 || fish.y + fish.h >= H) { fish.dy *= -1; fish.y = Math.max(0, Math.min(H - fish.h, fish.y)); }
  }
}

function checkCollisions() {
  const pad = 6;
  for (let i = fishes.length - 1; i >= 0; i--) {
    const f = fishes[i];
    let caught = (
      seal.x + pad       < f.x + f.w &&
      seal.x + seal.w - pad > f.x     &&
      seal.y + pad       < f.y + f.h &&
      seal.y + seal.h - pad > f.y
    );
    if (!caught && activeEffects.magnet) {
      const fdx = (f.x + f.w/2) - (seal.x + seal.w/2);
      const fdy = (f.y + f.h/2) - (seal.y + seal.h/2);
      caught = Math.sqrt(fdx*fdx + fdy*fdy) < MAGNET_RANGE;
    }
    if (caught) {
      const pts = f.type.points * (activeEffects.double ? 2 : 1);
      score       += pts;
      caughtCount += 1;
      document.getElementById('score').textContent  = score;
      document.getElementById('caught').textContent = caughtCount;
      addCatchLog(`+${pts} ${f.type.emoji} ${f.type.name}`);
      spawnParticles(f.x + f.w/2, f.y + f.h/2, f.type.emoji);
      fishes.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05; // gravity
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updatePowerupItems() {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.x += p.dx;
    p.y += p.dy;
    p.wobble += 0.05;
    if (p.x + p.w < -20 || p.x > W + 20 || p.y + p.h < -20 || p.y > H + 20) {
      powerups.splice(i, 1);
    }
  }
}

function updateActiveEffects(dt) {
  for (const effect of Object.keys(activeEffects)) {
    activeEffects[effect].timeLeft -= dt;
    if (activeEffects[effect].timeLeft <= 0) {
      if (effect === 'sizeUp') {
        const cx = seal.x + seal.w / 2;
        const cy = seal.y + seal.h / 2;
        seal.w = 64; seal.h = 48;
        seal.x = Math.max(0, Math.min(W - seal.w, cx - seal.w / 2));
        seal.y = Math.max(0, Math.min(H - seal.h, cy - seal.h / 2));
      }
      delete activeEffects[effect];
    }
  }
}

function applyPowerup(type) {
  activeEffects[type.effect] = { timeLeft: type.duration, duration: type.duration };
  if (type.effect === 'sizeUp') {
    const cx = seal.x + seal.w / 2;
    const cy = seal.y + seal.h / 2;
    seal.w = 96; seal.h = 72;
    seal.x = Math.max(0, Math.min(W - seal.w, cx - seal.w / 2));
    seal.y = Math.max(0, Math.min(H - seal.h, cy - seal.h / 2));
  }
  addCatchLog(`✨ ${type.name}!`);
}

function checkPowerupCollisions() {
  const pad = 4;
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    if (
      seal.x + pad         < p.x + p.w &&
      seal.x + seal.w - pad > p.x       &&
      seal.y + pad         < p.y + p.h &&
      seal.y + seal.h - pad > p.y
    ) {
      applyPowerup(p.type);
      spawnParticles(p.x + p.w / 2, p.y + p.h / 2, p.type.emoji);
      powerups.splice(i, 1);
    }
  }
}

function addCatchLog(msg) {
  catchLog.unshift(msg);
  if (catchLog.length > 8) catchLog.pop();
  catchLogEl.textContent = catchLog.join(' · ');
}

/* ═══════════════════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════════════════ */
function drawBackground() {
  if (currentTheme === 5) {
    if (bgCustomImage) {
      ctx.drawImage(bgCustomImage, 0, 0, W, H);
    } else {
      drawOceanBg();
    }
    return;
  }
  const theme = THEMES[currentTheme] || THEMES[0];
  if (theme.draw) theme.draw();
}

function drawOceanBg() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0096c7');
  grad.addColorStop(1, '#03045e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Animated light rays
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#fff';
  const t = Date.now() * 0.0004;
  for (let i = 0; i < 6; i++) {
    const bx = ((i * 160 + t * 60) % (W + 100)) - 50;
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + 40, H);
    ctx.lineTo(bx + 80, H);
    ctx.lineTo(bx + 40, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Bubbles
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 18; i++) {
    const bx = (i * 67  + Math.sin(Date.now()*0.001 + i) * 18) % W;
    const by = (i * 101 + Math.cos(Date.now()*0.0008 + i) * 25) % H;
    ctx.beginPath();
    ctx.arc(bx, by, 2.5 + Math.sin(i*0.7), 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCoralBg() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#f4511e');
  grad.addColorStop(1, '#6a0572');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const t = Date.now() * 0.0003;
  // Warm light rays
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#ffaa44';
  for (let i = 0; i < 5; i++) {
    const bx = ((i * 180 + t * 50) % (W + 100)) - 50;
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + 50, H);
    ctx.lineTo(bx + 90, H);
    ctx.lineTo(bx + 40, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Colorful bubbles
  ctx.save();
  const bubbleColors = ['rgba(255,100,100,0.15)', 'rgba(255,200,50,0.12)', 'rgba(200,100,255,0.12)'];
  for (let i = 0; i < 20; i++) {
    const bx = ((i * 52 + Math.sin(Date.now() * 0.0012 + i) * 20) % W + W) % W;
    const by = ((i * 89 + Math.cos(Date.now() * 0.0009 + i) * 22) % H + H) % H;
    ctx.fillStyle = bubbleColors[i % bubbleColors.length];
    ctx.beginPath();
    ctx.arc(bx, by, 3 + Math.sin(i * 0.8), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDeepSeaBg() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#050517');
  grad.addColorStop(1, '#000000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const t = Date.now() * 0.001;
  ctx.save();
  ctx.shadowBlur = 8;
  const bioColors = ['#00ff88', '#0088ff', '#88ffcc'];
  for (let i = 0; i < 25; i++) {
    const bx = ((i * 43 + Math.sin(t * 0.4 + i) * 15) % W + W) % W;
    const by = ((i * 77 + Math.cos(t * 0.3 + i) * 20) % H + H) % H;
    const glow = 0.3 + 0.3 * Math.sin(t * 2 + i * 1.3);
    ctx.globalAlpha = glow;
    const col = bioColors[i % bioColors.length];
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.beginPath();
    ctx.arc(bx, by, 1.5 + Math.abs(Math.sin(i * 0.9)) * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawArcticBg() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#90e0ef');
  grad.addColorStop(1, '#023e8a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const t = Date.now() * 0.001;
  ctx.save();
  // Drifting snowflakes
  for (let i = 0; i < 22; i++) {
    const bx = ((i * 53 + Math.sin(t * 0.5 + i) * 25) % W + W) % W;
    const speed = 0.5 + (i % 3) * 0.5;
    const by = ((i * 89 + t * 15 * speed) % H + H) % H;
    ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t + i);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(bx, by, 1.5 + Math.sin(i * 1.1) * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ice shimmer rays
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    const bx = ((i * 220 + t * 40) % (W + 100)) - 50;
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + 30, H);
    ctx.lineTo(bx + 60, H);
    ctx.lineTo(bx + 30, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawLavaBg() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#cc3300');
  grad.addColorStop(1, '#1a0000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const t = Date.now() * 0.001;
  ctx.save();
  ctx.shadowBlur = 6;
  const emberColors = ['#ff6600', '#ffcc00', '#ff3300'];
  for (let i = 0; i < 20; i++) {
    const bx = ((i * 51 + Math.sin(t * 0.6 + i) * 18) % W + W) % W;
    const by = H - ((i * 73 + t * 25) % H);
    const glow = 0.4 + 0.4 * Math.sin(t * 3 + i * 1.7);
    ctx.globalAlpha = glow;
    const col = emberColors[i % emberColors.length];
    ctx.fillStyle = col;
    ctx.shadowColor = '#ff4400';
    ctx.beginPath();
    ctx.arc(bx, by, 1 + Math.abs(Math.sin(i * 1.3)) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSprite(img, emoji, x, y, w, h, flipH, filter) {
  ctx.save();
  if (flipH) {
    ctx.translate(x + w/2, y + h/2);
    ctx.scale(-1, 1);
    ctx.translate(-(x + w/2), -(y + h/2));
  }
  if (filter) ctx.filter = filter;
  if (img) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    ctx.font = `${Math.min(w, h) * 1.1}px serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, x + w/2, y + h/2);
  }
  ctx.restore();
}

function drawAccessory(acc, colorFilter) {
  const aw = seal.w * 0.65;
  let ax = seal.x + (seal.w - aw) / 2;
  let ay;
  switch (acc.region) {
    case 'head': ay = seal.y - aw * 0.45; break;
    case 'face': ay = seal.y + seal.h * 0.05; break;
    default:     ay = seal.y + seal.h * 0.38; break; // body
  }
  ctx.save();
  if (seal.facing === -1) {
    ctx.translate(seal.x + seal.w / 2, seal.y + seal.h / 2);
    ctx.scale(-1, 1);
    ctx.translate(-(seal.x + seal.w / 2), -(seal.y + seal.h / 2));
  }
  if (colorFilter) ctx.filter = colorFilter;
  ctx.font = `${aw * 0.85}px serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(acc.emoji, ax + aw / 2, ay + aw / 2);
  ctx.restore();
}

function drawSeal() {
  const sealType = SEAL_TYPES[seal.type] || SEAL_TYPES[0];
  // Custom images are drawn without the seal-type filter so the user's
  // artwork is not unintentionally recoloured; filters apply to the emoji only.
  const filter = seal.img ? '' : sealType.filter;
  drawSprite(seal.img, '🦭', seal.x, seal.y, seal.w, seal.h, seal.facing === -1, filter);
  const acc = ACCESSORIES[seal.accessory];
  if (acc && acc.emoji) {
    const accColor = ACCESSORY_COLORS[seal.accessoryColor] || ACCESSORY_COLORS[0];
    drawAccessory(acc, accColor.filter);
  }
}

function drawFishes() {
  for (const fish of fishes) {
    ctx.save();
    const cx = fish.x + fish.w/2;
    const cy = fish.y + fish.h/2;
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(fish.wobble) * 0.08);
    ctx.translate(-cx, -cy);
    const flipH = fish.dx < 0;
    drawSprite(fishImages[fish.tidx], fish.type.emoji, fish.x, fish.y, fish.w, fish.h, flipH);
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '16px serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(p.emoji, p.x, p.y);
    ctx.restore();
  }
}

function drawPowerups() {
  const now = Date.now();
  for (const p of powerups) {
    const pulse = 0.7 + 0.3 * Math.sin(now * 0.004 + p.wobble);
    ctx.save();
    ctx.shadowBlur  = 14 * pulse;
    ctx.shadowColor = p.type.color;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle   = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.type.color;
    ctx.lineWidth   = 2;
    ctx.globalAlpha = pulse;
    ctx.stroke();
    ctx.globalAlpha  = 1;
    ctx.shadowBlur   = 0;
    ctx.font         = '22px serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'center';
    ctx.fillText(p.type.emoji, p.x + p.w / 2, p.y + p.h / 2);
    ctx.restore();
  }
}

function drawActiveEffectsHUD() {
  const effects = Object.entries(activeEffects);
  if (effects.length === 0) return;
  let x = 8;
  const y = H - 8;
  const bw = 50, bh = 30;
  for (const [effect, data] of effects) {
    const type  = POWERUP_TYPES.find(t => t.effect === effect);
    if (!type) continue;
    const ratio = Math.max(0, data.timeLeft / data.duration);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y - bh, bw, bh);
    ctx.fillStyle   = type.color;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x + 2, y - 7, (bw - 4) * ratio, 5);
    ctx.globalAlpha  = 1;
    ctx.font         = '18px serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'center';
    ctx.fillText(type.emoji, x + bw / 2, y - bh / 2 - 2);
    ctx.restore();
    x += bw + 6;
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawPowerups();
  drawFishes();
  drawSeal();
  drawParticles();
  drawActiveEffectsHUD();
}

/* ═══════════════════════════════════════════════════════════
   TIMER DISPLAY
═══════════════════════════════════════════════════════════ */
function updateTimerEl() {
  document.getElementById('timer').textContent = fmtTime(timeLeft);
  const el = document.getElementById('timer-display');
  el.className = '';
  if (timeLeft <= 10) el.classList.add('danger');
  else if (timeLeft <= 30) el.classList.add('warning');
}

/* ═══════════════════════════════════════════════════════════
   GAME LOOP
═══════════════════════════════════════════════════════════ */
let settingsPanelOpen = false;

function gameLoop(ts) {
  if (gameState !== 'playing') return;
  const dt = ts - lastTs;
  lastTs = ts;

  const paused = settingsPanelOpen;
  if (!paused) {
    timerAccum   += dt;
    spawnAccum   += dt;
    powerupAccum += dt;

    if (timerAccum >= 1000) {
      timerAccum -= 1000;
      timeLeft = Math.max(0, timeLeft - 1);
      updateTimerEl();
      if (timeLeft <= 0) { endGame(); return; }
    }

    if (spawnAccum >= SPAWN_INTERVAL) {
      spawnAccum -= SPAWN_INTERVAL;
      spawnFish();
    }

    if (powerupAccum >= POWERUP_SPAWN_INTERVAL) {
      powerupAccum -= POWERUP_SPAWN_INTERVAL;
      spawnPowerup();
    }

    updateSeal();
    updateFish();
    updatePowerupItems();
    updateActiveEffects(dt);
    checkCollisions();
    checkPowerupCollisions();
    updateParticles(dt);
  }

  render();
  rafId = requestAnimationFrame(gameLoop);
}

/* ── Menu idle loop ── */
function menuLoop(ts) {
  if (gameState !== 'menu') return;
  const dt = ts - (lastTs || ts);
  lastTs = ts;
  updateFish();
  updateParticles(dt);
  render();
  requestAnimationFrame(menuLoop);
}

/* ═══════════════════════════════════════════════════════════
   GAME CONTROL
═══════════════════════════════════════════════════════════ */
function startGame() {
  if (rafId) cancelAnimationFrame(rafId);
  score = 0; caughtCount = 0; timeLeft = gameDuration;
  timerAccum = 0; spawnAccum = 0; powerupAccum = 0;
  particles = []; fishes = []; powerups = []; activeEffects = {};
  catchLog.length = 0; catchLogEl.textContent = '';
  seal.w = 64; seal.h = 48; // reset size in case sizeUp was active
  seal.x = W/2 - seal.w/2; seal.y = H/2 - seal.h/2; seal.facing = 1;
  document.getElementById('score').textContent  = '0';
  document.getElementById('caught').textContent = '0';
  updateTimerEl();
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('end-screen').style.display   = 'none';
  gameState = 'playing';
  lastTs = performance.now();
  spawnFish(); spawnFish(); spawnFish();
  rafId = requestAnimationFrame(gameLoop);
}

function endGame() {
  gameState = 'ended';
  if (rafId) cancelAnimationFrame(rafId);
  const newBest = score > highScore;
  if (newBest) {
    highScore = score;
    localStorage.setItem('sealHighScore', highScore);
    document.getElementById('highscore').textContent = highScore;
  }
  document.getElementById('end-screen').style.display = 'flex';
  document.getElementById('end-title').textContent = newBest ? '🏆 New High Score!' : '🏆 Time\'s Up!';
  document.getElementById('end-message').innerHTML =
    `You caught <strong>${caughtCount}</strong> fish and scored <strong>${score}</strong> points!<br>
     Best score: <strong>${highScore}</strong>`;
}

function showMenu() {
  gameState = 'menu';
  if (rafId) cancelAnimationFrame(rafId);
  fishes = []; particles = [];
  document.getElementById('end-screen').style.display   = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  lastTs = performance.now();
  // seed some fish for the menu
  for (let i = 0; i < 6; i++) spawnFish();
  requestAnimationFrame(menuLoop);
}

/* ═══════════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════════ */
function openSettings() {
  settingsPanelOpen = true;
  document.getElementById('settings-panel').style.display   = 'block';
  document.getElementById('settings-backdrop').style.display = 'block';
}

function closeSettings() {
  settingsPanelOpen = false;
  document.getElementById('settings-panel').style.display   = 'none';
  document.getElementById('settings-backdrop').style.display = 'none';
}

/* ═══════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════ */
function selectTheme(idx) {
  if (idx === 5) {
    // Trigger custom image upload; theme changes only if file is selected
    document.getElementById('bg-upload').click();
    return;
  }
  currentTheme = idx;
  updateThemeUI();
  updateBodyBg();
}

function updateThemeUI() {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    const t = parseInt(btn.dataset.theme, 10);
    btn.classList.toggle('active', t === currentTheme);
  });
}

function updateBodyBg() {
  const theme = THEMES[currentTheme] || THEMES[0];
  document.body.style.background = theme.body;
}

function applySettings() {
  const val = parseInt(document.getElementById('s-duration').value, 10);
  if (!isNaN(val) && val >= 10 && val <= 600) {
    gameDuration = val;
    if (gameState !== 'playing') { timeLeft = gameDuration; updateTimerEl(); }
  }
  closeSettings();
}

function setPreview(id, img, emoji) {
  const el = document.getElementById(id);
  if (img) {
    const i = document.createElement('img');
    i.src = img.src;
    el.replaceChildren(i);
  } else {
    el.textContent = emoji;
  }
}

/* duration label live update */
document.getElementById('s-duration').addEventListener('input', function () {
  const v = parseInt(this.value, 10);
  document.getElementById('s-duration-label').textContent = isNaN(v) ? '' : `= ${fmtTime(v)}`;
});

/* image uploads */
document.getElementById('img-seal').addEventListener('change', function () {
  if (!this.files[0]) return;
  loadImageFromFile(this.files[0], (img, src) => {
    seal.img = img;
    setPreview('prev-seal', img, '🦭');
  });
});

for (let i = 0; i < FISH_TYPES.length; i++) {
  const idx = i;
  document.getElementById(`img-fish-${i}`).addEventListener('change', function () {
    if (!this.files[0]) return;
    loadImageFromFile(this.files[0], (img) => {
      fishImages[idx] = img;
      setPreview(`prev-fish-${idx}`, img, FISH_TYPES[idx].emoji);
    });
  });
}

/* reset buttons */
document.querySelectorAll('[data-reset]').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.reset;
    if (key === 'seal') {
      seal.img = null;
      document.getElementById('prev-seal').textContent = '🦭';
      document.getElementById('img-seal').value = '';
    } else {
      const idx = parseInt(key.split('-')[1], 10);
      fishImages[idx] = null;
      document.getElementById(`prev-fish-${idx}`).textContent = FISH_TYPES[idx].emoji;
      document.getElementById(`img-fish-${idx}`).value = '';
    }
  });
});

/* theme selection */
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectTheme(parseInt(btn.dataset.theme, 10));
  });
});

document.getElementById('bg-upload').addEventListener('change', function () {
  if (!this.files[0]) return;
  loadImageFromFile(this.files[0], (img) => {
    bgCustomImage = img;
    currentTheme = 5;
    updateThemeUI();
    updateBodyBg();
  });
});

/* ── Button wiring ── */
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('open-settings-start').addEventListener('click', openSettings);
document.getElementById('settings-btn').addEventListener('click', openSettings);
document.getElementById('s-apply').addEventListener('click', applySettings);
document.getElementById('s-close').addEventListener('click', closeSettings);
document.getElementById('settings-backdrop').addEventListener('click', closeSettings);
document.getElementById('play-again-btn').addEventListener('click', startGame);
document.getElementById('menu-btn').addEventListener('click', showMenu);

/* ── Seal type selection ── */
function selectSealType(idx) {
  seal.type = idx;
  updateSealTypeUI();
}

function updateSealTypeUI() {
  document.querySelectorAll('.seal-type-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.sealType, 10) === seal.type);
  });
}

document.querySelectorAll('.seal-type-btn').forEach(btn => {
  btn.addEventListener('click', () => selectSealType(parseInt(btn.dataset.sealType, 10)));
});

/* ── Accessory selection ── */
function selectAccessory(idx) {
  seal.accessory = idx;
  updateAccessoryUI();
}

function updateAccessoryUI() {
  document.querySelectorAll('.accessory-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.accessory, 10) === seal.accessory);
  });
}

document.querySelectorAll('.accessory-btn').forEach(btn => {
  btn.addEventListener('click', () => selectAccessory(parseInt(btn.dataset.accessory, 10)));
});

/* ── Accessory colour selection ── */
function selectAccessoryColor(idx) {
  seal.accessoryColor = idx;
  updateAccessoryColorUI();
}

function updateAccessoryColorUI() {
  document.querySelectorAll('.acc-color-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.accColor, 10) === seal.accessoryColor);
  });
}

document.querySelectorAll('.acc-color-btn').forEach(btn => {
  btn.addEventListener('click', () => selectAccessoryColor(parseInt(btn.dataset.accColor, 10)));
});

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.getElementById('highscore').textContent = highScore;
updateTimerEl();
showMenu();
updateSealTypeUI();
updateAccessoryUI();
updateAccessoryColorUI();
