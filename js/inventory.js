// ============ ИНВЕНТАРЬ (слоты + стаки) ============
// База предметов лежит в data/items.json как таблица записей с первичным ключом id.
// Всё в игре ссылается на предмет по строковому id: слоты рюкзака { id, count },
// дропы при добыче (gather.js), стоимость рецептов (building.js) и будущие лежащие
// в мире предметы { id, count, x, z }. ITEMS — карта id → запись (строится из таблицы).
// Ниже — запасной минимум на случай, если json не загрузился (например, через file://).
let ITEMS = {
  wood:  { id: 'wood',  name: 'Дерево', icon: '🪵', type: 'resource', stack: 99, desc: '' },
  stone: { id: 'stone', name: 'Камень', icon: '🪨', type: 'resource', stack: 99, desc: '' },
  apple: { id: 'apple', name: 'Яблоко', icon: '🍎', type: 'food',     stack: 16, desc: '' },
  coal:  { id: 'coal',  name: 'Уголь',  icon: '⚫', type: 'fuel',     stack: 99, desc: '' },
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
fetch('data/items.json?v=5')
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
  updateInv();
  return true;
}

// перенос/слияние/обмен стопок между слотами
function moveStack(from, to) {
  if (from === to) return;
  const a = inv.slots[from], b = inv.slots[to];
  if (!a) return;
  if (!b) { inv.slots[to] = a; inv.slots[from] = null; }
  else if (b.id === a.id) {              // слить однотипные
    const room = itemMax(a.id) - b.count;
    const mv = Math.min(room, a.count);
    b.count += mv; a.count -= mv;
    if (a.count <= 0) inv.slots[from] = null;
  } else { inv.slots[to] = a; inv.slots[from] = b; } // обмен
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
// «что-то изменилось» — обновить рюкзак и доступность рецептов
function updateInv() {
  renderInventoryPanel();
  if (typeof refreshRecipes === 'function') refreshRecipes();
}

// ============ КАРТОЧКА ПРЕДМЕТА (по удержанию) ============
let tip = null; // всплывающая карточка с названием/описанием
function showTip(idx, x, y) {
  hideTip();
  const s = inv.slots[idx];
  if (!s) return;
  const it = itemDef(s.id);
  const uses = itemUses(s.id);
  tip = document.createElement('div');
  tip.className = 'invTip';
  tip.innerHTML = `<div class="tipName">${it.icon} ${it.name}</div>` +
                  (it.desc ? `<div class="tipDesc">${it.desc}</div>` : '') +
                  (uses.length ? `<div class="tipUse">🔨 Крафт: ${uses.join(', ')}</div>` : '');
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

// ============ DRAG & DROP (мышь + палец) ============
let drag = null; // { from, sx, sy, active, ghost, hold }

function makeGhost(idx) {
  const s = inv.slots[idx];
  const g = document.createElement('div');
  g.className = 'invGhost';
  g.innerHTML = `<span class="ic">${itemDef(s.id).icon}</span><span class="cnt">${s.count}</span>`;
  return g;
}
function endDragCleanup() {
  if (drag && drag.ghost) drag.ghost.remove();
  drag = null;
}
grid.addEventListener('pointerdown', e => {
  const slotEl = e.target.closest('.invSlot');
  if (!slotEl || !grid.contains(slotEl)) return;
  const idx = +slotEl.dataset.index;
  if (!inv.slots[idx]) return;
  e.preventDefault();
  hideTip();
  drag = {
    from: idx, sx: e.clientX, sy: e.clientY, active: false, ghost: null,
    // удержание без движения — показать карточку предмета (и отменить перетаскивание)
    hold: setTimeout(() => {
      if (drag && !drag.active) { showTip(idx, drag.sx, drag.sy); endDragCleanup(); }
    }, 400),
  };
});
addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!drag.active && Math.hypot(dx, dy) > 8) {      // начали тащить
    drag.active = true;
    clearTimeout(drag.hold);
    drag.ghost = makeGhost(drag.from);
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
    const tEl = under && under.closest && under.closest('.invSlot');
    if (tEl && grid.contains(tEl)) moveStack(drag.from, +tEl.dataset.index);
    endDragCleanup();
    updateInv();
  } else {
    drag = null; // просто тап — ничего
  }
});

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
