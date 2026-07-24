// ============ РЕСУРСЫ: ДЕРЕВЬЯ ============
const dummy = new THREE.Object3D();
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);

const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.6, 5);
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
const crownGeo = new THREE.ConeGeometry(1.3, 2.6, 6);
const crownMat = new THREE.MeshLambertMaterial({ color: 0x2f6b2f });
const crown2Geo = new THREE.ConeGeometry(1.0, 2.0, 6);
const crown2Mat = new THREE.MeshLambertMaterial({ color: 0x3a7d38 });

const TREES = 260;
const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TREES);
const crowns = new THREE.InstancedMesh(crownGeo, crownMat, TREES);
const crowns2 = new THREE.InstancedMesh(crown2Geo, crown2Mat, TREES);
trunks.castShadow = crowns.castShadow = crowns2.castShadow = true;

const trees = [];

function setTreeMatrices(t, scaleMul = 1) {
  dummy.rotation.set(0, t.rotY, 0);
  dummy.scale.setScalar(t.s * scaleMul);

  dummy.position.set(t.x, t.h + 0.8 * t.s, t.z);
  dummy.updateMatrix();
  trunks.setMatrixAt(t.idx, dummy.matrix);

  dummy.position.set(t.x, t.h + 2.7 * t.s, t.z);
  dummy.updateMatrix();
  crowns.setMatrixAt(t.idx, dummy.matrix);

  dummy.position.set(t.x, t.h + 3.8 * t.s, t.z);
  dummy.updateMatrix();
  crowns2.setMatrixAt(t.idx, dummy.matrix);
}
function hideTree(t) {
  trunks.setMatrixAt(t.idx, ZERO_M);
  crowns.setMatrixAt(t.idx, ZERO_M);
  crowns2.setMatrixAt(t.idx, ZERO_M);
}
function treesNeedUpdate() {
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  crowns2.instanceMatrix.needsUpdate = true;
}

let placedT = 0, guard = 0;
while (placedT < TREES && guard < 6000) {
  guard++;
  const x = (hash(guard, 7) - 0.5) * (T_SIZE - 30);
  const z = (hash(guard, 13) - 0.5) * (T_SIZE - 30);
  const h = terrainHeight(x, z);
  if (h > 3 || h < WATER_Y + 0.6) continue;
  if (Math.abs(x) < 6 && Math.abs(z) < 6) continue;
  const t = {
    x, z, h,
    s: 0.8 + hash(guard, 21) * 0.9,
    rotY: hash(guard, 33) * Math.PI * 2,
    idx: placedT,
    hp: 3, alive: true, respawnAt: 0,
  };
  setTreeMatrices(t);
  trees.push(t);
  placedT++;
}
treesNeedUpdate();
scene.add(trunks, crowns, crowns2);

// ============ РЕСУРСЫ: КАМНИ ============
const rockGeo = new THREE.DodecahedronGeometry(0.7, 0);
const rockMat = new THREE.MeshLambertMaterial({ color: 0x8c8c85, flatShading: true });
const ROCKS = 90;
const rocksMesh = new THREE.InstancedMesh(rockGeo, rockMat, ROCKS);
rocksMesh.castShadow = true;

const rocks = [];

function setRockMatrix(r, scaleMul = 1) {
  dummy.position.set(r.x, r.h + r.s * 0.2, r.z);
  dummy.scale.set(r.s * scaleMul, r.sy * scaleMul, r.s * scaleMul);
  dummy.rotation.set(r.rx, r.ry, r.rz);
  dummy.updateMatrix();
  rocksMesh.setMatrixAt(r.idx, dummy.matrix);
}

for (let i = 0; i < ROCKS; i++) {
  const x = (hash(i, 101) - 0.5) * (T_SIZE - 20);
  const z = (hash(i, 202) - 0.5) * (T_SIZE - 20);
  const h = terrainHeight(x, z);
  const s = 0.4 + hash(i, 303) * 1.4;
  const r = {
    x, z, h, s,
    sy: s * (0.6 + hash(i, 404) * 0.6),
    rx: hash(i,505)*3, ry: hash(i,606)*3, rz: hash(i,707)*3,
    idx: i, hp: 4, alive: true, respawnAt: 0,
  };
  setRockMatrix(r);
  rocks.push(r);
}
rocksMesh.instanceMatrix.needsUpdate = true;
scene.add(rocksMesh);

// ============ ОБЛАКА ============
const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
const cloudGroup = new THREE.Group();
for (let i = 0; i < 14; i++) {
  const c = new THREE.Group();
  const n = 3 + Math.floor(hash(i, 55) * 3);
  for (let j = 0; j < n; j++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(3 + hash(i*10+j, 66) * 3, 7, 5), cloudMat);
    puff.position.set(j * 4 - n * 2, hash(i*10+j, 77) * 1.5, hash(i*10+j, 88) * 3);
    puff.scale.y = 0.55;
    c.add(puff);
  }
  c.position.set((hash(i, 91)-0.5) * 380, 55 + hash(i, 92) * 25, (hash(i, 93)-0.5) * 380);
  c.userData.speed = 0.5 + hash(i, 94);
  cloudGroup.add(c);
}
scene.add(cloudGroup);
