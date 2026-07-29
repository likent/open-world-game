// ============ ЦИКЛ ============
const clock = new THREE.Clock();
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const now = performance.now();

  // ввод
  let mx = joy.x, mz = joy.y;
  if (keys['KeyW']) mz -= 1;
  if (keys['KeyS']) mz += 1;
  if (keys['KeyA']) mx -= 1;
  if (keys['KeyD']) mx += 1;
  let ml = Math.hypot(mx, mz);
  if (ml > 1) { mx /= ml; mz /= ml; ml = 1; }
  player.moving = ml;

  if (ml > 0.05) {
    const moveAng = Math.atan2(mx, mz) + player.camYaw;
    if (!firstPerson) {
      player.heading = angleLerp(player.heading, moveAng, Math.min(1, dt * 12));
    }
    const inWater = player.pos.y < WATER_Y - 0.3;
    const spd = player.speed * ml * (inWater ? 0.45 : 1);
    player.pos.x += Math.sin(moveAng) * spd * dt;
    player.pos.z += Math.cos(moveAng) * spd * dt;
    player.walkPhase += dt * (inWater ? 5 : 9) * ml;
  }
  if (firstPerson) player.heading = player.camYaw + Math.PI;

  // границы
  const B = T_SIZE / 2 - 5;
  player.pos.x = Math.max(-B, Math.min(B, player.pos.x));
  player.pos.z = Math.max(-B, Math.min(B, player.pos.z));

  // коллизия с деревьями
  for (const tp of trees) {
    if (!tp.alive) continue;
    const dx = player.pos.x - tp.x, dz = player.pos.z - tp.z;
    const d2 = dx*dx + dz*dz;
    const min = 0.5 * tp.s + 0.35;
    if (d2 < min * min && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      player.pos.x = tp.x + dx / d * min;
      player.pos.z = tp.z + dz / d * min;
    }
  }
  // коллизия с постройками
  for (const b of buildings) {
    // фундамент — сплошной блок: держит сбоку, но сверху по нему ходим
    if (b.type === 'foundation') {
      const top = topOf(b);
      const half = CELL/2, r = 0.35;
      const relX = player.pos.x - b.x, relZ = player.pos.z - b.z;
      if (Math.abs(relX) < half + r && Math.abs(relZ) < half + r &&
          player.pos.y < top - 0.1 && player.pos.y > b.baseY - FOUND_SKIRT) {
        const penX = (half + r) - Math.abs(relX);
        const penZ = (half + r) - Math.abs(relZ);
        if (penX < penZ) player.pos.x = b.x + Math.sign(relX || 1) * (half + r);
        else             player.pos.z = b.z + Math.sign(relZ || 1) * (half + r);
      }
      continue;
    }
    if (isPlatform(b)) continue; // перекрытия — проходим под ними
    if (b.type === 'stairs') {
      // если игрок ниже поверхности марша — лестница твёрдая, выталкиваем
      const dirX = Math.cos(b.rotY), dirZ = -Math.sin(b.rotY);
      const perpX = Math.sin(b.rotY), perpZ = Math.cos(b.rotY);
      const relX = player.pos.x - b.x, relZ = player.pos.z - b.z;
      const lu = relX * dirX + relZ * dirZ;
      const lv = relX * perpX + relZ * perpZ;
      const HU = CELL/2 + 0.2, HV = 0.8;
      if (Math.abs(lu) < HU && Math.abs(lv) < HV) {
        const luC = Math.max(-CELL/2, Math.min(CELL/2, lu));
        const stepIdx = Math.min(5, Math.max(0, Math.floor((luC + CELL/2) / (CELL/6))));
        const h = b.baseY - stepIdx / 6 * STAIR_DROP;
        if (player.pos.y < h - 0.55) {
          const cands = [
            { pen: HU - lu, dx: dirX,  dz: dirZ  },
            { pen: lu + HU, dx: -dirX, dz: -dirZ },
            { pen: HV - lv, dx: perpX, dz: perpZ },
            { pen: lv + HV, dx: -perpX, dz: -perpZ },
          ];
          let bc = cands[0];
          for (const c of cands) if (c.pen < bc.pen) bc = c;
          player.pos.x += bc.dx * bc.pen;
          player.pos.z += bc.dz * bc.pen;
        }
      }
      continue;
    }
    if (isWallType(b.type)) {
      // держат только на уровне игрока (второй этаж не мешает первому)
      if (player.pos.y >= b.baseY + WALL_H - 0.1 || player.pos.y < b.baseY - 1.0) continue;
      const dirX = Math.cos(b.rotY), dirZ = -Math.sin(b.rotY);
      const relX = player.pos.x - b.x, relZ = player.pos.z - b.z;
      const proj = relX * dirX + relZ * dirZ;
      for (const [a, bb] of wallSegsFor(b)) {
        const tt = Math.max(a, Math.min(bb, proj));
        const cpX = b.x + dirX * tt, cpZ = b.z + dirZ * tt;
        const dx = player.pos.x - cpX, dz = player.pos.z - cpZ;
        const d2 = dx*dx + dz*dz;
        const min = WALL_PUSH[b.type];
        if (d2 < min * min && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          player.pos.x = cpX + dx / d * min;
          player.pos.z = cpZ + dz / d * min;
        }
      }
    } else {
      const dx = player.pos.x - b.x, dz = player.pos.z - b.z;
      const d2 = dx*dx + dz*dz;
      const min = b.radius + 0.35;
      if (d2 < min * min && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        player.pos.x = b.x + dx / d * min;
        player.pos.z = b.z + dz / d * min;
      }
    }
  }

  // гравитация + земля (платформы и лестницы — тоже пол)
  const prevY = player.pos.y;
  player.velY -= GRAV * dt;
  player.pos.y += player.velY * dt;
  let ground = terrainHeight(player.pos.x, player.pos.z);
  const STEP_UP = 0.45; // максимальный «шаг» вверх — прыжком под потолок уже не затянет
  for (const b of buildings) {
    if (isPlatform(b)) {
      if (Math.abs(player.pos.x - b.x) <= CELL/2 + 0.1 &&
          Math.abs(player.pos.z - b.z) <= CELL/2 + 0.1) {
        const top = topOf(b);
        if (prevY >= top - STEP_UP) ground = Math.max(ground, top);
      }
    } else if (b.type === 'stairs') {
      const dirX = Math.cos(b.rotY), dirZ = -Math.sin(b.rotY);
      const perpX = Math.sin(b.rotY), perpZ = Math.cos(b.rotY);
      const relX = player.pos.x - b.x, relZ = player.pos.z - b.z;
      const lu = relX * dirX + relZ * dirZ;
      const lv = relX * perpX + relZ * perpZ;
      if (Math.abs(lu) <= CELL/2 && Math.abs(lv) <= 0.7) {
        const stepIdx = Math.min(5, Math.max(0, Math.floor((lu + CELL/2) / (CELL/6))));
        const h = b.baseY - stepIdx / 6 * STAIR_DROP;
        if (prevY >= h - STEP_UP) ground = Math.max(ground, h);
      }
    } else if (isWallType(b.type)) {
      // торец стены — узкая дорожка
      const dirX = Math.cos(b.rotY), dirZ = -Math.sin(b.rotY);
      const relX = player.pos.x - b.x, relZ = player.pos.z - b.z;
      const proj = Math.max(-CELL/2, Math.min(CELL/2, relX * dirX + relZ * dirZ));
      const cpX = b.x + dirX * proj, cpZ = b.z + dirZ * proj;
      const dW = (player.pos.x-cpX)**2 + (player.pos.z-cpZ)**2;
      if (dW < 0.35 * 0.35) {
        const top = b.baseY + WALL_H;
        if (prevY >= top - STEP_UP) ground = Math.max(ground, top);
      }
    }
  }
  if (player.pos.y <= ground) {
    player.pos.y = ground;
    player.velY = 0;
    player.onGround = true;
  }
  // потолок: головой в перекрытие — прыжок гасится
  const HEAD = 1.75;
  if (player.velY > 0) {
    for (const b of buildings) {
      if (!isPlatform(b)) continue;
      if (Math.abs(player.pos.x - b.x) > CELL/2 + 0.1 ||
          Math.abs(player.pos.z - b.z) > CELL/2 + 0.1) continue;
      if (prevY + HEAD <= b.baseY + 0.01 && player.pos.y + HEAD > b.baseY) {
        player.pos.y = b.baseY - HEAD;
        player.velY = 0;
      }
    }
  }

  // персонаж
  char.group.position.copy(player.pos);
  char.group.rotation.y = player.heading;

  const swing = Math.sin(player.walkPhase) * 0.7 * player.moving;
  char.legL.rotation.x = swing;
  char.legR.rotation.x = -swing;
  char.armL.rotation.x = -swing * 0.8;
  char.armR.rotation.x = swing * 0.8;
  if (swingT > 0) {
    swingT -= dt;
    char.armR.rotation.x = -1.6 + Math.sin(swingT * 20) * 0.5;
  }
  if (!player.onGround) {
    char.legL.rotation.x = 0.5;
    char.legR.rotation.x = -0.3;
    char.armL.rotation.x = -0.6;
    char.armR.rotation.x = -0.6;
  }

  // камера
  if (firstPerson) {
    camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.camYaw;
    camera.rotation.x = -player.camPitch;
    camera.rotation.z = 0;
  } else {
    camTarget.set(player.pos.x, player.pos.y + 1.4, player.pos.z);
    camPos.set(
      camTarget.x + Math.sin(player.camYaw) * Math.cos(player.camPitch) * CAM_DIST,
      camTarget.y + Math.sin(player.camPitch) * CAM_DIST,
      camTarget.z + Math.cos(player.camYaw) * Math.cos(player.camPitch) * CAM_DIST
    );
    const camGround = terrainHeight(camPos.x, camPos.z) + 0.5;
    if (camPos.y < camGround) camPos.y = camGround;
    camera.position.lerp(camPos, Math.min(1, dt * 10));
    camera.lookAt(camTarget);
  }

  // призрак размещения
  if (placing) {
    const d = desiredSpot();
    const p = computePlacement(placing.type, d.x, d.z, d.ang);
    placing.ghost.visible = !p.invalid;
    placing.ghost.position.set(p.x, p.y || 0, p.z);
    placing.ghost.rotation.y = p.rot;
    const ok = placementValid(placing.type, p);
    placeOk.disabled = !ok;
    placing.ghost.traverse(o => {
      if (o.isMesh) o.material.color.setHex(ok ? (p.snapped ? 0x7fdc8f : 0xffffff) : 0xff5544);
    });
    if (p.invalid) {
      hint.textContent = 'Нужна платформа рядом (фундамент/перекрытие)';
      hint.classList.add('visible');
    } else if (!target) {
      hint.classList.remove('visible');
    }
  }

  // мобы
  if (typeof updateMobs === 'function') updateMobs(dt);

  // цель — по направлению взгляда (что перед игроком)
  target = (typeof aimTarget === 'function') ? aimTarget() : null;
  if (!placing) {
    // кнопка действия всегда видна и показывает, что в руке (или кулак)
    actionBtn.classList.add('visible');
    actionBtn.textContent = (typeof heldIcon === 'function') ? heldIcon() : '👊';
    const mode = (typeof heldMode === 'function') ? heldMode() : 'fist';
    if (target) {
      if (target.kind === 'mob') {
        const m = target.obj;
        hint.textContent = `${m.def.name} (${Math.ceil(m.hp)}/${m.def.hp})`;
      } else if (target.kind === 'tree') {
        hint.textContent = `Рубить дерево (${target.obj.hp}/3)`;
      } else {
        hint.textContent = `Добыть камень (${target.obj.hp}/4)`;
      }
      hint.classList.add('visible');
    } else if (mode === 'food') {
      hint.textContent = `Съесть ${heldIcon()}`;
      hint.classList.add('visible');
    } else {
      hint.classList.remove('visible');
    }
  } else {
    actionBtn.classList.remove('visible');
  }

  // отдельная кнопка взаимодействия — когда смотрим на дверь
  const inter = (typeof interactTarget === 'function' && !placing) ? interactTarget() : null;
  if (inter) {
    interactBtn.classList.add('visible');
    interactBtn.textContent = inter.mesh.userData.doorOpen > 0.5 ? '🚪' : '🔓';
  } else {
    interactBtn.classList.remove('visible');
  }

  processRespawns(now);

  // огонь костров + двери
  for (const b of buildings) {
    if (b.type === 'door') {
      // открывается/закрывается кнопкой взаимодействия (см. doInteract в gather.js)
      const ud = b.mesh.userData;
      ud.doorOpen += ((ud.doorTarget || 0) - ud.doorOpen) * Math.min(1, dt * 6);
      ud.doorPivot.rotation.y = -ud.doorOpen * Math.PI * 0.52;
      continue;
    }
    if (b.type !== 'campfire') continue;
    const fl = b.mesh.userData.flames;
    const s = 0.9 + Math.sin(t * 11 + b.x) * 0.12 + Math.sin(t * 23) * 0.06;
    fl[0].scale.set(s, s, s);
    fl[1].scale.set(2 - s, s, 2 - s);
    b.mesh.userData.light.intensity = 1.0 + Math.sin(t * 13 + b.z) * 0.25;
  }

  // волны
  const wp = waterGeo.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const bx = waterBase[i * 3], bz = waterBase[i * 3 + 2];
    wp.setY(i, Math.sin(bx * 0.15 + t * 1.4) * 0.12 + Math.cos(bz * 0.12 + t * 1.1) * 0.12);
  }
  wp.needsUpdate = true;

  // облака
  cloudGroup.children.forEach(c => {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > 220) c.position.x = -220;
  });

  updateDayNight(dt);
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
