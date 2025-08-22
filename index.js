// index.js v43 — бело-голубой UI, русские подписи, города только для cash,
// отправка заявки через Telegram WebApp (с безопасными уведомлениями)
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // элементы
  const fromPayBox = document.getElementById('from-pay');
  const toPayBox   = document.getElementById('to-pay');

  const fromCityBox = document.getElementById('from-citybox');
  const toCityBox   = document.getElementById('to-citybox');

  const cityFromSel = document.getElementById('cityFrom');
  const cityToSel   = document.getElementById('cityTo');

  const fromWrap = document.getElementById('from-currencies');
  const toWrap   = document.getElementById('to-currencies');

  const amountInput = document.getElementById('amount');
  const rateVal  = document.getElementById('rateVal');
  const totalVal = document.getElementById('totalVal');

  const contactInput = document.getElementById('contact');
  const reqsInput    = document.getElementById('requisites');
  const noteInput    = document.getElementById('note');

  const qrBox  = document.getElementById('qrbox');
  const qrFile = document.getElementById('qrfile');

  const sendBtn = document.getElementById('sendBtn');
  const hint    = document.getElementById('hint');

  // state
  let fromPayType = 'cash';     // cash | bank | crypto
  let toPayType   = 'cash';     // cash | bank | crypto | cnpay
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;       // код валюты/сервиса
  let selTo       = null;       // код валюты/сервиса
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };

  // Инициализация WebApp + «пинг», чтобы бот увидел юзера
  try {
    if (tg) {
      tg.expand();
      tg.ready();
      tg.sendData(JSON.stringify({ action:'webapp_open' }));
    } else if (hint) {
      hint.hidden = false;
    }
  } catch (_) {}

  // утилиты
  function clear(node){ while (node && node.firstChild) node.removeChild(node.firstChild); }

  function safeAlert(message){
    try {
      if (tg && typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast('6.2') && typeof tg.showAlert === 'function') {
        tg.showAlert(message);
      } else {
        alert(message);
      }
    } catch (_) { alert(message); }
  }

  function tile(item, side){
    if (!item) return document.createTextNode('');
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
    if (!container) return;
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    if (!code) return;
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }

  function renderTiles(container, list, side){
    clear(container);
    (list || []).forEach(item => container.appendChild(tile(item, side)));
  }

  function updateQrVisibility(){
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    if (!qrBox) return;
    qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  function refreshFrom(){
    // селектор города показываем ТОЛЬКО для наличных
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');

    const pricing = window.PRICING;
    if (!pricing || typeof pricing.currencies !== 'function') {
      console.warn('PRICING.currencies не найден. Убедись, что pricing.js подключён перед index.js');
      renderTiles(fromWrap, [], 'from');
      selFrom = null;
      return;
    }
    const list = pricing.currencies(fromPayType, cityFrom, 'from') || [];
    renderTiles(fromWrap, list, 'from');
    selFrom = list[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    // селектор города показываем ТОЛЬКО для наличных
    if (toCityBox) toCityBox.hidden = (toPayType !== 'cash');

    const pricing = window.PRICING;
    if (!pricing || typeof pricing.currencies !== 'function') {
      console.warn('PRICING.currencies не найден. Убедись, что pricing.js подключён перед index.js');
      renderTiles(toWrap, [], 'to');
      selTo = null;
      updateQrVisibility();
      return;
    }
    const list = pricing.currencies(toPayType, cityTo, 'to') || [];
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  function recalc(){
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0){
      rateVal && (rateVal.textContent = '—');
      totalVal && (totalVal.textContent = '—');
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }
    const pricing = window.PRICING;
    if (!pricing || typeof pricing.quote !== 'function') {
      console.warn('PRICING.quote не найден.');
      return;
    }
    const q = pricing.quote({ from:selFrom, to:selTo, amount });
    currentQuote = q || { rate:null,total:null, rateText:'—', totalText:'—' };
    rateVal && (rateVal.textContent  = currentQuote.rateText || '—');
    totalVal && (totalVal.textContent = currentQuote.totalText || '—');
  }

  // chips handlers
  function wireChips(box, cb){
    if (!box) return;
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb(btn.dataset.type);
      });
    });
    // активировать первую (если есть)
    const first = box.querySelector('.chip');
    if (first){ first.classList.add('active'); cb(first.dataset.type); }
  }

  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc(); });

  // selects (видны только при cash)
  cityFromSel?.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel?.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc(); });

  // первичный рендер
  refreshFrom();
  refreshTo();
  recalc();

  // Бизнес-правила (наличные CNY только Гуанчжоу)
  function validateBusinessRules(){
    if (fromPayType === 'cash' && selFrom === 'CNY' && cityFrom !== 'guangzhou') {
      safeAlert('Наличные юани можно ОТДАТЬ только в Гуанчжоу.');
      return false;
    }
    if (toPayType === 'cash' && selTo === 'CNY' && cityTo !== 'guangzhou') {
      safeAlert('Наличные юани можно ПОЛУЧИТЬ только в Гуанчжоу.');
      return false;
    }
    return true;
  }

  // ОТПРАВКА ЗАЯВКИ (WebApp)
  sendBtn?.addEventListener('click', async ()=>{
    const amountNum = Number(amountInput?.value || 0);
    if (!selFrom || !selTo) { safeAlert('Выберите валюты/сервис «Отдаю» и «Получаю».'); return; }
    if (!(amountNum > 0))   { safeAlert('Введите сумму.'); return; }
    if (!currentQuote.rate) { safeAlert('Не удалось рассчитать курс. Попробуйте ещё раз.'); return; }
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

    // Файл через sendData не передашь — только имя
    const file = qrFile?.files?.[0];
    if (file) payload.qr_filename = file.name || 'qr.png';

    if (!tg) { safeAlert('Откройте форму через Telegram WebApp, чтобы отправить заявку.'); return; }

    try {
      tg.sendData(JSON.stringify(payload)); // бот ловит web_app_data
      // уведомление (без падения на старых клиентах)
      safeAlert('✅ Заявка отправлена! Менеджер скоро свяжется с вами.');
      // tg.close(); // если хочешь закрывать — раскомментируй
    } catch (e) {
      console.error(e);
      safeAlert('Ошибка отправки в Telegram. Попробуйте ещё раз.');
    }
  });
})();
