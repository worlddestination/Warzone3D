'use strict';

/* ================================================================
   AMAZON STRIKE — REAL WAR 3D
   game.js — Full WebGL Engine
   Three.js r128 — Realistic Soldiers + Fighter Jets + Air Combat
================================================================ */

/* ================================================================
   SECTION 1: GLOBAL STATE & CONSTANTS
================================================================ */
const STATE = {
  phase:'loading',
  health:100, maxHealth:100,
  armor:75, maxArmor:100,
  ammo:30, maxAmmo:30,
  reserveAmmo:120,
  grenades:3, rockets:4,
  score:0, wave:1,
  kills:0, jetKills:0, deaths:0,
  shotsFired:0, shotsHit:0,
  startTime:0, elapsedTime:0,
  isReloading:false, reloadTimer:0, reloadDur:2.2,
  isADS:false, isSprinting:false, isCrouching:false,
  isGrounded:true, playerVelY:0,
  stamina:100, maxStamina:100,
  staminaDrain:25, staminaRegen:15,
  currentWeapon:0,
  shootCooldown:0,
  grenadeTimer:0,
  stingerLocking:false, stingerLocked:false, stingerLockTimer:0,
  stingerTarget:null,
};

const WEAPONS = [
  { name:'M4A1 ASSAULT RIFLE',  ammo:30,  reserve:120, damage:22, fireRate:0.10, reloadTime:2.2, range:80,  spread:0.012, auto:true,  muzzle:true, color:0x2a3040 },
  { name:'AWM SNIPER RIFLE',    ammo:5,   reserve:25,  damage:95, fireRate:1.2,  reloadTime:3.5, range:200, spread:0.001, auto:false, muzzle:true, color:0x334422 },
  { name:'M249 SAW LMG',        ammo:100, reserve:300, damage:18, fireRate:0.07, reloadTime:4.5, range:60,  spread:0.020, auto:true,  muzzle:true, color:0x1a2030 },
  { name:'FIM-92 STINGER',      ammo:1,   reserve:4,   damage:0,  fireRate:1.5,  reloadTime:3.0, range:500, spread:0,     auto:false, muzzle:false,color:0x2a3a20 },
];

/* --- REALISTIC ENEMY TYPES --- */
const ENEMY_TYPES = [
  { name:'RIFLEMAN',   bodyColor:0x4a5a3a, uniformColor:0x3a4a2c, helmetColor:0x2a3a20, vestColor:0x384830, health:60,  speed:3.0, damage:8,  score:100, scale:1.0, hasBody:true },
  { name:'SERGEANT',   bodyColor:0x3a4a2c, uniformColor:0x2e3d22, helmetColor:0x1e2e12, vestColor:0x2a3820, health:100, speed:2.6, damage:14, score:200, scale:1.05,hasBody:true },
  { name:'HEAVY GUN',  bodyColor:0x2a3820, uniformColor:0x1e2e12, helmetColor:0x141e0a, vestColor:0x1e2a12, health:180, speed:1.8, damage:20, score:350, scale:1.3, hasBody:true },
  { name:'SNIPER',     bodyColor:0x3a4020, uniformColor:0x2c3218, helmetColor:0x1a2010, vestColor:0x283018, health:80,  speed:2.0, damage:35, score:300, scale:0.98,hasBody:true },
  { name:'COMMANDER',  bodyColor:0x1a2818, uniformColor:0x141e10, helmetColor:0x0e1608, vestColor:0x18200e, health:220, speed:2.8, damage:25, score:600, scale:1.2, hasBody:true },
  { name:'SUB GUN',    bodyColor:0x3c4c2c, uniformColor:0x303e20, helmetColor:0x202e14, vestColor:0x283418, health:55,  speed:3.5, damage:10, score:120, scale:0.95,hasBody:true },
];

const MAP_SIZE   = 140;
const TREE_COUNT = 300;
const BUSH_COUNT = 180;
const ROCK_COUNT = 90;

const PLAYER_HEIGHT   = 1.75;
const PLAYER_CROUCH_H = 0.9;
const GRAVITY         = 18;
const JUMP_FORCE      = 7.5;
const MOVE_SPEED      = 5.5;
const SPRINT_SPEED    = 9.5;
const CROUCH_SPEED    = 2.8;
const BULLET_SPEED    = 90;
const ENEMY_BULLET_SPEED = 24;

/* ================================================================
   SECTION 2: THREE.JS ENGINE
================================================================ */
let renderer, scene, camera, clock;
let animFrameId = null;

function initRenderer() {
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;
  renderer.outputEncoding    = THREE.sRGBEncoding;
  window.addEventListener('resize', onResize);
}

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (camera) { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); }
}

function initScene() {
  scene = new THREE.Scene();
  clock = new THREE.Clock();
  scene.background = new THREE.Color(0x0b1e0e);
  scene.fog = new THREE.FogExp2(0x0b1e0e, 0.022);
  camera = new THREE.PerspectiveCamera(72, window.innerWidth/window.innerHeight, 0.05, 400);
  camera.position.set(0, PLAYER_HEIGHT, 0);
}

/* ================================================================
   SECTION 3: LIGHTING
================================================================ */
let sunLight, ambientLight;
const pointLights = [];

function buildLighting() {
  ambientLight = new THREE.AmbientLight(0x1a3a12, 1.8);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xc8e8a0, 1.2);
  sunLight.position.set(30, 60, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048,2048);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far  = 250;
  sunLight.shadow.camera.left = -80; sunLight.shadow.camera.right = 80;
  sunLight.shadow.camera.top  = 80;  sunLight.shadow.camera.bottom= -80;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  scene.add(new THREE.HemisphereLight(0x3a7a20, 0x0a2205, 0.9));

  const cfgs = [
    { x:-20,y:2,z:-20,c:0x40ff80,i:3.0,d:18 },
    { x:25, y:1,z:15, c:0x80ff40,i:2.5,d:14 },
    { x:-30,y:3,z:25, c:0x20ff60,i:2.8,d:16 },
    { x:10, y:2,z:-35,c:0x60ff20,i:2.2,d:12 },
    { x:-10,y:1,z:40, c:0x40cc80,i:2.0,d:15 },
    { x:40, y:2,z:-10,c:0x20ff80,i:2.4,d:14 },
    { x:-45,y:1,z:5,  c:0x80cc40,i:1.8,d:13 },
    { x:5,  y:2,z:50, c:0x40ff60,i:2.1,d:15 },
  ];
  cfgs.forEach(c=>{
    const pl = new THREE.PointLight(c.c, c.i, c.d);
    pl.position.set(c.x, c.y, c.z);
    scene.add(pl);
    const gm = new THREE.Mesh(new THREE.SphereGeometry(.12,6,6), new THREE.MeshBasicMaterial({color:c.c}));
    gm.position.copy(pl.position);
    scene.add(gm);
    pointLights.push({ light:pl, glow:gm, base:c.i, time:Math.random()*Math.PI*2 });
  });
}

/* ================================================================
   SECTION 4: TERRAIN
================================================================ */
let terrainMesh;

function buildTerrain() {
  const segs = 130;
  const geo  = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, segs, segs);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  for (let i=0; i<pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = 2.4*simplex2(x*.015,z*.015) + .8*simplex2(x*.04,z*.04) + .3*simplex2(x*.12,z*.12) + .1*simplex2(x*.3,z*.3);
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color:0x1a3a0a, roughness:0.98, metalness:0 });
  const cols = [];
  for (let i=0; i<pos.count; i++) {
    const h = pos.getY(i);
    if (h>1.5) cols.push(.3,.5,.15); else if (h>0) cols.push(.12,.22,.06); else cols.push(.06,.14,.04);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols,3));
  mat.vertexColors = true;
  terrainMesh = new THREE.Mesh(geo, mat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
}

function simplex2(x, y) {
  const s=(x+y)*.366025, i=Math.floor(x+s), j=Math.floor(y+s), t=(i+j)*.211325;
  const x0=x-i+t, y0=y-j+t, i1=x0>y0?1:0, j1=x0>y0?0:1;
  const x1=x0-i1+.211325, y1=y0-j1+.211325, x2=x0-.577350, y2=y0-.577350;
  const gi0=gradDot(i,j,x0,y0), gi1=gradDot(i+i1,j+j1,x1,y1), gi2=gradDot(i+1,j+1,x2,y2);
  const n0=Math.max(0,.5-x0*x0-y0*y0)**3*gi0, n1=Math.max(0,.5-x1*x1-y1*y1)**3*gi1, n2=Math.max(0,.5-x2*x2-y2*y2)**3*gi2;
  return 70*(n0+n1+n2);
}
function gradDot(ix,iy,x,y) {
  const h=hashInt(ix*1619+iy*31337)&7, G=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  return G[h][0]*x+G[h][1]*y;
}
function hashInt(n) {
  n=((n>>16)^n)*0x45d9f3b; n=((n>>16)^n)*0x45d9f3b; return (n>>16)^n;
}
function getTerrainHeight(x,z) {
  return 2.4*simplex2(x*.015,z*.015) + .8*simplex2(x*.04,z*.04) + .3*simplex2(x*.12,z*.12);
}

/* ================================================================
   SECTION 5: JUNGLE VEGETATION
================================================================ */
const jungleObjects = [];

function buildJungle() {
  buildTrees(); buildBushes(); buildRocks(); buildVines();
  buildRiver(); buildRuins(); buildGrass(); buildFerns();
  buildMushrooms(); buildFallenLogs(); buildFOBstructures();
}

function buildTrees() {
  for (let i=0; i<TREE_COUNT; i++) {
    let px, pz;
    do { px=(Math.random()-.5)*(MAP_SIZE-10); pz=(Math.random()-.5)*(MAP_SIZE-10); }
    while (Math.abs(px)<8&&Math.abs(pz)<8);
    const th = getTerrainHeight(px,pz);
    const g  = createTree(Math.floor(Math.random()*4), px, th, pz);
    scene.add(g);
    jungleObjects.push({mesh:g, radius:.6+Math.random()*.4, x:px, z:pz});
  }
}

function createTree(type, x, y, z) {
  const g = new THREE.Group(); g.position.set(x,y,z);
  const th = 8+Math.random()*14, tr = .25+Math.random()*.35;
  const tMat = new THREE.MeshStandardMaterial({ color:[0x3d2208,0x4a2a0a,0x2d1a05,0x5a3415][type%4], roughness:.98 });
  let cx=0, cz=0;
  const segH = th/7;
  for (let s=0;s<7;s++) {
    const r0=tr*(1-s*.07), r1=tr*(1-(s+1)*.07);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(.05,r1),Math.max(.08,r0),segH,7), tMat);
    seg.position.set(cx, s*segH+segH*.5, cz);
    seg.rotation.x=(Math.random()-.5)*.08; seg.rotation.z=(Math.random()-.5)*.08;
    seg.castShadow=true; g.add(seg);
    cx+=(Math.random()-.5)*.15; cz+=(Math.random()-.5)*.15;
  }
  if (type===1||type===3) {
    for (let r=0;r<5;r++) {
      const a=(r/5)*Math.PI*2;
      const root = new THREE.Mesh(new THREE.BoxGeometry(.15,th*.3,.6), tMat);
      root.position.set(Math.cos(a)*.5, th*.15, Math.sin(a)*.5);
      root.rotation.y=a; root.rotation.z=Math.PI*.12; g.add(root);
    }
  }
  const cMats=[0x1a5a08,0x0d4a05,0x226810,0x1a4a08,0x2a6014];
  const cc = type===2?1:2+Math.floor(Math.random()*3);
  for (let c=0;c<cc;c++) {
    const cy=th*(.6+c*.18)+(Math.random()-.5)*1.5, cr=3+Math.random()*5;
    const cGeo=new THREE.SphereGeometry(cr,9,7);
    const cPos=cGeo.attributes.position;
    for (let v=0;v<cPos.count;v++) {
      cPos.setX(v,cPos.getX(v)*(.85+Math.random()*.3));
      cPos.setY(v,cPos.getY(v)*(.35+Math.random()*.3)*(.7+Math.random()*.6));
      cPos.setZ(v,cPos.getZ(v)*(.85+Math.random()*.3));
    }
    cGeo.computeVertexNormals();
    const can = new THREE.Mesh(cGeo, new THREE.MeshStandardMaterial({color:cMats[Math.floor(Math.random()*5)],roughness:.88,side:THREE.DoubleSide}));
    can.position.set(cx+(Math.random()-.5)*1.5, cy, cz+(Math.random()-.5)*1.5);
    can.castShadow=true; g.add(can);
  }
  g.rotation.y=Math.random()*Math.PI*2; g.scale.setScalar(.7+Math.random()*.7);
  return g;
}

function buildBushes() {
  const bc=[0x1a4a08,0x225510,0x0d3505,0x2a6018,0x183d08];
  for (let i=0;i<BUSH_COUNT;i++) {
    const px=(Math.random()-.5)*(MAP_SIZE-6), pz=(Math.random()-.5)*(MAP_SIZE-6), th=getTerrainHeight(px,pz);
    const g=new THREE.Group();
    const sc=3+Math.floor(Math.random()*5);
    for (let s=0;s<sc;s++) {
      const r=.4+Math.random()*.7;
      const sphere=new THREE.Mesh(new THREE.SphereGeometry(r,6,5),new THREE.MeshStandardMaterial({color:bc[Math.floor(Math.random()*5)],roughness:.95}));
      sphere.position.set((Math.random()-.5)*1.2,r*.6+Math.random()*.3,(Math.random()-.5)*1.2);
      sphere.castShadow=true; g.add(sphere);
    }
    g.position.set(px,th,pz); g.rotation.y=Math.random()*Math.PI*2; scene.add(g);
  }
}

function buildRocks() {
  for (let i=0;i<ROCK_COUNT;i++) {
    const px=(Math.random()-.5)*(MAP_SIZE-8), pz=(Math.random()-.5)*(MAP_SIZE-8), th=getTerrainHeight(px,pz);
    const s=.3+Math.random()*1.8;
    const geo=new THREE.DodecahedronGeometry(s,1); const pos=geo.attributes.position;
    for (let v=0;v<pos.count;v++) {
      pos.setX(v,pos.getX(v)*(.7+Math.random()*.6)); pos.setY(v,pos.getY(v)*(.5+Math.random()*.6)); pos.setZ(v,pos.getZ(v)*(.7+Math.random()*.6));
    }
    geo.computeVertexNormals();
    const rock=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:.92,metalness:.05}));
    rock.position.set(px,th+s*.3,pz); rock.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
    rock.castShadow=true; rock.receiveShadow=true; scene.add(rock);
    jungleObjects.push({mesh:rock, radius:s*.7, x:px, z:pz});
  }
}

function buildVines() {
  const mat=new THREE.MeshStandardMaterial({color:0x2a5a10,roughness:.9});
  for (let i=0;i<60;i++) {
    const px=(Math.random()-.5)*(MAP_SIZE-10), pz=(Math.random()-.5)*(MAP_SIZE-10), th=getTerrainHeight(px,pz), len=4+Math.random()*10;
    for (let s=0;s<6;s++) {
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,len/6,4),mat);
      seg.position.set(px+(Math.random()-.5)*.3, th+12-s*(len/6), pz+(Math.random()-.5)*.3);
      seg.rotation.z=(Math.random()-.5)*.1; scene.add(seg);
    }
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(.4+Math.random()*.4,5,4),new THREE.MeshStandardMaterial({color:0x3a7a18,roughness:.88,side:THREE.DoubleSide}));
    leaf.position.set(px,th+12-len,pz); scene.add(leaf);
  }
}

function buildRiver() {
  const mat=new THREE.MeshStandardMaterial({color:0x0a3a5a,roughness:0,metalness:.3,transparent:true,opacity:.82});
  let rx=-30, rz=-MAP_SIZE*.5+5;
  for (let s=0;s<18;s++) {
    const rw=5+Math.random()*4, rl=8+Math.random()*6;
    const seg=new THREE.Mesh(new THREE.PlaneGeometry(rw,rl),mat);
    seg.rotation.x=-Math.PI/2; seg.position.set(rx,getTerrainHeight(rx,rz+rl*.5)-.2,rz+rl*.5);
    scene.add(seg); rz+=rl*.8; rx+=(Math.random()-.5)*4;
  }
}

function buildRuins() {
  const sM=new THREE.MeshStandardMaterial({color:0x3a3a30,roughness:.95});
  const mM=new THREE.MeshStandardMaterial({color:0x2a3a1a,roughness:.98});
  const pth=getTerrainHeight(35,35);
  const plat=new THREE.Mesh(new THREE.BoxGeometry(18,1.5,18),sM);
  plat.position.set(35,pth+.75,35); plat.castShadow=plat.receiveShadow=true; scene.add(plat);
  for (let p=0;p<8;p++) {
    const a=(p/8)*Math.PI*2, px=35+Math.cos(a)*7.5, pz=35+Math.sin(a)*7.5, pH=3+Math.random()*5;
    const pi=new THREE.Mesh(new THREE.CylinderGeometry(.4,.5,pH,7),sM);
    pi.position.set(px,pth+1.5+pH*.5,pz); pi.castShadow=true; scene.add(pi);
    jungleObjects.push({mesh:pi,radius:.55,x:px,z:pz});
    if (Math.random()<.3) pi.rotation.z=(Math.random()-.5)*1.2;
  }
  for (let w=0;w<5;w++) {
    const wx=35+(Math.random()-.5)*14, wz=35+(Math.random()-.5)*14, wth=getTerrainHeight(wx,wz), wH=1+Math.random()*2.5;
    const wall=new THREE.Mesh(new THREE.BoxGeometry(.6,wH,3+Math.random()*3),mM);
    wall.position.set(wx,wth+wH*.5,wz); wall.rotation.y=Math.random()*Math.PI;
    wall.castShadow=wall.receiveShadow=true; scene.add(wall);
    jungleObjects.push({mesh:wall,radius:.6,x:wx,z:wz});
  }
}

function buildGrass() {
  const mat=new THREE.MeshStandardMaterial({color:0x3a7a18,roughness:.95,side:THREE.DoubleSide});
  for (let i=0;i<500;i++) {
    const gx=(Math.random()-.5)*MAP_SIZE*.9, gz=(Math.random()-.5)*MAP_SIZE*.9, th=getTerrainHeight(gx,gz), h=.3+Math.random()*.7;
    const blade=new THREE.Mesh(new THREE.PlaneGeometry(.15,h),mat);
    blade.position.set(gx,th+h*.5,gz); blade.rotation.y=Math.random()*Math.PI; scene.add(blade);
  }
}

function buildFerns() {
  const fM=new THREE.MeshStandardMaterial({color:0x2a6010,roughness:.9,side:THREE.DoubleSide});
  for (let i=0;i<130;i++) {
    const fx=(Math.random()-.5)*MAP_SIZE*.85, fz=(Math.random()-.5)*MAP_SIZE*.85, th=getTerrainHeight(fx,fz);
    const g=new THREE.Group();
    const lc=5+Math.floor(Math.random()*6);
    for (let l=0;l<lc;l++) {
      const a=(l/lc)*Math.PI*2, ll=.6+Math.random()*.8;
      const leaf=new THREE.Mesh(new THREE.PlaneGeometry(.2,ll),fM);
      leaf.position.set(Math.cos(a)*ll*.5,ll*.3,Math.sin(a)*ll*.5);
      leaf.rotation.y=a; leaf.rotation.z=-.5-Math.random()*.4; g.add(leaf);
    }
    g.position.set(fx,th,fz); g.rotation.y=Math.random()*Math.PI*2; scene.add(g);
  }
}

function buildMushrooms() {
  const cc=[0xcc3300,0xff6600,0xaa2200,0xdd4400];
  for (let i=0;i<60;i++) {
    const mx=(Math.random()-.5)*MAP_SIZE*.8, mz=(Math.random()-.5)*MAP_SIZE*.8, th=getTerrainHeight(mx,mz);
    const g=new THREE.Group();
    const sh=.2+Math.random()*.5;
    g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(.05,.08,sh,6),new THREE.MeshStandardMaterial({color:0xddccaa,roughness:.9})),{position:new THREE.Vector3(0,sh*.5,0)}));
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.15+Math.random()*.2,7,5,0,Math.PI*2,0,Math.PI*.55),new THREE.MeshStandardMaterial({color:cc[Math.floor(Math.random()*4)],roughness:.7,emissive:0x220800,emissiveIntensity:.3}));
    cap.position.y=sh; g.add(cap);
    g.position.set(mx,th,mz); scene.add(g);
  }
}

function buildFallenLogs() {
  const lM=new THREE.MeshStandardMaterial({color:0x2a1505,roughness:.98});
  const mM=new THREE.MeshStandardMaterial({color:0x1a3a08,roughness:.95});
  for (let i=0;i<25;i++) {
    const lx=(Math.random()-.5)*MAP_SIZE*.75, lz=(Math.random()-.5)*MAP_SIZE*.75, th=getTerrainHeight(lx,lz);
    const len=4+Math.random()*8, r=.2+Math.random()*.35;
    const log=new THREE.Mesh(new THREE.CylinderGeometry(r*.7,r,len,8),lM);
    log.rotation.z=Math.PI/2; log.rotation.y=Math.random()*Math.PI;
    log.position.set(lx,th+r*.6,lz); log.castShadow=log.receiveShadow=true; scene.add(log);
    jungleObjects.push({mesh:log,radius:r+.2,x:lx,z:lz});
  }
}

/* FOB — Forward Operating Base structures */
function buildFOBstructures() {
  // Sandbag walls near player start
  const sbM = new THREE.MeshStandardMaterial({color:0x8a7a50,roughness:.95});
  const sbPos = [
    {x:-8,z:5,ry:0}, {x:8,z:5,ry:0}, {x:0,z:-8,ry:Math.PI/2},
    {x:-8,z:-5,ry:0},{x:8,z:-5,ry:0},
  ];
  sbPos.forEach(p=>{
    const sb=new THREE.Mesh(new THREE.BoxGeometry(3,.6,.5),sbM);
    sb.position.set(p.x, getTerrainHeight(p.x,p.z)+.3, p.z);
    sb.rotation.y=p.ry; sb.castShadow=sb.receiveShadow=true; scene.add(sb);
    jungleObjects.push({mesh:sb,radius:.5,x:p.x,z:p.z});
  });

  // Watchtower
  const wtM=new THREE.MeshStandardMaterial({color:0x3a2a10,roughness:.9});
  const baseX=-20, baseZ=-20, bth=getTerrainHeight(baseX,baseZ);
  for (let c=0;c<4;c++) {
    const a=(c/4)*Math.PI*2;
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.1,.12,5,6),wtM);
    post.position.set(baseX+Math.cos(a)*1.5,bth+2.5,baseZ+Math.sin(a)*1.5);
    post.castShadow=true; scene.add(post);
  }
  const floor=new THREE.Mesh(new THREE.BoxGeometry(3,.1,3),wtM);
  floor.position.set(baseX,bth+5,baseZ); floor.castShadow=floor.receiveShadow=true; scene.add(floor);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(2.2,1.5,4),wtM);
  roof.position.set(baseX,bth+6,baseZ); roof.rotation.y=Math.PI/4; scene.add(roof);

  // Ammo crates
  const cM=new THREE.MeshStandardMaterial({color:0x2a4a20,roughness:.85,metalness:.3});
  for (let i=0;i<8;i++) {
    const cx=(Math.random()-.5)*30, cz=(Math.random()-.5)*30, cth=getTerrainHeight(cx,cz);
    const crate=new THREE.Mesh(new THREE.BoxGeometry(.6,.45,.45),cM);
    crate.position.set(cx,cth+.225,cz); crate.rotation.y=Math.random()*Math.PI;
    crate.castShadow=true; scene.add(crate);
  }

  // Barbed wire fences
  const bwM=new THREE.MeshStandardMaterial({color:0x808080,roughness:.5,metalness:.8});
  for (let i=0;i<15;i++) {
    const bx=-40+i*5, bz=-40, bth=getTerrainHeight(bx,bz);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.9,5),bwM);
    post.position.set(bx,bth+.45,bz); scene.add(post);
    if (i>0) {
      const wire=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,5,3),bwM);
      wire.rotation.z=Math.PI/2; wire.position.set(bx-2.5,bth+.7,bz); scene.add(wire);
    }
  }
}

/* ================================================================
   SECTION 6: REALISTIC SOLDIER MESH
================================================================ */
function buildSoldierMesh(type) {
  const g = new THREE.Group();
  const s = type.scale;
  const uC = type.uniformColor, hC = type.helmetColor, vC = type.vestColor, bC = type.bodyColor;

  const uM = new THREE.MeshStandardMaterial({color:uC, roughness:.95, metalness:.02});
  const hM = new THREE.MeshStandardMaterial({color:hC, roughness:.9,  metalness:.05});
  const vM = new THREE.MeshStandardMaterial({color:vC, roughness:.88, metalness:.08, bumpScale:.005});
  const skinM = new THREE.MeshStandardMaterial({color:0xc8a882, roughness:.9});
  const bootM = new THREE.MeshStandardMaterial({color:0x1a1208, roughness:.85, metalness:.1});
  const metalM= new THREE.MeshStandardMaterial({color:0x2a2a2a, roughness:.45, metalness:.75});
  const lensM = new THREE.MeshStandardMaterial({color:0x003344, roughness:.1, metalness:.0, emissive:0x001122, emissiveIntensity:.4});

  /* --- LEGS --- */
  [-0.16*s, 0.16*s].forEach((legX,li)=>{
    // Upper leg
    const uLeg=new THREE.Mesh(new THREE.CylinderGeometry(.12*s,.10*s,.44*s,8),uM);
    uLeg.position.set(legX, .42*s, 0); uLeg.castShadow=true; g.add(uLeg);
    // Knee pad
    const kpad=new THREE.Mesh(new THREE.BoxGeometry(.15*s,.08*s,.06*s),vM);
    kpad.position.set(legX,.20*s,.06*s); g.add(kpad);
    // Lower leg
    const lLeg=new THREE.Mesh(new THREE.CylinderGeometry(.09*s,.10*s,.4*s,8),uM);
    lLeg.position.set(legX,.00*s,0); lLeg.castShadow=true; g.add(lLeg);
    // Boot
    const boot=new THREE.Mesh(new THREE.BoxGeometry(.14*s,.16*s,.24*s),bootM);
    boot.position.set(legX,-.18*s,.04*s); boot.castShadow=true; g.add(boot);
    // Boot sole
    const sole=new THREE.Mesh(new THREE.BoxGeometry(.16*s,.04*s,.26*s),bootM);
    sole.position.set(legX,-.26*s,.04*s); g.add(sole);
    // Cargo pocket on leg
    const poc=new THREE.Mesh(new THREE.BoxGeometry(.1*s,.1*s,.04*s),uM);
    poc.position.set(legX+(li===0?-.07*s:.07*s),.35*s,.0); g.add(poc);
  });

  /* --- TORSO --- */
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.46*s,.58*s,.26*s),uM);
  torso.position.y=.98*s; torso.castShadow=true; g.add(torso);

  // Plate carrier / MOLLE vest
  const vest=new THREE.Mesh(new THREE.BoxGeometry(.44*s,.5*s,.14*s),vM);
  vest.position.set(0,.98*s,.07*s); g.add(vest);
  // MOLLE pouches front
  for (let p=0;p<3;p++) {
    const px=(p-1)*.13*s;
    const pouch=new THREE.Mesh(new THREE.BoxGeometry(.1*s,.1*s,.06*s),vM);
    pouch.position.set(px,.82*s,.13*s); g.add(pouch);
  }
  // Side pouches
  [-0.26*s, 0.26*s].forEach(sx=>{
    const sp=new THREE.Mesh(new THREE.BoxGeometry(.06*s,.12*s,.18*s),vM);
    sp.position.set(sx,.92*s,.0); g.add(sp);
  });
  // Back of vest
  const backpad=new THREE.Mesh(new THREE.BoxGeometry(.40*s,.42*s,.1*s),vM);
  backpad.position.set(0,.98*s,-.14*s); g.add(backpad);
  // Backpack / radio
  const pack=new THREE.Mesh(new THREE.BoxGeometry(.22*s,.28*s,.14*s),vM);
  pack.position.set(0,.96*s,-.22*s); g.add(pack);
  const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.008*s,.008*s,.2*s,4),metalM);
  antenna.position.set(.08*s,1.15*s,-.22*s); g.add(antenna);

  /* --- ARMS --- */
  [-0.32*s, 0.32*s].forEach((ax,ai)=>{
    // Upper arm
    const ua=new THREE.Mesh(new THREE.CylinderGeometry(.09*s,.085*s,.32*s,7),uM);
    ua.position.set(ax,1.12*s,0); ua.castShadow=true; g.add(ua);
    // Elbow pad
    const ep=new THREE.Mesh(new THREE.SphereGeometry(.07*s,5,4),vM);
    ep.position.set(ax,.94*s,.04*s); ep.scale.set(1,.7,1); g.add(ep);
    // Lower arm
    const la=new THREE.Mesh(new THREE.CylinderGeometry(.07*s,.075*s,.28*s,7),uM);
    la.position.set(ax,.76*s,-.04*s); la.rotation.x=.15; la.castShadow=true; g.add(la);
    // Gloved hand
    const hand=new THREE.Mesh(new THREE.BoxGeometry(.08*s,.08*s,.10*s),new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.85}));
    hand.position.set(ax,.62*s,-.08*s); g.add(hand);
    // Shoulder pad
    const shp=new THREE.Mesh(new THREE.SphereGeometry(.13*s,6,5),vM);
    shp.position.set(ax,1.28*s,.0); shp.scale.set(.9,.7,.9); g.add(shp);
    // Flag patch / IR patch
    const patch=new THREE.Mesh(new THREE.BoxGeometry(.06*s,.04*s,.01*s),new THREE.MeshStandardMaterial({color:ai===0?0x1a3a8a:0x3a2a1a}));
    patch.position.set(ax,1.0*s,.14*s); g.add(patch);
  });

  /* --- NECK --- */
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.07*s,.08*s,.12*s,7),skinM);
  neck.position.set(0,1.35*s,0); g.add(neck);

  /* --- HEAD --- */
  const head=new THREE.Mesh(new THREE.SphereGeometry(.18*s,8,7),skinM);
  head.position.set(0,1.56*s,0); head.castShadow=true; g.add(head);

  // Combat helmet
  const helmetGeo=new THREE.SphereGeometry(.22*s,8,7,0,Math.PI*2,0,Math.PI*.65);
  const helmet=new THREE.Mesh(helmetGeo,hM);
  helmet.position.set(0,1.57*s,0); g.add(helmet);
  // Helmet rim
  const hrim=new THREE.Mesh(new THREE.TorusGeometry(.21*s,.025*s,5,12),hM);
  hrim.rotation.x=Math.PI/2; hrim.position.set(0,1.42*s,0); g.add(hrim);
  // NVG mount on helmet
  const nvgMount=new THREE.Mesh(new THREE.BoxGeometry(.04*s,.04*s,.06*s),metalM);
  nvgMount.position.set(0,1.73*s,.18*s); g.add(nvgMount);
  // Helmet cover with camo bumps
  const camo=new THREE.MeshStandardMaterial({color:hC,roughness:.98,metalness:0});
  for (let b=0;b<4;b++) {
    const bump=new THREE.Mesh(new THREE.SphereGeometry(.03*s,4,3),camo);
    bump.position.set((Math.random()-.5)*.2*s,1.64*s+Math.random()*.08*s,(Math.random()-.5)*.15*s);
    g.add(bump);
  }

  // Face balaclava / lower face cover
  const bala=new THREE.Mesh(new THREE.SphereGeometry(.175*s,8,5,0,Math.PI*2,Math.PI*.35,Math.PI*.4),new THREE.MeshStandardMaterial({color:hC,roughness:.95}));
  bala.position.set(0,1.56*s,0); g.add(bala);

  // Eyes
  [-0.06*s, 0.06*s].forEach(ex=>{
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.025*s,5,4),lensM);
    eye.position.set(ex,1.6*s,.16*s); g.add(eye);
  });

  /* --- WEAPON — realistic M4/AK based on enemy type --- */
  const wGrp = new THREE.Group();
  const wC = type.scale>1.2 ? 0x1a1a1a : 0x2a2a2a; // heavy gets darker
  const wMat = new THREE.MeshStandardMaterial({color:wC,roughness:.4,metalness:.75});
  const wMat2= new THREE.MeshStandardMaterial({color:0x1a1208,roughness:.85,metalness:.1});

  // Receiver
  const recv=new THREE.Mesh(new THREE.BoxGeometry(.05*s,.07*s,.28*s),wMat);
  recv.position.set(0,0,0); wGrp.add(recv);
  // Barrel
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.012*s,.015*s,type.scale>1.2?.35*s:.25*s,6),wMat);
  barrel.rotation.x=Math.PI/2; barrel.position.set(0,.01*s,-.22*s); wGrp.add(barrel);
  // Stock
  const stock=new THREE.Mesh(new THREE.BoxGeometry(.04*s,.055*s,.16*s),wMat);
  stock.position.set(0,-.01*s,.18*s); wGrp.add(stock);
  // Foregrip
  const fg=new THREE.Mesh(new THREE.BoxGeometry(.04*s,.06*s,.14*s),wMat);
  fg.position.set(0,-.04*s,-.1*s); wGrp.add(fg);
  // Magazine
  const mag=new THREE.Mesh(new THREE.BoxGeometry(.03*s,.12*s,.055*s),wMat2);
  mag.position.set(0,-.08*s,-.02*s); wGrp.add(mag);
  // Handle
  const hdl=new THREE.Mesh(new THREE.BoxGeometry(.04*s,.08*s,.05*s),wMat2);
  hdl.position.set(0,-.06*s,.06*s); hdl.rotation.x=.2; wGrp.add(hdl);
  // Muzzle flash point
  const mFP = new THREE.Mesh(new THREE.SphereGeometry(.01*s,3,3),new THREE.MeshBasicMaterial({color:0xffcc44,transparent:true,opacity:0}));
  mFP.position.set(0,.01*s,type.scale>1.2?-.37*s:-.28*s); mFP.name='muzzleFlash'; wGrp.add(mFP);

  wGrp.position.set(.28*s,.72*s,.16*s); wGrp.rotation.y=Math.PI*.04;
  g.add(wGrp);

  // Heavy gets bipod
  if (type.scale>1.2) {
    const bpM=new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:.4,metalness:.7});
    [-0.05*s,0.05*s].forEach(bx=>{
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(.008*s,.01*s,.15*s,4),bpM);
      leg.position.set(bx,.55*s,.32*s); leg.rotation.x=.3; g.add(leg);
    });
  }

  // Sniper gets ghillie suit elements
  if (type.name==='SNIPER') {
    const ghillieM=new THREE.MeshStandardMaterial({color:0x2a3a15,roughness:.99});
    for (let gh=0;gh<12;gh++) {
      const strip=new THREE.Mesh(new THREE.BoxGeometry((.02+Math.random()*.03)*s,(.08+Math.random()*.12)*s,.01*s),ghillieM);
      strip.position.set((Math.random()-.5)*.4*s,.85*s+(Math.random()-.5)*.3*s,(Math.random()-.5)*.15*s);
      strip.rotation.z=(Math.random()-.5)*.5; strip.rotation.y=Math.random()*Math.PI; g.add(strip);
    }
  }

  return g;
}

/* ================================================================
   SECTION 7: WEAPON MODEL (Player)
================================================================ */
let weaponGroup, weaponBob=0;
let muzzleFlashLight, muzzleFlashMesh;

function buildWeaponModel() {
  weaponGroup = new THREE.Group();
  const w = WEAPONS[STATE.currentWeapon];

  if (STATE.currentWeapon===3) {
    buildStingerModel();
  } else {
    buildRifleModel(w);
  }

  camera.add(weaponGroup);
  scene.add(camera);
}

function buildRifleModel(w) {
  const bMat=new THREE.MeshStandardMaterial({color:w.color,roughness:.38,metalness:.78});
  const aMat=new THREE.MeshStandardMaterial({color:0x111118,roughness:.28,metalness:.92});
  const rMat=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.88,metalness:.1});
  const wdMat=new THREE.MeshStandardMaterial({color:0x4a3010,roughness:.88,metalness:.05});

  // Receiver body
  const body=new THREE.Mesh(new THREE.BoxGeometry(.09,.11,.38),bMat); body.position.set(0,0,-.18); weaponGroup.add(body);
  // Lower receiver
  const lowR=new THREE.Mesh(new THREE.BoxGeometry(.085,.072,.34),aMat); lowR.position.set(0,-.06,-.18); weaponGroup.add(lowR);
  // Barrel assembly
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.013,.016,.46,8),aMat); barrel.rotation.x=Math.PI/2; barrel.position.set(0,.005,-.5); weaponGroup.add(barrel);
  // Gas tube
  const gas=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,.3,5),aMat); gas.rotation.x=Math.PI/2; gas.position.set(0,.025,-.4); weaponGroup.add(gas);
  // Muzzle device
  const muz=new THREE.Mesh(new THREE.CylinderGeometry(.02,.018,.1,8),aMat); muz.rotation.x=Math.PI/2; muz.position.set(0,.005,-.7); weaponGroup.add(muz);
  // Muzzle vents
  for (let v=0;v<4;v++) {
    const vent=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,.015,4),aMat);
    vent.position.set(Math.cos(v*Math.PI/2)*.018,.005,-.68); weaponGroup.add(vent);
  }
  // Handguard
  const hg=new THREE.Mesh(new THREE.BoxGeometry(.07,.065,.26),aMat); hg.position.set(0,.0,-.32); weaponGroup.add(hg);
  // Rail on handguard
  for (let r=0;r<3;r++) {
    const rail=new THREE.Mesh(new THREE.BoxGeometry(.003,.012,.22),aMat); rail.position.set(.036-.036*r,-.03,-.32); weaponGroup.add(rail);
  }
  // Grip
  const grip=new THREE.Mesh(new THREE.BoxGeometry(.065,.12,.058),rMat); grip.position.set(0,-.09,.0); grip.rotation.x=.18; weaponGroup.add(grip);
  // Trigger guard
  const tg=new THREE.Mesh(new THREE.TorusGeometry(.025,.006,5,8,Math.PI),aMat); tg.rotation.x=Math.PI/2; tg.position.set(0,-.045,-.04); weaponGroup.add(tg);
  // Trigger
  const trig=new THREE.Mesh(new THREE.BoxGeometry(.005,.025,.012),aMat); trig.position.set(0,-.055,-.02); trig.rotation.x=.3; weaponGroup.add(trig);
  // Magazine
  const mag=new THREE.Mesh(new THREE.BoxGeometry(.038,.14,.07),rMat); mag.position.set(0,-.11,-.14); weaponGroup.add(mag);
  // Stock
  if (STATE.currentWeapon===2) {
    // SAW bipod legs
    const bpM=new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:.4,metalness:.7});
    [-0.03,.03].forEach(bx=>{
      const bl=new THREE.Mesh(new THREE.CylinderGeometry(.006,.008,.12,4),bpM);
      bl.position.set(bx,-.04,-.6); bl.rotation.x=.4; weaponGroup.add(bl);
    });
    const stock2=new THREE.Mesh(new THREE.BoxGeometry(.055,.07,.2),rMat); stock2.position.set(0,-.025,.1); weaponGroup.add(stock2);
    const butt=new THREE.Mesh(new THREE.BoxGeometry(.07,.09,.04),rMat); butt.position.set(0,-.02,.22); weaponGroup.add(butt);
  } else {
    const stock=new THREE.Mesh(new THREE.BoxGeometry(.055,.08,.22),rMat); stock.position.set(0,-.02,.14); weaponGroup.add(stock);
    // Collapsible stock detail
    const sc2=new THREE.Mesh(new THREE.BoxGeometry(.02,.005,.18),aMat); sc2.position.set(.03,-.01,.14); weaponGroup.add(sc2);
    const butt=new THREE.Mesh(new THREE.BoxGeometry(.065,.09,.04),rMat); butt.position.set(0,-.02,.26); weaponGroup.add(butt);
    // Cheek riser (wood on sniper)
    if (STATE.currentWeapon===1) {
      const riser=new THREE.Mesh(new THREE.BoxGeometry(.055,.045,.14),wdMat); riser.position.set(0,.04,.15); weaponGroup.add(riser);
    }
  }
  // Charging handle
  const ch=new THREE.Mesh(new THREE.BoxGeometry(.012,.012,.04),aMat); ch.position.set(.055,.03,-.04); weaponGroup.add(ch);

  // Optics
  if (STATE.currentWeapon===1) {
    // Scope
    const scopeBase=new THREE.Mesh(new THREE.BoxGeometry(.04,.025,.22),aMat); scopeBase.position.set(0,.07,-.2); weaponGroup.add(scopeBase);
    const scopeTube=new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,.22,8),aMat); scopeTube.rotation.x=Math.PI/2; scopeTube.position.set(0,.11,-.2); weaponGroup.add(scopeTube);
    const lens=new THREE.Mesh(new THREE.CircleGeometry(.024,8),new THREE.MeshStandardMaterial({color:0x002244,roughness:0,emissive:0x001133,emissiveIntensity:.5})); lens.rotation.y=Math.PI/2; lens.position.set(0,.11,-.09); weaponGroup.add(lens);
    const reticleR=new THREE.Mesh(new THREE.TorusGeometry(.015,.002,4,8),new THREE.MeshBasicMaterial({color:0x00ff44})); reticleR.rotation.y=Math.PI/2; reticleR.position.set(0,.11,-.09); weaponGroup.add(reticleR);
  } else {
    // Reflex/ACOG
    const rsBase=new THREE.Mesh(new THREE.BoxGeometry(.035,.02,.06),aMat); rsBase.position.set(0,.065,-.12); weaponGroup.add(rsBase);
    const rsHood=new THREE.Mesh(new THREE.BoxGeometry(.032,.03,.05),aMat); rsHood.position.set(0,.09,-.12); weaponGroup.add(rsHood);
    const rsDot=new THREE.Mesh(new THREE.CircleGeometry(.008,6),new THREE.MeshBasicMaterial({color:0xff0000})); rsDot.rotation.y=Math.PI/2; rsDot.position.set(0,.09,-.09); weaponGroup.add(rsDot);
    // Laser / flashlight combo
    const lfc=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.06,6),aMat); lfc.rotation.x=Math.PI/2; lfc.position.set(.03,-.03,-.3); weaponGroup.add(lfc);
  }

  // Muzzle flash
  muzzleFlashLight = new THREE.PointLight(0xffaa30,0,4.5);
  muzzleFlashLight.position.set(0,0,-.78); weaponGroup.add(muzzleFlashLight);
  muzzleFlashMesh = new THREE.Mesh(new THREE.SphereGeometry(.07,5,4),new THREE.MeshBasicMaterial({color:0xffcc44,transparent:true,opacity:0}));
  muzzleFlashMesh.position.set(0,.005,-.78); weaponGroup.add(muzzleFlashMesh);

  weaponGroup.position.set(.19,-.17,-.38);
}

function buildStingerModel() {
  const sMat=new THREE.MeshStandardMaterial({color:0x3a4a30,roughness:.7,metalness:.3});
  const mMat=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.4,metalness:.8});

  // Tube
  const tube=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.7,10),sMat); tube.rotation.x=Math.PI/2; tube.position.set(0,.0,-.25); weaponGroup.add(tube);
  // Front bell
  const bell=new THREE.Mesh(new THREE.CylinderGeometry(.065,.055,.05,10),sMat); bell.rotation.x=Math.PI/2; bell.position.set(0,.0,-.58); weaponGroup.add(bell);
  // Seeker head
  const seek=new THREE.Mesh(new THREE.SphereGeometry(.062,8,7),new THREE.MeshStandardMaterial({color:0x111111,roughness:.2,metalness:.9})); seek.position.set(0,.0,-.62); weaponGroup.add(seek);
  const seeklens=new THREE.Mesh(new THREE.CircleGeometry(.03,8),new THREE.MeshStandardMaterial({color:0x001133,roughness:0,emissive:0x00aaff,emissiveIntensity:.8})); seeklens.rotation.y=Math.PI/2; seeklens.position.set(0,.0,-.62); weaponGroup.add(seeklens);
  // Grip / trigger assembly
  const grip=new THREE.Mesh(new THREE.BoxGeometry(.065,.12,.06),new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.88})); grip.position.set(0,-.1,-.18); grip.rotation.x=.2; weaponGroup.add(grip);
  // Shoulder brace
  const brace=new THREE.Mesh(new THREE.BoxGeometry(.1,.065,.1),sMat); brace.position.set(0,.03,.1); weaponGroup.add(brace);
  // IFF interrogator
  const iff=new THREE.Mesh(new THREE.BoxGeometry(.04,.04,.06),mMat); iff.position.set(.04,.04,-.1); weaponGroup.add(iff);

  muzzleFlashLight=new THREE.PointLight(0xff8800,0,8); muzzleFlashLight.position.set(0,0,-.7); weaponGroup.add(muzzleFlashLight);
  muzzleFlashMesh=new THREE.Mesh(new THREE.SphereGeometry(.04,4,3),new THREE.MeshBasicMaterial({color:0xff8800,transparent:true,opacity:0})); muzzleFlashMesh.position.set(0,0,-.7); weaponGroup.add(muzzleFlashMesh);

  weaponGroup.position.set(0,-.06,-.35);
}

/* ================================================================
   SECTION 8: FIGHTER JET SYSTEM
================================================================ */
const jets = [];
let jetGroup;

function createFighterJet(startX, startZ, altitude) {
  const g = new THREE.Group();
  const jMat = new THREE.MeshStandardMaterial({color:0x4a4a5a, roughness:.4, metalness:.7});
  const jMat2= new THREE.MeshStandardMaterial({color:0x3a3a4a, roughness:.45, metalness:.75});
  const cMat = new THREE.MeshStandardMaterial({color:0x112233, roughness:.1, metalness:.0, emissive:0x001122, emissiveIntensity:.6});
  const exMat= new THREE.MeshStandardMaterial({color:0x1a1a1a, roughness:.3, metalness:.9});
  const camMat=new THREE.MeshStandardMaterial({color:0x3a4a32, roughness:.85, metalness:.05}); // camo color

  // --- FUSELAGE ---
  const fuseGeo=new THREE.CylinderGeometry(.25,.55,6,10);
  const fuse=new THREE.Mesh(fuseGeo, camMat); fuse.rotation.x=Math.PI/2; fuse.castShadow=true; g.add(fuse);
  // Nose cone
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.25,2.2,10),camMat); nose.rotation.x=-Math.PI/2; nose.position.z=-4.1; nose.castShadow=true; g.add(nose);
  // Radome (darker nose tip)
  const radome=new THREE.Mesh(new THREE.ConeGeometry(.12,.8,8),new THREE.MeshStandardMaterial({color:0x1a1a22,roughness:.5,metalness:.4})); radome.rotation.x=-Math.PI/2; radome.position.z=-5; g.add(radome);
  // Tail cone
  const tailC=new THREE.Mesh(new THREE.ConeGeometry(.28,.8,8),camMat); tailC.rotation.x=Math.PI/2; tailC.position.z=3.4; g.add(tailC);

  // --- WINGS ---
  [-1,1].forEach(side=>{
    // Main wing
    const wShape=new THREE.Shape();
    wShape.moveTo(0,0); wShape.lineTo(side*4,-.5); wShape.lineTo(side*3.5,-1.8); wShape.lineTo(side*.4,-.2); wShape.closePath();
    const wGeo=new THREE.ExtrudeGeometry(wShape,{depth:.08,bevelEnabled:false});
    const wing=new THREE.Mesh(wGeo,jMat); wing.rotation.x=-Math.PI/2; wing.position.set(0,.1,.4); wing.castShadow=true; g.add(wing);

    // Wing fence
    const wf=new THREE.Mesh(new THREE.BoxGeometry(.05,.25,.6),jMat2); wf.position.set(side*3.0,.1,-.3); g.add(wf);

    // Hardpoint pylons x2
    [2.0, 3.0].forEach(wd=>{
      const pyl=new THREE.Mesh(new THREE.BoxGeometry(.08,.2,.4),jMat); pyl.position.set(side*wd,-.12,.3); g.add(pyl);
      // Missile on pylon
      const mis=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.7,6),new THREE.MeshStandardMaterial({color:0x888888,roughness:.4,metalness:.7}));
      mis.rotation.x=Math.PI/2; mis.position.set(side*wd,-.25,.3); g.add(mis);
      const misNose=new THREE.Mesh(new THREE.ConeGeometry(.05,.25,6),new THREE.MeshStandardMaterial({color:0x333333}));
      misNose.rotation.x=-Math.PI/2; misNose.position.set(side*wd,-.25,-.05); g.add(misNose);
    });

    // External fuel tank
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.9,7),new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:.5,metalness:.6}));
    tank.rotation.x=Math.PI/2; tank.position.set(side*1.2,-.2,.3); g.add(tank);

    // Tail fin
    const tfShape=new THREE.Shape();
    tfShape.moveTo(0,0); tfShape.lineTo(side*.2,1.6); tfShape.lineTo(side*1.2,1.4); tfShape.lineTo(side*1.4,0); tfShape.closePath();
    const tfGeo=new THREE.ExtrudeGeometry(tfShape,{depth:.06,bevelEnabled:false});
    const tf=new THREE.Mesh(tfGeo,jMat); tf.rotation.x=-Math.PI/2; tf.position.set(0,.06,2.2); g.add(tf);

    // Horizontal stabilizer
    const hsShape=new THREE.Shape();
    hsShape.moveTo(0,0); hsShape.lineTo(side*1.8,-.3); hsShape.lineTo(side*1.6,-.8); hsShape.lineTo(side*.2,-.1); hsShape.closePath();
    const hsGeo=new THREE.ExtrudeGeometry(hsShape,{depth:.06,bevelEnabled:false});
    const hs=new THREE.Mesh(hsGeo,jMat); hs.rotation.x=-Math.PI/2; hs.position.set(0,.06,2.8); g.add(hs);
  });

  // --- CANOPY ---
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(.32,8,6,0,Math.PI*2,0,Math.PI*.5),cMat);
  canopy.scale.set(1,.7,1.8); canopy.position.set(0,.28,-1.2); g.add(canopy);
  // Canopy frame
  const cframe=new THREE.Mesh(new THREE.TorusGeometry(.3,.02,4,12,Math.PI*.5),new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:.8}));
  cframe.rotation.x=Math.PI*.5; cframe.position.set(0,.25,-1.2); g.add(cframe);

  // --- ENGINE INTAKES ---
  [-0.35, 0.35].forEach(ix=>{
    const intake=new THREE.Mesh(new THREE.CylinderGeometry(.22,.18,.4,8),jMat2); intake.rotation.x=Math.PI/2; intake.position.set(ix,-.1,-.8); g.add(intake);
    const intInner=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.1,8),new THREE.MeshStandardMaterial({color:0x0a0a0a})); intInner.rotation.x=Math.PI/2; intInner.position.set(ix,-.1,-1.0); g.add(intInner);
  });

  // --- EXHAUSTS ---
  [-0.28, 0.28].forEach(ex=>{
    const exh=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,.3,8),exMat); exh.rotation.x=Math.PI/2; exh.position.set(ex,.0,3.2); g.add(exh);
    // Afterburner glow
    const ab=new THREE.PointLight(0xff6600,0,.5); ab.position.set(ex,.0,3.4); g.add(ab);
    const abMesh=new THREE.Mesh(new THREE.ConeGeometry(.15,.4,7),new THREE.MeshBasicMaterial({color:0xff8800,transparent:true,opacity:0}));
    abMesh.rotation.x=Math.PI/2; abMesh.position.set(ex,.0,3.5); abMesh.name='afterburner'; g.add(abMesh);
  });

  // --- NAVIGATION LIGHTS ---
  const rLight=new THREE.PointLight(0xff0000,.8,3); rLight.position.set(-3.8,.1,.0); g.add(rLight);
  const gLight=new THREE.PointLight(0x00ff00,.8,3); gLight.position.set(3.8,.1,.0); g.add(gLight);
  const wLight=new THREE.PointLight(0xffffff,.6,4); wLight.position.set(0,.1,-4.5); g.add(wLight);

  // --- RADAR/SENSOR DOME ---
  const dome=new THREE.Mesh(new THREE.SphereGeometry(.12,7,5,0,Math.PI*2,0,Math.PI*.5),new THREE.MeshStandardMaterial({color:0x1a1a22,roughness:.2,metalness:.3}));
  dome.position.set(0,-.28,.0); g.add(dome);

  // Set initial position
  const th = getTerrainHeight(startX, startZ);
  g.position.set(startX, (altitude||60)+th, startZ);
  g.scale.setScalar(1.2);

  return g;
}

function spawnJet(wave) {
  const angle = Math.random()*Math.PI*2;
  const dist  = 100+Math.random()*50;
  const x = Math.cos(angle)*dist, z = Math.sin(angle)*dist;
  const mesh = createFighterJet(x, z, 50+Math.random()*30);
  scene.add(mesh);

  const health = 200+wave*50;
  jets.push({
    mesh, alive:true,
    health, maxHealth:health,
    speed: 25+Math.random()*15,
    angle, altitude: 55+Math.random()*30,
    phase: 'approach',  // approach | strafe | bomb | evade
    shootTimer: 3+Math.random()*3,
    bombTimer:  5+Math.random()*5,
    bankAngle: 0,
    smokeTimer: 0,
    hitTimer: 0,
    radius: 3.5,
    score: 800+wave*200,
    afterburnerOn: false,
    strafing: false,
  });

  document.getElementById('aircraftWarning').classList.remove('hidden');
  setTimeout(()=>document.getElementById('aircraftWarning').classList.add('hidden'),4000);
  showNotif('⚠ HOSTILE AIRCRAFT DETECTED — ENGAGE WITH STINGER!');
}

const jetBullets = [];
const bombObjects = [];
const missileObjects = [];

function updateJets(dt, t) {
  jets.forEach(jet=>{
    if (!jet.alive) return;
    jet.hitTimer=Math.max(0,jet.hitTimer-dt);

    const toPlayer = new THREE.Vector3().subVectors(camera.position, jet.mesh.position);
    const dist = toPlayer.length();

    // Movement AI
    const speed = jet.speed * (jet.afterburnerOn?1.6:1.0);

    if (jet.phase==='approach') {
      // Fly toward player in a wide circle
      jet.angle += (speed*.8*dt)/Math.max(60,dist);
      const targetAlt = jet.altitude;
      const cx = Math.cos(jet.angle)*70;
      const cz = Math.sin(jet.angle)*70;
      jet.mesh.position.x += (cx-jet.mesh.position.x)*dt*0.5;
      jet.mesh.position.z += (cz-jet.mesh.position.z)*dt*0.5;
      jet.mesh.position.y += (targetAlt-jet.mesh.position.y)*dt*0.8;
      if (dist<100) jet.phase='strafe';
    }

    if (jet.phase==='strafe') {
      // Dive toward player, strafe run
      const dir = toPlayer.clone().normalize();
      dir.y = -0.15;
      jet.mesh.position.addScaledVector(dir, speed*dt);
      jet.mesh.position.y = Math.max(15, jet.mesh.position.y);
      jet.strafing = true;
      jet.afterburnerOn = true;

      if (dist<20 || jet.mesh.position.y<18) {
        jet.phase='pullout';
      }
    }

    if (jet.phase==='pullout') {
      // Pull up and evade
      jet.mesh.position.y += speed*0.8*dt;
      const evadeDir = toPlayer.clone().negate().normalize();
      evadeDir.y = 0.4;
      jet.mesh.position.addScaledVector(evadeDir, speed*dt);
      jet.afterburnerOn = true;
      if (jet.mesh.position.y>jet.altitude) { jet.phase='approach'; jet.afterburnerOn=false; jet.strafing=false; }
    }

    if (jet.phase==='bomb') {
      jet.bombTimer-=dt;
      if (jet.bombTimer<=0) {
        dropBomb(jet.mesh.position.clone());
        jet.bombTimer=8+Math.random()*6;
        jet.phase='approach';
      }
    }

    // Face direction of movement
    const velocity = jet.mesh.position.clone().sub(jet.mesh.getWorldPosition(new THREE.Vector3()).sub(jet.mesh.position));
    const moveDir = new THREE.Vector3().subVectors(jet.mesh.position, jet.mesh.position.clone().sub(new THREE.Vector3(Math.cos(jet.angle),0,Math.sin(jet.angle)).multiplyScalar(.1)));

    jet.mesh.lookAt(jet.mesh.position.clone().add(new THREE.Vector3(Math.cos(jet.angle),jet.strafing?-.1:.05,Math.sin(jet.angle))));

    // Bank on turns
    jet.bankAngle += ((jet.strafing?-.3:0)-jet.bankAngle)*dt*2;
    jet.mesh.rotation.z = jet.bankAngle;

    // Afterburner effect
    jet.mesh.traverse(child=>{
      if (child.name==='afterburner') {
        child.material.opacity = jet.afterburnerOn ? .7+Math.random()*.3 : 0;
      }
      if (child.isPointLight && child.color.r>.8) {
        // Afterburner glow
      }
    });

    // Navigation light blink
    const blink=Math.sin(t*3)>.5;
    jet.mesh.traverse(child=>{
      if (child.isPointLight) { child.intensity=blink?.8:.2; }
    });

    // Gun strafing
    jet.shootTimer-=dt;
    if (jet.shootTimer<=0 && jet.strafing && dist<80) {
      jet.shootTimer=.08+Math.random()*.06;
      const muzzPos=jet.mesh.position.clone().add(new THREE.Vector3(0,0,-5).applyEuler(jet.mesh.rotation));
      const shotDir=new THREE.Vector3().subVectors(camera.position,muzzPos).normalize();
      shotDir.x+=(Math.random()-.5)*.08; shotDir.y+=(Math.random()-.5)*.06; shotDir.z+=(Math.random()-.5)*.08;
      fireJetBullet(muzzPos, shotDir, 18);
    }

    // Missile launch when player sighted
    if (jet.phase==='strafe' && dist<120 && Math.random()<.002) {
      launchMissile(jet.mesh.position.clone(), camera.position.clone());
    }

    // Boundary check
    const b=MAP_SIZE*.7;
    jet.mesh.position.x=Math.max(-b,Math.min(b,jet.mesh.position.x));
    jet.mesh.position.z=Math.max(-b,Math.min(b,jet.mesh.position.z));

    // Hit flash
    if (jet.hitTimer>0) {
      jet.mesh.traverse(c=>{ if(c.isMesh&&c.material.color) c.material.emissive&&(c.material.emissive.set(0xff2200)); });
    } else {
      jet.mesh.traverse(c=>{ if(c.isMesh&&c.material.emissive) c.material.emissive.set(0x000000); });
    }
  });

  updateJetBullets(dt);
  updateBombs(dt);
  updateMissiles(dt);
  updateStinger(dt);
}

function fireJetBullet(pos, dir, dmg) {
  const b=getBulletFromPool();
  if (!b) return;
  b.active=true; b.mesh.visible=true;
  b.mesh.position.copy(pos);
  b.vel.copy(dir).multiplyScalar(60);
  b.life=3; b.damage=dmg; b.isEnemy=true;
  b.mesh.material.color.set(0xffaa00);
}

function updateJetBullets(dt) {
  // handled in main bullet loop
}

function dropBomb(pos) {
  const geo=new THREE.CylinderGeometry(.12,.08,.5,7);
  const mat=new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:.5,metalness:.6});
  const bomb=new THREE.Mesh(geo,mat);
  bomb.position.copy(pos);
  const fins=new THREE.Group();
  for (let f=0;f<4;f++) {
    const fin=new THREE.Mesh(new THREE.BoxGeometry(.18,.005,.12),mat);
    fin.position.set(Math.cos(f*Math.PI/2)*.1,-.2,Math.sin(f*Math.PI/2)*.1);
    fin.rotation.y=f*Math.PI/2; fins.add(fin);
  }
  fins.position.y=-.15; bomb.add(fins);
  scene.add(bomb);
  bombObjects.push({mesh:bomb, vel:new THREE.Vector3((Math.random()-.5)*5,-2,(Math.random()-.5)*5), life:10});
  showNotif('⚠ BOMBS AWAY!');
}

function updateBombs(dt) {
  for (let i=bombObjects.length-1;i>=0;i--) {
    const b=bombObjects[i];
    b.mesh.position.addScaledVector(b.vel,dt);
    b.vel.y-=12*dt;
    b.mesh.rotation.z+=2*dt;
    const th=getTerrainHeight(b.mesh.position.x,b.mesh.position.z);
    b.life-=dt;
    if (b.mesh.position.y<=th+.5||b.life<=0) {
      spawnExplosionEffect(b.mesh.position.clone(),25);
      enemies.forEach(e=>{
        if (!e.alive) return;
        const d=b.mesh.position.distanceTo(e.mesh.position);
        if (d<12) { e.health-=Math.floor(120*(1-d/12)); if(e.health<=0)killEnemy(e); else updateEnemyHealthBar(e); }
      });
      const dp=b.mesh.position.distanceTo(camera.position);
      if (dp<12) applyPlayerDamage(Math.floor(80*(1-dp/12)));
      scene.remove(b.mesh); bombObjects.splice(i,1);
    }
  }
}

function launchMissile(from, to) {
  const geo=new THREE.CylinderGeometry(.06,.06,.5,5);
  const mat=new THREE.MeshStandardMaterial({color:0x888888,roughness:.3,metalness:.8});
  const mesh=new THREE.Mesh(geo,mat);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.06,.25,5),mat);
  nose.position.y=.35; mesh.add(nose);
  mesh.position.copy(from);
  const dir=new THREE.Vector3().subVectors(to,from).normalize();
  const pl=new THREE.PointLight(0xff6600,3,5); pl.position.set(0,-.3,0); mesh.add(pl);
  scene.add(mesh);
  missileObjects.push({mesh,dir:dir.clone(),vel:dir.clone().multiplyScalar(20),life:5,homing:true,target:'player'});
  showNotif('⚠ MISSILE INCOMING!');
}

function updateMissiles(dt) {
  for (let i=missileObjects.length-1;i>=0;i--) {
    const m=missileObjects[i];
    if (m.homing) {
      const toTarget=new THREE.Vector3().subVectors(camera.position,m.mesh.position).normalize();
      m.vel.lerp(toTarget.multiplyScalar(35),dt*1.5);
    }
    m.mesh.position.addScaledVector(m.vel.clone().normalize(),Math.min(m.vel.length(),35)*dt);
    m.mesh.lookAt(m.mesh.position.clone().add(m.vel));
    m.life-=dt;
    const dp=m.mesh.position.distanceTo(camera.position);
    if (dp<2) {
      applyPlayerDamage(45);
      spawnExplosionEffect(m.mesh.position.clone(),8);
      scene.remove(m.mesh); missileObjects.splice(i,1); continue;
    }
    const th=getTerrainHeight(m.mesh.position.x,m.mesh.position.z);
    if (m.mesh.position.y<th+.3||m.life<=0) {
      spawnExplosionEffect(m.mesh.position.clone(),8);
      scene.remove(m.mesh); missileObjects.splice(i,1);
    }
  }
}

/* ================================================================
   SECTION 9: STINGER LOCK-ON SYSTEM
================================================================ */
let stingerLockProgress = 0;
const STINGER_LOCK_TIME  = 2.5;

function updateStinger(dt) {
  if (STATE.currentWeapon!==3) {
    stingerLockProgress=0;
    document.getElementById('stingerReticle').className='stinger-reticle';
    document.getElementById('stingerStatus').className='stinger-status';
    STATE.stingerLocked=false; STATE.stingerTarget=null;
    return;
  }

  // Find jet in crosshair
  let closestJet=null, closestAngle=Infinity;
  const camDir=new THREE.Vector3(); camera.getWorldDirection(camDir);

  jets.forEach(jet=>{
    if (!jet.alive) return;
    const toJet=new THREE.Vector3().subVectors(jet.mesh.position,camera.position).normalize();
    const angle=camDir.angleTo(toJet);
    if (angle<.2&&angle<closestAngle) { closestAngle=angle; closestJet=jet; }
  });

  const reticle=document.getElementById('stingerReticle');
  const status=document.getElementById('stingerStatus');

  if (closestJet) {
    stingerLockProgress=Math.min(1,stingerLockProgress+dt/STINGER_LOCK_TIME);
    if (stingerLockProgress<1) {
      reticle.className='stinger-reticle locking';
      status.className='stinger-status visible';
      status.textContent=`LOCKING... ${Math.round(stingerLockProgress*100)}%`;
    } else {
      reticle.className='stinger-reticle locked';
      status.className='stinger-status visible';
      status.textContent='TARGET LOCKED — FIRE!';
      STATE.stingerLocked=true; STATE.stingerTarget=closestJet;
    }
  } else {
    stingerLockProgress=Math.max(0,stingerLockProgress-.5*dt);
    reticle.className='stinger-reticle'+(stingerLockProgress>.1?' locking':'');
    status.className=stingerLockProgress>.1?'stinger-status visible':'stinger-status';
    status.textContent='SEEKING TARGET';
    if (stingerLockProgress<.05) { STATE.stingerLocked=false; STATE.stingerTarget=null; }
  }
}

function fireStinger() {
  if (!STATE.stingerLocked||!STATE.stingerTarget) { showNotif('NO LOCK — AIM AT AIRCRAFT!'); return; }
  if (STATE.ammo<=0) { showNotif('NO ROCKETS!'); return; }
  STATE.ammo--; updateAmmoUI();
  const target=STATE.stingerTarget;

  // Visual rocket trail
  const rMesh=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.4,5),new THREE.MeshStandardMaterial({color:0x888888,roughness:.3,metalness:.8}));
  rMesh.position.copy(camera.position);
  const pLight=new THREE.PointLight(0xff6600,5,8); pLight.position.copy(camera.position);
  scene.add(rMesh); scene.add(pLight);

  // Animate rocket to target
  let prog=0;
  const startPos=camera.position.clone();
  const rInterval=setInterval(()=>{
    prog+=.03;
    if (!target.alive||prog>=1) {
      clearInterval(rInterval);
      scene.remove(rMesh); scene.remove(pLight);
      if (target.alive) {
        // Direct hit
        target.health-=250;
        target.hitTimer=.3;
        showHitMarker(target.health<=0);
        if (target.health<=0) {
          destroyJet(target);
        } else {
          updateJetHealthBar(target);
          showNotif('HIT! JET DAMAGED!');
        }
      }
      spawnExplosionEffect(rMesh.position.clone(),15);
      return;
    }
    const pos=new THREE.Vector3().lerpVectors(startPos, target.mesh.position.clone().add(new THREE.Vector3(0,1,0)), prog);
    // Slight wobble
    pos.x+=(Math.random()-.5)*.5;
    pos.y+=(Math.random()-.5)*.5;
    rMesh.position.copy(pos); pLight.position.copy(pos);
    rMesh.lookAt(target.mesh.position);
  }, 16);

  STATE.stingerLocked=false; STATE.stingerTarget=null; stingerLockProgress=0;
  if (STATE.ammo===0&&STATE.reserveAmmo>0) startReload();
}

function destroyJet(jet) {
  jet.alive=false;
  STATE.score+=jet.score*STATE.wave;
  STATE.jetKills++;
  showNotif(`★ JET DESTROYED! +${jet.score*STATE.wave} pts`);
  addKillFeedEntry('ENEMY FIGHTER JET',true,true);
  updateScoreUI();

  // Big explosion
  for (let ex=0;ex<3;ex++) {
    setTimeout(()=>{
      const pos=jet.mesh.position.clone().add(new THREE.Vector3((Math.random()-.5)*4,Math.random()*2,(Math.random()-.5)*4));
      spawnExplosionEffect(pos,20);
    },ex*200);
  }

  // Debris crash
  setTimeout(()=>{
    scene.remove(jet.mesh);
    // Drop burning wreckage
    const wMat=new THREE.MeshStandardMaterial({color:0x4a3a2a,roughness:.9,emissive:0x441100,emissiveIntensity:.5});
    const wreck=new THREE.Mesh(new THREE.BoxGeometry(3,.4,1.5),wMat);
    wreck.position.copy(jet.mesh.position);
    scene.add(wreck);
    // Smoke effect
    for (let s=0;s<8;s++) {
      const sp=new THREE.Mesh(new THREE.SphereGeometry(.3+Math.random()*.5,5,4),new THREE.MeshBasicMaterial({color:0x222222,transparent:true,opacity:.6}));
      sp.position.copy(jet.mesh.position).add(new THREE.Vector3((Math.random()-.5)*6,Math.random()*5,(Math.random()-.5)*6));
      scene.add(sp);
      particles.push({mesh:sp,vel:new THREE.Vector3((Math.random()-.5)*2,3+Math.random()*2,(Math.random()-.5)*2),life:4,maxLife:4});
    }
    setTimeout(()=>scene.remove(wreck),8000);
  },1000);

  document.getElementById('sbJets').textContent=STATE.jetKills;
}

function updateJetHealthBar(jet) {
  // Jet health is visual only for now
}

/* ================================================================
   SECTION 10: ENEMY SYSTEM
================================================================ */
const enemies = [];
const grenadeObjects = [];

function spawnWave(w) {
  const count = Math.min(5+w*2, 20);
  for (let i=0;i<count;i++) spawnEnemy(selectEnemyType(w,i,count));

  // Spawn jets on wave 3+
  if (w>=3) {
    const jetCount = Math.min(1+Math.floor(w/3), 3);
    for (let j=0;j<jetCount;j++) setTimeout(()=>spawnJet(w), j*8000);
  }

  showWaveAnnounce(w);
  showNotif(`WAVE ${w} — ${count} GROUND TROOPS + ${w>=3?Math.min(1+Math.floor(w/3),3)+' AIRCRAFT':'NO AIR THREAT'}`);
}

function selectEnemyType(wave, index, total) {
  if (wave>=5&&index===0) return 4; // commander
  if (wave>=3&&Math.random()<.15) return 3; // sniper
  if (wave>=2&&Math.random()<.2) return 2;  // heavy
  if (Math.random()<.3) return 5;           // sub gun
  if (Math.random()<.4) return 1;           // sergeant
  return 0;                                  // rifleman
}

function spawnEnemy(typeIndex) {
  const type=ENEMY_TYPES[typeIndex];
  const angle=Math.random()*Math.PI*2, dist=25+Math.random()*30;
  let ex=Math.cos(angle)*dist, ez=Math.sin(angle)*dist;
  ex=Math.max(-MAP_SIZE*.45,Math.min(MAP_SIZE*.45,ex));
  ez=Math.max(-MAP_SIZE*.45,Math.min(MAP_SIZE*.45,ez));
  const ey=getTerrainHeight(ex,ez);

  const g=buildSoldierMesh(type);
  g.position.set(ex,ey,ez);
  scene.add(g);

  enemies.push({
    mesh:g, typeIndex, type,
    health:(type.health+(STATE.wave-1)*10), maxHealth:(type.health+(STATE.wave-1)*10),
    alive:true,
    shootTimer:1.5+Math.random()*2.5,
    state:'patrol',
    patrolAngle:Math.random()*Math.PI*2, patrolTimer:2+Math.random()*3,
    hitTimer:0, bobTime:Math.random()*Math.PI*2,
    coverTimer:0, inCover:false, coverPos:null,
    squadIndex:Math.floor(Math.random()*5),
    reloadTimer:0, isReloading:false,
    throwGrenadeTimer:10+Math.random()*15,
    crouching:false, crouchTimer:0,
    healthBar:buildEnemyHealthBar(g),
  });
}

function buildEnemyHealthBar(group) {
  const bg=new THREE.Mesh(new THREE.PlaneGeometry(1.0,.1),new THREE.MeshBasicMaterial({color:0x330000,transparent:true,opacity:.8}));
  bg.position.set(0,2.8,0); group.add(bg);
  const fg=new THREE.Mesh(new THREE.PlaneGeometry(1.0,.1),new THREE.MeshBasicMaterial({color:0x44ff22,transparent:true,opacity:.9}));
  fg.position.set(0,2.8,.001); group.add(fg);
  return {bg,fg,fgMat:fg.material};
}

function updateEnemyHealthBar(e) {
  const ratio=Math.max(0,e.health/e.maxHealth);
  e.healthBar.fg.scale.x=ratio;
  e.healthBar.fg.position.x=(ratio-1)*.5;
  e.healthBar.fgMat.color.set(ratio>.5?0x44ff22:ratio>.25?0xffaa22:0xff2222);
  e.healthBar.bg.lookAt(camera.position);
  e.healthBar.fg.lookAt(camera.position);
}

/* ================================================================
   SECTION 11: BULLET POOL
================================================================ */
const bulletPool = [];
const POOL_SIZE  = 120;
const particles  = [];

function initBulletPool() {
  const geo=new THREE.SphereGeometry(.025,4,3);
  for (let i=0;i<POOL_SIZE;i++) {
    const mat=new THREE.MeshBasicMaterial({color:0xffcc44});
    const mesh=new THREE.Mesh(geo,mat);
    mesh.visible=false; scene.add(mesh);
    bulletPool.push({mesh,active:false,vel:new THREE.Vector3(),life:0,damage:0,isEnemy:false});
  }
}

function getBulletFromPool() {
  for (const b of bulletPool) if (!b.active) return b;
  return null;
}

function fireBullet(fromPos, dir, damage, isEnemy, speed) {
  const b=getBulletFromPool(); if (!b) return;
  b.active=true; b.mesh.visible=true;
  b.mesh.position.copy(fromPos);
  b.vel.copy(dir).multiplyScalar(speed||BULLET_SPEED);
  b.life=4; b.damage=damage; b.isEnemy=isEnemy;
  b.mesh.material.color.set(isEnemy?0x00ffcc:0xffcc44);
}

function recycleBullet(b) { b.active=false; b.mesh.visible=false; }

function updateBullets(dt) {
  for (const b of bulletPool) {
    if (!b.active) continue;
    b.mesh.position.addScaledVector(b.vel,dt);
    b.life-=dt;
    if (b.life<=0) { recycleBullet(b); continue; }

    if (b.isEnemy) {
      const d=b.mesh.position.distanceTo(camera.position);
      if (d<.7) { applyPlayerDamage(b.damage); recycleBullet(b); spawnImpactParticles(b.mesh.position.clone(),0x00ffcc); }
    } else {
      let hit=false;
      for (const e of enemies) {
        if (!e.alive) continue;
        const d=b.mesh.position.distanceTo(e.mesh.position);
        if (d<1.0*e.type.scale) {
          e.health-=b.damage; STATE.shotsHit++;
          showHitMarker(e.health<=0); updateEnemyHealthBar(e); e.hitTimer=.15;
          if (e.health<=0) killEnemy(e); hit=true;
          spawnImpactParticles(b.mesh.position.clone(),0xff6600); break;
        }
      }
      // Check jet hits
      if (!hit) {
        for (const jet of jets) {
          if (!jet.alive) continue;
          const d=b.mesh.position.distanceTo(jet.mesh.position);
          if (d<jet.radius) {
            jet.health-=b.damage*.5; jet.hitTimer=.1;
            showHitMarker(jet.health<=0);
            if (jet.health<=0) destroyJet(jet);
            hit=true; spawnImpactParticles(b.mesh.position.clone(),0xffaa00); break;
          }
        }
      }
      if (hit) { recycleBullet(b); continue; }
      const th=getTerrainHeight(b.mesh.position.x,b.mesh.position.z);
      if (b.mesh.position.y<=th+.1) { spawnImpactParticles(b.mesh.position.clone(),0x8a6a3a); recycleBullet(b); }
    }
  }
}

/* ================================================================
   SECTION 12: IMPACT PARTICLES
================================================================ */
function spawnImpactParticles(pos, color) {
  for (let i=0;i<8;i++) {
    const geo=new THREE.SphereGeometry(.03+Math.random()*.04,3,3);
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:1});
    const mesh=new THREE.Mesh(geo,mat); mesh.position.copy(pos); scene.add(mesh);
    particles.push({mesh,vel:new THREE.Vector3((Math.random()-.5)*6,Math.random()*6,(Math.random()-.5)*6),life:.5+Math.random()*.4,maxLife:.5+Math.random()*.4});
  }
}

function updateParticles(dt) {
  for (let i=particles.length-1;i>=0;i--) {
    const p=particles[i];
    p.mesh.position.addScaledVector(p.vel,dt);
    p.vel.y-=12*dt; p.life-=dt;
    p.mesh.material.opacity=p.life/p.maxLife;
    if (p.life<=0) {
      scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); particles.splice(i,1);
    }
  }
}

function spawnExplosionEffect(pos, radius) {
  const fl=new THREE.PointLight(0xff8830,30,radius||12); fl.position.copy(pos); scene.add(fl);
  setTimeout(()=>scene.remove(fl),150);
  for (let i=0;i<40;i++) {
    const col=[0xff4400,0xff8800,0xffcc00,0xcc2200,0xff6600][Math.floor(Math.random()*5)];
    const geo=new THREE.SphereGeometry(.1+Math.random()*.2,4,3);
    const mat=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:1});
    const mesh=new THREE.Mesh(geo,mat); mesh.position.copy(pos); scene.add(mesh);
    const spd=6+Math.random()*14;
    const dir=new THREE.Vector3(Math.random()-.5,Math.random()*.9,Math.random()-.5).normalize();
    particles.push({mesh,vel:dir.multiplyScalar(spd),life:.9+Math.random()*.7,maxLife:.9+Math.random()*.7});
  }
  // Smoke
  for (let s=0;s<6;s++) {
    const sm=new THREE.Mesh(new THREE.SphereGeometry(.4+Math.random()*.6,5,4),new THREE.MeshBasicMaterial({color:0x333333,transparent:true,opacity:.5}));
    sm.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*2,Math.random()*2,(Math.random()-.5)*2));
    scene.add(sm);
    particles.push({mesh:sm,vel:new THREE.Vector3((Math.random()-.5)*.5,2+Math.random()*2,(Math.random()-.5)*.5),life:2.5+Math.random()*1.5,maxLife:2.5});
  }
}

/* ================================================================
   SECTION 13: GRENADE SYSTEM
================================================================ */
function throwGrenade() {
  if (STATE.grenades<=0) return;
  STATE.grenades--; updateGrenadeUI();
  const dir=new THREE.Vector3(); camera.getWorldDirection(dir);
  const pos=camera.position.clone().add(dir.clone().multiplyScalar(.8)); pos.y+=.2;
  const geo=new THREE.SphereGeometry(.08,7,6);
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x3a4a2a,roughness:.7,metalness:.65}));
  mesh.position.copy(pos); mesh.castShadow=true; scene.add(mesh);
  grenadeObjects.push({mesh,vel:dir.clone().multiplyScalar(14).add(new THREE.Vector3(0,6,0)),life:4,bounces:0});
}

function updateGrenades(dt) {
  for (let i=grenadeObjects.length-1;i>=0;i--) {
    const g=grenadeObjects[i];
    g.mesh.position.addScaledVector(g.vel,dt);
    g.vel.y-=14*dt; g.mesh.rotation.x+=5*dt; g.mesh.rotation.z+=3*dt;
    const th=getTerrainHeight(g.mesh.position.x,g.mesh.position.z);
    if (g.mesh.position.y<th+.1) { g.mesh.position.y=th+.1; g.vel.y=-g.vel.y*.4; g.vel.x*=.7; g.vel.z*=.7; g.bounces++; }
    g.life-=dt;
    if (g.life<=0||g.bounces>5) {
      explodeGrenade(g); scene.remove(g.mesh); grenadeObjects.splice(i,1);
    }
  }
}

function explodeGrenade(g) {
  const pos=g.mesh.position.clone(); const radius=8;
  spawnExplosionEffect(pos,radius);
  enemies.forEach(e=>{
    if (!e.alive) return;
    const d=pos.distanceTo(e.mesh.position);
    if (d<radius) { e.health-=Math.floor(80*(1-d/radius)); if(e.health<=0)killEnemy(e); else updateEnemyHealthBar(e); }
  });
  const dp=pos.distanceTo(camera.position);
  if (dp<radius) applyPlayerDamage(Math.floor(60*(1-dp/radius)));
}

/* ================================================================
   SECTION 14: ENEMY AI
================================================================ */
function updateEnemies(dt, t) {
  enemies.forEach(e=>{
    if (!e.alive) return;
    e.bobTime+=dt*2.5;
    updateEnemyHealthBar(e);
    const toPlayer=new THREE.Vector3().subVectors(camera.position,e.mesh.position);
    const dist=toPlayer.length(); toPlayer.normalize();

    if (dist<50&&e.state!=='chase'&&e.state!=='shoot') e.state='chase';

    // Cover seeking
    e.coverTimer-=dt;
    if (e.coverTimer<0&&e.state==='chase'&&Math.random()<.01&&dist<30) {
      e.inCover=true; e.crouching=true;
      e.coverTimer=3+Math.random()*4;
      e.state='shoot';
    }
    if (e.coverTimer<0&&e.inCover&&Math.random()<.015) { e.inCover=false; e.crouching=false; e.state='chase'; }

    // State machine
    if (e.state==='patrol') {
      e.patrolTimer-=dt;
      if (e.patrolTimer<=0) { e.patrolAngle+=(Math.random()-.5)*1.5; e.patrolTimer=2+Math.random()*3; }
      e.mesh.position.x=Math.max(-MAP_SIZE*.45,Math.min(MAP_SIZE*.45,e.mesh.position.x+Math.cos(e.patrolAngle)*e.type.speed*.4*dt));
      e.mesh.position.z=Math.max(-MAP_SIZE*.45,Math.min(MAP_SIZE*.45,e.mesh.position.z+Math.sin(e.patrolAngle)*e.type.speed*.4*dt));
    }

    if (e.state==='chase') {
      if (dist>3.5) {
        const spd=e.type.speed*(e.hitTimer>0?.4:1);
        e.mesh.position.addScaledVector(toPlayer,spd*dt);
        e.mesh.position.x=Math.max(-MAP_SIZE*.45,Math.min(MAP_SIZE*.45,e.mesh.position.x));
        e.mesh.position.z=Math.max(-MAP_SIZE*.45,Math.min(MAP_SIZE*.45,e.mesh.position.z));
        // Zigzag evasion
        const zigzag=new THREE.Vector3(-toPlayer.z,0,toPlayer.x).multiplyScalar(Math.sin(t*8+e.bobTime)*.8);
        e.mesh.position.add(zigzag.multiplyScalar(dt));
      } else { e.state='shoot'; }
    }

    if (e.state==='shoot') { if (dist>8&&!e.inCover) e.state='chase'; }

    // Face player
    e.mesh.lookAt(new THREE.Vector3(camera.position.x,e.mesh.position.y,camera.position.z));

    // Crouch animation
    if (e.crouching) { e.mesh.scale.y=Math.max(.7,e.mesh.scale.y-.5*dt); }
    else { e.mesh.scale.y=Math.min(1,e.mesh.scale.y+.5*dt); }

    // Terrain snap
    const th=getTerrainHeight(e.mesh.position.x,e.mesh.position.z);
    e.mesh.position.y=th+Math.sin(e.bobTime)*.04;

    // Shoot
    e.shootTimer-=dt;
    if (e.shootTimer<=0&&dist<40) {
      e.shootTimer=1.5+Math.random()*2-(STATE.wave*.08);
      const from=e.mesh.position.clone().add(new THREE.Vector3(0,1.5,0));
      const sd=new THREE.Vector3().subVectors(camera.position,from).normalize();
      sd.x+=(Math.random()-.5)*.16; sd.y+=(Math.random()-.5)*.10; sd.z+=(Math.random()-.5)*.16;
      sd.normalize();
      fireBullet(from,sd,e.type.damage,true,ENEMY_BULLET_SPEED);
      // Muzzle flash on enemy
      e.mesh.traverse(c=>{ if(c.name==='muzzleFlash') { c.material.opacity=1; setTimeout(()=>{if(c.material)c.material.opacity=0;},60); } });
    }

    // Grenade throw
    e.throwGrenadeTimer-=dt;
    if (e.throwGrenadeTimer<=0&&dist<25&&dist>8) {
      e.throwGrenadeTimer=12+Math.random()*15;
      const gpos=e.mesh.position.clone().add(new THREE.Vector3(0,1.5,0));
      const gdir=new THREE.Vector3().subVectors(camera.position,gpos).normalize().add(new THREE.Vector3(0,.4,0)).normalize();
      const geo2=new THREE.SphereGeometry(.08,7,6);
      const gm=new THREE.Mesh(geo2,new THREE.MeshStandardMaterial({color:0x3a4a2a,roughness:.7,metalness:.65}));
      gm.position.copy(gpos); scene.add(gm);
      grenadeObjects.push({mesh:gm,vel:gdir.multiplyScalar(10),life:3.5+Math.random()*.5,bounces:0});
      showNotif('⚠ ENEMY GRENADE!');
    }

    // Melee
    if (dist<1.8) applyPlayerDamage(e.type.damage*.4*dt);

    // Hit flash
    if (e.hitTimer>0) {
      e.hitTimer-=dt;
      e.mesh.traverse(c=>{if(c.isMesh&&c.material.emissive)c.material.emissive.set(0xff2200);c.material&&(c.material.emissiveIntensity=.6);});
    } else {
      e.mesh.traverse(c=>{if(c.isMesh&&c.material.emissive){c.material.emissive.set(0x000000);c.material.emissiveIntensity=0;}});
    }
  });
}

/* ================================================================
   SECTION 15: KILL ENEMY
================================================================ */
function killEnemy(e) {
  e.alive=false;
  STATE.score+=e.type.score*STATE.wave;
  STATE.kills++;
  spawnExplosionEffect(e.mesh.position.clone().add(new THREE.Vector3(0,1,0)),5);

  // Ragdoll
  e.mesh.rotation.x=Math.PI/2.2;
  e.mesh.position.y-=.3;

  setTimeout(()=>scene.remove(e.mesh),4000);
  updateScoreUI(); addKillFeedEntry(e.type.name, e.typeIndex===4, false);
  showNotif(`+${e.type.score*STATE.wave} pts — ${e.type.name} KIA`);

  const alive=enemies.filter(x=>x.alive);
  const jetsAlive=jets.filter(x=>x.alive);
  if (alive.length===0&&jetsAlive.length===0) {
    setTimeout(()=>{ STATE.wave++; enemies.length=0; jets.length=0; spawnWave(STATE.wave); },3500);
  }
}

/* ================================================================
   SECTION 16: PLAYER DAMAGE
================================================================ */
function applyPlayerDamage(dmg) {
  if (STATE.armor>0) { const a=Math.min(STATE.armor,dmg*.65); STATE.armor-=a; dmg-=a; }
  STATE.health=Math.max(0,STATE.health-dmg);
  updateHealthUI(); flashDamage();
  if (STATE.health<=0) triggerDeath();
}

function flashDamage() {
  const el=document.getElementById('screenDamage'); el.style.opacity='1';
  document.getElementById('hud').classList.add('shake');
  setTimeout(()=>{ el.style.opacity='0'; document.getElementById('hud').classList.remove('shake'); },200);
}

function triggerDeath() {
  STATE.phase='gameover'; STATE.deaths++;
  document.exitPointerLock(); showGameover();
}

/* ================================================================
   SECTION 17: INPUT
================================================================ */
const keys={};
let yaw=0, pitch=0, mouseDown=false, rightMouseDown=false;

function setupInput() {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', e=>{ keys[e.code]=false; });
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', e=>{ if(e.button===0)mouseDown=false; if(e.button===2){rightMouseDown=false;exitADS();} });
  document.addEventListener('contextmenu', e=>e.preventDefault());
  document.addEventListener('pointerlockchange', onPLChange);
}

function onKeyDown(e) {
  keys[e.code]=true;
  if (STATE.phase!=='playing') return;
  switch(e.code) {
    case 'KeyR': if(!STATE.isReloading)startReload(); break;
    case 'KeyG': throwGrenade(); break;
    case 'Digit1': switchWeapon(0); break;
    case 'Digit2': switchWeapon(1); break;
    case 'Digit3': switchWeapon(2); break;
    case 'Digit4': switchWeapon(3); break;
    case 'Escape': togglePause(); break;
    case 'Tab': e.preventDefault(); toggleScoreboard(true); break;
  }
}
document.addEventListener('keyup',e=>{ if(e.code==='Tab')toggleScoreboard(false); });

function onMouseMove(e) {
  if (STATE.phase!=='playing') return;
  const s=STATE.isADS?.001:.002;
  yaw-=e.movementX*s; pitch-=e.movementY*s;
  pitch=Math.max(-1.35,Math.min(1.35,pitch));
}

function onMouseDown(e) {
  if (e.button===0){ mouseDown=true; tryShoot(); }
  if (e.button===2){ rightMouseDown=true; enterADS(); }
}

function onPLChange() { if(!document.pointerLockElement&&STATE.phase==='playing')togglePause(); }
function lockPointer() { document.getElementById('gameCanvas').requestPointerLock(); }

/* ================================================================
   SECTION 18: SHOOTING
================================================================ */
function tryShoot() {
  if (STATE.phase!=='playing'||STATE.isReloading) return;
  if (STATE.ammo<=0) { if(STATE.reserveAmmo>0)startReload(); showNoAmmoWarn(); return; }
  if (STATE.shootCooldown>0) return;
  if (STATE.currentWeapon===3) { fireStinger(); return; }
  const w=WEAPONS[STATE.currentWeapon];
  STATE.ammo--; STATE.shotsFired++; STATE.shootCooldown=w.fireRate;
  updateAmmoUI();

  const dir=new THREE.Vector3(); camera.getWorldDirection(dir);
  const sp=w.spread*(STATE.isADS?.25:1)*(STATE.isSprinting?2.5:1);
  dir.x+=(Math.random()-.5)*sp; dir.y+=(Math.random()-.5)*sp; dir.z+=(Math.random()-.5)*sp;
  dir.normalize();
  fireBullet(camera.position.clone().add(dir.clone().multiplyScalar(.8)),dir,w.damage,false,BULLET_SPEED);

  // Raycast
  const ray=new THREE.Raycaster(camera.position.clone(),dir);
  const hits=[];
  enemies.forEach(e=>{ if(!e.alive)return; const ia=ray.intersectObject(e.mesh,true); if(ia.length&&ia[0].distance<w.range)hits.push({enemy:e,dist:ia[0].distance}); });
  // Jet raycast
  jets.forEach(jet=>{ if(!jet.alive)return; const ia=ray.intersectObject(jet.mesh,true); if(ia.length&&ia[0].distance<w.range)hits.push({jet,dist:ia[0].distance}); });
  if (hits.length) {
    hits.sort((a,b)=>a.dist-b.dist);
    const h=hits[0];
    if (h.enemy) {
      h.enemy.health-=w.damage; STATE.shotsHit++;
      showHitMarker(h.enemy.health<=0); updateEnemyHealthBar(h.enemy); h.enemy.hitTimer=.15; h.enemy.state='chase';
      if (h.enemy.health<=0) killEnemy(h.enemy);
    } else if (h.jet) {
      h.jet.health-=w.damage; STATE.shotsHit++; h.jet.hitTimer=.1;
      showHitMarker(h.jet.health<=0);
      if (h.jet.health<=0) destroyJet(h.jet);
    }
  }

  doMuzzleFlash();
  weaponGroup.position.z+=.022; weaponGroup.rotation.x-=.038;
  setTimeout(()=>{ weaponGroup.position.z-=.022; weaponGroup.rotation.x+=.038; },80);
  document.getElementById('crosshair').classList.add('spread');
  setTimeout(()=>document.getElementById('crosshair').classList.remove('spread'),140);
  if (STATE.ammo===0&&STATE.reserveAmmo>0) startReload();
  if (STATE.ammo<=5&&STATE.ammo>0) showLowAmmoWarn();
}

function doMuzzleFlash() {
  if (!muzzleFlashLight||!muzzleFlashMesh) return;
  muzzleFlashLight.intensity=3.8+Math.random();
  muzzleFlashMesh.material.opacity=.85;
  setTimeout(()=>{ muzzleFlashLight.intensity=0; muzzleFlashMesh.material.opacity=0; },50);
}

/* ================================================================
   SECTION 19: RELOAD
================================================================ */
function startReload() {
  if (STATE.isReloading||STATE.reserveAmmo<=0) return;
  STATE.isReloading=true;
  STATE.reloadTimer=WEAPONS[STATE.currentWeapon].reloadTime;
  document.getElementById('reloadMsg').classList.add('active');
  weaponGroup.rotation.x=.5;
  setTimeout(()=>{ if(weaponGroup)weaponGroup.rotation.x=0; },WEAPONS[STATE.currentWeapon].reloadTime*1000*.5);
}

function finishReload() {
  const needed=WEAPONS[STATE.currentWeapon].ammo-STATE.ammo;
  const take=Math.min(needed,STATE.reserveAmmo);
  STATE.ammo+=take; STATE.reserveAmmo-=take; STATE.isReloading=false;
  document.getElementById('reloadMsg').classList.remove('active');
  updateAmmoUI(); hideLowAmmoWarn();
}

/* ================================================================
   SECTION 20: ADS
================================================================ */
const ADS_FOV=40, NORMAL_FOV=72;

function enterADS() { STATE.isADS=true; document.getElementById('crosshair').classList.add('ads'); if(STATE.currentWeapon===1)document.getElementById('scopeOverlay').classList.remove('hidden'); }
function exitADS()  { STATE.isADS=false; document.getElementById('crosshair').classList.remove('ads'); document.getElementById('scopeOverlay').classList.add('hidden'); }

function updateADS(dt) {
  const tFOV=STATE.isADS?ADS_FOV:NORMAL_FOV;
  camera.fov+=(tFOV-camera.fov)*Math.min(1,8*dt);
  camera.updateProjectionMatrix();
  if (STATE.currentWeapon!==3) {
    const tx=STATE.isADS?.0:.19, ty=STATE.isADS?-.08:-.17, tz=STATE.isADS?-.22:-.38;
    weaponGroup.position.x+=(tx-weaponGroup.position.x)*Math.min(1,10*dt);
    weaponGroup.position.y+=(ty-weaponGroup.position.y)*Math.min(1,10*dt);
    weaponGroup.position.z+=(tz-weaponGroup.position.z)*Math.min(1,10*dt);
  }
}

/* ================================================================
   SECTION 21: WEAPON SWITCH
================================================================ */
function switchWeapon(idx) {
  if (idx===STATE.currentWeapon) return;
  STATE.currentWeapon=idx;
  const w=WEAPONS[idx];
  STATE.ammo=w.ammo; STATE.reserveAmmo=w.reserve; STATE.isReloading=false;
  document.getElementById('reloadMsg').classList.remove('active');
  document.getElementById('hudWeaponName').textContent=w.name;
  camera.remove(weaponGroup); buildWeaponModel();
  ['ws1','ws2','ws3','ws4'].forEach((id,i)=>{ document.getElementById(id).className='wsw-item'+(i===idx?' active':''); });
  updateAmmoUI();
  if (idx===3) { document.getElementById('stingerReticle').className='stinger-reticle'; document.getElementById('stingerStatus').className='stinger-status visible'; document.getElementById('stingerStatus').textContent='SEEKING TARGET'; }
  STATE.isADS=false; exitADS();
}

/* ================================================================
   SECTION 22: PLAYER MOVEMENT
================================================================ */
function updatePlayer(dt) {
  if (STATE.phase!=='playing') return;
  const wantSprint=keys['ShiftLeft']&&keys['KeyW'];
  STATE.isSprinting=wantSprint&&STATE.stamina>0&&!STATE.isADS;
  STATE.isCrouching=keys['KeyC']||keys['ControlLeft'];
  if (STATE.isSprinting) STATE.stamina=Math.max(0,STATE.stamina-STATE.staminaDrain*dt);
  else STATE.stamina=Math.min(STATE.maxStamina,STATE.stamina+STATE.staminaRegen*dt);
  updateStaminaUI();

  const spd=STATE.isCrouching?CROUCH_SPEED:STATE.isSprinting?SPRINT_SPEED:MOVE_SPEED;
  const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const right  =new THREE.Vector3( Math.cos(yaw),0,-Math.sin(yaw));
  const move   =new THREE.Vector3();
  if (keys['KeyW']) move.add(forward); if (keys['KeyS']) move.sub(forward);
  if (keys['KeyA']) move.sub(right);   if (keys['KeyD']) move.add(right);
  let moving=false;
  if (move.length()>.01) { move.normalize(); moving=true; weaponBob+=dt*(STATE.isSprinting?16:9); }

  const newX=camera.position.x+move.x*spd*dt, newZ=camera.position.z+move.z*spd*dt;
  let blocked=false;
  for (const obj of jungleObjects) { const dx=newX-obj.x, dz=newZ-obj.z; if(Math.sqrt(dx*dx+dz*dz)<obj.radius+.45){blocked=true;break;} }
  if (!blocked) {
    camera.position.x=Math.max(-MAP_SIZE*.45,Math.min(MAP_SIZE*.45,newX));
    camera.position.z=Math.max(-MAP_SIZE*.45,Math.min(MAP_SIZE*.45,newZ));
  }

  if (keys['Space']&&STATE.isGrounded) { STATE.playerVelY=JUMP_FORCE; STATE.isGrounded=false; }
  STATE.playerVelY-=GRAVITY*dt; camera.position.y+=STATE.playerVelY*dt;
  const th=getTerrainHeight(camera.position.x,camera.position.z);
  const tH=th+(STATE.isCrouching?PLAYER_CROUCH_H:PLAYER_HEIGHT);
  if (camera.position.y<tH) { camera.position.y=tH; STATE.playerVelY=0; STATE.isGrounded=true; }

  camera.rotation.order='YXZ'; camera.rotation.y=yaw; camera.rotation.x=pitch;

  const bobY=Math.sin(weaponBob)*(moving?.045:.01), bobX=Math.cos(weaponBob*.5)*(moving?.025:.005);
  if (!STATE.isADS&&STATE.currentWeapon!==3) {
    weaponGroup.position.y=-.17+bobY; weaponGroup.position.x=.19+bobX;
  }
  weaponGroup.rotation.z=-pitch*.08;

  if (mouseDown&&WEAPONS[STATE.currentWeapon].auto) tryShoot();

  if (STATE.isReloading) { STATE.reloadTimer-=dt; if(STATE.reloadTimer<=0)finishReload(); }
  if (STATE.shootCooldown>0) STATE.shootCooldown-=dt;
  updateADS(dt);
}

/* ================================================================
   SECTION 23: MINIMAP
================================================================ */
const mmCtx=document.getElementById('minimapCanvas').getContext('2d');

function drawMinimap() {
  const size=150, half=size/2, scale=size/MAP_SIZE;
  mmCtx.clearRect(0,0,size,size);
  mmCtx.fillStyle='rgba(0,0,0,.78)'; mmCtx.beginPath(); mmCtx.arc(half,half,half,0,Math.PI*2); mmCtx.fill();
  mmCtx.save(); mmCtx.beginPath(); mmCtx.arc(half,half,half-1,0,Math.PI*2); mmCtx.clip();

  jungleObjects.slice(0,80).forEach(o=>{ mmCtx.fillStyle='rgba(30,70,15,.55)'; mmCtx.fillRect(half+o.x*scale-1,half+o.z*scale-1,2,2); });

  enemies.forEach(e=>{
    if (!e.alive) return;
    const mx=half+e.mesh.position.x*scale, mz=half+e.mesh.position.z*scale;
    mmCtx.fillStyle=e.typeIndex===4?'#ff00ff':'#ff3300';
    mmCtx.beginPath(); mmCtx.arc(mx,mz,3,0,Math.PI*2); mmCtx.fill();
  });

  jets.forEach(jet=>{
    if (!jet.alive) return;
    const mx=half+jet.mesh.position.x*scale, mz=half+jet.mesh.position.z*scale;
    mmCtx.fillStyle='#00aaff';
    mmCtx.beginPath(); mmCtx.moveTo(mx,mz-5); mmCtx.lineTo(mx-4,mz+3); mmCtx.lineTo(mx+4,mz+3); mmCtx.closePath(); mmCtx.fill();
  });

  const px=half+camera.position.x*scale, pz=half+camera.position.z*scale;
  mmCtx.fillStyle='#44ff88'; mmCtx.beginPath(); mmCtx.arc(px,pz,4,0,Math.PI*2); mmCtx.fill();
  mmCtx.strokeStyle='#44ff88'; mmCtx.lineWidth=2; mmCtx.beginPath();
  mmCtx.moveTo(px,pz); mmCtx.lineTo(px-Math.sin(yaw)*8,pz-Math.cos(yaw)*8); mmCtx.stroke();

  mmCtx.restore();
  const dirs=['N','NE','E','SE','S','SW','W','NW'];
  document.getElementById('compassDir').textContent=dirs[Math.round((yaw/(Math.PI*2))*8+8)%8];
}

/* ================================================================
   SECTION 24: ENVIRONMENT ANIMATION
================================================================ */
let envTime=0;
function updateEnvironment(dt) {
  envTime+=dt;
  pointLights.forEach(pl=>{ pl.time+=dt*(1.5+Math.random()*.5); pl.light.intensity=pl.base*(.7+.4*Math.sin(pl.time*3.1)*Math.cos(pl.time*1.7)); });
  if (sunLight) {
    sunLight.position.x=Math.cos(envTime*.01)*50; sunLight.position.y=40+Math.sin(envTime*.008)*20;
    const df=Math.max(.3,Math.sin(envTime*.008)+.6); sunLight.intensity=.8*df; ambientLight.intensity=1+df*.8;
  }
}

/* ================================================================
   SECTION 25: UI
================================================================ */
function updateHealthUI() {
  document.getElementById('healthBar').style.width=(STATE.health/STATE.maxHealth*100)+'%';
  document.getElementById('hudHealthNum').textContent=Math.ceil(STATE.health);
  document.getElementById('armorBar').style.width=(STATE.armor/STATE.maxArmor*100)+'%';
  document.getElementById('hudArmorNum').textContent=Math.ceil(STATE.armor);
}

function updateAmmoUI() {
  document.getElementById('hudAmmo').textContent=STATE.ammo;
  document.getElementById('hudReserve').textContent=STATE.reserveAmmo;
  const pip=document.getElementById('ammoIcons'); pip.innerHTML='';
  const maxA=WEAPONS[STATE.currentWeapon].ammo;
  for (let i=0;i<maxA&&i<60;i++) { const d=document.createElement('div'); d.className='ammo-pip'+(i>=STATE.ammo?' empty':''); pip.appendChild(d); }
}

function updateScoreUI() {
  document.getElementById('hudScore').textContent=String(STATE.score).padStart(6,'0');
  document.getElementById('hudWave').textContent=String(STATE.wave).padStart(2,'0');
  document.getElementById('sbScore').textContent=STATE.score;
  document.getElementById('sbKills').textContent=STATE.kills;
  document.getElementById('sbJets').textContent=STATE.jetKills;
  document.getElementById('sbWave').textContent=STATE.wave;
  const acc=STATE.shotsFired>0?Math.round(STATE.shotsHit/STATE.shotsFired*100):0;
  document.getElementById('sbAccuracy').textContent=acc+'%';
}

function updateStaminaUI() { document.getElementById('staminaBar').style.width=(STATE.stamina/STATE.maxStamina*100)+'%'; }
function updateGrenadeUI() { document.getElementById('grenadeCount').textContent=STATE.grenades; }
function updateTimer() {
  if (STATE.phase!=='playing') return;
  STATE.elapsedTime=(Date.now()-STATE.startTime)/1000;
  const m=Math.floor(STATE.elapsedTime/60), s=Math.floor(STATE.elapsedTime%60);
  const ts=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  document.getElementById('hudTimer').textContent=ts; document.getElementById('sbTime').textContent=ts;
}

function showNotif(msg) {
  const c=document.getElementById('notifCenter'), d=document.createElement('div');
  d.className='notif-item'; d.textContent=msg; c.appendChild(d); setTimeout(()=>d.remove(),2200);
}

function showHitMarker(isKill) {
  const el=document.getElementById('hitMarker'); el.classList.add('active');
  const col=isKill?'#ffcc00':'#ff4444';
  ['hm-tl','hm-tr','hm-bl','hm-br'].forEach(cls=>el.querySelector('.'+cls).style.background=col);
  setTimeout(()=>el.classList.remove('active'),isKill?400:180);
}

function showLowAmmoWarn()  { document.getElementById('lowAmmoWarn').classList.remove('hidden'); }
function hideLowAmmoWarn()  { document.getElementById('lowAmmoWarn').classList.add('hidden'); }
function showNoAmmoWarn()   { const el=document.getElementById('noAmmoWarn'); el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'),1500); }

function addKillFeedEntry(name, isCommander, isJet) {
  const feed=document.getElementById('killFeed'), e=document.createElement('div');
  e.className='kill-entry'+(isJet?' jet':isCommander?' boss':'');
  e.textContent=isJet?`✈ JET DOWNED — ${name}`:isCommander?`★ COMMANDER KIA — ${name}`:`✖ ${name} KIA`;
  feed.appendChild(e); setTimeout(()=>e.remove(),4200);
}

function showWaveAnnounce(w) {
  const el=document.getElementById('waveAnnounce'), sub=document.getElementById('waSub');
  document.getElementById('waText').textContent=`WAVE ${w}`;
  sub.textContent=w===1?'GROUND TROOPS INCOMING':w>=5&&w%5===0?'⚠ AIR + GROUND ASSAULT ⚠':'GROUND + AIR SUPPORT INBOUND';
  el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'),2800);
}

/* ================================================================
   SECTION 26: PAUSE / MENUS
================================================================ */
function togglePause() {
  if (STATE.phase==='playing') { STATE.phase='paused'; document.getElementById('pauseMenu').classList.remove('hidden'); document.exitPointerLock(); }
  else if (STATE.phase==='paused') { STATE.phase='playing'; document.getElementById('pauseMenu').classList.add('hidden'); lockPointer(); }
}

function toggleScoreboard(show) { document.getElementById('scoreboard').classList.toggle('hidden',!show); }

document.getElementById('btnResume').addEventListener('click',()=>togglePause());
document.getElementById('btnMainMenu').addEventListener('click',()=>location.reload());
document.getElementById('btnRestart').addEventListener('click',()=>location.reload());
document.getElementById('btnGoMenu').addEventListener('click',()=>location.reload());

function showGameover() {
  const acc=STATE.shotsFired>0?Math.round(STATE.shotsHit/STATE.shotsFired*100):0;
  document.getElementById('goScore').textContent=STATE.score;
  document.getElementById('goWaves').textContent=STATE.wave;
  document.getElementById('goKills').textContent=STATE.kills;
  document.getElementById('goJets').textContent=STATE.jetKills;
  document.getElementById('sbDeaths').textContent=STATE.deaths;
  document.getElementById('gameoverScreen').classList.remove('hidden');
}

/* ================================================================
   SECTION 27: MAIN MENU
================================================================ */
function setupMenu() {
  const c=document.getElementById('menuParticles');
  for (let i=0;i<40;i++) {
    const p=document.createElement('div'); p.className='menu-particle';
    p.style.cssText=`left:${Math.random()*100}%;bottom:${Math.random()*30}%;--dur:${6+Math.random()*8}s;--delay:${Math.random()*6}s;width:${2+Math.random()*4}px;height:${2+Math.random()*4}px;background:hsl(${90+Math.random()*40},80%,${40+Math.random()*30}%)`;
    c.appendChild(p);
  }
  document.getElementById('btnPlay').addEventListener('click',()=>{ document.getElementById('mainMenu').style.display='none'; startGame(); });
  document.getElementById('btnControls').addEventListener('click',()=>document.getElementById('controlsPanel').classList.remove('hidden'));
  document.getElementById('btnCloseControls').addEventListener('click',()=>document.getElementById('controlsPanel').classList.add('hidden'));
  document.getElementById('btnCredits').addEventListener('click',()=>showNotif('AMAZON STRIKE — Built with Three.js r128 | Realistic Soldiers + Jets'));
}

/* ================================================================
   SECTION 28: START GAME
================================================================ */
function startGame() {
  STATE.phase='playing'; STATE.startTime=Date.now();
  document.getElementById('hud').classList.remove('hidden');
  lockPointer(); updateHealthUI(); updateAmmoUI(); updateScoreUI(); updateGrenadeUI();
  spawnWave(STATE.wave);
}

/* ================================================================
   SECTION 29: GAME LOOP
================================================================ */
function animate() {
  animFrameId=requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  if (STATE.phase==='playing') {
    updatePlayer(dt); updateEnemies(dt,clock.getElapsedTime());
    updateBullets(dt); updateParticles(dt); updateGrenades(dt);
    updateJets(dt,clock.getElapsedTime()); updateEnvironment(dt);
    drawMinimap(); updateTimer();
  }
  renderer.render(scene,camera);
}

/* ================================================================
   SECTION 30: LOADING & BOOTSTRAP
================================================================ */
const loadSteps=[
  {pct:5,  msg:'Initializing WebGL Engine...'},
  {pct:12, msg:'Calibrating Three.js r128...'},
  {pct:20, msg:'Generating Amazon Terrain (Simplex Noise)...'},
  {pct:30, msg:'Planting 300 Tropical Trees...'},
  {pct:38, msg:'Growing Ferns, Vines & Vegetation...'},
  {pct:45, msg:'Building Ancient Ruins & FOB...'},
  {pct:52, msg:'Deploying Sandbag Positions...'},
  {pct:58, msg:'Lighting Jungle (8 Bioluminescent Points)...'},
  {pct:65, msg:'Assembling Realistic Soldier AI (6 Types)...'},
  {pct:71, msg:'Building Fighter Jet (F-16 Inspired)...'},
  {pct:77, msg:'Loading Weapons: M4A1, AWM, SAW, Stinger...'},
  {pct:82, msg:'Programming Enemy Squads & Cover AI...'},
  {pct:87, msg:'Initializing Stinger Lock-On System...'},
  {pct:92, msg:'Configuring Bomb Physics...'},
  {pct:96, msg:'Compiling GLSL Shaders...'},
  {pct:100,msg:'MISSION READY — Enter the Combat Zone'},
];
let loadStep=0;

function tickLoader() {
  if (loadStep>=loadSteps.length) { setTimeout(()=>{ document.getElementById('loadingScreen').style.display='none'; setupMenu(); },600); return; }
  const step=loadSteps[loadStep++];
  document.getElementById('loadBar').style.width=step.pct+'%';
  document.getElementById('loadStatus').textContent=step.msg;
  setTimeout(tickLoader, loadStep===loadSteps.length?700:180+Math.random()*200);
}

function bootstrap() {
  initRenderer(); initScene(); buildLighting(); buildTerrain(); buildJungle();
  buildWeaponModel(); initBulletPool(); setupInput();
  document.getElementById('hudWeaponName').textContent=WEAPONS[0].name;
  animate(); tickLoader();
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootstrap);
else bootstrap();
