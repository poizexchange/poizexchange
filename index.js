// index.js v74 — баннер, выразительные заголовки, двусторонний расчёт, надёжная отправка
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // --- DOM ---
  const fromPayBox   = document.getElementById('from-pay');
  const toPayBox     = document.getElementById('to-pay');

  const cityTop      = document.getElementById('cityTop');
  const fromCityBox  = document.getElementById('from-citybox');
  const toCityBox    = document.getElementById('to-citybox');

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

  const qrBox        = document.getElementById('qrbox');
  const qrFile       = document.getElementById('qrfile');

  const sendBtn      = document.getElementById('sendBtn');
  const hint         = document.getElementById('hint');

  // --- CONST / API ---
  const API_BASE = 'https://api.poizexchange.ru';

  // --- STATE ---
  // стартуем Банк -> Китайские сервисы
  let fromPayType = 'bank';     // cash | bank | crypto
  let toPayType   = 'cnpay';    // cash | bank | crypto | cnpay
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;
  let selTo       = null;
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
  let updatingGet  = false; // чтобы не зациклить взаимные oninput
  let updatingGive = false;
  let sending = false;

  // --- Telegram init ---
  if (tg) {
    try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({action:'webapp_open'})); } catch(e){}
  } else if (hint) { hint.hidden = false; }

  // --- helpers ---
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }
  function showCityBox() {
    // показываем общий блок выбора города только если где-то выбран CASH
    const needCity = (fromPayType === 'cash' || toPayType === 'cash');
    if (cityTop) cityTop.hidden = !needCity;
  }

  function markActive(container, code){
    if (!container) return;
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    const found = container.querySelectorAll(`[data-code="${code}"]`);
    found.forEach(t=>t.classList.add('active'));
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
    btn.innerHTML = `
      <div class="ico"><img src="${item.icon}" alt=""></div>
      <div class="cap">${item.nameRu}</div>
    `;

    // нельзя отдавать CNY
    if (side === 'from' && item.code === 'CNY') {
      btn.classList.add('disabled');
      btn.title = 'Отдавать юани нельзя';
    }

    btn.addEventListener('click', () => {
      if (side === 'from' && item.code === 'CNY') { return; }
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
      updateQrVisibility();
      recalcFromGive();
    });
    return btn;
  }

  function renderTiles(container, list, side){
    clear(container);
    list.forEach(item => container.appendChild(tile(item, side)));
  }

  // --- списки валют ---
  function refreshFrom(){
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');
    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(fromPayType, cityFrom, 'from') : [];
    renderTiles(fromWrap, list, 'from');
    const firstAllowed = list.find(x => x.code !== 'CNY');
    selFrom = (firstAllowed ? firstAllowed.code : list[0]?.code) || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    if (toCityBox) toCityBox.hidden = (toPayType !== 'cash');
    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(toPayType, cityTo, 'to') : [];
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  // --- расчёт (вперёд: отдаю -> получаю) ---
  function recalcFromGive(){
    const a = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !a || a <= 0 || !window.PRICING?.quote){
      rateVal && (rateVal.textContent='—');
      totalVal && (totalVal.textContent='—');
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      if (!updatingGive && amountGetInp) amountGetInp.value = '';
      return;
    }
    const q = window.PRICING.quote({ from: selFrom, to: selTo, amount: a });
    currentQuote = q || {};
    rateVal && (rateVal.textContent = q?.rateText ?? '—');
    totalVal && (totalVal.textContent = q?.totalText ?? '—');

    // проставим «хочу получить»
    if (!updatingGive && amountGetInp && q?.total != null) {
      updatingGet = true;
      amountGetInp.value = String(Number(q.total.toFixed(6)));
      updatingGet = false;
    }
  }

  // --- расчёт (обратно: хочу получить -> сколько отдать) ---
  function recalcFromGet(){
    const g = Number(amountGetInp?.value || 0);
    if (!selFrom || !selTo || !g || g <= 0 || !window.PRICING?.quoteByToAmount){
      recalcFromGive();
      return;
    }
    const q = window.PRICING.quoteByToAmount({ from: selFrom, to: selTo, toAmount: g });
    currentQuote = q || {};
    rateVal && (rateVal.textContent = q?.rateText ?? '—');
    totalVal && (totalVal.textContent = q?.totalText ?? '—');

    // проставим «отдаю»
    if (!updatingGet && amountInput && q?.fromAmount != null) {
      updatingGive = true;
      amountInput.value = String(Number(q.fromAmount.toFixed(2)));
      updatingGive = false;
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

  // --- бизнес-правила ---
  function validateBusinessRules(){
    // 1) отдавать CNY нельзя
    if (selFrom === 'CNY') { alert('Отдавать юани нельзя.'); return false; }
    // 2) наличные CNY — только Гуанчжоу
    if (fromPayType === 'cash' && selFrom === 'CNY' && cityFrom !== 'guangzhou') { alert('Наличные юани можно ОТДАТЬ только в Гуанчжоу.'); return false; }
    if (toPayType   === 'cash' && selTo   === 'CNY' && cityTo   !== 'guangzhou') { alert('Наличные юани можно ПОЛУЧИТЬ только в Гуанчжоу.'); return false; }
    return true;
  }

  // --- отправка заявки ---
  async function sendOrder(){
    if (sending) return;
    sending = true;
    try {
      const amountNum = Number(amountInput?.value || 0);
      if (!selFrom || !selTo) { alert('Выберите валюты «Отдаю» и «Получаю».'); return; }
      if (!(amountNum > 0))   { alert('Введите сумму «Отдаю».'); return; }
      if (!currentQuote.rate) { alert('Не удалось рассчитать курс.'); return; }
      if (!validateBusinessRules()) return;

      const payload = {
        type: 'order',
        from_currency: selFrom, to_currency: selTo,
        from_kind: fromPayType, to_kind: toPayType,
        city_from: cityFrom, city_to: cityTo,
        amount: amountNum, rate: currentQuote.rate, total: currentQuote.total,
        contact: (contactInput?.value || '').trim(),
        requisites: (reqsInput?.value || '').trim(),
        qr_filename: qrFile?.files?.[0]?.name || null
      };

      // дублируем в TG, если открыто в Telegram
      try { if (tg && tg.sendData) tg.sendData(JSON.stringify(payload)); } catch(e){ console.warn('sendData failed', e); }

      // основной маршрут — REST API
      const r = await fetch(`${API_BASE}/order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      let ok = false;
      try {
        const j = await r.json();
        ok = !!(r.ok && j && (j.ok === true || j.status === 'ok'));
      } catch (_) { ok = r.ok; }

      if (ok) {
        if (tg?.showPopup) tg.showPopup({ title: 'Заявка отправлена', message: 'Мы скоро свяжемся с вами.' });
        else alert('Заявка отправлена. Мы скоро свяжемся с вами.');
      } else {
        alert('Ошибка при отправке заявки. Попробуйте ещё раз.');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
    } finally { sending = false; }
  }

  // --- события ---
  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); showCityBox(); recalcFromGive(); }, 'bank');
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  showCityBox(); recalcFromGive(); }, 'cnpay');

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalcFromGive(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalcFromGive(); });

  amountInput && amountInput.addEventListener('input', ()=>{ if (updatingGive) return; updatingGet=false; recalcFromGive(); });
  amountGetInp && amountGetInp.addEventListener('input', ()=>{ if (updatingGet) return;  updatingGive=false; recalcFromGet(); });

  sendBtn && sendBtn.addEventListener('click', sendOrder);

  // --- безопасный старт ---
  function bootOnceReady(){
    if (!window.PRICING?.currencies || !window.PRICING?.quote || !window.PRICING?.quoteByToAmount) {
      return setTimeout(bootOnceReady, 50);
    }
    refreshFrom();
    refreshTo();
    showCityBox();
    recalcFromGive();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootOnceReady);
  else bootOnceReady();
})();

