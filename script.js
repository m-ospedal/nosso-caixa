const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyqH5o5vTCqu-OP_ZBQOJb7jhaCRMQxiDGxqM-W9HXMW6RVPBj6xfkHBh5o7yZktNuW/exec';
const GEMINI_API_KEY = 'AQ.Ab8RN6I8_8WZNIBdU9yNjCOc7QmFVKocEofRV8faySkXB2EvMg';

const SYSTEM_PROMPT =
  'Você é o consultor financeiro de Yagho e Maria Eduarda. Você analisa o saldo livre deles (cerca de R$ 846 no cenário base) e o limite do cartão (R$ 500), além de usar a busca do Google para pesquisar preços reais de produtos (como aspiradores, móveis), comparar modelos e aconselhar quanto podem guardar para metas como viagem e carro sem comprometer as contas fixas.';

const STORAGE_KEY = 'nosso_caixa_v2';
const today = new Date();
const defaultMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

function initialIncomes(monthKey) {
  const d = `${monthKey}-05`;
  return [
    { id: 'inc-1', description: 'Maria Eduarda - Cobi', category: 'Maria Eduarda - Fixo', amount: 1750.00, date: d, isDefaultMonthly: true },
    { id: 'inc-2', description: 'Maria Eduarda - Dehon', category: 'Maria Eduarda - Fixo', amount: 300.00, date: d, isDefaultMonthly: true },
    { id: 'inc-3', description: 'Maria Eduarda - Club', category: 'Maria Eduarda - Fixo', amount: 400.00, date: d, isDefaultMonthly: true },
    { id: 'inc-4', description: 'Yagho - F&F Energia (Salário Base)', category: 'Yagho - Salário Base F&F', amount: 2000.00, date: d, isDefaultMonthly: true },
    { id: 'inc-5', description: 'Yagho - F&F Energia (Ajuda de Custo)', category: 'Yagho - Ajuda de Custo F&F', amount: 500.00, date: d, isDefaultMonthly: true, isYaghoAllowance: true },
  ];
}

function initialFixedBills() {
  return [
    { id: 'f-1', name: 'Aluguel', amount: 1217.00, kind: 'Fixo', status: 'Pendente' },
    { id: 'f-2', name: 'Luz', amount: 130.00, kind: 'Fixo', status: 'Pendente' },
    { id: 'f-3', name: 'Água', amount: 157.34, kind: 'Fixo', status: 'Pendente' },
    { id: 'f-4', name: 'Internet', amount: 90.00, kind: 'Fixo', status: 'Pendente' },
    { id: 'f-5', name: 'Compras', amount: 400.00, kind: 'Fixo', status: 'Pendente' },
    { id: 'f-6', name: 'Ração animais', amount: 100.00, kind: 'Fixo', status: 'Pendente' },
    { id: 'f-7', name: 'Plano de Saúde', amount: 280.00, kind: 'Fixo', status: 'Pendente' },
    { id: 'f-8', name: 'iCloud', amount: 20.00, kind: 'Fixo', status: 'Pendente' },
    { id: 'f-9', name: 'Cartão (Fatura atual)', amount: 547.57, kind: 'Fixo', status: 'Pendente' },
    { id: 'f-10', name: 'Santander', amount: 120.00, kind: 'Fixo', status: 'Pendente' },
    { id: 'p-1', name: 'Guarda roupa e sapateira', amount: 382.83, kind: 'Parcelado', status: 'Pendente', curr: 4, total: 12 },
    { id: 'p-2', name: 'Pintor', amount: 111.35, kind: 'Parcelado', status: 'Pendente', curr: 3, total: 6 },
    { id: 'p-3', name: 'Pintor 2', amount: 111.35, kind: 'Parcelado', status: 'Pendente', curr: 2, total: 6 },
    { id: 'p-4', name: 'Empréstimo', amount: 321.50, kind: 'Parcelado', status: 'Pendente', curr: 3, total: 14 },
    { id: 'p-5', name: 'Vestido', amount: 45.00, kind: 'Parcelado', status: 'Pendente', curr: 3, total: 4 },
    { id: 'p-6', name: 'Roupa Yagho', amount: 34.00, kind: 'Parcelado', status: 'Pendente', curr: 3, total: 10 },
    { id: 'p-7', name: 'Relicário', amount: 35.45, kind: 'Parcelado', status: 'Pendente', curr: 3, total: 4 },
  ];
}

let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {
  currentMonthKey: defaultMonthKey,
  cardLimitTotal: 500.00,
  incomes: initialIncomes(defaultMonthKey),
  fixedBills: initialFixedBills(),
  dailyExpenses: [],
  goals: [],
  archives: [],
};

document.getElementById('inc-date').value = today.toISOString().slice(0, 10);
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

function computeBudget() {
  const commissionActive = state.incomes.some((i) => i.category === 'Comissão F&F Yagho' && Number(i.amount) > 0);
  const effectiveIncomes = state.incomes.map((i) => ({
    ...i,
    suppressed: commissionActive && Boolean(i.isYaghoAllowance),
  }));

  const totalIncome = effectiveIncomes.reduce((s, i) => s + (i.suppressed ? 0 : Number(i.amount)), 0);
  const totalFixed = state.fixedBills.reduce((s, b) => s + Number(b.amount), 0);

  let totalDailyPix = 0;
  let totalDailyCard = 0;
  state.dailyExpenses.forEach((d) => {
    if (d.paymentMethod === 'Cartão de Crédito') totalDailyCard += Number(d.monthlyAmount);
    else totalDailyPix += Number(d.monthlyAmount);
  });

  const totalSpent = totalFixed + totalDailyPix + totalDailyCard;
  const freeBalance = totalIncome - totalFixed - totalDailyPix;
  const cardLimitAvailable = Number(state.cardLimitTotal) - totalDailyCard;
  const pendingBills = state.fixedBills.filter((b) => b.status === 'Pendente');
  const pendingTotal = pendingBills.reduce((s, b) => s + Number(b.amount), 0);

  return {
    commissionActive, effectiveIncomes, totalIncome, totalFixed,
    totalDailyPix, totalDailyCard, totalSpent, freeBalance,
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
      if (d.installments > 1 && d.curr + offset <= d.installments) {
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

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (SHEETS_URL && SHEETS_URL !== 'COLOQUE_AQUI_SEU_WEBHOOK') {
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
      saveState();
      showToast('Dados enviados para a planilha!');
    }
  } catch (err) {
    console.error('Sheets GET:', err);
    if (manual) showToast('Erro ao conectar com a planilha.');
  }
}

function renderAll() {
  const b = computeBudget();
  const mLabel = monthLabel(state.currentMonthKey);
  document.getElementById('main-page-title').textContent = `FINANÇAS ${mLabel}`;

  // Visão Geral
  document.getElementById('ov-free').textContent = brl(b.freeBalance);
  document.getElementById('ov-income').textContent = brl(b.totalIncome);
  document.getElementById('ov-income-note').textContent = b.commissionActive ? 'Comissão F&F ativa (Ajuda zerada)' : 'Salários base + Ajuda F&F';
  document.getElementById('ov-spent').textContent = brl(b.totalSpent);
  document.getElementById('ov-card').textContent = brl(b.cardLimitAvailable);
  document.getElementById('ov-card-note').textContent = `De ${brl(state.cardLimitTotal)}`;

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
      ${f.savingsComparedToNow > 0 ? `<span class="forecast-diff num">− ${brl(f.savingsComparedToNow)} de parcelas</span>` : '<span class="card-meta">Mesmo patamar atual</span>'}
      ${f.endedThisMonth.length ? `<div class="forecast-ended">Acaba: <strong>${f.endedThisMonth.join(', ')}</strong></div>` : ''}
    </div>
  `).join('');

  // Entradas
  document.getElementById('inc-total').textContent = brl(b.totalIncome);
  document.getElementById('inc-rule-banner').textContent = b.commissionActive
    ? 'Regra F&F ativa: Ajuda de Custo (R$ 500,00) zerada automaticamente pela Comissão F&F.'
    : 'Regra F&F padrão: Salário Base (R$ 2.000,00) + Ajuda de Custo (R$ 500,00).';

  document.getElementById('income-list').innerHTML = b.effectiveIncomes.map((inc) => `
    <div class="list-row">
      <div>
        <div class="row-title ${inc.suppressed ? 'strike' : ''}">${inc.description}</div>
        <div class="row-sub">${inc.category}${inc.suppressed ? ' · Zerada pela Comissão F&F' : ''}</div>
      </div>
      <div class="btn-row">
        <strong class="num ${inc.suppressed ? 'strike' : 'text-green'}">${inc.suppressed ? brl(0) : brl(inc.amount)}</strong>
        <button type="button" class="btn-delete" onclick="deleteIncome('${inc.id}')">✕</button>
      </div>
    </div>
  `).join('');

  // Despesas & Fixos
  document.getElementById('exp-free').textContent = brl(b.freeBalance);
  document.getElementById('exp-total').textContent = brl(b.totalSpent);
  document.getElementById('exp-card').textContent = brl(b.cardLimitAvailable);
  document.getElementById('exp-card-note').textContent = `Limite total: ${brl(state.cardLimitTotal)} · Usado: ${brl(b.totalDailyCard)}`;
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
          <div class="row-sub num">${d.paymentMethod} · ${pad2(d.curr)}/${pad2(d.installments)} · ${d.date.split('-').reverse().join('/')}</div>
        </div>
        <div class="btn-row">
          <strong class="num text-red">${brl(d.monthlyAmount)}</strong>
          <button type="button" class="status-btn ${d.status === 'Pago' ? 'pago' : 'pendente'}" onclick="toggleDailyStatus('${d.id}')">${d.status}</button>
          <button type="button" class="btn-delete" onclick="deleteDaily('${d.id}')">✕</button>
        </div>
      </div>
    `).join('');

  // Metas
  document.getElementById('goals-list').innerHTML = state.goals.length === 0
    ? '<article class="card"><p class="card-meta">Nenhuma meta cadastrada.</p></article>'
    : state.goals.map((g) => {
      const rem = Math.max(0, g.targetAmount - g.savedAmount);
      const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)) : 0;
      const months = g.monthlyContribution > 0 ? Math.ceil(rem / g.monthlyContribution) : 0;
      const est = new Date();
      est.setMonth(est.getMonth() + months);
      const dateStr = rem === 0 ? 'Meta alcançada' : est.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return `
        <article class="card">
          <div class="card-head">
            <div>
              <h2>${g.title}</h2>
              <span class="card-meta num">${g.category} · ${brl(g.savedAmount)} de ${brl(g.targetAmount)} (${brl(g.monthlyContribution)}/mês)</span>
            </div>
            <button type="button" class="btn-delete" onclick="deleteGoal('${g.id}')">✕</button>
          </div>
          <div class="card-head-inline mt-12" style="font-size:0.75rem;">
            <span>${rem === 0 ? 'Concluída' : 'Faltam ' + brl(rem)}</span>
            <strong class="num">${pct}%</strong>
          </div>
          <div class="progress-track"><div class="progress-fill ${pct === 100 ? 'done' : ''}" style="width:${pct}%"></div></div>
          <p class="card-meta mt-8">Previsão: <strong class="num">${months} mes(es)</strong> · ${dateStr}</p>
          ${rem > 0 ? `<button type="button" class="btn-outline mt-12" onclick="depositGoal('${g.id}', ${g.monthlyContribution})">+ Guardar aporte (${brl(g.monthlyContribution)})</button>` : ''}
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
    `Saldo livre ${brl(b.freeBalance)} · Cartão ${brl(b.cardLimitAvailable)}`;
}

// Navegação
window.switchTab = function (tabId) {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.querySelectorAll(`[data-tab="${tabId}"]`).forEach((b) => b.classList.add('active'));
};

document.querySelectorAll('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => window.switchTab(btn.getAttribute('data-tab')));
});

// Ações Entradas
document.getElementById('income-form').addEventListener('submit', (e) => {
  e.preventDefault();
  state.incomes.unshift({
    id: crypto.randomUUID(),
    category: document.getElementById('inc-category').value,
    description: document.getElementById('inc-desc').value.trim(),
    amount: Number(document.getElementById('inc-amount').value),
    date: document.getElementById('inc-date').value,
    isDefaultMonthly: false,
  });
  saveState();
  renderAll();
  showToast('Entrada registrada!');
  e.target.reset();
  document.getElementById('inc-date').value = today.toISOString().slice(0, 10);
});

window.deleteIncome = (id) => {
  state.incomes = state.incomes.filter((i) => i.id !== id);
  saveState();
  renderAll();
};

// Ações Despesas & Fixos
window.toggleFixedStatus = (id) => {
  state.fixedBills = state.fixedBills.map((b) => b.id === id ? { ...b, status: b.status === 'Pago' ? 'Pendente' : 'Pago' } : b);
  saveState();
  renderAll();
};

window.advanceInstallment = (id) => {
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
    state.cardLimitTotal = Number(novo);
    saveState();
    renderAll();
  }
});

function updateDailyPreview() {
  const total = Number(document.getElementById('daily-total').value || 0);
  const parc = Number(document.getElementById('daily-installments').value || 1);
  const prevEl = document.getElementById('daily-preview');
  if (total > 0 && parc > 1) {
    prevEl.classList.remove('hidden');
    prevEl.textContent = `Parcelamento: ${parc}x de ${brl(total / parc)}/mês`;
  } else {
    prevEl.classList.add('hidden');
  }
}

document.getElementById('daily-total').addEventListener('input', updateDailyPreview);
document.getElementById('daily-installments').addEventListener('change', updateDailyPreview);

document.getElementById('daily-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const totalAmount = Number(document.getElementById('daily-total').value);
  const installments = Number(document.getElementById('daily-installments').value);
  state.dailyExpenses.unshift({
    id: crypto.randomUUID(),
    description: document.getElementById('daily-desc').value.trim(),
    totalAmount,
    installments,
    curr: 1,
    monthlyAmount: Math.round((totalAmount / installments) * 100) / 100,
    date: document.getElementById('daily-date').value,
    paymentMethod: document.getElementById('daily-method').value,
    status: document.getElementById('daily-status').value,
  });
  saveState();
  renderAll();
  showToast('Gasto lançado!');
  e.target.reset();
  document.getElementById('daily-date').value = today.toISOString().slice(0, 10);
  updateDailyPreview();
});

window.toggleDailyStatus = (id) => {
  state.dailyExpenses = state.dailyExpenses.map((d) => d.id === id ? { ...d, status: d.status === 'Pago' ? 'Pendente' : 'Pago' } : d);
  saveState();
  renderAll();
};

window.deleteDaily = (id) => {
  state.dailyExpenses = state.dailyExpenses.filter((d) => d.id !== id);
  saveState();
  renderAll();
};

// Metas
document.getElementById('goal-form').addEventListener('submit', (e) => {
  e.preventDefault();
  state.goals.unshift({
    id: crypto.randomUUID(),
    category: document.getElementById('goal-cat').value,
    title: document.getElementById('goal-title').value.trim(),
    targetAmount: Number(document.getElementById('goal-target').value),
    monthlyContribution: Number(document.getElementById('goal-monthly').value),
    savedAmount: Number(document.getElementById('goal-saved').value || 0),
  });
  saveState();
  renderAll();
  showToast('Meta criada!');
  e.target.reset();
});

window.depositGoal = (id, amount) => {
  state.goals = state.goals.map((g) => g.id === id ? { ...g, savedAmount: Math.min(g.targetAmount, g.savedAmount + amount) } : g);
  saveState();
  renderAll();
  showToast('Aporte registrado na meta!');
};

window.deleteGoal = (id) => {
  state.goals = state.goals.filter((g) => g.id !== id);
  saveState();
  renderAll();
};

// Virar o Mês
document.getElementById('btn-rollover').addEventListener('click', () => {
  const b = computeBudget();
  const completed = [];
  const nextFixed = [];

  state.fixedBills.forEach((item) => {
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
    if (d.installments > 1 && d.curr < d.installments) {
      nextDaily.push({ ...d, curr: d.curr + 1, status: 'Pendente' });
    } else if (d.installments > 1) {
      completed.push(`${d.description} (${pad2(d.curr)}/${pad2(d.installments)})`);
    }
  });

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
  showToast('Mês virado e arquivado com sucesso!');
});

// Extrato do Mês
document.getElementById('btn-generate-statement').addEventListener('click', () => {
  const b = computeBudget();
  document.getElementById('statement-title').textContent = `Extrato — ${monthLabel(state.currentMonthKey)}`;
  document.getElementById('statement-body').innerHTML = `
    <p class="num"><strong>Entradas:</strong> ${brl(b.totalIncome)} | <strong>Gastos:</strong> ${brl(b.totalSpent)} | <strong>Livre:</strong> ${brl(b.freeBalance)} | <strong>Cartão Restante:</strong> ${brl(b.cardLimitAvailable)}</p>
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

// Balão Flutuante Conselheiro IA (Gemini + Google Search + Contexto Oculto)
const chatDrawer = document.getElementById('chat-drawer');
const chatMessages = document.getElementById('chat-messages');

document.getElementById('chat-fab').addEventListener('click', () => chatDrawer.classList.remove('hidden'));
document.getElementById('chat-close').addEventListener('click', () => chatDrawer.classList.add('hidden'));

function appendChat(role, text, sources = []) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  if (sources.length) {
    const src = document.createElement('div');
    src.className = 'chat-sources';
    src.innerHTML = '<strong>Fontes:</strong>';
    sources.slice(0, 4).forEach((s) => {
      const a = document.createElement('a');
      a.href = s.uri;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = s.title || s.uri;
      src.appendChild(a);
    });
    div.appendChild(src);
  }
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.getElementById('chat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const question = input.value.trim();
  if (!question) return;

  appendChat('user', question);
  input.value = '';
  const submit = document.getElementById('chat-submit');
  submit.disabled = true;

  const b = computeBudget();
  const hiddenContext = [
    `[CONTEXTO OCULTO - ${monthLabel(state.currentMonthKey)}]`,
    `Saldo Livre: ${brl(b.freeBalance)}`,
    `Limite Disponível do Cartão: ${brl(b.cardLimitAvailable)} de ${brl(state.cardLimitTotal)}`,
    `Gastos Fixos (${brl(b.totalFixed)}): ${state.fixedBills.map((f) => `${f.name} ${brl(f.amount)} (${f.status})`).join('; ')}`,
    `Metas: ${state.goals.length ? state.goals.map((g) => `${g.title}: ${brl(g.savedAmount)}/${brl(g.targetAmount)} (${brl(g.monthlyContribution)}/mês)`).join('; ') : 'Nenhuma cadastrada'}`,
  ].join('\n');

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: `${hiddenContext}\n\nPergunta: ${question}` }] }],
        tools: [{ googleSearch: {} }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const errMsg = data?.error?.message || 'Chave de API inválida.';
      appendChat('model', `Aviso da API Gemini: ${errMsg}\n\nDica: Gere uma chave começando com "AIza..." no Google AI Studio e cole na linha 2 do script.js.`);
      return;
    }
    const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || 'Sem resposta do Gemini.';
    const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.filter((c) => c.web?.uri).map((c) => c.web);
    appendChat('model', reply, sources);
  } catch {
    appendChat('model', 'Não foi possível conectar ao Conselheiro IA.');
  } finally {
    submit.disabled = false;
  }
});

renderAll();
loadFromSheets(false);
