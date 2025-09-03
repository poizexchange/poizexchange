// index.js v72 — стабильные плитки, двусторонний ввод суммы, надёжная отправка
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // --- DOM ---
  const fromPayBox   = document.getElementById('from-pay');
  const toPayBox     = document.getElementById('to-pay');

  const cityTop      = document.getElementById('cityTop');
  const cityFromSel  = document.getElementById('cityFrom');
  const cityToSel    = document.getElementById('cityTo');

  const fromWrap     = document.getElementById('from-currencies');
  const toWrap       = document.getElementById('to-currencies');

  const amountInput  = document.getElementById('amount');     // отдаю
  const amountGetInp = document.getElementById('amountGet');  // хочу получить

  const rateVal      = document.getElementById('rateVal');
  const totalVal     = document.getElementById('totalVal');

  const contactInput = document.getElementById('contact');
  const reqsInput    = document.getElementById('requisites');
  const noteInput    = document.getElementById('note');

  const qrBox        = document.getElementById('qrbox');
  const qrFile       = document.getElementById('qrfile');

  const sendBtn      = document.getElementById('sendBtn');
  const hint         = document.getElementById('hint');

  // --- API ---
  const API_BASE = 'https://api.poizexchange.ru';

  // --- STATE ---
  let fromPayType = 'bank';     // cash | bank | crypto
  let toPayType   = 'cnpay';    // cash | bank | crypto | cnpay
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;
  let selTo       = null;
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
  let sending = false;
  let updatingFromAmount = false;
  let updatingGetAmount = false;

  // --- Telegram init ---
  if (tg) {
    try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({action:'webapp_open'})); } catch(e){}
  } else if (hint) { hint.hidden = false; }

  // --- helpers ---
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }
  function showCitiesIfNeeded(){
    const need = (fromPayType === 'cash') || (toPayType === 'cash');
    if (cityTop) cityTop.hidden = !need;
  }
  function markActive(container, code){
    if (!container) return;
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }
  function updateQrVisibility(){
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    if (qrBox) qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  function tile(item, side){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `<div class="ico"><img src="${item.icon}" alt=""></div><div class="cap">${item.nameRu}</div>`;

    // Нельзя отдавать CNY
    if (side === 'from' && item.code === 'CNY') {
      btn.classList.add('disabled');
      btn.title = 'Отдавать юани нельзя';
    }

    btn.addEventListener('click', () => {
      if (side === 'from' && item.code === 'CNY') return;
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
      updateQrVisibility();
      recalc();
    });
    return btn;
  }

  function renderTiles(container, list, side){
    clear(container);
    list.forEach(item => container.appendChild(tile(item, side)));
  }

  // --- списки валют ---
  function refreshFrom(){
    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(fromPayType, cityFrom, 'from')
      : [];
    renderTiles(fromWrap, list, 'from');
    const firstAllowed = list.find(x => x.code !== 'CNY');
    selFrom = (firstAllowed ? firstAllowed.code : list[0]?.code) || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(toPayType, cityTo, 'to')
      : [];
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  // --- расчёты ---
  function setOutputs(q){
    currentQuote = q || {};
    rateVal && (rateVal.textContent = q?.rateText ?? '—');
    totalVal && (totalVal.textContent = q?.totalText ?? '—');
  }

  function recalc(){
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0 || !window.PRICING?.quote){
      setOutputs({ rate:null, total:null, rateText:'—', totalText:'—' });
      return;
    }
    const q = window.PRICING.quote({ from: selFrom, to: selTo, amount });
    setOutputs(q);

    // если сейчас НЕ идёт синхронизация из «получаю», обновим поле amountGet
    if (!updatingGetAmount) {
      updatingFromAmount = true;
      amountGetInp && (amountGetInp.value = (q?.total != null ? Number(q.total).toFixed(2) : ''));
      updatingFromAmount = false;
    }
  }

  // обратная задача: по «хочу получить» найти «сколько отдать»
  function solveFromAmountForTarget(targetTo){
    targetTo = Number(targetTo || 0);
    if (!selFrom || !selTo || targetTo <= 0 || !window.PRICING?.quote) return null;

    // Бинарный поиск по amountFrom
    let lo = 0, hi = Math.max(targetTo * (currentQuote.rate || 100), targetTo * 1000, 1e6);
    let mid, total;

    for (let i=0; i<28; i++){
      mid = (lo + hi) / 2;
      const q = window.PRICING.quote({ from: selFrom, to: selTo, amount: mid });
      total = Number(q?.total || 0);
      if (!total) { hi = mid; continue; }
      if (total < targetTo) lo = mid; else hi = mid;
    }
    return hi;
  }

  function recalcFromTarget(){
    const target = Number(amountGetInp?.value || 0);
    if (!selFrom || !selTo || target <= 0 || !window.PRICING?.quote){
      setOutputs({ rate:null, total:null, rateText:'—', totalText:'—' });
      if (!updatingFromAmount) { updatingGetAmount = true; amountGetInp.value=''; updatingGetAmount = false; }
      return;
    }
    const needFrom = solveFromAmountForTarget(target);
    if (needFrom && isFinite(needFrom)){
      updatingFromAmount = true;
      amountInput.value = needFrom.toFixed(2);
      updatingFromAmount = false;
      // после выставления корректно пересчитаем по прямой функции
      recalc();
    }
  }

  // --- правила ---
  function validateBusinessRules(){
    // отдавать CNY нельзя
    if (selFrom === 'CNY') { alert('Отдавать юани нельзя.'); return false; }
    // Наличные CNY — только Гуанчжоу
    if (fromPayType === 'cash' && selFrom === 'CNY' && cityFrom !== 'guangzhou') {
      alert('Наличные юани можно ОТДАТЬ только в Гуанчжоу.'); return false;
    }
    if (toPayType === 'cash' && selTo === 'CNY' && cityTo !== 'guangzhou') {
      alert('Наличные юани можно ПОЛУЧИТЬ только в Гуанчжоу.'); return false;
    }
    return true;
  }

  // --- отправка заявки ---
  async function sendOrder(){
    if (sending) return;
    sending = true;
    try {
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
        qr_filename: qrFile?.files?.[0]?.name || null
      };

      // пробуем продублировать в TG (если открыто в Telegram)
      try { if (tg && tg.sendData) tg.sendData(JSON.stringify(payload)); } catch(e){}

      // основной маршрут — REST API
      const r = await fetch(`${API_BASE}/order`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));

      if (r.ok && j.ok) {
        if (tg?.showPopup) tg.showPopup({ title: 'Заявка отправлена', message: 'Мы скоро свяжемся с вами.' });
        else alert('Заявка отправлена. Мы скоро свяжемся с вами.');
      } else {
        alert('Ошибка при отправке заявки. Попробуйте ещё раз.');
        console.error('ORDER FAIL', r.status, j);
      }
    } catch (e) {
      alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
      console.error('ORDER NET ERR', e);
    } finally {
      sending = false;
    }
  }

  // --- чипы ---
  function wireChips(box, cb, initialType){
    if (!box) return;
    const chips = Array.from(box.querySelectorAll('.chip'));
    chips.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        chips.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb && cb(btn.dataset.type);
      });
    });
    const initial = initialType ? box.querySelector(`.chip[data-type="${initialType}"]`) : chips[0];
    if (initial){ initial.classList.add('active'); cb && cb(initial.dataset.type); }
  }

  // --- события ---
  wireChips(fromPayBox, (type)=>{ fromPayType = type; showCitiesIfNeeded(); refreshFrom(); recalc(); }, 'bank');
  wireChips(toPayBox,   (type)=>{ toPayType   = type; showCitiesIfNeeded(); refreshTo();  recalc(); }, 'cnpay');

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc(); });

  amountInput && amountInput.addEventListener('input', ()=>{ if (!updatingFromAmount){ recalc(); } });
  amountGetInp && amountGetInp.addEventListener('input', ()=>{ if (!updatingGetAmount){ recalcFromTarget(); } });

  sendBtn && sendBtn.addEventListener('click', sendOrder);

  // --- безопасный старт ---
  function bootOnceReady(){
    if (!window.PRICING?.currencies || !window.PRICING?.quote) return setTimeout(bootOnceReady, 50);
    showCitiesIfNeeded();
    refreshFrom();
    refreshTo();
    recalc();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootOnceReady);
  else bootOnceReady();
})();
