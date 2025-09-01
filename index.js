// index.js v71 — стабильные плитки + автопересчёт + TG WebApp sendData + резерв в API
(function () {
  // ===== DOM =====
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

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

  // ===== STATE =====
  // По твоему требованию стартуем: Отдаю = БАНК, Получаю = КИТ.СЕРВИСЫ
  let fromPayType = 'bank';     // cash | bank | crypto
  let toPayType   = 'cnpay';    // cash | bank | crypto | cnpay
  let cityFrom    = 'moscow';
  let cityTo      = 'guangzhou'; // чтобы сразу корректно для CNY cash
  let selFrom     = null;       // код валюты/сервиса (например 'RUB', 'USDT', 'ALIPAY')
  let selTo       = null;
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
  let sending = false;

  // ===== CONST =====
  const API_BASE = 'https://api.poizexchange.ru';
  const CNPAY_CODES = ['ALIPAY','WECHAT','CN_CARD','CNY']; // в «китайских сервисах» и наличные CNY

  // ===== INIT TG =====
  if (tg) {
    try {
      tg.expand(); tg.ready();
      // легкий пинг, чтобы в логах бота видеть открытие формы
      try { tg.sendData(JSON.stringify({action:'webapp_open'})); } catch(e){}
    } catch(e){}
  } else if (hint) {
    hint.hidden = false;
  }

  // ===== UTILS =====
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

    // Правила видимости/блокировки (минимум защиты на фронте)
    // 1) Отдать наличные CNY нельзя — делаем их неактивными
    if (side === 'from' && fromPayType === 'cash' && item.code === 'CNY') {
      btn.disabled = true;
      btn.classList.add('disabled');
    }
    // 2) Получить наличные CNY можно только в Гуанчжоу
    if (side === 'to' && toPayType === 'cash' && item.code === 'CNY' && cityTo !== 'guangzhou') {
      btn.disabled = true;
      btn.classList.add('disabled');
    }

    btn.addEventListener('click', () => {
      if (btn.disabled) return;
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
    if (!container) return;
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    const match = container.querySelector(`[data-code="${code}"]`);
    if (match) match.classList.add('active');
  }

  function renderTiles(container, list, side){
    clear(container);
    list.forEach(item => container.appendChild(tile(item, side)));
  }

  function firstEnabledCode(container){
    const btn = container.querySelector('.tile:not(.disabled)');
    return btn ? btn.getAttribute('data-code') : null;
  }

  function updateQrVisibility(){
    // Показываем файл для QR только когда выбираются китайские сервисы (ALIPAY/WECHAT/CN_CARD) при получении
    const show = (toPayType === 'cnpay') && selTo && CNPAY_CODES.includes(selTo) && selTo !== 'CNY';
    if (qrBox) qrBox.hidden = !show;
  }

  // ===== RENDER LISTS =====
  function refreshFrom(){
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');
    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(fromPayType, cityFrom, 'from')
      : [];
    renderTiles(fromWrap, list, 'from');
    // Выбираем первый доступный элемент
    selFrom = firstEnabledCode(fromWrap) || (list[0]?.code ?? null);
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    if (toCityBox) toCityBox.hidden = (toPayType !== 'cash');
    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(toPayType, cityTo, 'to')
      : [];
    renderTiles(toWrap, list, 'to');
    selTo = firstEnabledCode(toWrap) || (list[0]?.code ?? null);
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  // ===== QUOTE =====
  function recalc(){
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

  // ===== CHIPS =====
  function wireChips(box, cb){
    if (!box) return;
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb && cb(btn.dataset.type);
      });
    });
  }

  // ===== EVENTS =====
  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc(); });

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc(); });

  amountInput && amountInput.addEventListener('input', recalc);

  // ===== SAFE BOOT (ждём PRICING) =====
  function bootOnceReady(){
    if (!window.PRICING?.currencies || !window.PRICING?.quote) { setTimeout(bootOnceReady, 50); return; }

    // Проставляем активные чипы по умолчанию: Отдаю=Банк, Получаю=Кит.сервисы
    if (fromPayBox) {
      fromPayBox.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
      const defFrom = fromPayBox.querySelector('.chip[data-type="bank"]') || fromPayBox.querySelector('.chip');
      if (defFrom){ defFrom.classList.add('active'); fromPayType = defFrom.dataset.type || 'bank'; }
    }
    if (toPayBox) {
      toPayBox.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
      const defTo = toPayBox.querySelector('.chip[data-type="cnpay"]') || toPayBox.querySelector('.chip');
      if (defTo){ defTo.classList.add('active'); toPayType = defTo.dataset.type || 'cnpay'; }
    }

    // Город: для cash показываем селект, начинаем с moscow/guangzhou уже заданы в state
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');
    if (toCityBox)   toCityBox.hidden   = (toPayType   !== 'cash');

    refreshFrom();
    refreshTo();
    recalc();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootOnceReady);
  else bootOnceReady();

  // ===== BUSINESS VALIDATION (перед отправкой) =====
  function validateBusiness(){
    // Отдавать юани нельзя вообще (особенно наличные)
    if (selFrom === 'CNY') {
      alert('Отдавать CNY нельзя.');
      return false;
    }
    // Получить наличные CNY можно только в Гуанчжоу
    if (toPayType === 'cash' && selTo === 'CNY' && cityTo !== 'guangzhou') {
      alert('Наличные CNY можно получить только в Гуанчжоу.');
      return false;
    }
    return true;
  }

  // ===== SEND ORDER =====
  async function sendOrder(){
    if (sending) return;
    sending = true;
    try{
      const amountNum = Number(amountInput?.value || 0);
      if (!selFrom || !selTo) { alert('Выберите валюты «Отдаю» и «Получаю».'); return; }
      if (!(amountNum > 0))   { alert('Введите сумму.'); return; }
      if (!currentQuote.rate) { alert('Не удалось рассчитать курс.'); return; }
      if (!validateBusiness()) return;

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
        qr_filename: qrFile?.files?.[0]?.name || null,
        nonce: Date.now().toString(36) + Math.random().toString(36).slice(2)
      };

      // 1) Пытаемся через TG WebApp
      let webappTried = false;
      try {
        if (window.Telegram?.WebApp?.sendData) {
          window.Telegram.WebApp.sendData(JSON.stringify(payload));
          webappTried = true;
        }
      } catch (e) { console.warn('sendData error', e); }

      // 2) ОБЯЗАТЕЛЬНО шлём резервом на API — чтобы заявка не потерялась
      try {
        const r = await fetch(`${API_BASE}/order`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });
        const j = await r.json().catch(()=>({}));
        if (r.ok && j.ok) {
          alert(webappTried ? 'Заявка отправлена.' : 'Заявка отправлена (через сайт).');
        } else {
          alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
        }
      } catch (e) {
        console.error(e);
        alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
      }
    } finally {
      sending = false;
    }
  }

  sendBtn && sendBtn.addEventListener('click', sendOrder);
})();
