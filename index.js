// index.js v36 — отрисовка плиток валют и расчёт

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

  function isCnPay(kind) {
    return kind === 'cnpay';
  }

  function setActiveChip(container, type) {
    container.querySelectorAll('.chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
  }

  function renderTiles(container, kind, side) {
    container.innerHTML = ''; // очистить
    const list = (window.PRICING && typeof window.PRICING.currencies === 'function')
      ? window.PRICING.currencies(kind)
      : [];

    if (!list || !list.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Нет валют для этого способа';
      container.appendChild(empty);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'tiles-grid'; // стилизуется через .tiles .tiles-grid в твоём CSS

    list.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'tile';
      btn.setAttribute('type', 'button');
      btn.dataset.code = item.code;

      btn.innerHTML = `
        <img class="tile-ico" src="${item.icon}" alt="${item.code}">
        <div class="tile-code">${item.code}</div>
        <div class="tile-name">${item.name || ''}</div>
      `;

      btn.addEventListener('click', () => {
        // отметить активную плитку
        grid.querySelectorAll('.tile').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (side === 'from') state.from = item.code;
        if (side === 'to')   state.to   = item.code;

        recalc();
      });

      grid.appendChild(btn);
    });

    container.appendChild(grid);

    // авто-выбор первой валюты, если ещё не выбрана
    const first = grid.querySelector('.tile');
    if (first) {
      first.classList.add('active');
      const code = first.dataset.code;
      if (side === 'from') state.from = code;
      if (side === 'to')   state.to   = code;
    }
  }

  function applyCnPayVisibility() {
    // показываем QR-блок, только если ТО — китайские сервисы
    if (isCnPay(state.toPay)) {
      qrbox.hidden = false;
    } else {
      qrbox.hidden = true;
      if (qrfile) qrfile.value = '';
    }
  }

  function recalc() {
    // прочитать amount
    const a = parseFloat(amountInput.value || '0');
    state.amount = isFinite(a) && a > 0 ? a : 0;

    // запросить котировку
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

    // обновить UI
    rateVal.textContent  = state.quote.rateText || '—';
    totalVal.textContent = state.quote.totalText || '—';
  }

  // Обработчики чипсов
  elFromPay.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    const type = btn.dataset.type;
    state.fromPay = type;
    setActiveChip(elFromPay, type);
    renderTiles(boxFrom, type, 'from');
    recalc();
  });

  elToPay.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    const type = btn.dataset.type;
    state.toPay = type;
    setActiveChip(elToPay, type);
    renderTiles(boxTo, type, 'to');
    applyCnPayVisibility();
    recalc();
  });

  // Изменение суммы
  amountInput.addEventListener('input', recalc);

  // Первая инициализация (выставим активные чипы и сразу нарисуем плитки)
  setActiveChip(elFromPay, state.fromPay);
  setActiveChip(elToPay,   state.toPay);
  renderTiles(boxFrom, state.fromPay, 'from');
  renderTiles(boxTo,   state.toPay,   'to');
  applyCnPayVisibility();
  recalc();

  // Отправка заявки
  sendBtn.addEventListener('click', async () => {
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
        // Закрываем WebApp — это норм. Сообщение «заявка принята» должен прислать бот.
        tg.close();
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
