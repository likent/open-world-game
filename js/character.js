// ============ ПЕРСОНАЖ ============
function buildCharacter() {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98c });
  const shirt = new THREE.MeshLambertMaterial({ color: 0xc44536 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x3a4a6b });
  const hair = new THREE.MeshLambertMaterial({ color: 0x4a3020 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.3), shirt);
  torso.position.y = 1.0;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skin);
  head.position.y = 1.55;
  g.add(head);

  const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.4), hair);
  hairMesh.position.y = 1.76;
  g.add(hairMesh);

  const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
  armGeo.translate(0, -0.22, 0);
  const armL = new THREE.Mesh(armGeo, shirt);
  armL.position.set(-0.36, 1.25, 0);
  const armR = new THREE.Mesh(armGeo.clone(), shirt);
  armR.position.set(0.36, 1.25, 0);
  g.add(armL, armR);

  const legGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
  legGeo.translate(0, -0.28, 0);
  const legL = new THREE.Mesh(legGeo, pants);
  legL.position.set(-0.15, 0.68, 0);
  const legR = new THREE.Mesh(legGeo.clone(), pants);
  legR.position.set(0.15, 0.68, 0);
  g.add(legL, legR);

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: g, armL, armR, legL, legR };
}
const char = buildCharacter();
scene.add(char.group);
