// ============ ИГРОК ============
// спавн: ищем сухое ровное место недалеко от центра
function findSpawn() {
  for (let r = 0; r < 180; r += 6) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = terrainHeight(x, z);
      if (h > WATER_Y + 1.6 && h < 3) return new THREE.Vector3(x, h, z);
    }
  }
  return new THREE.Vector3(0, terrainHeight(0, 0), 0);
}
const player = {
  pos: findSpawn(),
  velY: 0,
  heading: 0,
  camYaw: 0,
  camPitch: 0,
  onGround: true,
  speed: 8,
  walkPhase: 0,
  moving: 0,
};
const GRAV = 26, JUMP = 9.5, CAM_DIST = 5.5, EYE = 1.6;
let firstPerson = true;
let swingT = 0;

// ============ ИНВЕНТАРЬ ============
const inv = { wood: 500, stone: 500 };
const woodCnt = document.getElementById('woodCnt');
const stoneCnt = document.getElementById('stoneCnt');
function updateInv() {
  woodCnt.textContent = inv.wood;
  stoneCnt.textContent = inv.stone;
  refreshRecipes();
}
setTimeout(updateInv, 0); // показать стартовые ресурсы сразу
