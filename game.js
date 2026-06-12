/* ================================================================
   JUNGLE WARFARE 3D — AMAZON STRIKE
   game.js — Full WebGL Game Engine
   Three.js r128 — Procedural Amazon Jungle
================================================================ */

'use strict';

/* ================================================================
   SECTION 1: GLOBAL STATE & CONSTANTS
================================================================ */
const STATE = {
  phase:         'loading',   // loading | menu | playing | paused | gameover
  health:        100,
  maxHealth:     100,
  armor:         75,
  maxArmor:      100,
  ammo:          30,
  maxAmmo:       30,
  reserveAmmo:   120,
  grenades:      3,
  score:         0,
  wave:          1,
  kills:         0,
  deaths:        0,
  shotsFired:    0,
  shotsHit:      0,
  startTime:     0,
  elapsedTime:   0,
  isReloading:   false,
  reloadTimer:   0,
  reloadDur:     2.2,
  isADS:         false,
  isSprinting:   false,
  isCrouching:   false,
  isGrounded:    true,
  playerVelY:    0,
  stamina:       100,
  maxStamina:    100,
  staminaDrain:  25,
  staminaRegen:  15,
  currentWeapon: 0,
  shootCooldown: 0,
  grenadeTimer:  0,
};

const WEAPONS = [
  {
    name:       'M4A1 ASSAULT RIFLE',
    ammo:       30,
    reserve:    120,
    damage:     22,
    fireRate:   0.10,
    reloadTime: 2.2,
    range:      80,
    spread:     0.012,
    auto:       true,
    muzzleFlash: true,
    color:      0x223344,
  },
  {
    name:       'AWM SNIPER RIFLE',
    ammo:       5,
    reserve:    25,
    damage:     95,
    fireRate:   1.2,
    reloadTime: 3.5,
    range:      200,
    spread:     0.001,
    auto:       false,
    muzzleFlash: true,
    color:      0x334422,
  },
];

const ENEMY_TYPES = [
  { name: 'Scout',   color: 0x8B2500, health: 4,  speed: 3.5, damage: 8,  score: 100, scale: 1.0 },
  { name: 'Soldier', color: 0x5B1A00, health: 7,  speed: 2.8, damage: 14, score: 200, scale: 1.1 },
  { name: 'Heavy',   color: 0x3A0800, health: 14, speed: 1.8, damage: 20, score: 350, scale: 1.35 },
  { name: 'Sniper',  color: 0x2A4B00, health: 5,  speed: 2.2, damage: 30, score: 300, scale: 0.95 },
  { name: 'Boss',    color: 0x1A0030, health: 40, speed: 2.0, damage: 25, score: 800, scale: 1.8 },
];

const MAP_SIZE    = 120;
const TREE_COUNT  = 280;
const BUSH_COUNT  = 160;
const ROCK_COUNT  = 80;
const VINE_COUNT  = 60;

const PLAYER_HEIGHT   = 1.75;
const PLAYER_CROUCH_H = 0.9;
const GRAVITY         = 18;
const JUMP_FORCE      = 7.5;
const MOVE_SPEED      = 5.5;
const SPRINT_SPEED    = 9.5;
const CROUCH_SPEED    = 2.8;
const BULLET_SPEED    = 90;
const ENEMY_BULLET_SPEED = 22;

/* ================================================================
   SECTION 2: THREE.JS ENGINE SETUP
================================================================ */
let renderer, scene, camera, clock;
let animFrameId = null;

function initRenderer() {
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias:     true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled  = true;
  renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
  renderer.toneMapping        = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.outputEncoding     = THREE.sRGBEncoding;

  window.addEventListener('resize', onResize);
}

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
}

function initScene() {
  scene  = new THREE.Scene();
  clock  = new THREE.Clock();

  // Deep Amazon jungle sky — dark greenish blue
  scene.background = new THREE.Color(0x0b1e0e);

  // Heavy exponential fog for jungle depth
  scene.fog = new THREE.FogExp2(0x0b1e0e, 0.028);

  camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 300);
  camera.position.set(0, PLAYER_HEIGHT, 0);
}

/* ================================================================
   SECTION 3: LIGHTING — AMAZON JUNGLE
================================================================ */
let sunLight, ambientLight;
const pointLights = [];

function buildLighting() {
  // Ambient — dappled jungle green
  ambientLight = new THREE.AmbientLight(0x1a3a12, 1.8);
  scene.add(ambientLight);

  // Sun — filtered through canopy, angled low
  sunLight = new THREE.DirectionalLight(0xc8e8a0, 1.2);
  sunLight.position.set(30, 60, 20);
  sunLight.castShadow          = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near  = 1;
  sunLight.shadow.camera.far   = 200;
  sunLight.shadow.camera.left  = -70;
  sunLight.shadow.camera.right = 70;
  sunLight.shadow.camera.top   = 70;
  sunLight.shadow.camera.bottom= -70;
  sunLight.shadow.bias         = -0.0005;
  scene.add(sunLight);

  // Hemisphere — sky/ground contrast
  const hemi = new THREE.HemisphereLight(0x3a7a20, 0x0a2205, 0.9);
  scene.add(hemi);

  // Scattered bioluminescent jungle light points
  const jungleLightConfigs = [
    { x: -20, y: 2, z: -20, color: 0x40ff80, intensity: 3.0, dist: 18 },
    { x:  25, y: 1, z:  15, color: 0x80ff40, intensity: 2.5, dist: 14 },
    { x: -30, y: 3, z:  25, color: 0x20ff60, intensity: 2.8, dist: 16 },
    { x:  10, y: 2, z: -35, color: 0x60ff20, intensity: 2.2, dist: 12 },
    { x: -10, y: 1, z:  40, color: 0x40cc80, intensity: 2.0, dist: 15 },
    { x:  40, y: 2, z: -10, color: 0x20ff80, intensity: 2.4, dist: 14 },
    { x: -45, y: 1, z:   5, color: 0x80cc40, intensity: 1.8, dist: 13 },
    { x:   5, y: 2, z:  50, color: 0x40ff60, intensity: 2.1, dist: 15 },
  ];

  jungleLightConfigs.forEach(cfg => {
    const pl = new THREE.PointLight(cfg.color, cfg.intensity, cfg.dist);
    pl.position.set(cfg.x, cfg.y, cfg.z);
    scene.add(pl);

    // Glow sphere
    const glowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: cfg.color })
    );
    glowMesh.position.copy(pl.position);
    scene.add(glowMesh);
    pointLights.push({ light: pl, glow: glowMesh, base: cfg.intensity, time: Math.random() * Math.PI * 2 });
  });
}

/* ================================================================
   SECTION 4: PROCEDURAL JUNGLE TERRAIN
================================================================ */
let terrainMesh;
const terrainHeightData = [];

function buildTerrain() {
  const segs = 120;
  const geo  = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const W   = segs + 1;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    // Layered noise for natural terrain
    const h =
      2.4 * simplex2(x * 0.015, z * 0.015) +
      0.8 * simplex2(x * 0.04,  z * 0.04)  +
      0.3 * simplex2(x * 0.12,  z * 0.12)  +
      0.1 * simplex2(x * 0.3,   z * 0.3);

    pos.setY(i, h);
    terrainHeightData.push({ x, z, h });
  }

  geo.computeVertexNormals();

  // Amazon jungle floor — dark mossy soil
  const mat = new THREE.MeshStandardMaterial({
    color:     0x1a3a0a,
    roughness: 0.98,
    metalness: 0.0,
  });

  // Add vertex colors for variety
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i);
    if (h > 1.5) {
      colors.push(0.3, 0.5, 0.15);   // higher ground — lighter
    } else if (h > 0.0) {
      colors.push(0.12, 0.22, 0.06); // normal jungle floor
    } else {
      colors.push(0.06, 0.14, 0.04); // low / wet areas
    }
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  mat.vertexColors = true;

  terrainMesh = new THREE.Mesh(geo, mat);
  terrainMesh.receiveShadow = true;
  terrainMesh.name = 'terrain';
  scene.add(terrainMesh);
}

// Simple Simplex-style noise (no import needed)
function simplex2(x, y) {
  const s   = (x + y) * 0.366025;
  const i   = Math.floor(x + s);
  const j   = Math.floor(y + s);
  const t   = (i + j) * 0.211325;
  const x0  = x - i + t;
  const y0  = y - j + t;
  const i1  = x0 > y0 ? 1 : 0;
  const j1  = x0 > y0 ? 0 : 1;
  const x1  = x0 - i1 + 0.211325;
  const y1  = y0 - j1 + 0.211325;
  const x2  = x0 - 0.577350;
  const y2  = y0 - 0.577350;
  const gi0 = gradDot(i, j, x0, y0);
  const gi1 = gradDot(i + i1, j + j1, x1, y1);
  const gi2 = gradDot(i + 1, j + 1, x2, y2);
  const n0  = Math.max(0, 0.5 - x0*x0 - y0*y0) ** 3 * gi0;
  const n1  = Math.max(0, 0.5 - x1*x1 - y1*y1) ** 3 * gi1;
  const n2  = Math.max(0, 0.5 - x2*x2 - y2*y2) ** 3 * gi2;
  return 70 * (n0 + n1 + n2);
}

function gradDot(ix, iy, x, y) {
  const h = hashInt(ix * 1619 + iy * 31337) & 7;
  const G = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  return G[h][0] * x + G[h][1] * y;
}

function hashInt(n) {
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  return (n >> 16) ^ n;
}

function getTerrainHeight(x, z) {
  return (
    2.4 * simplex2(x * 0.015, z * 0.015) +
    0.8 * simplex2(x * 0.04,  z * 0.04)  +
    0.3 * simplex2(x * 0.12,  z * 0.12)
  );
}

/* ================================================================
   SECTION 5: AMAZON JUNGLE VEGETATION
================================================================ */
const jungleObjects = [];  // collideable objects

function buildJungle() {
  buildTrees();
  buildBushes();
  buildRocks();
  buildVines();
  buildRiver();
  buildRuins();
  buildGrassPatch();
  buildFerns();
  buildMushrooms();
  buildFallenLogs();
}

/* --- TREES --- */
function buildTrees() {
  for (let i = 0; i < TREE_COUNT; i++) {
    let px, pz;
    do {
      px = (Math.random() - 0.5) * (MAP_SIZE - 10);
      pz = (Math.random() - 0.5) * (MAP_SIZE - 10);
    } while (Math.abs(px) < 8 && Math.abs(pz) < 8); // keep spawn clear

    const th = getTerrainHeight(px, pz);
    const treeType = Math.floor(Math.random() * 4);
    const treeGroup = createTree(treeType, px, th, pz);
    scene.add(treeGroup);
    jungleObjects.push({ mesh: treeGroup, radius: 0.6 + Math.random() * 0.4, x: px, z: pz });
  }
}

function createTree(type, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const trunkHeight = 8 + Math.random() * 14;
  const trunkR      = 0.25 + Math.random() * 0.35;
  const trunkSegs   = 7;

  // Trunk colors
  const trunkColors = [0x3d2208, 0x4a2a0a, 0x2d1a05, 0x5a3415];
  const trunkMat = new THREE.MeshStandardMaterial({
    color:     trunkColors[type % trunkColors.length],
    roughness: 0.98,
    metalness: 0.0,
  });

  // Curved trunk using multiple cylinders
  let curX = 0, curZ = 0;
  const segH = trunkHeight / trunkSegs;
  for (let s = 0; s < trunkSegs; s++) {
    const r0 = trunkR * (1 - s * 0.07);
    const r1 = trunkR * (1 - (s+1) * 0.07);
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.max(0.05, r1), Math.max(0.08, r0), segH, 7),
      trunkMat
    );
    seg.position.set(curX, s * segH + segH * 0.5, curZ);
    seg.rotation.x = (Math.random() - 0.5) * 0.08;
    seg.rotation.z = (Math.random() - 0.5) * 0.08;
    seg.castShadow    = true;
    seg.receiveShadow = true;
    group.add(seg);
    curX += (Math.random() - 0.5) * 0.15;
    curZ += (Math.random() - 0.5) * 0.15;
  }

  // Buttress roots for big tropical trees
  if (type === 1 || type === 3) {
    for (let r = 0; r < 5; r++) {
      const angle = (r / 5) * Math.PI * 2;
      const root  = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, trunkHeight * 0.3, 0.6),
        trunkMat
      );
      root.position.set(Math.cos(angle) * 0.5, trunkHeight * 0.15, Math.sin(angle) * 0.5);
      root.rotation.y = angle;
      root.rotation.z = Math.PI * 0.12;
      root.castShadow = true;
      group.add(root);
    }
  }

  // Canopy layers
  const canopyColors = [0x1a5a08, 0x0d4a05, 0x226810, 0x1a4a08, 0x2a6014];
  const canopyCount  = type === 2 ? 1 : 2 + Math.floor(Math.random() * 3);

  for (let c = 0; c < canopyCount; c++) {
    const canopyY = trunkHeight * (0.6 + c * 0.18) + (Math.random() - 0.5) * 1.5;
    const canopyR = 3 + Math.random() * 5;
    const flatness = 0.35 + Math.random() * 0.3;

    const canopyMat = new THREE.MeshStandardMaterial({
      color:     canopyColors[Math.floor(Math.random() * canopyColors.length)],
      roughness: 0.88,
      metalness: 0.05,
      side:      THREE.DoubleSide,
    });

    // Irregular canopy using SphereGeometry with deformation
    const cGeo = new THREE.SphereGeometry(canopyR, 9, 7);
    const cPos = cGeo.attributes.position;
    for (let v = 0; v < cPos.count; v++) {
      cPos.setX(v, cPos.getX(v) * (0.85 + Math.random() * 0.3));
      cPos.setY(v, cPos.getY(v) * flatness * (0.7 + Math.random() * 0.6));
      cPos.setZ(v, cPos.getZ(v) * (0.85 + Math.random() * 0.3));
    }
    cGeo.computeVertexNormals();

    const canopy = new THREE.Mesh(cGeo, canopyMat);
    canopy.position.set(curX + (Math.random()-0.5)*1.5, canopyY, curZ + (Math.random()-0.5)*1.5);
    canopy.castShadow    = true;
    canopy.receiveShadow = true;
    group.add(canopy);
  }

  // Random rotation
  group.rotation.y = Math.random() * Math.PI * 2;
  group.scale.setScalar(0.7 + Math.random() * 0.7);
  return group;
}

/* --- BUSHES --- */
function buildBushes() {
  const bushColors = [0x1a4a08, 0x225510, 0x0d3505, 0x2a6018, 0x183d08];
  for (let i = 0; i < BUSH_COUNT; i++) {
    const px = (Math.random() - 0.5) * (MAP_SIZE - 6);
    const pz = (Math.random() - 0.5) * (MAP_SIZE - 6);
    const th = getTerrainHeight(px, pz);
    const group = new THREE.Group();
    const sphereCount = 3 + Math.floor(Math.random() * 5);
    for (let s = 0; s < sphereCount; s++) {
      const r   = 0.4 + Math.random() * 0.7;
      const mat = new THREE.MeshStandardMaterial({
        color:     bushColors[Math.floor(Math.random() * bushColors.length)],
        roughness: 0.95,
      });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), mat);
      sphere.position.set((Math.random()-0.5)*1.2, r*0.6 + Math.random()*0.3, (Math.random()-0.5)*1.2);
      sphere.castShadow = true;
      group.add(sphere);
    }
    group.position.set(px, th, pz);
    group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(group);
  }
}

/* --- ROCKS --- */
function buildRocks() {
  for (let i = 0; i < ROCK_COUNT; i++) {
    const px   = (Math.random() - 0.5) * (MAP_SIZE - 8);
    const pz   = (Math.random() - 0.5) * (MAP_SIZE - 8);
    const th   = getTerrainHeight(px, pz);
    const s    = 0.3 + Math.random() * 1.8;
    const mat  = new THREE.MeshStandardMaterial({
      color:     0x2a2a2a,
      roughness: 0.92,
      metalness: 0.05,
    });
    // Deformed rock shape
    const geo  = new THREE.DodecahedronGeometry(s, 1);
    const pos  = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      pos.setX(v, pos.getX(v) * (0.7 + Math.random() * 0.6));
      pos.setY(v, pos.getY(v) * (0.5 + Math.random() * 0.6));
      pos.setZ(v, pos.getZ(v) * (0.7 + Math.random() * 0.6));
    }
    geo.computeVertexNormals();
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(px, th + s * 0.3, pz);
    rock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    rock.castShadow    = true;
    rock.receiveShadow = true;
    scene.add(rock);
    jungleObjects.push({ mesh: rock, radius: s * 0.7, x: px, z: pz });
  }
}

/* --- VINES --- */
function buildVines() {
  for (let i = 0; i < VINE_COUNT; i++) {
    const px  = (Math.random() - 0.5) * (MAP_SIZE - 10);
    const pz  = (Math.random() - 0.5) * (MAP_SIZE - 10);
    const th  = getTerrainHeight(px, pz);
    const len = 4 + Math.random() * 10;
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a5a10, roughness: 0.9 });
    // Hanging vine
    for (let s = 0; s < 6; s++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len / 6, 4), mat);
      seg.position.set(
        px + (Math.random()-0.5)*0.3,
        th + 12 - s * (len / 6),
        pz + (Math.random()-0.5)*0.3
      );
      seg.rotation.z = (Math.random()-0.5)*0.1;
      scene.add(seg);
    }
    // Leaf cluster at bottom
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3a7a18, roughness: 0.88, side: THREE.DoubleSide });
    const leaf    = new THREE.Mesh(new THREE.SphereGeometry(0.4 + Math.random()*0.4, 5, 4), leafMat);
    leaf.position.set(px, th + 12 - len, pz);
    scene.add(leaf);
  }
}

/* --- RIVER --- */
function buildRiver() {
  const riverMat = new THREE.MeshStandardMaterial({
    color:      0x0a3a5a,
    roughness:  0.0,
    metalness:  0.3,
    transparent: true,
    opacity:     0.82,
  });
  // Winding river segments
  let rx = -30, rz = -MAP_SIZE * 0.5 + 5;
  for (let s = 0; s < 18; s++) {
    const rw  = 5 + Math.random() * 4;
    const rl  = 8 + Math.random() * 6;
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(rw, rl), riverMat);
    seg.rotation.x = -Math.PI / 2;
    const th = getTerrainHeight(rx, rz + rl * 0.5);
    seg.position.set(rx, th - 0.2, rz + rl * 0.5);
    scene.add(seg);
    rz  += rl * 0.8;
    rx  += (Math.random() - 0.5) * 4;
  }
}

/* --- ANCIENT RUINS --- */
function buildRuins() {
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3a3a30, roughness: 0.95, metalness: 0.0 });
  const mossStone = new THREE.MeshStandardMaterial({ color: 0x2a3a1a, roughness: 0.98 });

  // Temple platform
  const platform = new THREE.Mesh(new THREE.BoxGeometry(18, 1.5, 18), stoneMat);
  const pth = getTerrainHeight(35, 35);
  platform.position.set(35, pth + 0.75, 35);
  platform.castShadow = platform.receiveShadow = true;
  scene.add(platform);

  // Pillars around ruins
  for (let p = 0; p < 8; p++) {
    const angle  = (p / 8) * Math.PI * 2;
    const px     = 35 + Math.cos(angle) * 7.5;
    const pz     = 35 + Math.sin(angle) * 7.5;
    const pilH   = 3 + Math.random() * 5;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, pilH, 7), stoneMat);
    pillar.position.set(px, pth + 1.5 + pilH * 0.5, pz);
    pillar.castShadow = true;
    scene.add(pillar);
    jungleObjects.push({ mesh: pillar, radius: 0.55, x: px, z: pz });
    // Some broken/toppled
    if (Math.random() < 0.3) {
      pillar.rotation.z = (Math.random() - 0.5) * 1.2;
    }
  }

  // Broken wall sections
  for (let w = 0; w < 5; w++) {
    const wx  = 35 + (Math.random() - 0.5) * 14;
    const wz  = 35 + (Math.random() - 0.5) * 14;
    const wth = getTerrainHeight(wx, wz);
    const wH  = 1 + Math.random() * 2.5;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, wH, 3 + Math.random()*3), mossStone);
    wall.position.set(wx, wth + wH*0.5, wz);
    wall.rotation.y = Math.random() * Math.PI;
    wall.castShadow = wall.receiveShadow = true;
    scene.add(wall);
    jungleObjects.push({ mesh: wall, radius: 0.6, x: wx, z: wz });
  }
}

/* --- GRASS PATCHES --- */
function buildGrassPatch() {
  const grassMat = new THREE.MeshStandardMaterial({
    color:     0x3a7a18,
    roughness: 0.95,
    side:      THREE.DoubleSide,
  });
  for (let i = 0; i < 400; i++) {
    const gx = (Math.random()-0.5) * MAP_SIZE * 0.9;
    const gz = (Math.random()-0.5) * MAP_SIZE * 0.9;
    const th = getTerrainHeight(gx, gz);
    const h  = 0.3 + Math.random() * 0.7;
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.15, h), grassMat);
    blade.position.set(gx, th + h*0.5, gz);
    blade.rotation.y = Math.random() * Math.PI;
    scene.add(blade);
  }
}

/* --- FERNS --- */
function buildFerns() {
  const fernMat = new THREE.MeshStandardMaterial({ color: 0x2a6010, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 120; i++) {
    const fx = (Math.random()-0.5) * MAP_SIZE * 0.85;
    const fz = (Math.random()-0.5) * MAP_SIZE * 0.85;
    const th = getTerrainHeight(fx, fz);
    const g  = new THREE.Group();
    const leafCount = 5 + Math.floor(Math.random() * 6);
    for (let l = 0; l < leafCount; l++) {
      const angle = (l / leafCount) * Math.PI * 2;
      const lLen  = 0.6 + Math.random() * 0.8;
      const leaf  = new THREE.Mesh(new THREE.PlaneGeometry(0.2, lLen), fernMat);
      leaf.position.set(Math.cos(angle)*lLen*0.5, lLen*0.3, Math.sin(angle)*lLen*0.5);
      leaf.rotation.y = angle;
      leaf.rotation.z = -0.5 - Math.random() * 0.4;
      g.add(leaf);
    }
    g.position.set(fx, th, fz);
    g.rotation.y = Math.random() * Math.PI * 2;
    scene.add(g);
  }
}

/* --- MUSHROOMS --- */
function buildMushrooms() {
  const capColors = [0xcc3300, 0xff6600, 0xaa2200, 0xdd4400];
  for (let i = 0; i < 60; i++) {
    const mx = (Math.random()-0.5) * MAP_SIZE * 0.8;
    const mz = (Math.random()-0.5) * MAP_SIZE * 0.8;
    const th = getTerrainHeight(mx, mz);
    const g  = new THREE.Group();
    const stemH = 0.2 + Math.random() * 0.5;
    const stem  = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, stemH, 6),
      new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.9 })
    );
    stem.position.y = stemH * 0.5;
    g.add(stem);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.15 + Math.random()*0.2, 7, 5, 0, Math.PI*2, 0, Math.PI*0.55),
      new THREE.MeshStandardMaterial({
        color:      capColors[Math.floor(Math.random()*capColors.length)],
        roughness:  0.7,
        emissive:   0x220800,
        emissiveIntensity: 0.3,
      })
    );
    cap.position.y = stemH;
    g.add(cap);
    g.position.set(mx, th, mz);
    scene.add(g);
  }
}

/* --- FALLEN LOGS --- */
function buildFallenLogs() {
  const logMat = new THREE.MeshStandardMaterial({ color: 0x2a1505, roughness: 0.98 });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x1a3a08, roughness: 0.95 });
  for (let i = 0; i < 25; i++) {
    const lx  = (Math.random()-0.5) * MAP_SIZE * 0.75;
    const lz  = (Math.random()-0.5) * MAP_SIZE * 0.75;
    const th  = getTerrainHeight(lx, lz);
    const len = 4 + Math.random() * 8;
    const r   = 0.2 + Math.random() * 0.35;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(r*0.7, r, len, 8), logMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = Math.random() * Math.PI;
    log.position.set(lx, th + r * 0.6, lz);
    log.castShadow = log.receiveShadow = true;
    scene.add(log);
    // Moss on top
    const mossGeo = new THREE.CylinderGeometry(r*0.71, r*1.01, len, 8, 1, false, 0, Math.PI);
    const moss    = new THREE.Mesh(mossGeo, mossMat);
    moss.rotation.z = Math.PI / 2;
    moss.rotation.y = log.rotation.y;
    moss.position.set(lx, th + r * 0.6 + r * 0.02, lz);
    scene.add(moss);
    jungleObjects.push({ mesh: log, radius: r + 0.2, x: lx, z: lz });
  }
}

/* ================================================================
   SECTION 6: WEAPON MODEL
================================================================ */
let weaponGroup, weaponBob = 0, weaponSwayX = 0, weaponSwayY = 0;
let muzzleFlashLight, muzzleFlashMesh;

function buildWeaponModel() {
  weaponGroup = new THREE.Group();

  const w = WEAPONS[STATE.currentWeapon];

  // Receiver / body
  const bodyMat = new THREE.MeshStandardMaterial({ color: w.color, roughness: 0.4, metalness: 0.75 });
  const accMat  = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.3, metalness: 0.9 });
  const rubMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.1 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.38), bodyMat);
  body.position.set(0, 0, -0.18);
  weaponGroup.add(body);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.42, 8), accMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.46);
  weaponGroup.add(barrel);

  // Suppressor / muzzle
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.019, 0.12, 8), accMat);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.01, -0.68);
  weaponGroup.add(muzzle);

  // Scope
  const scopeBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.18), accMat);
  scopeBase.position.set(0, 0.07, -0.18);
  weaponGroup.add(scopeBase);

  const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8), accMat);
  scopeTube.rotation.x = Math.PI / 2;
  scopeTube.position.set(0, 0.10, -0.18);
  weaponGroup.add(scopeTube);

  // Scope lens
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.022, 8),
    new THREE.MeshStandardMaterial({ color: 0x002244, roughness: 0.0, metalness: 0.0, emissive: 0x001133, emissiveIntensity: 0.5 })
  );
  lens.rotation.y = Math.PI / 2;
  lens.position.set(0, 0.10, -0.09);
  weaponGroup.add(lens);

  // Magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.14, 0.072), rubMat);
  mag.position.set(0, -0.11, -0.14);
  weaponGroup.add(mag);

  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.06), rubMat);
  grip.position.set(0, -0.09, 0.0);
  grip.rotation.x = 0.2;
  weaponGroup.add(grip);

  // Trigger guard
  const tg = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 5, 8, Math.PI), accMat);
  tg.rotation.x = Math.PI / 2;
  tg.position.set(0, -0.045, -0.04);
  weaponGroup.add(tg);

  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.08, 0.22), rubMat);
  stock.position.set(0, -0.02, 0.14);
  weaponGroup.add(stock);

  // Foregrip / front rail
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, 0.18), accMat);
  rail.position.set(0, -0.054, -0.32);
  weaponGroup.add(rail);

  // Handguard
  const hg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.065, 0.22), accMat);
  hg.position.set(0, -0.002, -0.3);
  weaponGroup.add(hg);

  // Charging handle
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.04), accMat);
  ch.position.set(0.055, 0.03, -0.04);
  weaponGroup.add(ch);

  // Muzzle flash (hidden by default)
  muzzleFlashLight = new THREE.PointLight(0xffaa30, 0, 3.5);
  muzzleFlashLight.position.set(0, 0, -0.75);
  weaponGroup.add(muzzleFlashLight);

  const muzzleGeo  = new THREE.SphereGeometry(0.06, 5, 4);
  muzzleFlashMesh  = new THREE.Mesh(
    muzzleGeo,
    new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0 })
  );
  muzzleFlashMesh.position.set(0, 0, -0.75);
  weaponGroup.add(muzzleFlashMesh);

  weaponGroup.position.set(0.19, -0.17, -0.38);
  camera.add(weaponGroup);
  scene.add(camera);
}

/* ================================================================
   SECTION 7: ENEMY SYSTEM
================================================================ */
const enemies       = [];
let   enemyBullets  = [];
let   activeBullets = [];
let   grenadeObjects = [];

function spawnWave(w) {
  const count = Math.min(4 + w * 2, 18);
  for (let i = 0; i < count; i++) {
    const typeIndex = selectEnemyType(w, i, count);
    spawnEnemy(typeIndex);
  }
  showWaveAnnounce(w);
  showNotif(`WAVE ${w} — ${count} HOSTILES DETECTED`);
}

function selectEnemyType(wave, index, total) {
  if (wave >= 5 && index === 0 && index === 0) return 4; // boss
  if (wave >= 3 && Math.random() < 0.2) return 3;       // sniper
  if (wave >= 2 && Math.random() < 0.25) return 2;      // heavy
  if (Math.random() < 0.4) return 1;                    // soldier
  return 0;                                              // scout
}

function spawnEnemy(typeIndex) {
  const type  = ENEMY_TYPES[typeIndex];
  const angle = Math.random() * Math.PI * 2;
  const dist  = 25 + Math.random() * 25;
  let   ex    = Math.cos(angle) * dist;
  let   ez    = Math.sin(angle) * dist;
  ex = Math.max(-MAP_SIZE*0.45, Math.min(MAP_SIZE*0.45, ex));
  ez = Math.max(-MAP_SIZE*0.45, Math.min(MAP_SIZE*0.45, ez));
  const ey    = getTerrainHeight(ex, ez);

  const group = buildEnemyMesh(type, typeIndex);
  group.position.set(ex, ey, ez);
  scene.add(group);

  enemies.push({
    mesh:        group,
    typeIndex,
    type,
    health:      (type.health + (STATE.wave - 1) * 2) * (typeIndex === 4 ? 1.5 : 1),
    maxHealth:   (type.health + (STATE.wave - 1) * 2) * (typeIndex === 4 ? 1.5 : 1),
    alive:       true,
    shootTimer:  1.5 + Math.random() * 3,
    state:       'patrol',    // patrol | chase | shoot | dead
    patrolAngle: Math.random() * Math.PI * 2,
    patrolTimer: 2 + Math.random() * 3,
    alertTimer:  0,
    hitTimer:    0,
    bobTime:     Math.random() * Math.PI * 2,
    lastX:       ex,
    lastZ:       ez,
    healthBar:   buildEnemyHealthBar(group),
  });
}

function buildEnemyMesh(type, typeIndex) {
  const group = new THREE.Group();
  const s     = type.scale;
  const col   = type.color;

  const bodyMat    = new THREE.MeshStandardMaterial({ color: col,     roughness: 0.5, metalness: 0.3, emissive: col, emissiveIntensity: 0.05 });
  const headMat    = new THREE.MeshStandardMaterial({ color: col,     roughness: 0.5, metalness: 0.2 });
  const visorMat   = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0066cc, emissiveIntensity: 0.8, roughness: 0.1, metalness: 0.0 });
  const armorMat   = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.4, metalness: 0.6 });
  const equipMat   = new THREE.MeshStandardMaterial({ color: 0x1a2a1a, roughness: 0.7, metalness: 0.2 });

  // Legs
  [-0.18 * s, 0.18 * s].forEach(legX => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14*s, 0.10*s, 0.8*s, 7), bodyMat);
    leg.position.set(legX, 0.4*s, 0);
    leg.castShadow = true;
    group.add(leg);
    // Boot
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16*s, 0.12*s, 0.26*s), armorMat);
    boot.position.set(legX, 0.06*s, 0.04*s);
    group.add(boot);
  });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52*s, 0.72*s, 0.30*s), bodyMat);
  torso.position.y = 1.08*s;
  torso.castShadow = true;
  group.add(torso);

  // Chest armor plate
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.46*s, 0.5*s, 0.07*s), armorMat);
  plate.position.set(0, 1.1*s, 0.16*s);
  group.add(plate);

  // Shoulder pads
  [-0.34*s, 0.34*s].forEach(sx => {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.16*s, 6, 5), armorMat);
    pad.position.set(sx, 1.38*s, 0);
    pad.scale.set(1, 0.7, 1);
    group.add(pad);
  });

  // Arms
  [-0.38*s, 0.38*s].forEach(ax => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1*s, 0.08*s, 0.65*s, 6), bodyMat);
    arm.position.set(ax, 0.98*s, 0);
    arm.castShadow = true;
    group.add(arm);
  });

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22*s, 8, 7), headMat);
  head.position.y = 1.7*s;
  head.castShadow = true;
  group.add(head);

  // Helmet
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.26*s, 8, 7, 0, Math.PI*2, 0, Math.PI*0.6), armorMat);
  helmet.position.set(0, 1.72*s, 0);
  group.add(helmet);

  // Visor
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3*s, 0.1*s, 0.08*s), visorMat);
  visor.position.set(0, 1.72*s, 0.24*s);
  group.add(visor);

  // Enemy gun
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.05*s, 0.05*s, 0.3*s), equipMat);
  gunBody.position.set(0.35*s, 1.0*s, 0.18*s);
  group.add(gunBody);
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01*s, 0.01*s, 0.2*s, 5), equipMat);
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0.35*s, 1.02*s, 0.35*s);
  group.add(gunBarrel);

  // Backpack for heavy
  if (typeIndex === 2) {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4*s, 0.5*s, 0.2*s), equipMat);
    pack.position.set(0, 1.1*s, -0.25*s);
    group.add(pack);
  }

  // Boss — extra spikes / detail
  if (typeIndex === 4) {
    for (let sp = 0; sp < 6; sp++) {
      const angle  = (sp / 6) * Math.PI * 2;
      const spike  = new THREE.Mesh(new THREE.ConeGeometry(0.06*s, 0.35*s, 5), new THREE.MeshStandardMaterial({ color: 0x660022, metalness: 0.8 }));
      spike.position.set(Math.cos(angle)*0.35*s, 1.9*s, Math.sin(angle)*0.35*s);
      spike.rotation.z = -Math.cos(angle) * 0.5;
      spike.rotation.x = -Math.sin(angle) * 0.5;
      group.add(spike);
    }
  }

  return group;
}

function buildEnemyHealthBar(group) {
  // 3D health bar above enemy head
  const bgGeo = new THREE.PlaneGeometry(1.0, 0.12);
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x330000, transparent: true, opacity: 0.8 });
  const bg    = new THREE.Mesh(bgGeo, bgMat);
  bg.position.set(0, 2.8, 0);
  group.add(bg);

  const fgGeo = new THREE.PlaneGeometry(1.0, 0.12);
  const fgMat = new THREE.MeshBasicMaterial({ color: 0x44ff22, transparent: true, opacity: 0.9 });
  const fg    = new THREE.Mesh(fgGeo, fgMat);
  fg.position.set(0, 2.8, 0.001);
  group.add(fg);

  return { bg, fg, fgMat, fgGeo };
}

function updateEnemyHealthBar(e) {
  const ratio = Math.max(0, e.health / e.maxHealth);
  const bar   = e.healthBar;
  bar.fg.scale.x = ratio;
  bar.fg.position.x = (ratio - 1) * 0.5;
  if (ratio > 0.5) bar.fgMat.color.set(0x44ff22);
  else if (ratio > 0.25) bar.fgMat.color.set(0xffaa22);
  else bar.fgMat.color.set(0xff2222);
  bar.bg.lookAt(camera.position);
  bar.fg.lookAt(camera.position);
}

/* ================================================================
   SECTION 8: BULLETS & PROJECTILES
================================================================ */
const bulletPool = [];
const POOL_SIZE  = 80;

function initBulletPool() {
  const geo = new THREE.SphereGeometry(0.025, 4, 3);
  for (let i = 0; i < POOL_SIZE; i++) {
    const mat  = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    bulletPool.push({ mesh, active: false, vel: new THREE.Vector3(), life: 0, damage: 0, isEnemy: false });
  }
}

function getBulletFromPool() {
  for (const b of bulletPool) {
    if (!b.active) return b;
  }
  return null;
}

function fireBullet(fromPos, dir, damage, isEnemy, speed) {
  const b = getBulletFromPool();
  if (!b) return;
  b.active   = true;
  b.mesh.visible = true;
  b.mesh.position.copy(fromPos);
  b.vel.copy(dir).multiplyScalar(speed || BULLET_SPEED);
  b.life     = 3.5;
  b.damage   = damage;
  b.isEnemy  = isEnemy;
  b.mesh.material.color.set(isEnemy ? 0x00ffcc : 0xffcc44);
}

function updateBullets(dt) {
  for (const b of bulletPool) {
    if (!b.active) continue;
    b.mesh.position.addScaledVector(b.vel, dt);
    b.life -= dt;
    if (b.life <= 0) { recycleBullet(b); continue; }

    if (b.isEnemy) {
      const d = b.mesh.position.distanceTo(camera.position);
      if (d < 0.8) {
        applyPlayerDamage(b.damage);
        recycleBullet(b);
        spawnImpactParticles(b.mesh.position.clone(), 0x00ffcc);
      }
    } else {
      // Check enemy hits
      let hit = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        const d = b.mesh.position.distanceTo(e.mesh.position);
        if (d < 1.0 * e.type.scale) {
          e.health -= b.damage;
          STATE.shotsHit++;
          showHitMarker(e.health <= 0);
          updateEnemyHealthBar(e);
          e.hitTimer = 0.15;
          if (e.health <= 0) killEnemy(e);
          hit = true;
          spawnImpactParticles(b.mesh.position.clone(), 0xff6600);
          break;
        }
      }
      if (hit) { recycleBullet(b); continue; }

      // Terrain hit
      const bx = b.mesh.position.x, bz = b.mesh.position.z;
      const th = getTerrainHeight(bx, bz);
      if (b.mesh.position.y <= th + 0.1) {
        spawnImpactParticles(b.mesh.position.clone(), 0x8a6a3a);
        recycleBullet(b);
      }
    }
  }
}

function recycleBullet(b) {
  b.active = false;
  b.mesh.visible = false;
}

/* ================================================================
   SECTION 9: IMPACT PARTICLES
================================================================ */
const particles = [];

function spawnImpactParticles(pos, color) {
  const count = 6;
  for (let i = 0; i < count; i++) {
    const geo  = new THREE.SphereGeometry(0.03 + Math.random()*0.04, 3, 3);
    const mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    particles.push({
      mesh,
      vel:  new THREE.Vector3((Math.random()-0.5)*6, Math.random()*6, (Math.random()-0.5)*6),
      life: 0.5 + Math.random()*0.4,
      maxLife: 0.5 + Math.random()*0.4,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.mesh.position.addScaledVector(p.vel, dt);
    p.vel.y -= 12 * dt;
    p.life  -= dt;
    p.mesh.material.opacity = p.life / p.maxLife;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      particles.splice(i, 1);
    }
  }
}

/* ================================================================
   SECTION 10: GRENADE SYSTEM
================================================================ */
function throwGrenade() {
  if (STATE.grenades <= 0) return;
  STATE.grenades--;
  updateGrenadeUI();

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const pos = camera.position.clone().add(dir.clone().multiplyScalar(0.8));
  pos.y += 0.2;

  const geo  = new THREE.SphereGeometry(0.1, 7, 6);
  const mat  = new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 0.7, metalness: 0.6 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.castShadow = true;
  scene.add(mesh);

  const vel = dir.clone().multiplyScalar(14).add(new THREE.Vector3(0, 6, 0));
  grenadeObjects.push({ mesh, vel, life: 4.0, bounces: 0 });
  showNotif('GRENADE THROWN!');
}

function updateGrenades(dt) {
  for (let i = grenadeObjects.length - 1; i >= 0; i--) {
    const g = grenadeObjects[i];
    g.mesh.position.addScaledVector(g.vel, dt);
    g.vel.y -= 14 * dt;
    g.mesh.rotation.x += 5 * dt;
    g.mesh.rotation.z += 3 * dt;

    const th = getTerrainHeight(g.mesh.position.x, g.mesh.position.z);
    if (g.mesh.position.y < th + 0.1) {
      g.mesh.position.y = th + 0.1;
      g.vel.y = -g.vel.y * 0.4;
      g.vel.x *= 0.7; g.vel.z *= 0.7;
      g.bounces++;
    }

    g.life -= dt;
    if (g.life <= 0 || g.bounces > 5) {
      explodeGrenade(g);
      scene.remove(g.mesh);
      grenadeObjects.splice(i, 1);
    }
  }
}

function explodeGrenade(g) {
  const pos    = g.mesh.position.clone();
  const radius = 8;

  // Explosion flash
  spawnExplosionEffect(pos);

  // Damage enemies in radius
  enemies.forEach(e => {
    if (!e.alive) return;
    const d = pos.distanceTo(e.mesh.position);
    if (d < radius) {
      const dmg = Math.floor(80 * (1 - d / radius));
      e.health -= dmg;
      if (e.health <= 0) killEnemy(e);
      else updateEnemyHealthBar(e);
    }
  });

  // Damage player if too close
  const dp = pos.distanceTo(camera.position);
  if (dp < radius) {
    applyPlayerDamage(Math.floor(60 * (1 - dp / radius)));
  }
}

function spawnExplosionEffect(pos) {
  // Flash point light
  const fl = new THREE.PointLight(0xff8830, 30, 20);
  fl.position.copy(pos);
  scene.add(fl);
  setTimeout(() => scene.remove(fl), 120);

  // Explosion particles
  for (let i = 0; i < 30; i++) {
    const geo  = new THREE.SphereGeometry(0.08 + Math.random()*0.15, 4, 3);
    const col  = [0xff4400, 0xff8800, 0xffcc00, 0xcc2200][Math.floor(Math.random()*4)];
    const mat  = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    const spd  = 5 + Math.random() * 12;
    const dir  = new THREE.Vector3(Math.random()-0.5, Math.random()*0.8, Math.random()-0.5).normalize();
    particles.push({
      mesh, vel: dir.multiplyScalar(spd),
      life: 0.8 + Math.random() * 0.6,
      maxLife: 0.8 + Math.random() * 0.6,
    });
  }
}

/* ================================================================
   SECTION 11: PLAYER INPUT
================================================================ */
const keys   = {};
let   yaw    = 0;
let   pitch  = 0;
let   mouseDown = false;
let   rightMouseDown = false;

function setupInput() {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup',   e => { keys[e.code] = false; });
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup',   e => {
    if (e.button === 0) mouseDown      = false;
    if (e.button === 2) { rightMouseDown = false; exitADS(); }
  });
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerlockchange', onPointerLockChange);
}

function onKeyDown(e) {
  keys[e.code] = true;
  if (!STATE.phase === 'playing') return;

  switch (e.code) {
    case 'KeyR':      if (!STATE.isReloading) startReload(); break;
    case 'KeyG':      throwGrenade(); break;
    case 'Digit1':    switchWeapon(0); break;
    case 'Digit2':    switchWeapon(1); break;
    case 'Escape':    togglePause(); break;
    case 'Tab':       e.preventDefault(); toggleScoreboard(true); break;
  }
}

document.addEventListener('keyup', e => {
  if (e.code === 'Tab') toggleScoreboard(false);
});

function onMouseMove(e) {
  if (STATE.phase !== 'playing') return;
  const sens = STATE.isADS ? 0.0012 : 0.002;
  yaw   -= e.movementX * sens;
  pitch -= e.movementY * sens;
  pitch  = Math.max(-1.4, Math.min(1.4, pitch));
}

function onMouseDown(e) {
  if (e.button === 0) { mouseDown = true; tryShoot(); }
  if (e.button === 2) { rightMouseDown = true; enterADS(); }
}

function onPointerLockChange() {
  if (!document.pointerLockElement) {
    if (STATE.phase === 'playing') togglePause();
  }
}

function lockPointer() {
  document.getElementById('gameCanvas').requestPointerLock();
}

/* ================================================================
   SECTION 12: SHOOTING
================================================================ */
function tryShoot() {
  if (STATE.phase !== 'playing') return;
  if (STATE.isReloading) return;
  if (STATE.ammo <= 0) {
    if (STATE.reserveAmmo > 0) startReload();
    showNoAmmoWarn();
    return;
  }
  if (STATE.shootCooldown > 0) return;

  const weapon = WEAPONS[STATE.currentWeapon];
  STATE.ammo--;
  STATE.shotsFired++;
  STATE.shootCooldown = weapon.fireRate;
  updateAmmoUI();

  // Direction with spread
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const sp = weapon.spread * (STATE.isADS ? 0.25 : 1.0) * (STATE.isSprinting ? 2.5 : 1.0);
  dir.x += (Math.random()-0.5) * sp;
  dir.y += (Math.random()-0.5) * sp;
  dir.z += (Math.random()-0.5) * sp;
  dir.normalize();

  const fromPos = camera.position.clone().add(dir.clone().multiplyScalar(0.8));
  fireBullet(fromPos, dir, weapon.damage, false, BULLET_SPEED);

  // Raycast instant hit detection
  const ray  = new THREE.Raycaster(camera.position.clone(), dir);
  const hits = [];
  enemies.forEach(e => {
    if (!e.alive) return;
    const iArr = ray.intersectObject(e.mesh, true);
    if (iArr.length && iArr[0].distance < weapon.range) {
      hits.push({ enemy: e, dist: iArr[0].distance });
    }
  });
  if (hits.length) {
    hits.sort((a, b) => a.dist - b.dist);
    const target = hits[0].enemy;
    target.health -= weapon.damage;
    STATE.shotsHit++;
    showHitMarker(target.health <= 0);
    updateEnemyHealthBar(target);
    target.hitTimer = 0.15;
    target.state    = 'chase';
    if (target.health <= 0) killEnemy(target);
  }

  // Muzzle flash
  doMuzzleFlash();

  // Weapon kick
  weaponGroup.position.z += 0.025;
  weaponGroup.rotation.x -= 0.04;
  setTimeout(() => {
    weaponGroup.position.z -= 0.025;
    weaponGroup.rotation.x += 0.04;
  }, 90);

  // Crosshair spread
  document.getElementById('crosshair').classList.add('spread');
  setTimeout(() => document.getElementById('crosshair').classList.remove('spread'), 150);

  if (STATE.ammo === 0 && STATE.reserveAmmo > 0) startReload();
  if (STATE.ammo <= 5 && STATE.ammo > 0) showLowAmmoWarn();
}

function doMuzzleFlash() {
  muzzleFlashLight.intensity = 3.5 + Math.random();
  muzzleFlashMesh.material.opacity = 0.8;
  setTimeout(() => {
    muzzleFlashLight.intensity    = 0;
    muzzleFlashMesh.material.opacity = 0;
  }, 55);
}

/* ================================================================
   SECTION 13: RELOAD SYSTEM
================================================================ */
function startReload() {
  if (STATE.isReloading || STATE.reserveAmmo <= 0) return;
  STATE.isReloading   = true;
  STATE.reloadTimer   = WEAPONS[STATE.currentWeapon].reloadTime;

  document.getElementById('reloadMsg').classList.add('active');

  // Weapon animation — tilt down
  weaponGroup.rotation.x = 0.5;
  setTimeout(() => { weaponGroup.rotation.x = 0; }, WEAPONS[STATE.currentWeapon].reloadTime * 1000 * 0.5);
}

function finishReload() {
  const needed  = WEAPONS[STATE.currentWeapon].ammo - STATE.ammo;
  const take    = Math.min(needed, STATE.reserveAmmo);
  STATE.ammo       += take;
  STATE.reserveAmmo -= take;
  STATE.isReloading  = false;

  document.getElementById('reloadMsg').classList.remove('active');
  updateAmmoUI();
  hideLowAmmoWarn();
}

/* ================================================================
   SECTION 14: ADS (Aim Down Sights)
================================================================ */
const ADS_FOV    = 40;
const NORMAL_FOV = 72;
let   adsTimer   = 0;
const ADS_SPEED  = 8;

function enterADS() {
  STATE.isADS = true;
  document.getElementById('crosshair').classList.add('ads');
  if (STATE.currentWeapon === 1) {
    document.getElementById('scopeOverlay').classList.remove('hidden');
  }
}

function exitADS() {
  STATE.isADS = false;
  document.getElementById('crosshair').classList.remove('ads');
  document.getElementById('scopeOverlay').classList.add('hidden');
}

function updateADS(dt) {
  const targetFOV = STATE.isADS ? ADS_FOV : NORMAL_FOV;
  camera.fov += (targetFOV - camera.fov) * Math.min(1, ADS_SPEED * dt);
  camera.updateProjectionMatrix();

  const targetX = STATE.isADS ? 0.0 : 0.19;
  const targetY = STATE.isADS ? -0.08 : -0.17;
  const targetZ = STATE.isADS ? -0.22 : -0.38;
  weaponGroup.position.x += (targetX - weaponGroup.position.x) * Math.min(1, 10 * dt);
  weaponGroup.position.y += (targetY - weaponGroup.position.y) * Math.min(1, 10 * dt);
  weaponGroup.position.z += (targetZ - weaponGroup.position.z) * Math.min(1, 10 * dt);
}

/* ================================================================
   SECTION 15: WEAPON SWITCH
================================================================ */
function switchWeapon(index) {
  if (index === STATE.currentWeapon) return;
  STATE.currentWeapon = index;

  // Reset ammo to weapon defaults
  const w = WEAPONS[index];
  STATE.ammo         = w.ammo;
  STATE.reserveAmmo  = w.reserve;
  STATE.isReloading  = false;
  document.getElementById('reloadMsg').classList.remove('active');
  document.getElementById('hudWeaponName').textContent = w.name;

  // Rebuild weapon model
  camera.remove(weaponGroup);
  buildWeaponModel();

  updateWeaponSwitchUI(index);
  updateAmmoUI();
}

function updateWeaponSwitchUI(idx) {
  document.getElementById('ws1').className = 'wsw-item' + (idx === 0 ? ' active' : '');
  document.getElementById('ws2').className = 'wsw-item' + (idx === 1 ? ' active' : '');
}

/* ================================================================
   SECTION 16: ENEMY AI UPDATE
================================================================ */
function updateEnemies(dt, t) {
  enemies.forEach(e => {
    if (!e.alive) return;

    e.bobTime += dt * 2.5;
    updateEnemyHealthBar(e);

    const toPlayer = new THREE.Vector3().subVectors(camera.position, e.mesh.position);
    const dist     = toPlayer.length();
    toPlayer.normalize();

    // State machine
    if (dist < 40 && e.state !== 'chase') {
      e.state = 'chase';
    }

    if (e.state === 'patrol') {
      e.patrolTimer -= dt;
      if (e.patrolTimer <= 0) {
        e.patrolAngle += (Math.random()-0.5) * 1.5;
        e.patrolTimer  = 2 + Math.random() * 3;
      }
      const px = e.mesh.position.x + Math.cos(e.patrolAngle) * e.type.speed * 0.5 * dt;
      const pz = e.mesh.position.z + Math.sin(e.patrolAngle) * e.type.speed * 0.5 * dt;
      e.mesh.position.x = Math.max(-MAP_SIZE*0.45, Math.min(MAP_SIZE*0.45, px));
      e.mesh.position.z = Math.max(-MAP_SIZE*0.45, Math.min(MAP_SIZE*0.45, pz));
    }

    if (e.state === 'chase') {
      const spd = e.type.speed * (e.hitTimer > 0 ? 0.5 : 1.0);
      if (dist > 4) {
        e.mesh.position.addScaledVector(toPlayer, spd * dt);
        e.mesh.position.x = Math.max(-MAP_SIZE*0.45, Math.min(MAP_SIZE*0.45, e.mesh.position.x));
        e.mesh.position.z = Math.max(-MAP_SIZE*0.45, Math.min(MAP_SIZE*0.45, e.mesh.position.z));
      } else {
        e.state = 'shoot';
      }
    }

    if (e.state === 'shoot') {
      if (dist > 6) e.state = 'chase';
    }

    // Always face player
    e.mesh.lookAt(new THREE.Vector3(camera.position.x, e.mesh.position.y, camera.position.z));

    // Terrain snap
    const th       = getTerrainHeight(e.mesh.position.x, e.mesh.position.z);
    e.mesh.position.y = th + Math.sin(e.bobTime) * 0.05;

    // Enemy shoot
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && dist < 35 && e.state !== 'patrol') {
      e.shootTimer = 1.8 + Math.random() * 2.5 - (STATE.wave * 0.1);
      const shootFrom = e.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
      const shootDir  = new THREE.Vector3().subVectors(camera.position, shootFrom).normalize();
      // Inaccuracy
      shootDir.x += (Math.random()-0.5) * 0.18;
      shootDir.y += (Math.random()-0.5) * 0.12;
      shootDir.z += (Math.random()-0.5) * 0.18;
      shootDir.normalize();
      fireBullet(shootFrom, shootDir, e.type.damage, true, ENEMY_BULLET_SPEED);
    }

    // Melee damage when very close
    if (dist < 1.6) {
      applyPlayerDamage(e.type.damage * 0.5 * dt);
    }

    // Hit flash
    if (e.hitTimer > 0) {
      e.hitTimer -= dt;
      e.mesh.traverse(child => {
        if (child.isMesh && child.material.emissiveIntensity !== undefined) {
          child.material.emissiveIntensity = 0.5;
        }
      });
    } else {
      e.mesh.traverse(child => {
        if (child.isMesh && child.material.emissiveIntensity !== undefined) {
          child.material.emissiveIntensity = 0.05;
        }
      });
    }
  });
}

/* ================================================================
   SECTION 17: KILL ENEMY
================================================================ */
function killEnemy(e) {
  e.alive = false;
  e.state = 'dead';

  STATE.score += e.type.score * STATE.wave;
  STATE.kills++;

  spawnExplosionEffect(e.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)));

  // Ragdoll — tip over
  e.mesh.rotation.x  = Math.PI / 2;
  e.mesh.position.y -= 0.5;

  setTimeout(() => scene.remove(e.mesh), 3000);

  updateScoreUI();
  addKillFeedEntry(e.type.name, e.typeIndex === 4);
  showNotif(`+${e.type.score * STATE.wave} pts — ${e.type.name} ELIMINATED!`);

  // Check wave clear
  const alive = enemies.filter(x => x.alive);
  if (alive.length === 0) {
    setTimeout(() => {
      STATE.wave++;
      enemies.length = 0;
      spawnWave(STATE.wave);
    }, 3500);
  }
}

/* ================================================================
   SECTION 18: PLAYER DAMAGE & DEATH
================================================================ */
function applyPlayerDamage(dmg) {
  if (STATE.armor > 0) {
    const armorAbsorb  = Math.min(STATE.armor, dmg * 0.6);
    STATE.armor       -= armorAbsorb;
    dmg               -= armorAbsorb;
  }
  STATE.health = Math.max(0, STATE.health - dmg);
  updateHealthUI();
  flashDamage();

  if (STATE.health <= 0) triggerDeath();
}

function flashDamage() {
  const el = document.getElementById('screenDamage');
  el.style.opacity = '1';
  document.getElementById('hud').classList.add('shake');
  setTimeout(() => {
    el.style.opacity = '0';
    document.getElementById('hud').classList.remove('shake');
  }, 180);
}

function triggerDeath() {
  STATE.phase  = 'gameover';
  STATE.deaths++;
  document.exitPointerLock();
  showGameover();
}

/* ================================================================
   SECTION 19: PLAYER MOVEMENT
================================================================ */
function updatePlayer(dt) {
  if (STATE.phase !== 'playing') return;

  // Sprint & stamina
  const wantSprint   = keys['ShiftLeft'] && (keys['KeyW']);
  STATE.isSprinting  = wantSprint && STATE.stamina > 0 && !STATE.isADS;
  STATE.isCrouching  = keys['KeyC'];

  if (STATE.isSprinting) {
    STATE.stamina = Math.max(0, STATE.stamina - STATE.staminaDrain * dt);
  } else {
    STATE.stamina = Math.min(STATE.maxStamina, STATE.stamina + STATE.staminaRegen * dt);
  }
  updateStaminaUI();

  const spd = STATE.isCrouching
    ? CROUCH_SPEED
    : STATE.isSprinting
      ? SPRINT_SPEED
      : MOVE_SPEED;

  // Movement vectors
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right   = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw));
  const move    = new THREE.Vector3();

  if (keys['KeyW']) move.add(forward);
  if (keys['KeyS']) move.sub(forward);
  if (keys['KeyA']) move.sub(right);
  if (keys['KeyD']) move.add(right);

  let moving = false;
  if (move.length() > 0.01) {
    move.normalize();
    moving = true;
    weaponBob += dt * (STATE.isSprinting ? 16 : 9);
  }

  // Attempt move with basic collision
  const newX = camera.position.x + move.x * spd * dt;
  const newZ = camera.position.z + move.z * spd * dt;

  let blocked = false;
  for (const obj of jungleObjects) {
    const dx = newX - obj.x;
    const dz = newZ - obj.z;
    if (Math.sqrt(dx*dx + dz*dz) < obj.radius + 0.4) { blocked = true; break; }
  }

  if (!blocked) {
    camera.position.x = Math.max(-MAP_SIZE*0.45, Math.min(MAP_SIZE*0.45, newX));
    camera.position.z = Math.max(-MAP_SIZE*0.45, Math.min(MAP_SIZE*0.45, newZ));
  }

  // Jump
  if (keys['Space'] && STATE.isGrounded) {
    STATE.playerVelY = JUMP_FORCE;
    STATE.isGrounded  = false;
  }

  // Gravity
  STATE.playerVelY -= GRAVITY * dt;
  camera.position.y += STATE.playerVelY * dt;

  // Terrain collision
  const th = getTerrainHeight(camera.position.x, camera.position.z);
  const targetH = th + (STATE.isCrouching ? PLAYER_CROUCH_H : PLAYER_HEIGHT);
  if (camera.position.y < targetH) {
    camera.position.y = targetH;
    STATE.playerVelY  = 0;
    STATE.isGrounded  = true;
  }

  // Camera rotation
  camera.rotation.order = 'YXZ';
  camera.rotation.y     = yaw;
  camera.rotation.x     = pitch;

  // Weapon bob
  const bobY = Math.sin(weaponBob) * (moving ? 0.045 : 0.01);
  const bobX = Math.cos(weaponBob * 0.5) * (moving ? 0.025 : 0.005);
  if (!STATE.isADS) {
    weaponGroup.position.y = -0.17 + bobY;
    weaponGroup.position.x = 0.19  + bobX;
  }

  // Weapon sway from mouse movement
  weaponGroup.rotation.z = -pitch * 0.08;

  // Auto-fire
  if (mouseDown && WEAPONS[STATE.currentWeapon].auto) {
    tryShoot();
  }

  // Reload countdown
  if (STATE.isReloading) {
    STATE.reloadTimer -= dt;
    if (STATE.reloadTimer <= 0) finishReload();
  }

  // Shoot cooldown
  if (STATE.shootCooldown > 0) STATE.shootCooldown -= dt;

  // ADS
  updateADS(dt);
}

/* ================================================================
   SECTION 20: MINIMAP
================================================================ */
const mmCtx = document.getElementById('minimapCanvas').getContext('2d');

function drawMinimap() {
  const size  = 150;
  const half  = size / 2;
  const scale = size / MAP_SIZE;

  mmCtx.clearRect(0, 0, size, size);

  // Background
  mmCtx.fillStyle = 'rgba(0,0,0,0.75)';
  mmCtx.beginPath();
  mmCtx.arc(half, half, half, 0, Math.PI * 2);
  mmCtx.fill();

  // Clip to circle
  mmCtx.save();
  mmCtx.beginPath();
  mmCtx.arc(half, half, half - 1, 0, Math.PI * 2);
  mmCtx.clip();

  // Trees (dots)
  mmCtx.fillStyle = 'rgba(30,70,15,0.6)';
  jungleObjects.slice(0, 80).forEach(obj => {
    const mx = half + obj.x * scale;
    const mz = half + obj.z * scale;
    mmCtx.fillRect(mx - 1, mz - 1, 2, 2);
  });

  // Enemies
  enemies.forEach(e => {
    if (!e.alive) return;
    const mx = half + e.mesh.position.x * scale;
    const mz = half + e.mesh.position.z * scale;
    mmCtx.fillStyle = e.typeIndex === 4 ? '#ff00ff' : '#ff3300';
    mmCtx.beginPath();
    mmCtx.arc(mx, mz, 3, 0, Math.PI * 2);
    mmCtx.fill();
  });

  // Player dot
  const px = half + camera.position.x * scale;
  const pz = half + camera.position.z * scale;
  mmCtx.fillStyle = '#44ff88';
  mmCtx.beginPath();
  mmCtx.arc(px, pz, 4, 0, Math.PI * 2);
  mmCtx.fill();

  // Player direction indicator
  mmCtx.strokeStyle = '#44ff88';
  mmCtx.lineWidth   = 2;
  mmCtx.beginPath();
  mmCtx.moveTo(px, pz);
  mmCtx.lineTo(px - Math.sin(yaw) * 8, pz - Math.cos(yaw) * 8);
  mmCtx.stroke();

  mmCtx.restore();

  // Compass
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  const idx  = Math.round((yaw / (Math.PI * 2)) * 8 + 8) % 8;
  document.getElementById('compassDir').textContent = dirs[idx];
}

/* ================================================================
   SECTION 21: ANIMATED JUNGLE ENVIRONMENT
================================================================ */
let envTime = 0;

function updateEnvironment(dt) {
  envTime += dt;

  // Flickering bioluminescent lights
  pointLights.forEach(pl => {
    pl.time += dt * (1.5 + Math.random() * 0.5);
    pl.light.intensity = pl.base * (0.7 + 0.4 * Math.sin(pl.time * 3.1) * Math.cos(pl.time * 1.7));
  });

  // Animate sun (slow day cycle — subtle)
  if (sunLight) {
    sunLight.position.x = Math.cos(envTime * 0.01) * 50;
    sunLight.position.y = 40 + Math.sin(envTime * 0.008) * 20;
    const daylightFactor = Math.max(0.3, Math.sin(envTime * 0.008) + 0.6);
    sunLight.intensity = 0.8 * daylightFactor;
    ambientLight.intensity = 1.0 + daylightFactor * 0.8;
  }
}

/* ================================================================
   SECTION 22: TIMER & STATS
================================================================ */
function updateTimer() {
  if (STATE.phase !== 'playing') return;
  STATE.elapsedTime = (Date.now() - STATE.startTime) / 1000;
  const m = Math.floor(STATE.elapsedTime / 60);
  const s = Math.floor(STATE.elapsedTime % 60);
  document.getElementById('hudTimer').textContent =
    String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  document.getElementById('sbTime').textContent =
    String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

/* ================================================================
   SECTION 23: UI UPDATE FUNCTIONS
================================================================ */
function updateHealthUI() {
  const pct = (STATE.health / STATE.maxHealth) * 100;
  document.getElementById('healthBar').style.width  = pct + '%';
  document.getElementById('hudHealthNum').textContent = Math.ceil(STATE.health);
  const armor = (STATE.armor / STATE.maxArmor) * 100;
  document.getElementById('armorBar').style.width   = armor + '%';
  document.getElementById('hudArmorNum').textContent = Math.ceil(STATE.armor);
}

function updateAmmoUI() {
  document.getElementById('hudAmmo').textContent    = STATE.ammo;
  document.getElementById('hudReserve').textContent = STATE.reserveAmmo;

  // Ammo pips
  const pip = document.getElementById('ammoIcons');
  pip.innerHTML = '';
  const maxPips = Math.min(STATE.ammo, 30);
  for (let i = 0; i < WEAPONS[STATE.currentWeapon].ammo; i++) {
    const d = document.createElement('div');
    d.className = 'ammo-pip' + (i >= STATE.ammo ? ' empty' : '');
    pip.appendChild(d);
  }
}

function updateScoreUI() {
  document.getElementById('hudScore').textContent  = String(STATE.score).padStart(6,'0');
  document.getElementById('hudWave').textContent   = String(STATE.wave).padStart(2,'0');
  document.getElementById('sbScore').textContent   = STATE.score;
  document.getElementById('sbKills').textContent   = STATE.kills;
  document.getElementById('sbWave').textContent    = STATE.wave;
  const acc = STATE.shotsFired > 0 ? Math.round((STATE.shotsHit / STATE.shotsFired) * 100) : 0;
  document.getElementById('sbAccuracy').textContent = acc + '%';
  document.getElementById('sbShots').textContent    = STATE.shotsFired;
}

function updateStaminaUI() {
  document.getElementById('staminaBar').style.width = (STATE.stamina / STATE.maxStamina * 100) + '%';
}

function updateGrenadeUI() {
  document.getElementById('grenadeCount').textContent = STATE.grenades;
}

/* ================================================================
   SECTION 24: HUD NOTIFICATIONS
================================================================ */
let notifTimer = null;

function showNotif(msg) {
  const c   = document.getElementById('notifCenter');
  const div = document.createElement('div');
  div.className   = 'notif-item';
  div.textContent = msg;
  c.appendChild(div);
  setTimeout(() => div.remove(), 2100);
}

function showHitMarker(isKill) {
  const el = document.getElementById('hitMarker');
  el.classList.add('active');
  el.querySelector('.hm-tl').style.background = isKill ? '#ffcc00' : '#ff4444';
  el.querySelector('.hm-tr').style.background = isKill ? '#ffcc00' : '#ff4444';
  el.querySelector('.hm-bl').style.background = isKill ? '#ffcc00' : '#ff4444';
  el.querySelector('.hm-br').style.background = isKill ? '#ffcc00' : '#ff4444';
  setTimeout(() => el.classList.remove('active'), isKill ? 400 : 180);
}

function showLowAmmoWarn()  { document.getElementById('lowAmmoWarn').classList.remove('hidden'); }
function hideLowAmmoWarn()  { document.getElementById('lowAmmoWarn').classList.add('hidden'); }
function showNoAmmoWarn()   {
  const el = document.getElementById('noAmmoWarn');
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 1500);
}

function addKillFeedEntry(name, isBoss) {
  const feed  = document.getElementById('killFeed');
  const entry = document.createElement('div');
  entry.className   = 'kill-entry' + (isBoss ? ' headshot' : '');
  entry.textContent = isBoss
    ? `★ BOSS ELIMINATED — ${name}`
    : `✖ ${name} ELIMINATED`;
  feed.appendChild(entry);
  setTimeout(() => entry.remove(), 4200);
}

function showWaveAnnounce(w) {
  const el  = document.getElementById('waveAnnounce');
  const sub = document.getElementById('waSub');
  document.getElementById('waText').textContent = `WAVE ${w}`;
  sub.textContent = w === 1
    ? 'ENGAGE ALL HOSTILES'
    : w % 5 === 0
      ? '⚠ BOSS INCOMING ⚠'
      : 'ELIMINATE ALL THREATS';
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2800);
}

/* ================================================================
   SECTION 25: PAUSE & MENUS
================================================================ */
function togglePause() {
  if (STATE.phase === 'playing') {
    STATE.phase = 'paused';
    document.getElementById('pauseMenu').classList.remove('hidden');
    document.exitPointerLock();
  } else if (STATE.phase === 'paused') {
    STATE.phase = 'playing';
    document.getElementById('pauseMenu').classList.add('hidden');
    lockPointer();
  }
}

function toggleScoreboard(show) {
  document.getElementById('scoreboard').classList.toggle('hidden', !show);
}

document.getElementById('btnResume').addEventListener('click', () => togglePause());
document.getElementById('btnMainMenu').addEventListener('click', () => location.reload());
document.getElementById('btnRestart').addEventListener('click', () => location.reload());
document.getElementById('btnGoMenu').addEventListener('click', () => location.reload());

/* ================================================================
   SECTION 26: GAME OVER SCREEN
================================================================ */
function showGameover() {
  const acc = STATE.shotsFired > 0 ? Math.round((STATE.shotsHit / STATE.shotsFired) * 100) : 0;
  document.getElementById('goScore').textContent    = STATE.score;
  document.getElementById('goWaves').textContent    = STATE.wave;
  document.getElementById('goKills').textContent    = STATE.kills;
  document.getElementById('goAccuracy').textContent = acc + '%';
  document.getElementById('sbDeaths').textContent   = STATE.deaths;
  document.getElementById('gameoverScreen').classList.remove('hidden');
}

/* ================================================================
   SECTION 27: MAIN MENU SETUP
================================================================ */
function setupMenu() {
  // Spawn ambient particles
  const container = document.getElementById('menuParticles');
  for (let i = 0; i < 35; i++) {
    const p = document.createElement('div');
    p.className = 'menu-particle';
    p.style.cssText = `
      left: ${Math.random()*100}%;
      bottom: ${Math.random()*30}%;
      --dur: ${6 + Math.random()*8}s;
      --delay: ${Math.random()*6}s;
      width: ${2 + Math.random()*4}px;
      height: ${2 + Math.random()*4}px;
      background: hsl(${90 + Math.random()*40}, 80%, ${40+Math.random()*30}%);
    `;
    container.appendChild(p);
  }

  document.getElementById('btnPlay').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';
    startGame();
  });
  document.getElementById('btnControls').addEventListener('click', () => {
    document.getElementById('controlsPanel').classList.remove('hidden');
  });
  document.getElementById('btnCloseControls').addEventListener('click', () => {
    document.getElementById('controlsPanel').classList.add('hidden');
  });
  document.getElementById('btnCredits').addEventListener('click', () => {
    showNotif('JUNGLE WARFARE 3D — Built with Three.js & WebGL');
  });
}

/* ================================================================
   SECTION 28: GAME START & INIT
================================================================ */
function startGame() {
  STATE.phase      = 'playing';
  STATE.startTime  = Date.now();
  document.getElementById('hud').classList.remove('hidden');
  lockPointer();
  updateHealthUI();
  updateAmmoUI();
  updateScoreUI();
  updateGrenadeUI();
  spawnWave(STATE.wave);
}

/* ================================================================
   SECTION 29: MAIN GAME LOOP
================================================================ */
function animate() {
  animFrameId = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (STATE.phase === 'playing') {
    updatePlayer(dt);
    updateEnemies(dt, clock.getElapsedTime());
    updateBullets(dt);
    updateParticles(dt);
    updateGrenades(dt);
    updateEnvironment(dt);
    drawMinimap();
    updateTimer();
  }

  renderer.render(scene, camera);
}

/* ================================================================
   SECTION 30: LOADING SEQUENCE & BOOTSTRAP
================================================================ */
const loadSteps = [
  { pct: 8,  msg: 'Initializing WebGL Engine...' },
  { pct: 18, msg: 'Loading Three.js r128...' },
  { pct: 28, msg: 'Generating Amazon Terrain...' },
  { pct: 40, msg: 'Planting 280 Trees...' },
  { pct: 50, msg: 'Spawning Vegetation & Ferns...' },
  { pct: 58, msg: 'Building Ancient Ruins...' },
  { pct: 65, msg: 'Setting Up Jungle Lighting...' },
  { pct: 72, msg: 'Assembling Enemy AI...' },
  { pct: 80, msg: 'Calibrating Weapon Systems...' },
  { pct: 88, msg: 'Initializing Bullet Physics...' },
  { pct: 94, msg: 'Compiling Shaders...' },
  { pct: 100,msg: 'MISSION READY — Enter the Jungle' },
];

let loadStep = 0;

function tickLoader() {
  if (loadStep >= loadSteps.length) {
    setTimeout(() => {
      document.getElementById('loadingScreen').style.display = 'none';
      setupMenu();
    }, 600);
    return;
  }
  const step = loadSteps[loadStep++];
  document.getElementById('loadBar').style.width    = step.pct + '%';
  document.getElementById('loadStatus').textContent = step.msg;

  const delay = loadStep === loadSteps.length ? 700 : 200 + Math.random() * 200;
  setTimeout(tickLoader, delay);
}

function bootstrap() {
  // Init Three.js
  initRenderer();
  initScene();
  buildLighting();
  buildTerrain();
  buildJungle();
  buildWeaponModel();
  initBulletPool();
  setupInput();

  // Sync HUD
  document.getElementById('hudWeaponName').textContent = WEAPONS[0].name;

  // Start render loop
  animate();

  // Run loader
  tickLoader();
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
