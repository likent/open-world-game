// ============ ТЕРРЕЙН ============
const T_SIZE = 400, T_SEG = 128;
const terrainGeo = new THREE.PlaneGeometry(T_SIZE, T_SIZE, T_SEG, T_SEG);
terrainGeo.rotateX(-Math.PI / 2);

const pos = terrainGeo.attributes.position;
const colors = [];
const cGrass = new THREE.Color(0x5a8f3c);
const cGrass2 = new THREE.Color(0x6da34a);
const cDirt = new THREE.Color(0x8a6f4d);
const cRock = new THREE.Color(0x7d7d78);
const cSand = new THREE.Color(0xc9b280);
const tmpC = new THREE.Color();

for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), z = pos.getZ(i);
  const h = terrainHeight(x, z);
  pos.setY(i, h);
  if (h > 6) tmpC.copy(cRock);
  else if (h > 3.5) tmpC.copy(cDirt).lerp(cRock, (h - 3.5) / 2.5);
  else if (h < WATER_Y + 1.2) tmpC.copy(cSand);
  else {
    const n = smoothNoise(x * 0.08, z * 0.08);
    tmpC.copy(cGrass).lerp(cGrass2, n);
  }
  colors.push(tmpC.r, tmpC.g, tmpC.b);
}
terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
terrainGeo.computeVertexNormals();

const terrain = new THREE.Mesh(
  terrainGeo,
  new THREE.MeshLambertMaterial({ vertexColors: true })
);
terrain.receiveShadow = true;
scene.add(terrain);

// ============ ВОДА ============
const W_SEG = 48;
const waterGeo = new THREE.PlaneGeometry(T_SIZE, T_SIZE, W_SEG, W_SEG);
waterGeo.rotateX(-Math.PI / 2);
const water = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({
  color: 0x2f6f9f, transparent: true, opacity: 0.72,
}));
water.position.y = WATER_Y;
scene.add(water);
const waterBase = waterGeo.attributes.position.array.slice();
