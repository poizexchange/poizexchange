// index.js v36 — под верстку v34 (плитки .tile с .ico/.cap/.sub)
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
  if (tg) { try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({action:"webapp_open"})); } catch(e){} }

  // DOM
  const elFromPay = document.getElementById('from-pay');
  const elToPay   = document.getElementById('to-pay');
  const boxFrom   = document.getElementById('from-currencies');
  const boxTo     = document.getElementById('to-currencies');

  const amountInput = document.getElementById('amount');
  const rateVal     = document.getElementById('rateVal');
  const totalVal    = document.getElementById('totalVal');

  const contactInp   = document.getElementById('contact');
  const requisitesTa = document.getElementById('requisites');
  const noteTa       = document.getElementById('note');

  const sendBtn = document.getElementById('sendBtn');
  const hint    = document.getElementById('hint');
  const qrbox   = document.getElementById('qrbox');
  const qrfile  = document.getElementById('qrfile');

  // Состояние
  const state = {
    fromPay: 'cash',
    toPay: 'cash',
    from: null,
    to:   null,
    amount: 0,
    quote:  { rate:null, total:null, rateText:'—', totalText:'—' }
  };

  function isCnPay(kind) { return kind === 'cnpay'; }

  function setActiveChip(container, type) {
    container.querySelectorAll('.chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
  }

  function renderTiles(container, kind, side) {
    container.innerHTML = ''; // очистка
    const list = (window.PRICING && typeof window.PRICING.currencies === 'function')
      ? window.PRICING.currencies(kind)
      : [];

    if (!list || !list.length) {
      const empty = document.createElement('div');
      empty.className = 'sub';
      empty.style.textAlign = 'center';
      empty.style.gridColumn = '1 / -1';
      empty.textContent = 'Нет валют для этого способа';
      container.appendChild(empty);
      return;
    }

    // .tiles уже grid из CSS -> просто кладём кнопки
    list.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'tile';
      btn.type = 'button';
      btn.dataset.code = item.code;

      btn.innerHTML = `
        <div class="ico"><img src="${item.icon}" alt="${item.code}"></div>
        <div class="cap">${item.code}</div>
        <div class="sub">${item.name || ''}</div>
      `;

      btn.addEventListener('click', () => {
        container.querySelectorAll('.tile').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (side === 'from') state.from = item.code;
        if (side === 'to')   state.to   = item.code;
        recalc();
      });

      container.appendChild(btn);
    });

    // автоселект первой
    const first = container.querySelector('.tile');
    if (first) {
      first.classList.add('active');
      const code = first.dataset.code;
      if (side === 'from') state.from = code;
      if (side === 'to')   state.to   = code;
    }
  }

  function applyCnPayVisibility() {
    qrbox.hidden = !isCnPay(state.toPay);
    if (qrbox.hidden && qrfile) qrfile.value = '';
  }

  function recalc() {
    const a = parseFloat(amountInput.value || '0');
    state.amount = isFinite(a) && a > 0 ? a : 0;

    if (window.PRICING && typeof window.PRICING.quote === 'function' && state.from && state.to) {
      const q = window.PRICING.quote({
        fromPay: state.fromPay,
        toPay:   state.toPay,
        from:    state.from,
        to:      state.to,
        amount:  state.amount
      });
      state.quote = q || { rate:null, total:null, rateText:'—', totalText:'—' };
    } else {
      state.quote = { rate:null, total:null, rateText:'—', totalText:'—' };
    }

    rateVal.textContent  = state.quote.rateText || '—';
    totalVal.textContent = state.quote.totalText || '—';
  }

  // Чипсы
  elFromPay.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip'); if (!btn) return;
    state.fromPay = btn.dataset.type;
    setActiveChip(elFromPay, state.fromPay);
    renderTiles(boxFrom, state.fromPay, 'from');
    recalc();
  });

  elToPay.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip'); if (!btn) return;
    state.toPay = btn.dataset.type;
    setActiveChip(elToPay, state.toPay);
    renderTiles(boxTo, state.toPay, 'to');
    applyCnPayVisibility();
    recalc();
  });

  // Сумма
  amountInput.addEventListener('input', recalc);

  // Инициализация
  setActiveChip(elFromPay, state.fromPay);
  setActiveChip(elToPay,   state.toPay);
  renderTiles(boxFrom, state.fromPay, 'from');
  renderTiles(boxTo,   state.toPay,   'to');
  applyCnPayVisibility();
  recalc();

  // Отправка заявки
  sendBtn.addEventListener('click', () => {
    const payload = {
      type: 'order',
      from_pay: state.fromPay,
      to_pay:   state.toPay,
      from_currency: state.from,
      to_currency:   state.to,
      amount: state.amount,
      rate:   state.quote.rate,
      total:  state.quote.total,
      contact:    (contactInp.value || '').trim(),
      requisites: (requisitesTa.value || '').trim(),
      note:       (noteTa.value || '').trim(),
      has_qr: !!(qrfile && qrfile.files && qrfile.files.length > 0),
    };

    if (tg) {
      try {
        tg.sendData(JSON.stringify(payload));
        tg.close(); // нормальное поведение — бот должен ответить в чате
      } catch (e) {
        console.error(e);
        alert('Не удалось отправить через Telegram WebApp. Попробуйте ещё раз.');
      }
    } else {
      hint.hidden = false;
      alert('Откройте форму из бота в Telegram, чтобы отправить заявку напрямую.');
    }
  });
})();
