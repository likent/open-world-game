// ============ КРАФТ ============
const CELL = 2.0;
const F_H = 0.3;                 // толщина перекрытия
const WALL_H = 2.0;
const FOUND_H = WALL_H / 2;      // фундамент — полстены высотой (задел под «устойчивость»)
const STAIR_DROP = WALL_H + F_H; // лестница поднимает на верх перекрытия, без порога
const SNAP_R = 2.2;
// верх платформы: у фундамента своя высота
const topOf = b => b.baseY + (b.type === 'foundation' ? FOUND_H : F_H);

const RECIPES = {
  foundation: { name: 'Фундамент',   cost: { wood: 2, stone: 2 }, hp: 10, radius: 1.0 },
  floor:      { name: 'Перекрытие',  cost: { wood: 4 },           hp: 6,  radius: 1.0 },
  stairs:     { name: 'Лестница',    cost: { wood: 3 },           hp: 5,  radius: 0.8 },
  woodwall:   { name: 'Дер. стена',  cost: { wood: 5 },           hp: 5,  radius: 1.0 },
  stonewall:  { name: 'Кам. стена',  cost: { stone: 5 },          hp: 8,  radius: 1.0 },
  window:     { name: 'Окно',        cost: { wood: 4 },           hp: 4,  radius: 1.0 },
  door:       { name: 'Дверь',       cost: { wood: 4 },           hp: 4,  radius: 1.0 },
  campfire:   { name: 'Костёр',      cost: { wood: 3, stone: 2 }, hp: 3,  radius: 0.55 },
};
const HOTKEYS = ['foundation','floor','stairs','woodwall','stonewall','window','door','campfire'];

const WOOD_M = () => new THREE.MeshLambertMaterial({ color: 0x8a6238 });

const FOUND_SKIRT = 3.0; // насколько фундамент уходит вниз (дотянуться до земли на склоне)
function buildFoundation() {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(CELL, FOUND_H, CELL),
    new THREE.MeshLambertMaterial({ color: 0x9a938a, flatShading: true })
  );
  slab.position.y = FOUND_H / 2;
  g.add(slab);
  // «юбка» вниз — чтобы висящий на склоне фундамент дотягивался до земли и слегка пронзал terrain
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(CELL * 0.94, FOUND_SKIRT, CELL * 0.94),
    new THREE.MeshLambertMaterial({ color: 0x877f76, flatShading: true })
  );
  skirt.position.y = -FOUND_SKIRT / 2 + 0.02;
  g.add(skirt);
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(CELL + 0.08, 0.1, CELL + 0.08),
    new THREE.MeshLambertMaterial({ color: 0x7b6a52 })
  );
  trim.position.y = FOUND_H - 0.05;
  g.add(trim);
  return g;
}
function buildFloor() {
  const g = new THREE.Group();
  const m = WOOD_M();
  for (let i = 0; i < 5; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.41, F_H * 0.6, CELL), m);
    plank.position.set(-0.8 + i * 0.4, F_H * 0.7, 0);
    g.add(plank);
  }
  const beam1 = new THREE.Mesh(new THREE.BoxGeometry(CELL, F_H * 0.4, 0.15), m);
  beam1.position.set(0, F_H * 0.2, -0.7);
  g.add(beam1);
  const beam2 = beam1.clone();
  beam2.position.z = 0.7;
  g.add(beam2);
  return g;
}
function buildStairs() {
  const g = new THREE.Group();
  const m = WOOD_M();
  const STEPS = 6, du = CELL / STEPS;
  for (let i = 0; i < STEPS; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(du, 0.22, 1.2), m);
    step.position.set(
      -CELL/2 + (i + 0.5) * du,
      -i / STEPS * STAIR_DROP - 0.11,
      0
    );
    g.add(step);
  }
  return g;
}
function buildCampfire() {
  const g = new THREE.Group();
  const stoneM = new THREE.MeshLambertMaterial({ color: 0x8c8c85, flatShading: true });
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), stoneM);
    st.position.set(Math.cos(a) * 0.5, 0.08, Math.sin(a) * 0.5);
    st.rotation.set(i, i * 2, 0);
    g.add(st);
  }
  const logM = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 5), logM);
    log.rotation.z = Math.PI / 2.4;
    log.rotation.y = i / 3 * Math.PI * 2;
    log.position.y = 0.18;
    g.add(log);
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.6, 6),
    new THREE.MeshBasicMaterial({ color: 0xff9a3d, transparent: true, opacity: 0.9 })
  );
  flame.position.y = 0.45;
  g.add(flame);
  const flame2 = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.4, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd66b, transparent: true, opacity: 0.95 })
  );
  flame2.position.y = 0.5;
  g.add(flame2);
  const light = new THREE.PointLight(0xff9a3d, 1.2, 14);
  light.position.y = 0.8;
  g.add(light);
  g.userData.flames = [flame, flame2];
  g.userData.light = light;
  return g;
}
function buildWoodWall() {
  const g = new THREE.Group();
  const m = WOOD_M();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(CELL, F_H, 0.16), m);
  plinth.position.y = -F_H / 2;
  g.add(plinth);
  for (let i = 0; i < 5; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.41, WALL_H + hash(i, 3) * 0.04, 0.14), m);
    plank.position.set(-0.8 + i * 0.4, WALL_H / 2, 0);
    g.add(plank);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.1), m);
  bar.position.set(0, WALL_H * 0.65, 0.1);
  g.add(bar);
  return g;
}
function buildStoneWall() {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: 0x84847e, flatShading: true });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(CELL, F_H, 0.34), m);
  plinth.position.y = -F_H / 2;
  g.add(plinth);
  let y = 0.21;
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(0.5 + hash(row, i) * 0.1, 0.42, 0.32), m);
      b.position.set(-0.75 + i * 0.5 + (row % 2) * 0.15, y, 0);
      b.rotation.y = (hash(i, row) - 0.5) * 0.1;
      g.add(b);
    }
    y += 0.4;
  }
  return g;
}
function buildWindowWall() {
  const g = new THREE.Group();
  const m = WOOD_M();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(CELL, F_H, 0.16), m);
  plinth.position.y = -F_H / 2;
  g.add(plinth);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.8, 0.14), m);
  bottom.position.y = 0.4;
  g.add(bottom);
  const top = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.5, 0.14), m);
  top.position.y = WALL_H - 0.25;
  g.add(top);
  for (const sx of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.14), m);
    col.position.set(sx * 0.75, 1.15, 0);
    g.add(col);
  }
  const frameM = new THREE.MeshLambertMaterial({ color: 0x5e4326 });
  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.22), frameM);
  sill.position.y = 0.82;
  g.add(sill);
  const lintel = sill.clone();
  lintel.position.y = 1.48;
  g.add(lintel);
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.66, 0.08), frameM);
  mullion.position.y = 1.15;
  g.add(mullion);
  return g;
}
function buildDoorWall() {
  const g = new THREE.Group();
  const m = WOOD_M();
  for (const sx of [-1, 1]) {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.35, F_H, 0.16), m);
    plinth.position.set(sx * 0.825, -F_H / 2, 0);
    g.add(plinth);
  }
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.35, WALL_H, 0.14), m);
    side.position.set(sx * 0.825, WALL_H / 2, 0);
    g.add(side);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.35, 0.14), m);
  lintel.position.y = WALL_H - 0.175;
  g.add(lintel);
  // створка на шарнире — сама открывается при подходе
  const leafM = new THREE.MeshLambertMaterial({ color: 0x6e4d2c });
  const pivot = new THREE.Group();
  pivot.position.set(-0.65, 0, 0);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.28, 1.62, 0.08), leafM);
  leaf.position.set(0.64, 0.81, 0);
  pivot.add(leaf);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0xd9b23c }));
  knob.position.set(1.15, 0.85, 0.08);
  pivot.add(knob);
  g.add(pivot);
  g.userData.doorPivot = pivot;
  g.userData.doorOpen = 0;    // фактическое положение створки (анимируется)
  g.userData.doorTarget = 0;  // куда стремится: 0 закрыта, 1 открыта (по кнопке)
  return g;
}
const BUILDERS = {
  foundation: buildFoundation, floor: buildFloor, stairs: buildStairs,
  campfire: buildCampfire, woodwall: buildWoodWall, stonewall: buildStoneWall,
  window: buildWindowWall, door: buildDoorWall,
};

// buildings: { type, mesh, x, z, baseY, rotY, hp, maxHp, radius }
const buildings = [];
const isWallType = t => t === 'woodwall' || t === 'stonewall' || t === 'window' || t === 'door';
const isPlatform = b => b.type === 'foundation' || b.type === 'floor';
// сегменты коллизии (вдоль локальной оси); у двери — проём
const WALL_SEGS = {
  woodwall: [[-CELL/2, CELL/2]],
  stonewall: [[-CELL/2, CELL/2]],
  window: [[-CELL/2, CELL/2]],
  door: [[-CELL/2, -0.65], [0.65, CELL/2]],
};
// радиус выталкивания: у двери меньше, чтобы игрок пролезал в проём
const WALL_PUSH = { woodwall: 0.6, stonewall: 0.6, window: 0.6, door: 0.4 };
const DOOR_CLOSED = [[-CELL/2, CELL/2]]; // закрытая дверь — сплошная стена
// сегменты коллизии с учётом состояния двери (закрытая держит, открытая — проём)
function wallSegsFor(b) {
  if (b.type === 'door') return (b.mesh.userData.doorOpen > 0.5) ? WALL_SEGS.door : DOOR_CLOSED;
  return WALL_SEGS[b.type];
}

function canAfford(cost) {
  for (const k in cost) if (countItem(k) < cost[k]) return false;
  return true;
}
function refreshRecipes() {
  document.querySelectorAll('.recipe').forEach(el => {
    const r = RECIPES[el.dataset.item];
    el.classList.toggle('disabled', !canAfford(r.cost));
  });
}

// ============ ПРИВЯЗКА ============
const ADJ = [[1,0],[-1,0],[0,1],[0,-1]];

function snapOccupied(type, p) {
  for (const b of buildings) {
    const d2 = (p.x-b.x)**2 + (p.z-b.z)**2;
    const dy = Math.abs(p.y - b.baseY);
    if (type === 'foundation' && b.type === 'foundation' && d2 < 1.0) return true;
    if (type === 'floor' && b.type === 'floor' && d2 < 1.0 && dy < 0.5) return true;
    if (isWallType(type) && isWallType(b.type) && d2 < 0.09 && dy < 0.5) return true;
    if (type === 'campfire' && b.type === 'campfire' && d2 < 0.36 && dy < 0.5) return true;
    if (type === 'stairs' && b.type === 'stairs' && d2 < 1.0 && dy < 0.5) return true;
  }
  return false;
}

function computePlacement(type, wx, wz, freeAng) {
  let best = null, bestD = SNAP_R * SNAP_R;
  const consider = (c, bias = 0) => {
    if (snapOccupied(type, c)) return; // занятые точки пропускаем — снап уходит на свободный ярус
    // кандидаты этажей совпадают по XZ — сравниваем по высоте, где «стоят ноги» (c.ref)
    const yPen = (((c.ref ?? c.y) - player.pos.y) / 2.5) ** 2;
    const d2 = (wx-c.x)**2 + (wz-c.z)**2 + yPen - bias;
    if (d2 < bestD) { bestD = d2; best = c; }
  };

  if (type === 'foundation') {
    for (const f of buildings) {
      if (f.type !== 'foundation') continue;
      for (const [ox, oz] of ADJ)
        consider({ x: f.x+ox*CELL, z: f.z+oz*CELL, y: f.baseY, rot: 0, snapped: true });
    }
    return best || { x: wx, z: wz, y: terrainHeight(wx, wz), rot: 0, snapped: false };
  }

  if (type === 'floor') {
    for (const p of buildings) {
      if (!isPlatform(p)) continue;
      // над платформой — потолок / пол второго этажа (стоишь внизу на платформе)
      consider({ x: p.x, z: p.z, y: topOf(p) + WALL_H, rot: 0, snapped: true, ref: topOf(p) });
      // вбок от других перекрытий на той же высоте (стоишь на перекрытии)
      if (p.type === 'floor')
        for (const [ox, oz] of ADJ)
          consider({ x: p.x+ox*CELL, z: p.z+oz*CELL, y: p.baseY, rot: 0, snapped: true, ref: topOf(p) });
    }
    return best || { x: wx, z: wz, y: 0, rot: 0, snapped: false, invalid: true };
  }

  if (isWallType(type)) {
    for (const p of buildings) {
      if (!isPlatform(p)) continue;
      const top = topOf(p);
      consider({ x: p.x, z: p.z + CELL/2, y: top, rot: 0, snapped: true });
      consider({ x: p.x, z: p.z - CELL/2, y: top, rot: 0, snapped: true });
      consider({ x: p.x + CELL/2, z: p.z, y: top, rot: Math.PI/2, snapped: true });
      consider({ x: p.x - CELL/2, z: p.z, y: top, rot: Math.PI/2, snapped: true });
    }
    // поверх существующей стены — второй ярус (на уровне перекрытий, чтобы этажи совпадали)
    for (const w of buildings) {
      if (!isWallType(w.type)) continue;
      consider({ x: w.x, z: w.z, y: w.baseY + WALL_H + F_H, rot: w.rotY, snapped: true });
    }
    return best || { x: wx, z: wz, y: terrainHeight(wx, wz), rot: freeAng + Math.PI/2, snapped: false };
  }

  if (type === 'stairs') {
    // направление спуска — к игроку (поднимаешься вперёд), квантуем по осям
    const ddx = -Math.sin(freeAng), ddz = -Math.cos(freeAng);
    let inRot;
    if (Math.abs(ddx) > Math.abs(ddz)) inRot = ddx > 0 ? 0 : Math.PI;
    else inRot = ddz > 0 ? -Math.PI/2 : Math.PI/2;

    for (const p of buildings) {
      if (!isPlatform(p)) continue;
      const top = topOf(p);
      // внутри ячейки: с платформы на верх этажа выше (стоишь у её низа)
      consider({ x: p.x, z: p.z, y: top + WALL_H + F_H, rot: inRot, snapped: true, ref: top }, 0.01);
      // снаружи: спуск с платформы на землю (стоишь внизу)
      consider({ x: p.x + CELL, z: p.z, y: top, rot: 0,          snapped: true, ref: top - STAIR_DROP });
      consider({ x: p.x - CELL, z: p.z, y: top, rot: Math.PI,    snapped: true, ref: top - STAIR_DROP });
      consider({ x: p.x, z: p.z + CELL, y: top, rot: -Math.PI/2, snapped: true, ref: top - STAIR_DROP });
      consider({ x: p.x, z: p.z - CELL, y: top, rot: Math.PI/2,  snapped: true, ref: top - STAIR_DROP });
    }
    return best || { x: wx, z: wz, y: 0, rot: 0, snapped: false, invalid: true };
  }

  // костёр — к центру платформы
  for (const p of buildings) {
    if (!isPlatform(p)) continue;
    consider({ x: p.x, z: p.z, y: topOf(p), rot: freeAng, snapped: true });
  }
  return best || { x: wx, z: wz, y: terrainHeight(wx, wz), rot: freeAng, snapped: false };
}

function placementValid(type, p) {
  if (p.invalid) return false;
  const B = T_SIZE / 2 - 5;
  if (Math.abs(p.x) > B || Math.abs(p.z) > B) return false;

  if (p.snapped) return !snapOccupied(type, p);

  const r = RECIPES[type].radius;
  for (const t of trees) {
    if (!t.alive) continue;
    if ((p.x-t.x)**2 + (p.z-t.z)**2 < (r + 0.5*t.s)**2) return false;
  }
  for (const rk of rocks) {
    if (!rk.alive) continue;
    if ((p.x-rk.x)**2 + (p.z-rk.z)**2 < (r + rk.s*0.7)**2) return false;
  }
  for (const b of buildings) {
    if ((p.x-b.x)**2 + (p.z-b.z)**2 < (r + b.radius)**2) return false;
  }
  return true;
}

// --- размещение с призраком ---
let placing = null;
const placeControls = document.getElementById('placeControls');
const placeOk = document.getElementById('placeOk');
const craftPanel = document.getElementById('craftPanel');

function startPlacing(type) {
  cancelPlacing();
  const ghost = BUILDERS[type]();
  ghost.traverse(o => {
    if (o.isMesh) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = 0.45;
    }
    if (o.isPointLight) o.intensity = 0;
  });
  scene.add(ghost);
  placing = { type, ghost };
  placeControls.classList.add('visible');
  craftPanel.classList.remove('open');
  invPanel.classList.remove('open');
}
function cancelPlacing() {
  if (placing) {
    scene.remove(placing.ghost);
    placing = null;
  }
  placeControls.classList.remove('visible');
  hint.classList.remove('visible');
}
function desiredSpot() {
  const fwdAng = firstPerson ? player.camYaw + Math.PI : player.heading;
  return {
    x: player.pos.x + Math.sin(fwdAng) * 3,
    z: player.pos.z + Math.cos(fwdAng) * 3,
    ang: fwdAng,
  };
}
function confirmPlacing() {
  if (!placing) return;
  const d = desiredSpot();
  const p = computePlacement(placing.type, d.x, d.z, d.ang);
  if (!placementValid(placing.type, p)) return;
  const rec = RECIPES[placing.type];
  if (!canAfford(rec.cost)) { cancelPlacing(); return; }
  for (const k in rec.cost) removeItem(k, rec.cost[k]);

  const mesh = BUILDERS[placing.type]();
  mesh.position.set(p.x, p.y, p.z);
  mesh.rotation.y = p.rot;
  mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(mesh);
  buildings.push({
    type: placing.type, mesh,
    x: p.x, z: p.z, baseY: p.y, rotY: p.rot,
    hp: rec.hp, maxHp: rec.hp, radius: rec.radius,
  });

  updateInv();
  // остаёмся в режиме стройки, пока хватает ресурсов (выход — ✕ / Esc / C)
  if (!canAfford(rec.cost)) cancelPlacing();
}

document.querySelectorAll('.recipe').forEach(el => {
  el.addEventListener('click', () => {
    const type = el.dataset.item;
    if (canAfford(RECIPES[type].cost)) startPlacing(type);
  });
});
function toggleCraftPanel() {
  if (placing) { cancelPlacing(); return; }
  refreshRecipes();
  const opening = !craftPanel.classList.contains('open');
  craftPanel.classList.toggle('open');
  if (opening) {
    invPanel.classList.remove('open');
    document.exitPointerLock?.(); // вернуть курсор для выбора
  }
}
document.getElementById('craftBtn').addEventListener('click', toggleCraftPanel);
placeOk.addEventListener('click', confirmPlacing);
document.getElementById('placeCancel').addEventListener('click', cancelPlacing);
