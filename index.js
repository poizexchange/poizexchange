// index.js v43 — cash-город только для наличных; русские подписи; отправка заявки без автозакрытия
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
  const rateVal = document.getElementById('rateVal');
  const totalVal = document.getElementById('totalVal');

  const contactInput = document.getElementById('contact');
  const reqsInput = document.getElementById('requisites');
  const noteInput = document.getElementById('note');
  const qrBox = document.getElementById('qrbox');
  const qrFile = document.getElementById('qrfile');
  const sendBtn = document.getElementById('sendBtn');
  const hint = document.getElementById('hint');

  // state
  let fromPayType = 'cash';     // cash | bank | crypto
  let toPayType   = 'cash';     // cash | bank | crypto | cnpay
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;       // code (например RUB / USD / CNY / SBP / ALIPAY ...)
  let selTo       = null;
  let currentQuote = { rate:null,total:null, rateText:'—', totalText:'—' };

  // Инициализация WebApp без отправки лишних данных
  if (tg) { try { tg.expand(); tg.ready(); } catch(e){} }
  else if (hint) { hint.hidden = false; }

  function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }

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
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
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
    list.forEach(item=> container.appendChild(tile(item, side)));
  }

  function updateQrVisibility(){
    const cnpay = ['ALIPAY', 'WECHAT', 'CN_CARD'];
    qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  function refreshFrom(){
    // селектор города показываем ТОЛЬКО для наличных
    fromCityBox.hidden = (fromPayType !== 'cash');
    const list = window.PRICING.currencies(fromPayType, cityFrom, 'from');
    renderTiles(fromWrap, list, 'from');
    selFrom = list[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    // селектор города показываем ТОЛЬКО для наличных
    toCityBox.hidden = (toPayType !== 'cash');
    const list = window.PRICING.currencies(toPayType, cityTo, 'to');
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  function recalc(){
    const amount = Number(amountInput.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0){
      rateVal.textContent = '—';
      totalVal.textContent = '—';
      currentQuote = {rate:null,total:null, rateText:'—', totalText:'—'};
      return;
    }
    const q = window.PRICING.quote({ from:selFrom, to:selTo, amount });
    currentQuote = q;
    rateVal.textContent  = q.rateText || '—';
    totalVal.textContent = q.totalText || '—';
  }

  // chips handlers
  function wireChips(box, cb){
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb(btn.dataset.type);
      });
    });
    // activate first
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

  // ——— ВАЛИДАЦИИ ПЕРЕД ОТПРАВКОЙ ———
  function validateBusinessRules(){
    // наличные юани — только Гуанчжоу (и отдать, и получить)
    if (fromPayType === 'cash' && selFrom === 'CNY' && cityFrom !== 'guangzhou') {
      alert('Наличные юани можно ОТДАТЬ только в Гуанчжоу.');
      return false;
    }
    if (toPayType === 'cash' && selTo === 'CNY' && cityTo !== 'guangzhou') {
      alert('Наличные юани можно ПОЛУЧИТЬ только в Гуанчжоу.');
      return false;
    }
    return true;
  }

  // ОТПРАВКА ЗАЯВКИ (WebApp)
  sendBtn?.addEventListener('click', async ()=>{
    const amountNum = Number(amountInput.value || 0);
    if (!selFrom || !selTo) { alert('Выберите валюты/сервис «Отдаю» и «Получаю».'); return; }
    if (!(amountNum > 0))   { alert('Введите сумму.'); return; }
    if (!currentQuote.rate) { alert('Не удалось рассчитать курс. Попробуйте ещё раз.'); return; }
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
      contact: (contactInput.value || '').trim(),
      requisites: (reqsInput.value || '').trim(),
      note: (noteInput.value || '').trim(),
      fix_minutes: 30
    };

    // Файл через sendData не отправить — передадим только имя, менеджер запросит QR в чате
    const file = qrFile?.files?.[0];
    if (file) payload.qr_filename = file.name || 'qr.png';

    if (tg) {
      try {
        tg.sendData(JSON.stringify(payload)); // бот ловит web_app_data
        // НЕ закрываем webview — покажем попап
        if (tg.showPopup) {
          tg.showPopup({ title: 'Заявка отправлена', message: 'Мы скоро свяжемся с вами.' });
        } else {
          alert('Заявка отправлена. Мы скоро свяжемся с вами.');
        }
      } catch (e) {
        console.error(e);
        alert('Ошибка отправки в Telegram. Попробуйте ещё раз.');
      }
    } else {
      alert('Откройте форму через Telegram WebApp, чтобы отправить заявку.');
    }
  });
})();
