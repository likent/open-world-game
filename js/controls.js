// ============ УПРАВЛЕНИЕ ============
const joy = { id: null, x: 0, y: 0 };
const look = { id: null, lastX: 0, lastY: 0 };
const joyEl = document.getElementById('joystick');
const stickEl = document.getElementById('stick');
const JOY_R = 44;

function joyCenter() {
  const r = joyEl.getBoundingClientRect();
  return { cx: r.left + r.width/2, cy: r.top + r.height/2 };
}
function setStick(dx, dy) {
  stickEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}
function handleJoy(t) {
  const { cx, cy } = joyCenter();
  let dx = t.clientX - cx, dy = t.clientY - cy;
  const d = Math.hypot(dx, dy);
  if (d > JOY_R) { dx = dx / d * JOY_R; dy = dy / d * JOY_R; }
  joy.x = dx / JOY_R;
  joy.y = dy / JOY_R;
  setStick(dx, dy);
}

function pitchClamp() {
  return firstPerson ? [-1.35, 1.35] : [-0.2, 1.2];
}

addEventListener('touchstart', e => {
  if (e.target.closest('.panel') || e.target.closest('button') ||
      e.target.closest('#placeControls') || e.target.closest('#belt')) return;
  for (const t of e.changedTouches) {
    const jr = joyEl.getBoundingClientRect();
    const inJoy = t.clientX > jr.left - 30 && t.clientX < jr.right + 30 &&
                  t.clientY > jr.top - 30 && t.clientY < jr.bottom + 30;
    if (inJoy && joy.id === null) {
      joy.id = t.identifier;
      handleJoy(t);
    } else if (t.clientX > innerWidth * 0.4 && look.id === null) {
      look.id = t.identifier;
      look.lastX = t.clientX; look.lastY = t.clientY;
    }
  }
}, { passive: false });

addEventListener('touchmove', e => {
  let handled = false;
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) { handleJoy(t); handled = true; }
    else if (t.identifier === look.id) {
      const [lo, hi] = pitchClamp();
      player.camYaw   -= (t.clientX - look.lastX) * 0.006;
      player.camPitch += (t.clientY - look.lastY) * 0.005;
      player.camPitch = Math.max(lo, Math.min(hi, player.camPitch));
      look.lastX = t.clientX; look.lastY = t.clientY;
      handled = true;
    }
  }
  if (handled) e.preventDefault();
}, { passive: false });

addEventListener('touchend', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) {
      joy.id = null; joy.x = joy.y = 0;
      setStick(0, 0);
    }
    if (t.identifier === look.id) look.id = null;
  }
});

document.getElementById('jumpBtn').addEventListener('touchstart', e => {
  e.stopPropagation();
  if (player.onGround) { player.velY = JUMP; player.onGround = false; }
}, { passive: true });

actionBtn.addEventListener('touchstart', e => {
  e.stopPropagation();
  hitTarget();
}, { passive: true });
actionBtn.addEventListener('click', e => {
  if (e.detail !== 0) hitTarget();
});

// Настройки
const settingsPanel = document.getElementById('settings');
document.getElementById('settingsBtn').addEventListener('click', () => {
  settingsPanel.classList.toggle('open');
  if (settingsPanel.classList.contains('open')) document.exitPointerLock?.();
});
const viewFP = document.getElementById('viewFP');
const viewTP = document.getElementById('viewTP');
function setView(fp) {
  firstPerson = fp;
  viewFP.classList.toggle('active', fp);
  viewTP.classList.toggle('active', !fp);
  char.group.visible = !fp;
  document.getElementById('crosshair').style.display = fp ? 'block' : 'none';
  const [lo, hi] = pitchClamp();
  player.camPitch = Math.max(lo, Math.min(hi, player.camPitch));
  if (!fp) player.camPitch = Math.max(0.15, player.camPitch);
}
viewFP.addEventListener('click', () => setView(true));
viewTP.addEventListener('click', () => setView(false));
setView(true);

// Десктоп
const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space' && player.onGround) { player.velY = JUMP; player.onGround = false; }
  if (e.code === 'KeyE') hitTarget();
  if (e.code === 'KeyV') setView(!firstPerson);
  if (e.code === 'KeyC') toggleCraftPanel();
  if (e.code === 'KeyI') toggleInventory();
  if (e.code === 'Enter' && placing) confirmPlacing();
  if (e.code === 'Escape') { cancelPlacing(); craftPanel.classList.remove('open'); invPanel.classList.remove('open'); }
  // цифры: при открытом крафте — выбор рецепта, иначе — слот пояса
  if (e.code.startsWith('Digit')) {
    const n = parseInt(e.code.slice(5)) - 1;
    if (craftPanel.classList.contains('open')) {
      if (n >= 0 && n < HOTKEYS.length) {
        const type = HOTKEYS[n];
        if (canAfford(RECIPES[type].cost)) startPlacing(type);
      }
    } else if (typeof selectBelt === 'function') {
      selectBelt(n);
    }
  }
});
addEventListener('keyup', e => keys[e.code] = false);
renderer.domElement.addEventListener('click', () => {
  // клик при захваченной мыши во время стройки = поставить
  if (placing && document.pointerLockElement === renderer.domElement) {
    confirmPlacing();
    return;
  }
  renderer.domElement.requestPointerLock?.();
});
addEventListener('mousemove', e => {
  if (document.pointerLockElement === renderer.domElement) {
    const [lo, hi] = pitchClamp();
    player.camYaw   -= e.movementX * 0.0025;
    player.camPitch += e.movementY * 0.0025;
    player.camPitch = Math.max(lo, Math.min(hi, player.camPitch));
  }
});
