// ============ СБОР / БОЙ ============
const REACH = 3.6;        // дистанция взаимодействия с ресурсом
const MOB_REACH = 2.9;    // дистанция удара по мобу
const AIM_DOT = 0.5;      // cos(~60°): цель должна быть перед игроком (не «спиной»)
const RESPAWN_MS = 40000;
let target = null;
const actionBtn = document.getElementById('actionBtn');
const interactBtn = document.getElementById('interactBtn');
const hint = document.getElementById('hint');

// Цель — то, на что смотрит игрок (ближайшее к центру взгляда, в пределах досягаемости).
// Цель имеет смысл только когда в руке инструмент или пусто (кулак); с едой/прочим — нет.
function aimTarget() {
  const mode = (typeof heldMode === 'function') ? heldMode() : 'fist';
  if (mode !== 'tool' && mode !== 'fist') return null;
  const hx = Math.sin(player.heading), hz = Math.cos(player.heading);
  let best = null, bestScore = AIM_DOT;
  const consider = (kind, obj, ox, oz, oy, reach) => {
    const dx = ox - player.pos.x, dz = oz - player.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > reach || dist < 0.0001) return;
    if (oy !== null && Math.abs(oy - player.pos.y) > 2.6) return; // по высоте
    const dot = (dx * hx + dz * hz) / dist;                       // насколько перед нами
    if (dot > bestScore) { bestScore = dot; best = { kind, obj }; }
  };
  for (const t of trees) if (t.alive) consider('tree', t, t.x, t.z, null, REACH);
  for (const r of rocks) if (r.alive) consider('rock', r, r.x, r.z, null, REACH);
  if (typeof mobs !== 'undefined')
    for (const m of mobs) consider('mob', m, m.x, m.z, terrainHeight(m.x, m.z), MOB_REACH);
  return best;
}
function findTarget() { return aimTarget(); } // совместимость

function hitTarget() {
  const mode = (typeof heldMode === 'function') ? heldMode() : 'fist';
  if (mode === 'food') { if (typeof eatHeld === 'function') eatHeld(); return; } // еда — съесть
  if (mode === 'hold') return;                                                   // прочее — просто держим

  const t = aimTarget();
  if (!t) return;
  swingT = 0.3;
  const held = (typeof heldDef === 'function') ? heldDef() : null; // null = кулак

  if (t.kind === 'mob') {
    // меч бьёт в полную силу; кулак/не оружие — слабее
    const dmg = (held && held.use === 'attack') ? held.power : 2;
    if (typeof damageMob === 'function') damageMob(t.obj, dmg);
    return;
  }

  // подходящий инструмент рубит/копает эффективно; кулаком или не тем — медленнее
  const matches = held && ((t.kind === 'tree' && held.use === 'wood') ||
                           (t.kind === 'rock' && held.use === 'stone'));
  if (!matches && Math.random() > 0.4) return; // «тюк» без прогресса — реже добываешь

  const o = t.obj;
  o.hp--;
  if (t.kind === 'tree') {
    if (o.hp <= 0) {
      o.alive = false;
      o.respawnAt = performance.now() + RESPAWN_MS;
      hideTree(o);
      addItem('wood', 3);
      if (Math.random() < 0.25) addItem('apple', 1);
    } else {
      setTreeMatrices(o, 1.08);
      setTimeout(() => { if (o.alive) { setTreeMatrices(o); treesNeedUpdate(); } }, 120);
      addItem('wood', 1);
    }
    treesNeedUpdate();
  } else {
    if (o.hp <= 0) {
      o.alive = false;
      o.respawnAt = performance.now() + RESPAWN_MS;
      rocksMesh.setMatrixAt(o.idx, ZERO_M);
      addItem('stone', 2);
      if (Math.random() < 0.2) addItem('coal', 1);
    } else {
      setRockMatrix(o, 1.08);
      setTimeout(() => { if (o.alive) { setRockMatrix(o); rocksMesh.instanceMatrix.needsUpdate = true; } }, 120);
      addItem('stone', 1);
    }
    rocksMesh.instanceMatrix.needsUpdate = true;
  }
  // addItem уже вызвал updateInv()
}

// ============ ВЗАИМОДЕЙСТВИЕ (двери и т.п.) ============
// объект перед игроком, с которым можно взаимодействовать (пока — двери)
function interactTarget() {
  if (typeof buildings === 'undefined') return null;
  const hx = Math.sin(player.heading), hz = Math.cos(player.heading);
  let best = null, bestScore = 0.25; // конус пошире, чем у удара
  for (const b of buildings) {
    if (b.type !== 'door') continue;
    const dx = b.x - player.pos.x, dz = b.z - player.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 3.2 || dist < 0.0001) continue;
    if (Math.abs(b.baseY - player.pos.y) > 2.5) continue;
    const dot = (dx * hx + dz * hz) / dist;
    if (dot > bestScore) { bestScore = dot; best = b; }
  }
  return best;
}
function toggleDoor(b) {
  const ud = b.mesh.userData;
  ud.doorTarget = ud.doorTarget > 0.5 ? 0 : 1;
}
function doInteract() {
  const b = interactTarget();
  if (b && b.type === 'door') toggleDoor(b);
}

function processRespawns(now) {
  let tDirty = false, rDirty = false;
  for (const t of trees) {
    if (!t.alive && now >= t.respawnAt) {
      t.alive = true; t.hp = 3;
      setTreeMatrices(t);
      tDirty = true;
    }
  }
  for (const r of rocks) {
    if (!r.alive && now >= r.respawnAt) {
      r.alive = true; r.hp = 4;
      setRockMatrix(r);
      rDirty = true;
    }
  }
  if (tDirty) treesNeedUpdate();
  if (rDirty) rocksMesh.instanceMatrix.needsUpdate = true;
}
