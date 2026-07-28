// ============ ИНВЕНТАРЬ (слоты + стаки) ============
// Реестр предметов: id → отображение и максимум в стопке
const ITEMS = {
  wood:  { name: 'Дерево', icon: '🪵', max: 99 },
  stone: { name: 'Камень', icon: '🪨', max: 99 },
  apple: { name: 'Яблоко', icon: '🍎', max: 16 },
  coal:  { name: 'Уголь',  icon: '⚫', max: 99 },
};
const itemMax = id => ITEMS[id]?.max ?? 99;

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
// разделить стопку пополам в ближайший пустой слот
function splitStack(idx) {
  const s = inv.slots[idx];
  if (!s || s.count < 2) return;
  const empty = inv.slots.indexOf(null);
  if (empty < 0) return;
  const half = Math.floor(s.count / 2);
  s.count -= half;
  inv.slots[empty] = { id: s.id, count: half };
}

// ============ ОТРИСОВКА ============
function renderInventoryPanel() {
  let html = '';
  for (let i = 0; i < inv.slots.length; i++) {
    const s = inv.slots[i];
    if (s) {
      const it = ITEMS[s.id];
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

// ============ DRAG & DROP (мышь + палец) ============
let drag = null; // { from, sx, sy, active, ghost, lp }

function makeGhost(idx) {
  const s = inv.slots[idx];
  const g = document.createElement('div');
  g.className = 'invGhost';
  g.innerHTML = `<span class="ic">${ITEMS[s.id].icon}</span><span class="cnt">${s.count}</span>`;
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
  drag = {
    from: idx, sx: e.clientX, sy: e.clientY, active: false, ghost: null,
    // долгое нажатие без движения — разделить стопку (мобильный аналог ПКМ)
    lp: setTimeout(() => {
      if (drag && !drag.active) { splitStack(idx); endDragCleanup(); updateInv(); }
    }, 500),
  };
});
addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!drag.active && Math.hypot(dx, dy) > 8) {      // начали тащить
    drag.active = true;
    clearTimeout(drag.lp);
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
  if (!drag) return;
  clearTimeout(drag.lp);
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
// ПКМ на десктопе — разделить стопку пополам
grid.addEventListener('contextmenu', e => {
  const slotEl = e.target.closest('.invSlot');
  if (slotEl && grid.contains(slotEl)) {
    e.preventDefault();
    splitStack(+slotEl.dataset.index);
    updateInv();
  }
});

// ============ ОТКРЫТИЕ / ЗАКРЫТИЕ ============
function toggleInventory() {
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

// ============ СТАРТОВЫЙ НАБОР ============
addItem('wood', 120);
addItem('stone', 80);
addItem('apple', 3);
addItem('coal', 2);
setTimeout(updateInv, 0); // показать всё сразу после загрузки остальных модулей
