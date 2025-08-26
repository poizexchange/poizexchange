// index.js v42.2 — без изменения дизайна/плиток, стабильный рендер + отправка заявки
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // элементы
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

  // state
  let fromPayType = 'cash';   // cash | bank | crypto
  let toPayType   = 'cash';   // cash | bank | crypto | cnpay
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;     // код валюты/сервиса
  let selTo       = null;     // код валюты/сервиса
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };

  // Инициализация WebApp (без sendData-пинга, чтобы не мешать)
  if (tg) { try { tg.expand(); tg.ready(); } catch (e) {} }
  else if (hint) { hint.hidden = false; }

  // ---------- утилиты ----------
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }

  function tile(item, side){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `
      <div class="ico"><img src="${item.icon}" alt=""></div>
      <div class="cap">${item.nameRu}</div>
    `;
    btn.addEventListener('click', () => {
      if (side === 'from') {
        selFrom = item.code;
        markActive(fromWrap, item.code);
      } else {
        selTo = item.code;
        markActive(toWrap, item.code);
      }
      updateQrVisibility();
      recalc();
    });
    return btn;
  }

  function markActive(container, code){
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }

  function renderTiles(container, list, side){
    clear(container);
    list.forEach(item => container.appendChild(tile(item, side)));
  }

  function updateQrVisibility(){
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    if (qrBox) qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  // ---------- рендер списков ----------
  function refreshFrom(){
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');

    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(fromPayType, cityFrom, 'from')
      : [];

    renderTiles(fromWrap, list, 'from');
    selFrom = list[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    if (toCityBox) toCityBox.hidden = (toPayType !== 'cash');

    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(toPayType, cityTo, 'to')
      : [];

    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  function recalc(){
    amountInput?.addEventListener('input', recalc);
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0 || !window.PRICING?.quote){
      if (rateVal)  rateVal.textContent  = '—';
      if (totalVal) totalVal.textContent = '—';
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }
    const q = window.PRICING.quote({ from: selFrom, to: selTo, amount });
    currentQuote = q || {};
    if (rateVal)  rateVal.textContent  = q?.rateText  ?? '—';
    if (totalVal) totalVal.textContent = q?.totalText ?? '—';
  }

  // ---------- кнопки-«чипы» ----------
  function wireChips(box, cb){
    if (!box) return;
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb && cb(btn.dataset.type);
      });
    });
    const first = box.querySelector('.chip');
    if (first){ first.classList.add('active'); cb && cb(first.dataset.type); }
  }

  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc();  });

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc();  });

  // ---------- безопасная инициализация (ждём PRICING) ----------
  function boot() {
    if (!window.PRICING?.currencies || !window.PRICING?.quote) {
      setTimeout(boot, 100); // pricing.js ещё не готов — подождём
      return;
    }
    refreshFrom();
    refreshTo();
    recalc();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ---------- отправка заявки ----------
  function validateBusinessRules(){
    // наличные CNY — только Гуанчжоу
    if (fromPayType === 'cash' && selFrom === 'CNY' && cityFrom !== 'guangzhou') { alert('Наличные юани можно ОТДАТЬ только в Гуанчжоу.'); return false; }
    if (toPayType   === 'cash' && selTo   === 'CNY' && cityTo   !== 'guangzhou') { alert('Наличные юани можно ПОЛУЧИТЬ только в Гуанчжоу.'); return false; }
    return true;
  }

  async function sendOrder(){
    const amountNum = Number(amountInput?.value || 0);
    if (!selFrom || !selTo) { alert('Выберите валюты «Отдаю» и «Получаю».'); return; }
    if (!(amountNum > 0))   { alert('Введите сумму.'); return; }
    if (!currentQuote.rate) { alert('Не удалось рассчитать курс.'); return; }
    if (!validateBusinessRules()) return;

    const payload = {
      type: 'order',
      from_currency: selFrom,
      to_currency: selTo,
      from_kind: fromPayType,
      to_kind: toPayType,
      city_from: cityFrom,
      city_to: cityTo,
      amount: amountNum,
      rate: currentQuote.rate,
      total: currentQuote.total,
      contact: (contactInput?.value || '').trim(),
      requisites: (reqsInput?.value || '').trim(),
      note: (noteInput?.value || '').trim(),
      fix_minutes: 30
    };
    const file = qrFile?.files?.[0];
    if (file) payload.qr_filename = file.name || 'qr.png';

    // 1) Пытаемся через Telegram WebApp
    let viaTelegram = false;
    try {
      if (window.Telegram?.WebApp?.sendData) {
        window.Telegram.WebApp.sendData(JSON.stringify(payload));
        viaTelegram = true;
        // дружелюбный отклик (без закрытия)
        if (window.Telegram.WebApp.showPopup) {
          window.Telegram.WebApp.showPopup({ title: 'Заявка отправлена', message: 'Мы скоро свяжемся с вами.' });
        } else {
          alert('Заявка отправлена. Мы скоро свяжемся с вами.');
        }
      }
    } catch (e) {
      console.error('sendData failed', e);
    }

    // 2) Если не внутри Telegram — уходим в REST API
    if (!viaTelegram) {
      try {
        const r = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_currency: payload.from_currency,
            to_currency: payload.to_currency,
            from_kind:    payload.from_kind,
            to_kind:      payload.to_kind,
            city_from:    payload.city_from,
            city_to:      payload.city_to,
            amount:       payload.amount,
            rate:         payload.rate,
            total:        payload.total,
            contact:      payload.contact,
            requisites:   payload.requisites,
            note:         payload.note,
            fix_minutes:  payload.fix_minutes,
            qr_filename:  payload.qr_filename || null,
          })
        });
        const j = await r.json().catch(()=>({}));
        if (r.ok && j.ok) alert('Заявка отправлена (через сайт). Мы скоро свяжемся с вами.');
        else alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
      } catch (e) {
        console.error(e);
        alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
      }
    }
  }

  sendBtn && sendBtn.addEventListener('click', sendOrder);
})();
