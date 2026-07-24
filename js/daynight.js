// ============ ДЕНЬ/НОЧЬ ============
const DAY_LEN = 120;
let dayTime = DAY_LEN * 0.25;

const skyDay = new THREE.Color(0x87b5d9);
const skySunset = new THREE.Color(0xe8926b);
const skyNight = new THREE.Color(0x0b1026);
const skyColor = new THREE.Color();
const clockHud = document.getElementById('clockHud');

function updateDayNight(dt) {
  dayTime = (dayTime + dt) % DAY_LEN;
  const ang = (dayTime / DAY_LEN) * Math.PI * 2;
  const sunH = Math.sin(ang);

  const R = 260;
  sunDisc.position.set(
    player.pos.x + Math.cos(ang) * R,
    Math.sin(ang) * R * 0.6,
    player.pos.z + Math.sin(ang * 0.3) * 40 - 80
  );
  moonDisc.position.set(
    player.pos.x - Math.cos(ang) * R,
    -Math.sin(ang) * R * 0.6,
    player.pos.z + 80
  );

  sun.position.copy(sunDisc.position).sub(player.pos).setLength(120).add(player.pos);
  sun.position.y = Math.max(sun.position.y, 5);
  sun.target.position.copy(player.pos);
  moon.position.copy(moonDisc.position).sub(player.pos).setLength(120).add(player.pos);
  moon.position.y = Math.max(moon.position.y, 5);
  moon.target.position.copy(player.pos);

  const dayF = THREE.MathUtils.clamp(sunH * 2.2, 0, 1);
  const nightF = THREE.MathUtils.clamp(-sunH * 2.2, 0, 1);
  const sunsetF = THREE.MathUtils.clamp(1 - Math.abs(sunH) * 3.5, 0, 1);

  sun.intensity = dayF * 1.1;
  sun.castShadow = dayF > 0.05;
  moon.intensity = nightF * 0.25;
  hemi.intensity = 0.18 + dayF * 0.7;

  skyColor.copy(skyNight).lerp(skyDay, dayF);
  skyColor.lerp(skySunset, sunsetF * 0.8);
  scene.background = skyColor;
  scene.fog.color.copy(skyColor);

  starMat.opacity = nightF;
  cloudMat.opacity = 0.15 + dayF * 0.7;
  sunDisc.visible = sunH > -0.15;
  moonDisc.visible = sunH < 0.15;

  const hours = Math.floor(((dayTime / DAY_LEN) * 24 + 6) % 24);
  const icon = sunH > 0.3 ? '🌞' : sunH > -0.1 ? '🌅' : '🌙';
  clockHud.textContent = `${icon} ${String(hours).padStart(2,'0')}:00`;
}
