// ============ ПОЯС (hotbar) ============
// Слоты с инструментами; активный определяет действие (см. gather.js).
// Пустой слот = кулак (слабая атака голыми руками).
const belt = { slots: ['axe', 'pickaxe', 'sword', null], active: 0 };
const FIST = { id: 'fist', name: 'Кулак', icon: '👊', use: 'attack', power: 2 };

function activeTool() {
  const id = belt.slots[belt.active];
  return id ? itemDef(id) : FIST;
}
function selectBelt(i) {
  if (i >= 0 && i < belt.slots.length) { belt.active = i; renderBelt(); }
}

const beltEl = document.getElementById('belt');
function renderBelt() {
  let html = '';
  for (let i = 0; i < belt.slots.length; i++) {
    const id = belt.slots[i];
    const it = id ? itemDef(id) : null;
    html += `<div class="beltSlot${i === belt.active ? ' active' : ''}" data-bi="${i}">` +
            (it ? `<span class="ic">${it.icon}</span>` : '') +
            `<span class="bk">${i + 1}</span></div>`;
  }
  beltEl.innerHTML = html;
}
// тап/клик по слоту — сделать активным
beltEl.addEventListener('pointerdown', e => {
  const s = e.target.closest('.beltSlot');
  if (s) { e.preventDefault(); selectBelt(+s.dataset.bi); }
});
renderBelt();
setTimeout(renderBelt, 0); // перерисовать после загрузки базы предметов (иконки)
