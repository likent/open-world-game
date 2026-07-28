// ============ ПОЯС (hotbar) ============
// Держит ЛЮБЫЕ предметы — перетаскивай из рюкзака. Поведение активного зависит от типа:
//  инструмент — добывает/бьёт; еда — съедается кнопкой действия; прочее — просто «в руке».
const belt = {
  slots: [{ id: 'axe', count: 1 }, { id: 'pickaxe', count: 1 }, { id: 'sword', count: 1 }, null],
  active: 0,
};

function heldId()  { const s = belt.slots[belt.active]; return s ? s.id : null; }
function heldDef() { const id = heldId(); return id ? itemDef(id) : null; }
// режим действия по активному предмету
function heldMode() {
  const d = heldDef();
  if (!d) return 'fist';            // пустая рука — можно бить/добывать (медленно)
  if (d.type === 'tool') return 'tool';
  if (d.type === 'food') return 'food';
  return 'hold';                    // прочее — просто держим
}
function heldIcon() { const d = heldDef(); return d ? d.icon : '👊'; }
function selectBelt(i) { if (i >= 0 && i < belt.slots.length) { belt.active = i; renderBelt(); } }

// съесть активную еду (по кнопке действия)
function eatHeld() {
  const s = belt.slots[belt.active];
  if (!s) return false;
  const d = itemDef(s.id);
  if (d.type !== 'food' || !d.heal) return false;
  if (typeof player !== 'undefined' && player.hp >= player.maxHp) return false; // не тратим впустую
  s.count--;
  if (s.count <= 0) belt.slots[belt.active] = null;
  if (typeof player !== 'undefined') player.hp = Math.min(player.maxHp, player.hp + d.heal);
  renderBelt();
  return true;
}

const beltEl = document.getElementById('belt');
function renderBelt() {
  let html = '';
  for (let i = 0; i < belt.slots.length; i++) {
    const s = belt.slots[i];
    const it = s ? itemDef(s.id) : null;
    html += `<div class="beltSlot${i === belt.active ? ' active' : ''}" data-bi="${i}">` +
            (it ? `<span class="ic">${it.icon}</span>` : '') +
            (s && s.count > 1 ? `<span class="cnt">${s.count}</span>` : '') +
            `<span class="bk">${i + 1}</span></div>`;
  }
  beltEl.innerHTML = html;
}
// перетаскивание/удержание берёт общий обработчик из inventory.js; тап = выбрать слот
beltEl.addEventListener('pointerdown', onSlotDown);
renderBelt();
setTimeout(renderBelt, 0); // перерисовать иконки после загрузки базы предметов
