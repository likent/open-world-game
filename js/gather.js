// ============ СБОР / УДАРЫ ============
const GATHER_R = 3.2;
const RESPAWN_MS = 40000;
let target = null;
const actionBtn = document.getElementById('actionBtn');
const hint = document.getElementById('hint');

function findTarget() {
  let best = null, bestD = GATHER_R * GATHER_R;
  for (const t of trees) {
    if (!t.alive) continue;
    const d2 = (player.pos.x-t.x)**2 + (player.pos.z-t.z)**2;
    if (d2 < bestD) { bestD = d2; best = { kind: 'tree', obj: t }; }
  }
  for (const r of rocks) {
    if (!r.alive) continue;
    const d2 = (player.pos.x-r.x)**2 + (player.pos.z-r.z)**2;
    if (d2 < bestD) { bestD = d2; best = { kind: 'rock', obj: r }; }
  }
  return best;
}

function hitTarget() {
  if (!target) return;
  const o = target.obj;
  o.hp--;
  swingT = 0.3;

  if (target.kind === 'tree') {
    if (o.hp <= 0) {
      o.alive = false;
      o.respawnAt = performance.now() + RESPAWN_MS;
      hideTree(o);
      inv.wood += 3;
    } else {
      setTreeMatrices(o, 1.08);
      setTimeout(() => { if (o.alive) { setTreeMatrices(o); treesNeedUpdate(); } }, 120);
      inv.wood += 1;
    }
    treesNeedUpdate();
  } else if (target.kind === 'rock') {
    if (o.hp <= 0) {
      o.alive = false;
      o.respawnAt = performance.now() + RESPAWN_MS;
      rocksMesh.setMatrixAt(o.idx, ZERO_M);
      inv.stone += 2;
    } else {
      setRockMatrix(o, 1.08);
      setTimeout(() => { if (o.alive) { setRockMatrix(o); rocksMesh.instanceMatrix.needsUpdate = true; } }, 120);
      inv.stone += 1;
    }
    rocksMesh.instanceMatrix.needsUpdate = true;
  }
  updateInv();
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
