// ============ МОБЫ ============
// Данные — data/mobs.json. Мирные пасутся и убегают при ударе; враждебные
// охотятся на игрока (активны ночью). Дроп мяса/костей — через addItem по id.
let MOBS = {};            // id → определение
let MOB_DEFS = [];        // список определений
fetch('data/mobs.json?v=10')
  .then(r => r.ok ? r.json() : Promise.reject('HTTP ' + r.status))
  .then(db => { MOB_DEFS = db.mobs; for (const m of MOB_DEFS) MOBS[m.id] = m; })
  .catch(err => console.warn('mobs.json не загружен:', err));

const MOB_CAP = 10;       // сколько мобов держим в мире
const SPAWN_INT = 3.0;    // раз в сколько секунд пробуем заспавнить
const AGGRO_R = 22;       // на какой дистанции враг замечает игрока
const MELEE_R = 2.4;      // радиус удара игрока по мобу
const DESPAWN_R = 100;    // дальше этого мобы удаляются (переиспользуем)
const PLAYER_DMG = 3;     // урон игрока за удар

const mobs = [];          // активные: { def, mesh, x, z, heading, wander, flee, atkCd, hp }
let spawnTimer = 0;
let lastHitAt = -999;     // когда игрока последний раз ударили (для регена)

function isNight() {
  const ang = (dayTime / DAY_LEN) * Math.PI * 2;
  return Math.sin(ang) < -0.1;
}

// --- меш моба: тело + голова + 4 ноги (в стиле персонажа) ---
function buildMobMesh(def) {
  const g = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: new THREE.Color(def.color), flatShading: true });
  const dark = new THREE.MeshLambertMaterial({ color: new THREE.Color(def.color).multiplyScalar(0.7) });
  const s = def.size;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.5 * s, 1.0 * s), body);
  torso.position.y = 0.55 * s;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.42 * s, 0.42 * s), body);
  head.position.set(0, 0.62 * s, 0.62 * s);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.2 * s, 0.2 * s), dark);
  snout.position.set(0, 0.56 * s, 0.86 * s);
  g.add(snout);
  // глаза — красные у враждебных, тёмные у мирных
  const eyeM = new THREE.MeshBasicMaterial({ color: def.hostile ? 0xff3322 : 0x1a1a1a });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 0.08 * s, 0.06 * s), eyeM);
    eye.position.set(sx * 0.13 * s, 0.68 * s, 0.83 * s);
    g.add(eye);
  }
  const legGeo = new THREE.BoxGeometry(0.13 * s, 0.4 * s, 0.13 * s);
  legGeo.translate(0, -0.2 * s, 0);
  const legs = [];
  for (const lz of [0.32 * s, -0.32 * s]) for (const lx of [-0.17 * s, 0.17 * s]) {
    const leg = new THREE.Mesh(legGeo.clone(), dark);
    leg.position.set(lx, 0.4 * s, lz);
    g.add(leg); legs.push(leg);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.legs = legs;
  return g;
}

function spawnMob(def) {
  // точка на кольце вокруг игрока, на суше
  for (let tries = 0; tries < 12; tries++) {
    const a = (tries * 1.9) % (Math.PI * 2) + tries;
    const r = 18 + (tries * 7) % 20;
    const x = player.pos.x + Math.cos(a) * r;
    const z = player.pos.z + Math.sin(a) * r;
    const B = T_SIZE / 2 - 6;
    if (Math.abs(x) > B || Math.abs(z) > B) continue;
    if (terrainHeight(x, z) < WATER_Y + 0.6) continue; // не в воде
    const mesh = buildMobMesh(def);
    scene.add(mesh);
    mobs.push({ def, mesh, x, z, heading: a, wander: 0, flee: 0, atkCd: 0, hp: def.hp, phase: 0 });
    return;
  }
}

function killMob(i) {
  if (i < 0) return;
  const m = mobs[i];
  scene.remove(m.mesh);
  for (const d of m.def.drops || []) addItem(d.id, d.count);
  mobs.splice(i, 1);
}

// урон мобу (возвращает true, если добит)
function damageMob(m, dmg) {
  m.hp -= dmg;
  if (!m.def.hostile) m.flee = 4;        // мирный убегает после удара
  if (m.hp <= 0) { killMob(mobs.indexOf(m)); return true; }
  return false;
}

// стены построек не пускают мобов (жилище реально защищает)
function collideMobWalls(m) {
  if (typeof buildings === 'undefined') return;
  const my = terrainHeight(m.x, m.z);
  for (const b of buildings) {
    if (!isWallType(b.type)) continue;
    if (my >= b.baseY + WALL_H - 0.1 || my < b.baseY - 1.0) continue; // не на уровне стены
    const dirX = Math.cos(b.rotY), dirZ = -Math.sin(b.rotY);
    const relX = m.x - b.x, relZ = m.z - b.z;
    const proj = relX * dirX + relZ * dirZ;
    for (const [a, bb] of WALL_SEGS[b.type]) {
      const tt = Math.max(a, Math.min(bb, proj));
      const cpX = b.x + dirX * tt, cpZ = b.z + dirZ * tt;
      const ddx = m.x - cpX, ddz = m.z - cpZ;
      const d2 = ddx * ddx + ddz * ddz;
      const min = (WALL_PUSH[b.type] || 0.6) + 0.25; // мобы чуть толще игрока
      if (d2 < min * min && d2 > 1e-4) {
        const d = Math.sqrt(d2);
        m.x = cpX + ddx / d * min; m.z = cpZ + ddz / d * min;
      }
    }
  }
}

function respawnPlayerDead() {
  player.hp = player.maxHp;
  player.pos.copy(findSpawn());
  player.velY = 0;
  // разгоняем ближайших врагов, чтобы не забили сразу на респауне
  for (const m of mobs) if (m.def.hostile) { m.x += 30; m.flee = 0; }
}

// --- HUD здоровья ---
const hpFill = document.getElementById('hpFill');
function updateHpHud() {
  if (!hpFill) return;
  const f = Math.max(0, player.hp / player.maxHp);
  hpFill.style.width = (f * 100) + '%';
  hpFill.style.background = f > 0.5 ? '#5fd06a' : f > 0.25 ? '#e8c33d' : '#e0483d';
}

function updateMobs(dt) {
  const now = performance.now();
  const night = isNight();

  // спавн
  spawnTimer += dt;
  if (spawnTimer >= SPAWN_INT) {
    spawnTimer = 0;
    if (mobs.length < MOB_CAP && MOB_DEFS.length) {
      // ночью чаще враги, днём — мирные; но подходящих по времени
      const pool = MOB_DEFS.filter(d => d.spawn === 'any' ||
        (night ? d.spawn === 'night' || d.hostile : d.spawn === 'day' || !d.hostile));
      if (pool.length) spawnMob(pool[(mobs.length + Math.floor(spawnTimer)) % pool.length] || pool[0]);
    }
  }

  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i], def = m.def;
    const dx = player.pos.x - m.x, dz = player.pos.z - m.z;
    const distP = Math.hypot(dx, dz);

    // слишком далеко — деспавн
    if (distP > DESPAWN_R) { scene.remove(m.mesh); mobs.splice(i, 1); continue; }

    // выбор направления
    let tx, tz, spd = def.speed;
    if (m.flee > 0) {                                   // убегает от игрока
      m.flee -= dt; tx = -dx; tz = -dz; spd *= 1.15;
    } else if (def.hostile && distP < AGGRO_R) {        // враг охотится
      tx = dx; tz = dz;
    } else {                                            // блуждание
      m.wander -= dt;
      if (m.wander <= 0) { m.heading += (Math.random() - 0.5) * 2.5; m.wander = 1.5 + Math.random() * 2; }
      tx = Math.sin(m.heading); tz = Math.cos(m.heading); spd *= 0.5;
    }
    const tl = Math.hypot(tx, tz) || 1;
    m.heading = Math.atan2(tx / tl, tz / tl);

    // движение с проверкой суши/границ
    const nx = m.x + Math.sin(m.heading) * spd * dt;
    const nz = m.z + Math.cos(m.heading) * spd * dt;
    const B = T_SIZE / 2 - 4;
    if (Math.abs(nx) < B && Math.abs(nz) < B && terrainHeight(nx, nz) > WATER_Y + 0.4) {
      m.x = nx; m.z = nz;
    } else {
      m.heading += 2.2; m.wander = 0.3;                 // упёрлись — развернуться
    }
    collideMobWalls(m);                                 // стены не пускают

    const gy = terrainHeight(m.x, m.z);

    // атака игрока — только если он примерно на высоте моба (не с земли на этаж)
    if (m.atkCd > 0) m.atkCd -= dt;
    if (def.hostile && def.damage > 0 && distP < 1.7 &&
        Math.abs(player.pos.y - gy) < 2.6 && m.atkCd <= 0) {
      player.hp = Math.max(0, player.hp - def.damage);
      m.atkCd = 1.0; lastHitAt = now;
      if (player.hp <= 0) respawnPlayerDead();
    }

    // размещение меша + анимация ног/покачивание
    m.phase += dt * spd * 2.2;
    m.mesh.position.set(m.x, gy, m.z);
    m.mesh.rotation.y = m.heading;
    const sw = Math.sin(m.phase) * 0.5 * Math.min(1, spd);
    const legs = m.mesh.userData.legs;
    if (legs) { legs[0].rotation.x = sw; legs[3].rotation.x = sw; legs[1].rotation.x = -sw; legs[2].rotation.x = -sw; }
  }

  // реген здоровья вне боя
  if (player.hp > 0 && player.hp < player.maxHp && now - lastHitAt > 6000) {
    player.hp = Math.min(player.maxHp, player.hp + 4 * dt);
  }
  updateHpHud();
}
