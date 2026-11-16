const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyqH5o5vTCqu-OP_ZBQOJb7jhaCRMQxiDGxqM-W9HXMW6RVPBj6xfkHBh5o7yZktNuW/exec';

const STORAGE_KEY = 'nosso_caixa_v5';
const HISTORY_KEY = 'nosso_caixa_undo_v5';
const THEME_KEY = 'nosso_caixa_theme';
const PHOTO_KEY = 'pudi_financas_photo';
const RAW_PHOTO_KEY = 'pudi_financas_raw_photo';
const MAX_UNDO = 200;

const TAB_TITLES = {
  'visao-geral': 'Visão Geral',
  'entradas': 'Entradas',
  'despesas': 'Despesas & Fixos',
  'metas': 'Cofre, Metas & Vontades',
  'arquivos': 'Arquivos',
};

let activeTabId = 'visao-geral';

const today = new Date();
const defaultMonthKey = '2026-11';

function initialIncomes(monthKey) {
  const d = `${monthKey}-05`;
  return [
    { id: 'inc-1', person: 'Maria Eduarda', description: 'Cobi', amount: 1750.00, date: d, isDefaultMonthly: true },
    { id: 'inc-2', person: 'Maria Eduarda', description: 'Dehon', amount: 300.00, date: d, isDefaultMonthly: true },
    { id: 'inc-3', person: 'Maria Eduarda', description: 'Club', amount: 400.00, date: d, isDefaultMonthly: true },
    { id: 'inc-pensao', person: 'Maria Eduarda', description: 'Pensão', amount: 600.00, date: d, isDefaultMonthly: true },
    { id: 'inc-4', person: 'Yagho', description: 'F&F Energia (Salário Base)', amount: 2000.00, date: d, isDefaultMonthly: true },
    { id: 'inc-5', person: 'Yagho', description: 'F&F Energia (Ajuda de Custo)', amount: 500.00, date: d, isDefaultMonthly: true, isYaghoAllowance: true },
  ];
}

function initialFixedBills() {
  return [
    { id: 'f-1', name: 'Aluguel', amount: 1217.00, kind: 'Fixo', status: 'Pago' },
    { id: 'f-2', name: 'Luz', amount: 130.00, kind: 'Fixo', status: 'Pago' },
    { id: 'f-3', name: 'Água', amount: 157.34, kind: 'Fixo', status: 'Pago' },
    { id: 'f-4', name: 'Internet', amount: 90.00, kind: 'Fixo', status: 'Pago' },
    { id: 'f-5', name: 'Compras', amount: 400.00, kind: 'Fixo', status: 'Pago' },
    { id: 'f-6', name: 'Ração animais', amount: 100.00, kind: 'Fixo', status: 'Pago' },
    { id: 'f-7', name: 'Plano de Saúde', amount: 280.00, kind: 'Fixo', status: 'Pago' },
    { id: 'f-8', name: 'iCloud', amount: 20.00, kind: 'Fixo', status: 'Pago' },
    { id: 'f-9', name: 'Cartão (Fatura atual)', amount: 547.57, kind: 'Fixo', status: 'Pago', isCardBill: true },
    { id: 'f-10', name: 'Santander', amount: 120.00, kind: 'Fixo', status: 'Pago' },
    { id: 'p-1', name: 'Guarda roupa e sapateira', amount: 382.83, kind: 'Parcelado', status: 'Pago', curr: 4, total: 12 },
    { id: 'p-2', name: 'Pintor', amount: 111.35, kind: 'Parcelado', status: 'Pago', curr: 3, total: 6 },
    { id: 'p-3', name: 'Pintor 2', amount: 111.35, kind: 'Parcelado', status: 'Pago', curr: 2, total: 6 },
    { id: 'p-4', name: 'Empréstimo', amount: 321.50, kind: 'Parcelado', status: 'Pago', curr: 3, total: 14 },
    { id: 'p-5', name: 'Vestido', amount: 45.00, kind: 'Parcelado', status: 'Pago', curr: 3, total: 4 },
    { id: 'p-6', name: 'Roupa Yagho', amount: 34.00, kind: 'Parcelado', status: 'Pago', curr: 3, total: 10 },
    { id: 'p-7', name: 'Relicário', amount: 35.45, kind: 'Parcelado', status: 'Pago', curr: 3, total: 4 },
  ];
}

function initialDailyExpenses(monthKey) {
  return [
    {
      id: 'adj-pix-nov',
      description: 'Ajuste gastos extras (Novembro)',
      totalAmount: 496.61,
      installments: 1,
      curr: 1,
      monthlyAmount: 496.61,
      date: `${monthKey}-16`,
      paymentMethod: 'Pix/Débito',
      status: 'Pago',
    },
    {
      id: 'adj-card-nov',
      description: 'Compras no cartão (Fatura Dezembro)',
      totalAmount: 499.89,
      installments: 1,
      curr: 1,
      monthlyAmount: 499.89,
      date: `${monthKey}-16`,
      paymentMethod: 'Cartão de Crédito',
      status: 'Pendente',
    },
  ];
}

function createInitialState() {
  return {
    currentMonthKey: defaultMonthKey,
    cardLimitTotal: 500.00,
    vaultSaved: 0,
    incomes: initialIncomes(defaultMonthKey),
    fixedBills: initialFixedBills(),
    dailyExpenses: initialDailyExpenses(defaultMonthKey),
    goals: [],
    goalCategories: ['Viagem', 'Carro', 'Casa', 'Reserva'],
    archives: [],
  };
}

let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || createInitialState();
if (!Array.isArray(state.goalCategories)) {
  state.goalCategories = ['Viagem', 'Carro', 'Casa', 'Reserva'];
}
if (typeof state.vaultSaved !== 'number') {
  state.vaultSaved = 0;
}

let undoStack = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

// Foto do Casal + Menu Flutuante ao Clicar + Editor de Centralização e Zoom
function applyCouplePhoto(dataUrl) {
  const imgs = [document.getElementById('avatar-img-side'), document.getElementById('avatar-img-mobile')];
  const fallbacks = [document.getElementById('avatar-fallback-side'), document.getElementById('avatar-fallback-mobile')];

  if (dataUrl) {
    imgs.forEach((img) => {
      img.src = dataUrl;
      img.classList.remove('hidden');
    });
    fallbacks.forEach((fb) => fb.classList.add('hidden'));
  } else {
    imgs.forEach((img) => img.classList.add('hidden'));
    fallbacks.forEach((fb) => fb.classList.remove('hidden'));
  }
}

applyCouplePhoto(localStorage.getItem(PHOTO_KEY));

const photoInput = document.getElementById('couple-photo-input');
const cropModal = document.getElementById('photo-crop-modal');
const cropCircle = document.getElementById('crop-circle-box');
const cropImg = document.getElementById('crop-preview-img');
const zoomRange = document.getElementById('crop-zoom-range');
const zoomLabel = document.getElementById('crop-zoom-label');
const popSide = document.getElementById('avatar-popover-side');
const popMobile = document.getElementById('avatar-popover-mobile');

function closeAvatarPopovers() {
  popSide.classList.add('hidden');
  popMobile.classList.add('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.avatar-menu-anchor')) {
    closeAvatarPopovers();
  }
});

function handleAvatarClick(popoverEl) {
  const hasPhoto = Boolean(localStorage.getItem(PHOTO_KEY));
  if (!hasPhoto) {
    photoInput.click();
    return;
  }
  const isOpen = !popoverEl.classList.contains('hidden');
  closeAvatarPopovers();
  if (!isOpen) popoverEl.classList.remove('hidden');
}

document.getElementById('avatar-btn-side').addEventListener('click', () => handleAvatarClick(popSide));
document.getElementById('avatar-btn-mobile').addEventListener('click', () => handleAvatarClick(popMobile));

function triggerAdjustCurrentPhoto() {
  closeAvatarPopovers();
  const raw = localStorage.getItem(RAW_PHOTO_KEY) || localStorage.getItem(PHOTO_KEY);
  if (raw) openCropModal(raw);
}

function triggerChangeNewPhoto() {
  closeAvatarPopovers();
  photoInput.click();
}

document.getElementById('opt-adjust-side').addEventListener('click', triggerAdjustCurrentPhoto);
document.getElementById('opt-adjust-mobile').addEventListener('click', triggerAdjustCurrentPhoto);
document.getElementById('opt-change-side').addEventListener('click', triggerChangeNewPhoto);
document.getElementById('opt-change-mobile').addEventListener('click', triggerChangeNewPhoto);

let cropState = {
  imgObj: null,
  baseScale: 1,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  startX: 0,
  startY: 0,
};

function clampCropOffsets() {
  if (!cropState.imgObj) return;
  const boxSize = 210;
  const scale = cropState.baseScale * cropState.zoom;
  const dispW = cropState.imgObj.width * scale;
  const dispH = cropState.imgObj.height * scale;
  const minX = Math.min(0, boxSize - dispW);
  const minY = Math.min(0, boxSize - dispH);
  cropState.offsetX = Math.max(minX, Math.min(0, cropState.offsetX));
  cropState.offsetY = Math.max(minY, Math.min(0, cropState.offsetY));
}

function updateCropTransform() {
  if (!cropState.imgObj) return;
  clampCropOffsets();
  const scale = cropState.baseScale * cropState.zoom;
  cropImg.style.width = `${cropState.imgObj.width * scale}px`;
  cropImg.style.height = `${cropState.imgObj.height * scale}px`;
  cropImg.style.transform = `translate(${cropState.offsetX}px, ${cropState.offsetY}px)`;
  zoomLabel.textContent = `${Math.round(cropState.zoom * 100)}%`;
}

function openCropModal(rawSrc) {
  const img = new Image();
  img.onload = () => {
    const boxSize = 210;
    const baseScale = Math.max(boxSize / img.width, boxSize / img.height);
    cropState = {
      imgObj: img,
      baseScale,
      zoom: 1,
      offsetX: (boxSize - img.width * baseScale) / 2,
      offsetY: (boxSize - img.height * baseScale) / 2,
      dragging: false,
      startX: 0,
      startY: 0,
    };
    zoomRange.value = '1';
    cropImg.src = rawSrc;
    updateCropTransform();
    cropModal.classList.remove('hidden');
  };
  img.src = rawSrc;
}

cropCircle.addEventListener('pointerdown', (e) => {
  cropState.dragging = true;
  cropState.startX = e.clientX - cropState.offsetX;
  cropState.startY = e.clientY - cropState.offsetY;
  cropCircle.setPointerCapture(e.pointerId);
});

cropCircle.addEventListener('pointermove', (e) => {
  if (!cropState.dragging) return;
  cropState.offsetX = e.clientX - cropState.startX;
  cropState.offsetY = e.clientY - cropState.startY;
  updateCropTransform();
});

cropCircle.addEventListener('pointerup', () => { cropState.dragging = false; });
cropCircle.addEventListener('pointercancel', () => { cropState.dragging = false; });

zoomRange.addEventListener('input', () => {
  const boxCenter = 105;
  const oldScale = cropState.baseScale * cropState.zoom;
  cropState.zoom = Number(zoomRange.value);
  const newScale = cropState.baseScale * cropState.zoom;
  cropState.offsetX = boxCenter - ((boxCenter - cropState.offsetX) / oldScale) * newScale;
  cropState.offsetY = boxCenter - ((boxCenter - cropState.offsetY) / oldScale) * newScale;
  updateCropTransform();
});

document.getElementById('btn-save-crop').addEventListener('click', () => {
  if (!cropState.imgObj) return;
  const outSize = 260;
  const ratio = outSize / 210;
  const scale = cropState.baseScale * cropState.zoom * ratio;
  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    cropState.imgObj,
    cropState.offsetX * ratio,
    cropState.offsetY * ratio,
    cropState.imgObj.width * scale,
    cropState.imgObj.height * scale
  );
  const finalDataUrl = canvas.toDataURL('image/jpeg', 0.88);
  localStorage.setItem(PHOTO_KEY, finalDataUrl);
  applyCouplePhoto(finalDataUrl);
  cropModal.classList.add('hidden');
  showToast('Foto centralizada na bolinha!');
});

document.getElementById('btn-close-crop').addEventListener('click', () => cropModal.classList.add('hidden'));
document.getElementById('btn-pick-new-photo').addEventListener('click', () => photoInput.click());

photoInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const rawDataUrl = ev.target.result;
    try { localStorage.setItem(RAW_PHOTO_KEY, rawDataUrl); } catch {}
    openCropModal(rawDataUrl);
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

// Tema Claro / Escuro
let currentTheme = localStorage.getItem(THEME_KEY) || 'light';
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  document.getElementById('btn-theme-side').textContent = theme === 'dark' ? '☀ Modo Claro' : '◐ Modo Escuro';
}
applyTheme(currentTheme);

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}
document.getElementById('btn-theme-side').addEventListener('click', toggleTheme);
document.getElementById('btn-theme-mobile').addEventListener('click', toggleTheme);

// Pilha de Desfazer (200 ações)
function pushUndo() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > MAX_UNDO) {
    undoStack.shift();
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(undoStack));
  updateUndoButtons();
}

function performUndo() {
  if (undoStack.length === 0) return;
  const previousJson = undoStack.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(undoStack));
  state = JSON.parse(previousJson);
  saveState(false);
  renderAll();
  showToast(`Ação desfeita! (${undoStack.length} restante(s))`);
}

function updateUndoButtons() {
  const count = undoStack.length;
  const disabled = count === 0;
  document.getElementById('btn-undo-side').disabled = disabled;
  document.getElementById('btn-undo-side').textContent = `↶ Desfazer (${count})`;
  document.getElementById('btn-undo-header').disabled = disabled;
  document.getElementById('btn-undo-header').textContent = `↶ Desfazer (${count})`;
  document.getElementById('btn-undo-mobile').disabled = disabled;
  document.getElementById('btn-undo-mobile').textContent = `↶ ${count}`;
}

document.getElementById('btn-undo-side').addEventListener('click', performUndo);
document.getElementById('btn-undo-header').addEventListener('click', performUndo);
document.getElementById('btn-undo-mobile').addEventListener('click', performUndo);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    performUndo();
  }
});

document.getElementById('daily-date').value = today.toISOString().slice(0, 10);

function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function pad2(n) { return String(n).padStart(2, '0'); }

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  const str = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function nextMonthKey(key, offset = 1) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

// =========================================================================
// CÁLCULO FINANCEIRO COM REGRA REAL DO CARTÃO (FATURA NO MÊS SEGUINTE)
// =========================================================================
function computeBudget() {
  const commissionActive = state.incomes.some((i) => {
    const desc = (i.description || '').toLowerCase();
    return i.person === 'Yagho' && desc.includes('comiss') && Number(i.amount) > 0;
  });

  const effectiveIncomes = state.incomes.map((i) => ({
    ...i,
    suppressed: commissionActive && Boolean(i.isYaghoAllowance),
  }));

  const totalMaria = effectiveIncomes
    .filter((i) => i.person === 'Maria Eduarda')
    .reduce((s, i) => s + (i.suppressed ? 0 : Number(i.amount)), 0);

  const totalYagho = effectiveIncomes
    .filter((i) => i.person === 'Yagho')
    .reduce((s, i) => s + (i.suppressed ? 0 : Number(i.amount)), 0);

  const totalIncome = totalMaria + totalYagho;
  const totalFixed = state.fixedBills.reduce((s, b) => s + Number(b.amount), 0);

  let totalDailyPix = 0;
  let totalDailyCard = 0;
  state.dailyExpenses.forEach((d) => {
    if (d.paymentMethod === 'Cartão de Crédito') totalDailyCard += Number(d.monthlyAmount);
    else totalDailyPix += Number(d.monthlyAmount);
  });

  const totalSpent = totalFixed + totalDailyPix;
  const freeBalance = totalIncome - totalFixed - totalDailyPix;
  const cardLimitAvailable = Number(state.cardLimitTotal) - totalDailyCard;
  const pendingBills = state.fixedBills.filter((b) => b.status === 'Pendente');
  const pendingTotal = pendingBills.reduce((s, b) => s + Number(b.amount), 0);

  return {
    commissionActive, effectiveIncomes, totalMaria, totalYagho, totalIncome,
    totalFixed, totalDailyPix, totalDailyCard, totalSpent, freeBalance,
    cardLimitAvailable, pendingBills, pendingTotal,
  };
}

function buildForecast(monthsAhead = 6) {
  const currentTotalFixed = state.fixedBills.reduce((s, b) => s + Number(b.amount), 0);
  const results = [];

  for (let offset = 1; offset <= monthsAhead; offset++) {
    const key = nextMonthKey(state.currentMonthKey, offset);
    let fixedSum = 0;
    const endedThisMonth = [];

    state.fixedBills.forEach((b) => {
      if (b.isCardBill || b.name.toLowerCase().includes('fatura atual')) {
        return;
      }
      if (b.kind === 'Fixo') {
        fixedSum += Number(b.amount);
      } else if (b.kind === 'Parcelado') {
        const futureCurr = b.curr + offset;
        if (futureCurr <= b.total) {
          fixedSum += Number(b.amount);
        } else if (futureCurr === b.total + 1) {
          endedThisMonth.push(b.name);
        }
      }
    });

    state.dailyExpenses.forEach((d) => {
      if (d.paymentMethod === 'Cartão de Crédito') {
        const futureCardCurr = d.curr + (offset - 1);
        if (futureCardCurr <= d.installments) {
          fixedSum += Number(d.monthlyAmount);
        } else if (futureCardCurr === d.installments + 1 && d.installments > 1) {
          endedThisMonth.push(d.description);
        }
      } else if (d.installments > 1 && d.curr + offset <= d.installments) {
        fixedSum += Number(d.monthlyAmount);
      }
    });

    results.push({
      label: monthLabel(key),
      fixedSum,
      savingsComparedToNow: Math.max(0, currentTotalFixed - fixedSum),
      endedThisMonth,
    });
  }
  return results;
}

function saveState(syncRemote = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (syncRemote && SHEETS_URL && SHEETS_URL !== 'COLOQUE_AQUI_SEU_WEBHOOK') {
    fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(state),
    }).catch((err) => console.error('Sheets POST:', err));
  }
}

async function loadFromSheets(manual = false) {
  if (!SHEETS_URL || SHEETS_URL === 'COLOQUE_AQUI_SEU_WEBHOOK') return;
  if (manual) showToast('Sincronizando com a planilha...');
  try {
    const res = await fetch(SHEETS_URL);
    const data = await res.json();
    if (data && Array.isArray(data.incomes) && Array.isArray(data.fixedBills)) {
      state = { ...state, ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderAll();
      if (manual) showToast('Planilha sincronizada com sucesso!');
    } else if (manual) {
      saveState(true);
      showToast('Dados enviados para a planilha!');
    }
  } catch (err) {
    console.error('Sheets GET:', err);
    if (manual) showToast('Erro ao conectar com a planilha.');
  }
}

function renderAll() {
  updateUndoButtons();
  const b = computeBudget();
  const mLabel = monthLabel(state.currentMonthKey);

  // Cabeçalho Dinâmico
  document.getElementById('header-month-pill').textContent = mLabel;
  document.getElementById('header-tab-title').textContent = TAB_TITLES[activeTabId] || 'Visão Geral';
  document.getElementById('header-status-subtitle').textContent = b.pendingBills.length > 0
    ? `${b.pendingBills.length} conta(s) pendente(s) · ${brl(b.freeBalance)} livre para gastar`
    : `Tudo pago por aqui · ${brl(b.freeBalance)} livre para gastar`;

  // Visão Geral
  document.getElementById('ov-free').textContent = brl(b.freeBalance);
  document.getElementById('ov-income').textContent = brl(b.totalIncome);
  document.getElementById('ov-income-note').textContent = b.commissionActive ? 'Comissão F&F ativa (Ajuda zerada)' : 'Salários base + Ajuda F&F + Pensão';
  document.getElementById('ov-spent').textContent = brl(b.totalSpent);
  document.getElementById('ov-card').textContent = brl(b.cardLimitAvailable);
  document.getElementById('ov-card-note').textContent = `De ${brl(state.cardLimitTotal)} (fatura no próx. mês)`;

  const alertEl = document.getElementById('pending-alert');
  if (b.pendingBills.length > 0) {
    alertEl.classList.remove('hidden');
    alertEl.innerHTML = `
      <div><strong>Alerta:</strong> ${b.pendingBills.length} conta(s) fixa(s)/parcela(s) pendente(s) somando <strong class="num">${brl(b.pendingTotal)}</strong>.</div>
      <button type="button" class="btn-outline" onclick="switchTab('despesas')">Revisar Contas</button>
    `;
  } else {
    alertEl.classList.add('hidden');
  }

  // Projeção Próximos Meses
  const forecast = buildForecast(6);
  document.getElementById('ov-forecast-grid').innerHTML = forecast.map((f) => `
    <div class="forecast-box">
      <span class="forecast-month">${f.label}</span>
      <strong class="forecast-val num">${brl(f.fixedSum)}</strong>
      ${f.savingsComparedToNow > 0 ? `<span class="forecast-diff num">− ${brl(f.savingsComparedToNow)} vs mês atual</span>` : '<span class="card-meta">Mesmo patamar atual</span>'}
      ${f.endedThisMonth.length ? `<div class="forecast-ended">Acaba: <strong>${f.endedThisMonth.join(', ')}</strong></div>` : ''}
    </div>
  `).join('');

  // Entradas (Maria Eduarda & Yagho separados)
  document.getElementById('inc-total').textContent = brl(b.totalIncome);
  document.getElementById('inc-total-maria').textContent = brl(b.totalMaria);
  document.getElementById('inc-total-yagho').textContent = brl(b.totalYagho);
  document.getElementById('inc-rule-banner').textContent = b.commissionActive
    ? 'Regra F&F ativa: Ajuda de Custo (R$ 500,00) zerada automaticamente pela Comissão F&F.'
    : 'Regra F&F padrão: Salário Base (R$ 2.000,00) + Ajuda de Custo (R$ 500,00).';

  const renderIncomeRows = (personName) => b.effectiveIncomes
    .filter((inc) => inc.person === personName)
    .map((inc) => `
      <div class="list-row">
        <div>
          <div class="row-title ${inc.suppressed ? 'strike' : ''}">${inc.description}</div>
          ${inc.suppressed ? '<div class="row-sub">Zerada pela Comissão F&F</div>' : ''}
        </div>
        <div class="btn-row">
          <strong class="num ${inc.suppressed ? 'strike' : 'text-green'}">${inc.suppressed ? brl(0) : brl(inc.amount)}</strong>
          <button type="button" class="btn-delete" onclick="deleteIncome('${inc.id}')">✕</button>
        </div>
      </div>
    `).join('');

  document.getElementById('income-list-maria').innerHTML = renderIncomeRows('Maria Eduarda');
  document.getElementById('income-list-yagho').innerHTML = renderIncomeRows('Yagho');

  // Despesas & Fixos
  document.getElementById('exp-free').textContent = brl(b.freeBalance);
  document.getElementById('exp-total').textContent = brl(b.totalSpent);
  document.getElementById('exp-card').textContent = brl(b.cardLimitAvailable);
  document.getElementById('exp-card-note').textContent = `Limite: ${brl(state.cardLimitTotal)} · Próx. fatura: ${brl(b.totalDailyCard)}`;
  document.getElementById('fixed-total-label').textContent = `${state.fixedBills.length} itens · Total ${brl(b.totalFixed)}`;

  document.getElementById('fixed-list').innerHTML = state.fixedBills.map((item) => `
    <div class="list-row">
      <div>
        <div class="row-title">${item.name}</div>
        <div class="row-sub num">${item.kind}${item.kind === 'Parcelado' ? ` · Parcela ${pad2(item.curr)}/${pad2(item.total)}` : ''}</div>
      </div>
      <div class="btn-row">
        <strong class="num">${brl(item.amount)}</strong>
        <button type="button" class="status-btn ${item.status === 'Pago' ? 'pago' : 'pendente'}" onclick="toggleFixedStatus('${item.id}')">${item.status}</button>
        ${item.kind === 'Parcelado' ? `<button type="button" class="btn-outline" onclick="advanceInstallment('${item.id}')">+1 Parc.</button>` : ''}
      </div>
    </div>
  `).join('');

  document.getElementById('daily-list').innerHTML = state.dailyExpenses.length === 0
    ? '<p class="card-meta">Nenhum gasto avulso lançado.</p>'
    : state.dailyExpenses.map((d) => `
      <div class="list-row">
        <div>
          <div class="row-title">${d.description}</div>
          <div class="row-sub num">${d.paymentMethod}${d.paymentMethod === 'Cartão de Crédito' ? ' (Vence próx. mês)' : ''} · ${pad2(d.curr)}/${pad2(d.installments)} · ${d.date.split('-').reverse().join('/')}</div>
        </div>
        <div class="btn-row">
          <strong class="num text-red">${brl(d.monthlyAmount)}</strong>
          <button type="button" class="status-btn ${d.status === 'Pago' ? 'pago' : 'pendente'}" onclick="toggleDailyStatus('${d.id}')">${d.status}</button>
          <button type="button" class="btn-delete" onclick="deleteDaily('${d.id}')">✕</button>
        </div>
      </div>
    `).join('');

  // Cofre, Metas e Vontades
  document.getElementById('vault-total').textContent = brl(state.vaultSaved);

  const catSelect = document.getElementById('goal-cat');
  const currentCat = catSelect.value;
  catSelect.innerHTML = state.goalCategories.map((c) => `<option value="${c}">${c}</option>`).join('');
  if (state.goalCategories.includes(currentCat)) catSelect.value = currentCat;

  document.getElementById('goals-list').innerHTML = state.goals.length === 0
    ? '<article class="card"><p class="card-meta">Nenhuma meta ou vontade adicionada ainda.</p></article>'
    : state.goals.map((g) => {
      const isVontade = g.kind === 'vontade';
      const hasTarget = Number(g.targetAmount) > 0;
      const saved = Number(g.savedAmount || 0);
      const target = Number(g.targetAmount || 0);
      const monthly = Number(g.monthlyContribution || 0);

      if (isVontade) {
        return `
          <article class="card">
            <div class="card-head">
              <div>
                <span class="kind-pill vontade">Vontade · ${g.category}</span>
                <h2>${g.title}</h2>
                ${hasTarget ? `<strong class="num text-blue" style="display:block; margin-top:4px; font-size:1.1rem;">${brl(target)}</strong>` : '<span class="card-meta">Sem valor definido</span>'}
              </div>
              <div class="btn-row">
                <button type="button" class="btn-outline" onclick="promoteWishToGoal('${g.id}')">Transformar em Meta</button>
                <button type="button" class="btn-delete" onclick="deleteGoal('${g.id}')">✕</button>
              </div>
            </div>
          </article>
        `;
      }

      const rem = hasTarget ? Math.max(0, target - saved) : 0;
      const pct = hasTarget ? Math.min(100, Math.round((saved / target) * 100)) : 0;
      const months = (hasTarget && monthly > 0) ? Math.ceil(rem / monthly) : 0;
      const est = new Date();
      est.setMonth(est.getMonth() + months);
      const dateStr = rem === 0 ? 'Meta alcançada!' : est.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      return `
        <article class="card">
          <div class="card-head">
            <div>
              <span class="kind-pill meta">Meta · ${g.category}</span>
              <h2>${g.title}</h2>
              <span class="card-meta num">
                Guardado: <strong class="text-green">${brl(saved)}</strong>${hasTarget ? ` de ${brl(target)}` : ''}${monthly > 0 ? ` · ${brl(monthly)}/mês` : ''}
              </span>
            </div>
            <button type="button" class="btn-delete" onclick="deleteGoal('${g.id}')">✕</button>
          </div>

          ${hasTarget ? `
            <div class="card-head-inline mt-12" style="font-size:0.75rem;">
              <span>${rem === 0 ? 'Concluída' : 'Faltam ' + brl(rem)}</span>
              <strong class="num">${pct}%</strong>
            </div>
            <div class="progress-track"><div class="progress-fill ${pct === 100 ? 'done' : ''}" style="width:${pct}%"></div></div>
          ` : ''}

          ${(hasTarget && monthly > 0) ? `<p class="card-meta mt-8">Previsão: <strong class="num">${months} mes(es)</strong> · ${dateStr}</p>` : ''}

          <div class="btn-row mt-12">
            <button type="button" class="btn-outline" onclick="depositGoal('${g.id}', ${monthly})">+ Colocar dinheiro</button>
            ${saved > 0 ? `<button type="button" class="btn-outline" onclick="withdrawGoal('${g.id}')">Retirar</button>` : ''}
          </div>
        </article>
      `;
    }).join('');

  // Arquivos
  document.getElementById('archives-list').innerHTML = state.archives.length === 0
    ? '<article class="card"><p class="card-meta">Nenhum mês arquivado ainda.</p></article>'
    : state.archives.map((a) => `
      <article class="card">
        <h2>${a.monthLabel}</h2>
        <p class="card-meta num mt-8">Entradas: ${brl(a.totalIncome)} · Gastos: ${brl(a.totalSpent)} · Saldo Livre: ${brl(a.freeBalance)}</p>
        ${a.completedInstallments.length ? `<p class="card-meta text-green mt-8">Parcelas finalizadas: ${a.completedInstallments.join(', ')}</p>` : ''}
      </article>
    `).join('');

  document.getElementById('chat-context-preview').textContent =
    `Livre ${brl(b.freeBalance)} · Cofre ${brl(state.vaultSaved)} · Cartão ${brl(b.cardLimitAvailable)}`;
}

// Navegação
window.switchTab = function (tabId) {
  activeTabId = tabId;
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.querySelectorAll(`[data-tab="${tabId}"]`).forEach((b) => b.classList.add('active'));
  document.getElementById('header-tab-title').textContent = TAB_TITLES[tabId] || 'Visão Geral';
};

document.querySelectorAll('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => window.switchTab(btn.getAttribute('data-tab')));
});

// Entradas Maria Eduarda e Yagho
document.getElementById('form-income-maria').addEventListener('submit', (e) => {
  e.preventDefault();
  pushUndo();
  state.incomes.unshift({
    id: crypto.randomUUID(),
    person: 'Maria Eduarda',
    description: document.getElementById('maria-desc').value.trim(),
    amount: Number(document.getElementById('maria-amount').value),
    date: today.toISOString().slice(0, 10),
    isDefaultMonthly: false,
  });
  saveState();
  renderAll();
  showToast('Entrada adicionada para Maria Eduarda!');
  e.target.reset();
});

document.getElementById('form-income-yagho').addEventListener('submit', (e) => {
  e.preventDefault();
  pushUndo();
  state.incomes.unshift({
    id: crypto.randomUUID(),
    person: 'Yagho',
    description: document.getElementById('yagho-desc').value.trim(),
    amount: Number(document.getElementById('yagho-amount').value),
    date: today.toISOString().slice(0, 10),
    isDefaultMonthly: false,
  });
  saveState();
  renderAll();
  showToast('Entrada adicionada para Yagho!');
  e.target.reset();
});

window.deleteIncome = (id) => {
  pushUndo();
  state.incomes = state.incomes.filter((i) => i.id !== id);
  saveState();
  renderAll();
};

// Despesas & Fixos
window.toggleFixedStatus = (id) => {
  pushUndo();
  state.fixedBills = state.fixedBills.map((b) => b.id === id ? { ...b, status: b.status === 'Pago' ? 'Pendente' : 'Pago' } : b);
  saveState();
  renderAll();
};

window.advanceInstallment = (id) => {
  pushUndo();
  state.fixedBills = state.fixedBills.filter((b) => {
    if (b.id !== id) return true;
    if (b.curr >= b.total) return false;
    b.curr += 1;
    b.status = 'Pendente';
    return true;
  });
  saveState();
  renderAll();
};

document.getElementById('btn-edit-limit').addEventListener('click', () => {
  const novo = prompt('Novo limite total do cartão (R$):', String(state.cardLimitTotal));
  if (novo !== null && !Number.isNaN(Number(novo)) && Number(novo) >= 0) {
    pushUndo();
    state.cardLimitTotal = Number(novo);
    saveState();
    renderAll();
  }
});

function updateDailyPreview() {
  const total = Number(document.getElementById('daily-total').value || 0);
  const parc = Number(document.getElementById('daily-installments').value || 1);
  const method = document.getElementById('daily-method').value;
  const prevEl = document.getElementById('daily-preview');
  if (total > 0 && (parc > 1 || method === 'Cartão de Crédito')) {
    prevEl.classList.remove('hidden');
    const note = method === 'Cartão de Crédito' ? ' (entra na fatura do mês que vem)' : '';
    prevEl.textContent = `Parcelamento: ${parc}x de ${brl(total / parc)}/mês${note}`;
  } else {
    prevEl.classList.add('hidden');
  }
}

document.getElementById('daily-total').addEventListener('input', updateDailyPreview);
document.getElementById('daily-installments').addEventListener('change', updateDailyPreview);
document.getElementById('daily-method').addEventListener('change', updateDailyPreview);

document.getElementById('daily-form').addEventListener('submit', (e) => {
  e.preventDefault();
  pushUndo();
  const totalAmount = Number(document.getElementById('daily-total').value);
  const installments = Number(document.getElementById('daily-installments').value);
  const paymentMethod = document.getElementById('daily-method').value;
  state.dailyExpenses.unshift({
    id: crypto.randomUUID(),
    description: document.getElementById('daily-desc').value.trim(),
    totalAmount,
    installments,
    curr: 1,
    monthlyAmount: Math.round((totalAmount / installments) * 100) / 100,
    date: document.getElementById('daily-date').value,
    paymentMethod,
    status: paymentMethod === 'Cartão de Crédito' ? 'Pendente' : document.getElementById('daily-status').value,
  });
  saveState();
  renderAll();
  showToast(paymentMethod === 'Cartão de Crédito' ? 'Lançado no cartão (vence no mês que vem)!' : 'Gasto lançado!');
  e.target.reset();
  document.getElementById('daily-date').value = today.toISOString().slice(0, 10);
  updateDailyPreview();
});

window.toggleDailyStatus = (id) => {
  pushUndo();
  state.dailyExpenses = state.dailyExpenses.map((d) => d.id === id ? { ...d, status: d.status === 'Pago' ? 'Pendente' : 'Pago' } : d);
  saveState();
  renderAll();
};

window.deleteDaily = (id) => {
  pushUndo();
  state.dailyExpenses = state.dailyExpenses.filter((d) => d.id !== id);
  saveState();
  renderAll();
};

// =========================================================================
// COFRE DO CASAL + METAS & VONTADES (CAMPOS OPCIONAIS)
// =========================================================================
document.getElementById('btn-vault-add').addEventListener('click', () => {
  const val = prompt('Quanto vocês vão guardar no Cofre agora? (R$)');
  const num = val ? Number(val.replace(',', '.')) : 0;
  if (num > 0 && !Number.isNaN(num)) {
    pushUndo();
    state.vaultSaved = Math.round((state.vaultSaved + num) * 100) / 100;
    saveState();
    renderAll();
    showToast(`${brl(num)} guardados no Cofre!`);
  }
});

document.getElementById('btn-vault-sub').addEventListener('click', () => {
  if (state.vaultSaved <= 0) {
    showToast('O Cofre está zerado no momento.');
    return;
  }
  const val = prompt(`Quanto desejam retirar do Cofre? (Saldo: ${brl(state.vaultSaved)})`);
  const num = val ? Number(val.replace(',', '.')) : 0;
  if (num > 0 && !Number.isNaN(num)) {
    pushUndo();
    state.vaultSaved = Math.max(0, Math.round((state.vaultSaved - num) * 100) / 100);
    saveState();
    renderAll();
    showToast(`${brl(num)} retirados do Cofre.`);
  }
});

const goalKindSelect = document.getElementById('goal-kind');
function updateGoalFormFields() {
  const isVontade = goalKindSelect.value === 'vontade';
  document.getElementById('goal-monthly-wrap').classList.toggle('hidden', isVontade);
  document.getElementById('goal-saved-wrap').classList.toggle('hidden', isVontade);
  document.getElementById('goal-submit-btn').textContent = isVontade ? 'Salvar Vontade' : 'Salvar Meta';
}
goalKindSelect.addEventListener('change', updateGoalFormFields);
updateGoalFormFields();

document.getElementById('btn-add-goal-cat').addEventListener('click', () => {
  const nova = prompt('Nome da nova categoria (ex.: Emergência, Reforma, Eletrônicos):');
  if (nova && nova.trim()) {
    const clean = nova.trim();
    if (!state.goalCategories.includes(clean)) {
      pushUndo();
      state.goalCategories.push(clean);
      saveState();
      renderAll();
      document.getElementById('goal-cat').value = clean;
      showToast(`Categoria "${clean}" adicionada!`);
    }
  }
});

document.getElementById('goal-form').addEventListener('submit', (e) => {
  e.preventDefault();
  pushUndo();
  const kind = document.getElementById('goal-kind').value;
  state.goals.unshift({
    id: crypto.randomUUID(),
    kind,
    category: document.getElementById('goal-cat').value,
    title: document.getElementById('goal-title').value.trim(),
    targetAmount: Number(document.getElementById('goal-target').value || 0),
    monthlyContribution: kind === 'vontade' ? 0 : Number(document.getElementById('goal-monthly').value || 0),
    savedAmount: kind === 'vontade' ? 0 : Number(document.getElementById('goal-saved').value || 0),
  });
  saveState();
  renderAll();
  showToast(kind === 'vontade' ? 'Vontade adicionada à lista!' : 'Meta criada!');
  e.target.reset();
  updateGoalFormFields();
});

window.promoteWishToGoal = (id) => {
  pushUndo();
  state.goals = state.goals.map((g) => g.id === id ? { ...g, kind: 'meta' } : g);
  saveState();
  renderAll();
  showToast('Transformada em Meta com barra de progresso!');
};

window.depositGoal = (id, defaultMonthly) => {
  const suggestion = defaultMonthly > 0 ? String(defaultMonthly) : '';
  const val = prompt('Quanto deseja colocar nessa meta? (R$)', suggestion);
  const num = val ? Number(val.replace(',', '.')) : 0;
  if (num > 0 && !Number.isNaN(num)) {
    pushUndo();
    state.goals = state.goals.map((g) => {
      if (g.id !== id) return g;
      const nextSaved = Math.round(((g.savedAmount || 0) + num) * 100) / 100;
      return { ...g, savedAmount: nextSaved };
    });
    saveState();
    renderAll();
    showToast(`${brl(num)} adicionados na meta!`);
  }
};

window.withdrawGoal = (id) => {
  const val = prompt('Quanto deseja retirar dessa meta? (R$)');
  const num = val ? Number(val.replace(',', '.')) : 0;
  if (num > 0 && !Number.isNaN(num)) {
    pushUndo();
    state.goals = state.goals.map((g) => {
      if (g.id !== id) return g;
      return { ...g, savedAmount: Math.max(0, Math.round(((g.savedAmount || 0) - num) * 100) / 100) };
    });
    saveState();
    renderAll();
    showToast(`${brl(num)} retirados da meta.`);
  }
};

window.deleteGoal = (id) => {
  pushUndo();
  state.goals = state.goals.filter((g) => g.id !== id);
  saveState();
  renderAll();
};

// Virar o Mês & Restaurar Início
document.getElementById('btn-rollover').addEventListener('click', () => {
  pushUndo();
  const b = computeBudget();
  const completed = [];
  const nextFixed = [];
  let nextMonthCardBill = 0;

  state.fixedBills.forEach((item) => {
    if (item.isCardBill || item.name.toLowerCase().includes('fatura atual')) {
      return;
    }
    if (item.kind === 'Parcelado') {
      if (item.curr >= item.total) {
        completed.push(`${item.name} (${pad2(item.curr)}/${pad2(item.total)})`);
      } else {
        nextFixed.push({ ...item, curr: item.curr + 1, status: 'Pendente' });
      }
    } else {
      nextFixed.push({ ...item, status: 'Pendente' });
    }
  });

  const nextDaily = [];
  state.dailyExpenses.forEach((d) => {
    if (d.paymentMethod === 'Cartão de Crédito') {
      nextMonthCardBill += Number(d.monthlyAmount);
      if (d.installments > 1 && d.curr < d.installments) {
        nextDaily.push({ ...d, curr: d.curr + 1, status: 'Pendente' });
      } else if (d.installments > 1) {
        completed.push(`${d.description} (${pad2(d.curr)}/${pad2(d.installments)})`);
      }
    } else if (d.installments > 1 && d.curr < d.installments) {
      nextDaily.push({ ...d, curr: d.curr + 1, status: 'Pendente' });
    } else if (d.installments > 1) {
      completed.push(`${d.description} (${pad2(d.curr)}/${pad2(d.installments)})`);
    }
  });

  if (nextMonthCardBill > 0) {
    nextFixed.unshift({
      id: crypto.randomUUID(),
      name: 'Cartão (Fatura atual)',
      amount: Math.round(nextMonthCardBill * 100) / 100,
      kind: 'Fixo',
      status: 'Pendente',
      isCardBill: true,
    });
  }

  state.archives.unshift({
    id: crypto.randomUUID(),
    monthKey: state.currentMonthKey,
    monthLabel: monthLabel(state.currentMonthKey),
    totalIncome: b.totalIncome,
    totalSpent: b.totalSpent,
    freeBalance: b.freeBalance,
    completedInstallments: completed,
  });

  const nextKey = nextMonthKey(state.currentMonthKey);
  state.currentMonthKey = nextKey;
  state.fixedBills = nextFixed;
  state.dailyExpenses = nextDaily;
  state.incomes = state.incomes.filter((i) => i.isDefaultMonthly).map((i) => ({ ...i, date: `${nextKey}-05` }));

  saveState();
  renderAll();
  showToast('Mês virado! Fatura do cartão transferida para o novo mês.');
});

document.getElementById('btn-reset-defaults').addEventListener('click', () => {
  if (!confirm('Deseja restaurar todas as contas fixas, parcelas e salários para o padrão inicial?')) return;
  pushUndo();
  const fresh = createInitialState();
  state.currentMonthKey = fresh.currentMonthKey;
  state.incomes = fresh.incomes;
  state.fixedBills = fresh.fixedBills;
  state.dailyExpenses = fresh.dailyExpenses;
  state.cardLimitTotal = 500.00;
  saveState();
  renderAll();
  showToast('Finanças restauradas para o fechamento de Novembro!');
});

// Extrato do Mês
document.getElementById('btn-generate-statement').addEventListener('click', () => {
  const b = computeBudget();
  document.getElementById('statement-title').textContent = `Extrato — ${monthLabel(state.currentMonthKey)}`;
  document.getElementById('statement-body').innerHTML = `
    <p class="num"><strong>Entradas:</strong> ${brl(b.totalIncome)} | <strong>Gastos:</strong> ${brl(b.totalSpent)} | <strong>Livre:</strong> ${brl(b.freeBalance)} | <strong>Cofre:</strong> ${brl(state.vaultSaved)}</p>
    <div class="divider"></div>
    <h3>Fixos &amp; Parcelas (${state.fixedBills.length})</h3>
    <div class="list-stack mt-8">
      ${state.fixedBills.map((f) => `<div class="list-row"><span>${f.name} (${f.status})</span><strong class="num">${brl(f.amount)}</strong></div>`).join('')}
    </div>
  `;
  document.getElementById('statement-modal').classList.remove('hidden');
});

document.getElementById('btn-close-statement').addEventListener('click', () => {
  document.getElementById('statement-modal').classList.add('hidden');
});

document.getElementById('btn-sync-sheets').addEventListener('click', () => loadFromSheets(true));
document.getElementById('btn-sync-mobile').addEventListener('click', () => loadFromSheets(true));

// =========================================================================
// CONSULTOR FINANCEIRO LOCAL (100% OFFLINE)
// =========================================================================
const chatDrawer = document.getElementById('chat-drawer');
const chatMessages = document.getElementById('chat-messages');

document.getElementById('chat-fab').addEventListener('click', () => chatDrawer.classList.remove('hidden'));
document.getElementById('chat-close').addEventListener('click', () => chatDrawer.classList.add('hidden'));

function appendChat(role, text) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function generateLocalAdvisorReply(rawQuestion) {
  const q = rawQuestion.toLowerCase();
  const b = computeBudget();
  const forecast = buildForecast(6);

  const parcMatch = q.match(/(\d+)\s*x\b/);
  const installments = parcMatch ? Math.max(1, Math.min(24, Number(parcMatch[1]))) : 1;

  const cleanedForPrice = q.replace(/(\d+)\s*x\b/g, '');
  const priceMatch = cleanedForPrice.match(/(\d+(?:[.,]\d{1,2})?)/);
  const price = priceMatch ? Number(priceMatch[1].replace(',', '.')) : null;

  if (price !== null && price > 0) {
    const monthlyPart = price / installments;
    const fitsCard = monthlyPart <= b.cardLimitAvailable;
    const fitsFree = monthlyPart <= b.freeBalance;
    const nextRelief = forecast.find((f) => f.savingsComparedToNow > 0);

    const lines = [
      `Simulação para ${brl(price)} (${installments > 1 ? `${installments}x de ${brl(monthlyPart)}/mês` : 'à vista'}):`,
      '',
      fitsCard
        ? `• No Cartão de Crédito: Cabe! Vocês têm ${brl(b.cardLimitAvailable)} livres no cartão (vence só na fatura do mês que vem).`
        : `• No Cartão de Crédito: Estoura o limite atual de ${brl(b.cardLimitAvailable)} livres (faltam ${brl(monthlyPart - b.cardLimitAvailable)}).`,
      fitsFree
        ? `• No Pix / Débito (Saldo Livre): Cabe! De ${brl(b.freeBalance)} livres, ainda restariam ${brl(b.freeBalance - monthlyPart)} no mês.`
        : `• No Pix / Débito (Saldo Livre): Compromete todo o saldo livre de ${brl(b.freeBalance)}.`,
    ];

    if (nextRelief) {
      lines.push(
        '',
        `Dica de timing: Em ${nextRelief.label}, os fixos caem para ${brl(nextRelief.fixedSum)} (${nextRelief.endedThisMonth.length ? `acabam: ${nextRelief.endedThisMonth.join(', ')}` : 'redução de fatura'}).`
      );
    }
    return lines.join('\n');
  }

  if (q.includes('comprar') || q.includes('aspirador') || q.includes('vale a pena') || q.includes('posso gastar') || q.includes('quanto posso')) {
    const lines = [
      `Para compras hoje em ${monthLabel(state.currentMonthKey)}, vocês têm:`,
      `• Limite no Cartão: ${brl(b.cardLimitAvailable)} disponíveis (vence no mês seguinte).`,
      `• Saldo Livre (Pix/Débito): ${brl(b.freeBalance)} após pagar todos os fixos.`,
      `• No Cofre do Casal: ${brl(state.vaultSaved)} guardados.`,
      '',
      'Me mande o valor e as parcelas (ex: "aspirador 200 em 2x") que eu simulo o impacto exato para vocês!',
    ];
    return lines.join('\n');
  }

  if (q.includes('meta') || q.includes('cofre') || q.includes('guardar') || q.includes('vontade') || q.includes('viagem') || q.includes('carro')) {
    const activeGoals = state.goals.filter((g) => g.kind !== 'vontade');
    const wishes = state.goals.filter((g) => g.kind === 'vontade');
    const lines = [`Cofre do Pudicasal: ${brl(state.vaultSaved)} guardados.`];
    if (activeGoals.length) {
      lines.push('', 'Metas em andamento:');
      activeGoals.forEach((g) => {
        lines.push(`• ${g.title}: ${brl(g.savedAmount || 0)}${g.targetAmount > 0 ? ` de ${brl(g.targetAmount)}` : ''}`);
      });
    }
    if (wishes.length) {
      lines.push('', 'Lista de Vontades:');
      wishes.forEach((w) => {
        lines.push(`• ${w.title}${w.targetAmount > 0 ? ` — ${brl(w.targetAmount)}` : ''}`);
      });
    }
    return lines.join('\n');
  }

  if (q.includes('parcela') || q.includes('proximo') || q.includes('próximo') || q.includes('folga') || q.includes('acaba')) {
    const lines = ['Projeção dos gastos fixos + fatura do cartão nos próximos meses:'];
    forecast.slice(0, 4).forEach((f) => {
      const extra = f.endedThisMonth.length ? ` (Acaba: ${f.endedThisMonth.join(', ')})` : '';
      lines.push(`• ${f.label}: ${brl(f.fixedSum)}${extra}`);
    });
    return lines.join('\n');
  }

  return [
    `Resumo rápido do Pudicasal (${monthLabel(state.currentMonthKey)}):`,
    `• Entradas: ${brl(b.totalIncome)} | Gastos do mês: ${brl(b.totalSpent)}`,
    `• Livre para gastar: ${brl(b.freeBalance)} | Cofre: ${brl(state.vaultSaved)} | Cartão livre: ${brl(b.cardLimitAvailable)}`,
    '',
    'Pergunte coisas como:',
    '— "Posso comprar um aspirador de 200 em 2x?"',
    '— "Quando acaba nossas parcelas?"',
    '— "Como está nosso cofre e metas?"',
  ].join('\n');
}

document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const question = input.value.trim();
  if (!question) return;

  appendChat('user', question);
  input.value = '';
  const reply = generateLocalAdvisorReply(question);
  appendChat('model', reply);
});

renderAll();
loadFromSheets(false);
