// ============ БАЗА ============
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87b5d9, 60, 220);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 600);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

// ============ СВЕТ ============
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3f5a36, 0.85);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2d9, 1.1);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -60;
sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
sun.shadow.camera.far = 400;
scene.add(sun);
scene.add(sun.target);

const moon = new THREE.DirectionalLight(0x8fa8d9, 0);
scene.add(moon);
scene.add(moon.target);

const sunDisc = new THREE.Mesh(
  new THREE.SphereGeometry(6, 12, 8),
  new THREE.MeshBasicMaterial({ color: 0xffe9b0, fog: false })
);
scene.add(sunDisc);
const moonDisc = new THREE.Mesh(
  new THREE.SphereGeometry(4, 12, 8),
  new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false })
);
scene.add(moonDisc);

// ============ ЗВЁЗДЫ ============
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 500; i++) {
  const th = Math.random() * Math.PI * 2;
  const ph = Math.random() * Math.PI * 0.5;
  const r = 280;
  starPos.push(
    r * Math.cos(th) * Math.cos(ph),
    r * Math.sin(ph) + 10,
    r * Math.sin(th) * Math.cos(ph)
  );
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0, fog: false, sizeAttenuation: false });
scene.add(new THREE.Points(starGeo, starMat));
