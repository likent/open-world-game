// ============ ИНВЕНТАРЬ (слоты + стаки) ============
// База предметов лежит в data/items.json как таблица записей с первичным ключом id.
// Всё в игре ссылается на предмет по строковому id: слоты рюкзака { id, count },
// дропы при добыче (gather.js), стоимость рецептов (building.js) и будущие лежащие
// в мире предметы { id, count, x, z }. ITEMS — карта id → запись (строится из таблицы).
// Ниже — запасной минимум на случай, если json не загрузился (например, через file://).
let ITEMS = {
  wood:    { id: 'wood',    name: 'Дерево', icon: '🪵', type: 'resource', stack: 99, desc: '' },
  stone:   { id: 'stone',   name: 'Камень', icon: '🪨', type: 'resource', stack: 99, desc: '' },
  apple:   { id: 'apple',   name: 'Яблоко', icon: '🍎', type: 'food',     stack: 16, heal: 8, desc: '' },
  coal:    { id: 'coal',    name: 'Уголь',  icon: '⚫', type: 'fuel',     stack: 99, desc: '' },
  meat:    { id: 'meat',    name: 'Мясо',   icon: '🥩', type: 'food',     stack: 32, heal: 22, desc: '' },
  bone:    { id: 'bone',    name: 'Кость',  icon: '🦴', type: 'material', stack: 99, desc: '' },
  axe:     { id: 'axe',     name: 'Топор',  icon: '🪓', type: 'tool', use: 'wood',   power: 1, stack: 1, desc: '' },
  pickaxe: { id: 'pickaxe', name: 'Кирка',  icon: '⛏️', type: 'tool', use: 'stone',  power: 1, stack: 1, desc: '' },
  sword:   { id: 'sword',   name: 'Меч',    icon: '⚔️', type: 'tool', use: 'attack', power: 6, stack: 1, desc: '' },
};
const itemDef = id => ITEMS[id] || { id, name: id, icon: '❓', type: 'misc', stack: 99, desc: '' };
const itemMax = id => itemDef(id).stack ?? 99;
// где применяется предмет — выводим из рецептов (RECIPES в building.js), а не из текста.
// добавишь рецепт со стоимостью в этот id — он появится тут сам, описание трогать не нужно.
function itemUses(id) {
  if (typeof RECIPES !== 'object') return [];
  const out = [];
  for (const k in RECIPES) {
    const cost = RECIPES[k].cost;
    if (cost && cost[id]) out.push(RECIPES[k].name);
  }
  return out;
}

// Загружаем таблицу предметов из JSON и строим карту id → запись
fetch('data/items.json?v=13')
  .then(r => r.ok ? r.json() : Promise.reject('HTTP ' + r.status))
  .then(db => {
    const map = {};
    for (const it of db.items) map[it.id] = it;
    ITEMS = map;
    updateInv();
  })
  .catch(err => console.warn('items.json не загружен, использую запасную базу:', err));

const INV_SLOTS = 24;                 // 6×4 рюкзак
// Каждый слот: null | { id, count }
const inv = { slots: new Array(INV_SLOTS).fill(null) };

// --- элементы UI ---
const grid = document.getElementById('invGrid');
const invPanel = document.getElementById('inventory');

// ============ ОПЕРАЦИИ ============
function countItem(id) {
  let n = 0;
  for (const s of inv.slots) if (s && s.id === id) n += s.count;
  if (typeof belt !== 'undefined') for (const s of belt.slots) if (s && s.id === id) n += s.count;
  return n;
}
// свободное место под предмет (для стаков + пустых слотов)
function roomFor(id) {
  const max = itemMax(id);
  let room = 0;
  for (const s of inv.slots) {
    if (!s) room += max;
    else if (s.id === id) room += max - s.count;
  }
  return room;
}
// добавить предмет; возвращает остаток, который не поместился (0 — всё влезло)
function addItem(id, count) {
  const max = itemMax(id);
  for (const s of inv.slots) {          // сперва досыпаем в существующие стопки
    if (count <= 0) break;
    if (s && s.id === id && s.count < max) {
      const add = Math.min(max - s.count, count);
      s.count += add; count -= add;
    }
  }
  for (let i = 0; i < inv.slots.length && count > 0; i++) { // затем пустые слоты
    if (!inv.slots[i]) {
      const add = Math.min(max, count);
      inv.slots[i] = { id, count: add }; count -= add;
    }
  }
  updateInv();
  return count;
}
// убрать count штук предмета; true — если хватило
function removeItem(id, count) {
  if (countItem(id) < count) return false;
  for (let i = inv.slots.length - 1; i >= 0 && count > 0; i--) {
    const s = inv.slots[i];
    if (s && s.id === id) {
      const take = Math.min(s.count, count);
      s.count -= take; count -= take;
      if (s.count === 0) inv.slots[i] = null;
    }
  }
  if (typeof belt !== 'undefined') for (let i = belt.slots.length - 1; i >= 0 && count > 0; i--) {
    const s = belt.slots[i];
    if (s && s.id === id) {
      const take = Math.min(s.count, count);
      s.count -= take; count -= take;
      if (s.count === 0) belt.slots[i] = null;
    }
  }
  updateInv();
  return true;
}

// --- слот адресуется ссылкой { arr, i, kind }: работает и для рюкзака, и для пояса ---
function slotRefFromEl(el) {
  if (!el) return null;
  if (el.dataset.index !== undefined) return { arr: inv.slots, i: +el.dataset.index, kind: 'inv' };
  if (el.dataset.bi !== undefined && typeof belt !== 'undefined') return { arr: belt.slots, i: +el.dataset.bi, kind: 'belt' };
  return null;
}
const getSlot = ref => ref.arr[ref.i];
const setSlot = (ref, v) => { ref.arr[ref.i] = v; };

// перенос/слияние/обмен стопок между любыми слотами (рюкзак ↔ пояс)
function moveStackRef(from, to) {
  if (from.arr === to.arr && from.i === to.i) return;
  const a = getSlot(from), b = getSlot(to);
  if (!a) return;
  if (!b) { setSlot(to, a); setSlot(from, null); }
  else if (b.id === a.id) {
    const room = itemMax(a.id) - b.count;
    const mv = Math.min(room, a.count);
    b.count += mv; a.count -= mv;
    if (a.count <= 0) setSlot(from, null);
  } else { setSlot(to, a); setSlot(from, b); }
}

// ============ ОТРИСОВКА ============
function renderInventoryPanel() {
  let html = '';
  for (let i = 0; i < inv.slots.length; i++) {
    const s = inv.slots[i];
    if (s) {
      const it = itemDef(s.id);
      html += `<div class="invSlot filled" data-index="${i}" title="${it.name}">` +
              `<span class="ic">${it.icon}</span><span class="cnt">${s.count}</span></div>`;
    } else {
      html += `<div class="invSlot" data-index="${i}"></div>`;
    }
  }
  grid.innerHTML = html;
}
// «что-то изменилось» — обновить рюкзак, пояс и доступность рецептов
function updateInv() {
  renderInventoryPanel();
  if (typeof renderBelt === 'function') renderBelt();
  if (typeof refreshRecipes === 'function') refreshRecipes();
}

// ============ КАРТОЧКА ПРЕДМЕТА (по удержанию) ============
let tip = null; // всплывающая карточка с названием/описанием
function showTipSlot(s, x, y) {
  hideTip();
  if (!s) return;
  const it = itemDef(s.id);
  const uses = itemUses(s.id);
  // не вываливаем весь список (их могут быть сотни) — пара примеров + счётчик
  const MAX_USES = 3;
  let useLine = '';
  if (uses.length) {
    let label = uses.slice(0, MAX_USES).join(', ');
    if (uses.length > MAX_USES) label += ` +${uses.length - MAX_USES}`;
    useLine = `<div class="tipUse">🔨 Крафт (${uses.length}): ${label}</div>`;
  }
  tip = document.createElement('div');
  tip.className = 'invTip';
  tip.innerHTML = `<div class="tipName">${it.icon} ${it.name}</div>` +
                  (it.desc ? `<div class="tipDesc">${it.desc}</div>` : '') +
                  useLine;
  document.body.appendChild(tip);
  // разместить над пальцем/курсором, не вылезая за края экрана
  const r = tip.getBoundingClientRect();
  let left = x - r.width / 2;
  left = Math.max(8, Math.min(innerWidth - r.width - 8, left));
  let top = y - r.height - 16;
  if (top < 8) top = y + 16;
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}
function hideTip() {
  if (tip) { tip.remove(); tip = null; }
}

// ============ DRAG & DROP (мышь + палец) — рюкзак и пояс ============
let drag = null; // { from:ref, sx, sy, active, ghost, hold }

function makeGhostRef(ref) {
  const s = getSlot(ref);
  const g = document.createElement('div');
  g.className = 'invGhost';
  g.innerHTML = `<span class="ic">${itemDef(s.id).icon}</span>` +
                (s.count > 1 ? `<span class="cnt">${s.count}</span>` : '');
  return g;
}
function endDragCleanup() {
  if (drag && drag.ghost) drag.ghost.remove();
  drag = null;
}
// общий обработчик нажатия на слот — вешается и на рюкзак (grid), и на пояс (belt.js)
function onSlotDown(e) {
  const slotEl = e.target.closest('.invSlot, .beltSlot');
  if (!slotEl) return;
  const ref = slotRefFromEl(slotEl);
  if (!ref) return;
  e.preventDefault();
  hideTip();
  const has = !!getSlot(ref);
  drag = {
    from: ref, sx: e.clientX, sy: e.clientY, active: false, ghost: null,
    // удержание непустого слота — карточка предмета
    hold: has ? setTimeout(() => {
      if (drag && !drag.active) { showTipSlot(getSlot(ref), drag.sx, drag.sy); endDragCleanup(); }
    }, 400) : null,
  };
}
grid.addEventListener('pointerdown', onSlotDown);
addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!drag.active && Math.hypot(dx, dy) > 8 && getSlot(drag.from)) { // тащим только непустой
    drag.active = true;
    clearTimeout(drag.hold);
    drag.ghost = makeGhostRef(drag.from);
    document.body.appendChild(drag.ghost);
  }
  if (drag.active) {
    e.preventDefault();
    drag.ghost.style.left = e.clientX + 'px';
    drag.ghost.style.top = e.clientY + 'px';
  }
});
addEventListener('pointerup', e => {
  hideTip();
  if (!drag) return;
  clearTimeout(drag.hold);
  if (drag.active) {
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const tEl = under && under.closest && under.closest('.invSlot, .beltSlot');
    const toRef = slotRefFromEl(tEl);
    if (toRef) moveStackRef(drag.from, toRef);
    endDragCleanup();
    updateInv();
  } else {
    const ref = drag.from;
    drag = null;
    if (ref.kind === 'belt') { if (typeof selectBelt === 'function') selectBelt(ref.i); }
    else eatFromSlot(ref.i); // рюкзак: быстрый тап по еде — съесть
  }
});

// съесть 1 шт. еды из слота: восстановить здоровье игрока
function eatFromSlot(idx) {
  const s = inv.slots[idx];
  if (!s) return;
  const it = itemDef(s.id);
  if (it.type !== 'food' || !it.heal) return;
  if (typeof player === 'undefined' || player.hp >= player.maxHp) return; // не тратим впустую
  removeItem(s.id, 1);
  player.hp = Math.min(player.maxHp, player.hp + it.heal);
}

// ============ ОТКРЫТИЕ / ЗАКРЫТИЕ ============
function toggleInventory() {
  hideTip();
  const opening = !invPanel.classList.contains('open');
  invPanel.classList.toggle('open', opening);
  if (opening) {
    document.getElementById('craftPanel').classList.remove('open');
    document.getElementById('settings').classList.remove('open');
    renderInventoryPanel();
    document.exitPointerLock?.(); // вернуть курсор для перетаскивания
  }
}
document.getElementById('invBtn').addEventListener('click', toggleInventory);
// крестик закрывает свою панель (рюкзак/крафт) — на телефоне кнопка-переключатель под панелью
document.querySelectorAll('.panelClose').forEach(btn => {
  btn.addEventListener('click', () => { hideTip(); btn.closest('.panel').classList.remove('open'); });
});

// ============ СТАРТОВЫЙ НАБОР ============
addItem('wood', 120);
addItem('stone', 80);
addItem('apple', 3);
addItem('coal', 2);
setTimeout(updateInv, 0); // показать всё сразу после загрузки остальных модулей
