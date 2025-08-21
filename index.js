// index.js v43 — рабочая отправка заявки + логика городов и плиток
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
  const isTG = !!tg;

  // ---------- DOM ----------
  const fromPayBox   = document.getElementById('from-pay');
  const toPayBox     = document.getElementById('to-pay');

  const fromCityBox  = document.getElementById('from-citybox');
  const toCityBox    = document.getElementById('to-citybox');

  const cityFromSel  = document.getElementById('cityFrom');
  const cityToSel    = document.getElementById('cityTo');

  const fromWrap     = document.getElementById('from-currencies');
  const toWrap       = document.getElementById('to-currencies');

  const amountInput  = document.getElementById('amount');
  const rateVal      = document.getElementById('rateVal');
  const totalVal     = document.getElementById('totalVal');

  const contactInput = document.getElementById('contact');
  const reqsInput    = document.getElementById('requisites');
  const noteInput    = document.getElementById('note');

  const qrBox        = document.getElementById('qrbox');
  const qrFile       = document.getElementById('qrfile');

  const sendBtn      = document.getElementById('sendBtn');
  const hint         = document.getElementById('hint');

  // ---------- STATE ----------
  let fromPayType  = 'cash';     // cash | bank | crypto
  let toPayType    = 'cash';     // cash | bank | crypto | cnpay
  let cityFrom     = 'moscow';
  let cityTo       = 'moscow';
  let selFrom      = null;       // currency code
  let selTo        = null;       // currency code
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };

  // ---------- TG INIT ----------
  if (isTG) {
    try {
      tg.expand();
      tg.ready();
      // пингуем открытие
      const openPayload = { action:'webapp_open' };
      console.log('DEBUG WEBAPP_OPEN -> sendData', openPayload);
      tg.sendData(JSON.stringify(openPayload));
    } catch (e) {
      console.warn('TG init error', e);
    }
  } else {
    // если открыто не в Telegram — покажем подсказку
    if (hint) hint.hidden = false;
  }

  // ---------- HELPERS ----------
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }
  function fmtNum(n, d=2){ return (n==null || isNaN(n)) ? '—' : Number(n).toLocaleString('ru-RU',{maximumFractionDigits:d}); }

  function markActive(container, code){
    if (!container) return;
    container.querySelectorAll('.tile').forEach(t => t.classList.remove('active'));
    if (!code) return;
    const el = container.querySelector(`[data-code="${code}"]`);
    if (el) el.classList.add('active');
  }

  // плитка валюты
  function tile(item, side){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `
      <div class="ico"><img src="${item.icon}" alt=""></div>
      <div class="cap">${item.nameRu || item.code}</div>
    `;
    btn.addEventListener('click', () => {
      if (side === 'from') {
        selFrom = item.code;
        markActive(fromWrap, selFrom);
      } else {
        selTo = item.code;
        markActive(toWrap, selTo);
      }
      // QR: показываем только если ПОЛУЧАЮ китайские сервисы
      const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
      qrBox && (qrBox.hidden = !(toPayType === 'cnpay' && side === 'to' && selTo && cnpay.includes(selTo)));
      recalc();
    });
    return btn;
  }

  function renderTiles(container, list, side){
    clear(container);
    if (!list || list.length === 0) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Нет доступных вариантов';
      container && container.appendChild(p);
      return;
    }
    list.forEach(item => container.appendChild(tile(item, side)));
  }

  // ---------- DATA FROM PRICING ----------
  function refreshFrom(){
    // селектор города — только для наличных
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');

    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(fromPayType, cityFrom, 'from') : [];

    console.log('DEBUG refreshFrom', { fromPayType, cityFrom, list });

    renderTiles(fromWrap, list, 'from');
    selFrom = list && list[0] ? list[0].code : null;
    markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    // селектор города — только для наличных
    if (toCityBox) toCityBox.hidden = (toPayType !== 'cash');

    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(toPayType, cityTo, 'to') : [];

    console.log('DEBUG refreshTo', { toPayType, cityTo, list });

    renderTiles(toWrap, list, 'to');
    selTo = list && list[0] ? list[0].code : null;
    markActive(toWrap, selTo);

    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    qrBox && (qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo)));
  }

  function recalc(){
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0 || !window.PRICING || !window.PRICING.quote){
      rateVal && (rateVal.textContent = '—');
      totalVal && (totalVal.textContent = '—');
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }
    const q = window.PRICING.quote({ from: selFrom, to: selTo, amount });
    currentQuote = q;
    if (rateVal)  rateVal.textContent  = q.rateText || '—';
    if (totalVal) totalVal.textContent = q.totalText || '—';
    console.log('DEBUG quote', { selFrom, selTo, amount, q });
  }

  // ---------- CHIPS ----------
  function wireChips(box, cb){
    if (!box) return;
    const chips = box.querySelectorAll('.chip');
    chips.forEach(btn => {
      btn.addEventListener('click', () => {
        chips.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cb(btn.dataset.type);
      });
    });
    // активируем первую
    const first = chips[0];
    if (first) { first.classList.add('active'); cb(first.dataset.type); }
  }

  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc(); });

  // ---------- CITY SELECTS ----------
  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc(); });

  // ---------- INIT ----------
  // если чипсы не поставили active автоматически (например, другой HTML),
  // руками дернем первичную инициализацию:
  if (!fromWrap?.querySelector('.tile')) refreshFrom();
  if (!toWrap?.querySelector('.tile'))   refreshTo();
  recalc();

  // ---------- SEND ORDER ----------
  sendBtn && sendBtn.addEventListener('click', async () => {
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo) {
      const msg = 'Выберите валюты отправки и получения.';
      console.warn('DEBUG validation', msg);
      isTG ? tg.showAlert?.(msg) : alert(msg);
      return;
    }
    if (!amount || amount <= 0) {
      const msg = 'Введите корректную сумму.';
      console.warn('DEBUG validation', msg);
      isTG ? tg.showAlert?.(msg) : alert(msg);
      return;
    }
    if (!currentQuote?.rate || !currentQuote?.total) {
      const msg = 'Нет актуального курса. Попробуйте изменить параметры.';
      console.warn('DEBUG validation', msg);
      isTG ? tg.showAlert?.(msg) : alert(msg);
      return;
    }

    const payload = {
      type: 'order',
      from_currency: selFrom,
      to_currency: selTo,
      from_kind: fromPayType,
      to_kind: toPayType,
      city_from: cityFrom,
      city_to: cityTo,
      amount: amount,
      rate: currentQuote.rate,
      total: currentQuote.total,
      contact: (contactInput?.value || '').trim(),
      requisites: (reqsInput?.value || '').trim(),
      note: (noteInput?.value || '').trim(),
      fix_minutes: 30
    };

    // файл QR — только имя добавляем (сам файл через WebApp SDK не шлётся)
    const file = qrFile?.files?.[0];
    if (file) payload.qr_filename = file.name;

    console.log('DEBUG SEND PAYLOAD ->', payload);

    if (!isTG) {
      alert('Откройте форму через Telegram (WebApp), чтобы отправить заявку.');
      return;
    }

    try {
      tg.sendData(JSON.stringify(payload));
      tg.showAlert?.('Заявка отправлена 📩');
      setTimeout(() => tg.close(), 500);
    } catch (e) {
      console.error('tg.sendData error', e);
      tg.showAlert?.('Ошибка отправки в Telegram. Попробуйте ещё раз.');
    }
  });

  // на всякий случай — пересчёт при вводе суммы
  amountInput && amountInput.addEventListener('input', recalc);
})();
