// index.js v72 — двусторонний ввод (Отдаю/Получаю), стабильные плитки, мгновенный пересчёт, WebApp+API
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // DOM
  const fromPayBox   = document.getElementById('from-pay');
  const toPayBox     = document.getElementById('to-pay');
  const fromCityBox  = document.getElementById('from-citybox');
  const toCityBox    = document.getElementById('to-citybox');
  const cityFromSel  = document.getElementById('cityFrom');
  const cityToSel    = document.getElementById('cityTo');
  const fromWrap     = document.getElementById('from-currencies');
  const toWrap       = document.getElementById('to-currencies');

  const amountGiveInput = document.getElementById('amountGive'); // Отдаю
  const amountGetInput  = document.getElementById('amountGet');  // Получаю

  const rateVal      = document.getElementById('rateVal');
  const totalVal     = document.getElementById('totalVal');

  const contactInput = document.getElementById('contact');
  const reqsInput    = document.getElementById('requisites');
  const noteInput    = document.getElementById('note');

  const qrBox        = document.getElementById('qrbox');
  const qrFile       = document.getElementById('qrfile');

  const sendBtn      = document.getElementById('sendBtn');
  const hint         = document.getElementById('hint');

  // State
  let fromPayType = 'bank';   // старт: Отдаю — Банк
  let toPayType   = 'cnpay';  // старт: Получаю — Китайские сервисы
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;
  let selTo       = null;

  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
  let syncing = false;
  let lastEdited = 'give'; // 'give' | 'get'

  const API_BASE = 'https://api.poizexchange.ru';

  if (tg) { try{ tg.expand(); tg.ready(); }catch(e){} } else if (hint) { hint.hidden = false; }

  // --- utils ---
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }
  const round = (x,p=2)=> (isFinite(x)? Math.round(x*10**p)/10**p : 0);

  function tile(item, side){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `<div class="ico"><img src="${item.icon}" alt=""></div><div class="cap">${item.nameRu}</div>`;
    btn.addEventListener('click', () => {
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
      updateQrVisibility();
      recalcSmart();
    });
    return btn;
  }

  function markActive(container, code){
    if (!container) return;
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }

  function renderTiles(container, list, side){
    clear(container);
    list.forEach(item => container.appendChild(tile(item, side)));
  }

  function updateQrVisibility(){
    const cnpay = ['ALIPAY','WECHAT','CN_CARD','CNY'];
    if (qrBox) qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  // --- data render ---
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

  // --- calc core ---
  function forwardQuote(amountGive){
    if (!window.PRICING?.quote || !selFrom || !selTo || !(amountGive > 0)) return null;
    return window.PRICING.quote({ from: selFrom, to: selTo, amount: amountGive }) || null;
  }

  function inverseAmountForTarget(targetGet){
    if (!window.PRICING?.quote || !selFrom || !selTo || !(targetGet > 0)) return null;

    let lo = 0, hi = 1;
    for (let i=0;i<32;i++){
      const tot = forwardQuote(hi)?.total ?? 0;
      if (tot >= targetGet) break;
      hi *= 2;
      if (hi > 1e12) break;
    }
    const qHi = forwardQuote(hi);
    if (!qHi || (qHi.total ?? 0) < targetGet) return null;

    for (let it=0; it<48; it++){
      const mid = (lo + hi) / 2;
      const tot = forwardQuote(mid)?.total ?? 0;
      if (!isFinite(tot)) return null;
      const diff = tot - targetGet;
      if (Math.abs(diff) <= Math.max(0.0001, targetGet*1e-7)) {
        return { amountGive: mid, quote: forwardQuote(mid) };
      }
      if (tot < targetGet) lo = mid; else hi = mid;
    }
    const mid = (lo + hi)/2;
    return { amountGive: mid, quote: forwardQuote(mid) };
  }

  function setOutputs(q){
    currentQuote = q || {};
    if (rateVal)  rateVal.textContent  = q?.rateText  ?? '—';
    if (totalVal) totalVal.textContent = q?.totalText ?? '—';
  }

  function recalcFromGive(){
    const give = Number(amountGiveInput?.value || 0);
    if (!(give > 0)) {
      setOutputs(null);
      if (!syncing && amountGetInput) amountGetInput.value = '';
      return;
    }
    const q = forwardQuote(give);
    setOutputs(q);
    if (!q){
      if (!syncing && amountGetInput) amountGetInput.value = '';
      return;
    }
    if (!syncing && amountGetInput){
      syncing = true;
      amountGetInput.value = String(round(q.total ?? 0, 2));
      syncing = false;
    }
  }

  function recalcFromGet(){
    const want = Number(amountGetInput?.value || 0);
    if (!(want > 0)) {
      setOutputs(null);
      if (!syncing && amountGiveInput) amountGiveInput.value = '';
      return;
    }
    const res = inverseAmountForTarget(want);
    if (!res || !(res.amountGive > 0) || !res.quote) {
      setOutputs(null);
      if (!syncing && amountGiveInput) amountGiveInput.value = '';
      return;
    }
    if (!syncing && amountGiveInput){
      syncing = true;
      amountGiveInput.value = String(round(res.amountGive, 2));
      syncing = false;
    }
    setOutputs(res.quote);
  }

  function recalcSmart(){
    if (lastEdited === 'get') recalcFromGet();
    else recalcFromGive();
  }

  // --- business rules ---
  function validateBusinessRules(){
    if (toPayType === 'cash' && selTo === 'CNY' && cityTo !== 'guangzhou') {
      alert('Наличные юани можно ПОЛУЧИТЬ только в Гуанчжоу.');
      return false;
    }
    if (fromPayType === 'cash' && selFrom === 'CNY') {
      alert('Нельзя ОТДАТЬ наличные юани.');
      return false;
    }
    return true;
  }

  // --- chips & events ---
  function wireChips(box, cb){
    if (!box) return;
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb && cb(btn.dataset.type);
      });
    });
    // стартовые: from=bank, to=cnpay
    const want = box.id==='from-pay' ? 'bank' : 'cnpay';
    const first = box.querySelector(`.chip[data-type="${want}"]`) || box.querySelector('.chip');
    if (first){ first.classList.add('active'); cb && cb(first.dataset.type); }
  }

  wireChips(fromPayBox, (t)=>{ fromPayType=t; refreshFrom(); recalcSmart(); });
  wireChips(toPayBox,   (t)=>{ toPayType=t;   refreshTo();  recalcSmart(); });

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalcSmart(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalcSmart(); });

  amountGiveInput && amountGiveInput.addEventListener('input', ()=>{ lastEdited='give'; if(!syncing) recalcFromGive(); });
  amountGetInput  && amountGetInput .addEventListener('input', ()=>{ lastEdited='get';  if(!syncing) recalcFromGet();  });

  // --- boot ---
  function bootOnceReady(){
    if (!window.PRICING?.currencies || !window.PRICING?.quote) { setTimeout(bootOnceReady, 40); return; }
    refreshFrom(); refreshTo(); recalcSmart();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootOnceReady);
  else bootOnceReady();

  // --- order ---
  async function sendOrder(){
    const give = Number(amountGiveInput?.value || 0);
    const get  = Number(amountGetInput?.value || 0);

    if (!selFrom || !selTo){ alert('Выберите валюты «Отдаю» и «Получаю».'); return; }
    if (!(give>0) && !(get>0)){ alert('Введите сумму в «Отдаю» или «Получаю».'); return; }
    if (!validateBusinessRules()) return;

    let payloadQuote = null;
    let amountToSend = null;
    if (give > 0) { payloadQuote = forwardQuote(give); amountToSend = give; }
    else {
      const inv = inverseAmountForTarget(get);
      if (!inv){ alert('Не удалось рассчитать исходную сумму «Отдаю».'); return; }
      payloadQuote = inv.quote; amountToSend = inv.amountGive;
      if (amountGiveInput) amountGiveInput.value = String(round(inv.amountGive, 2));
      if (totalVal) totalVal.textContent = inv.quote?.totalText ?? '—';
      if (rateVal)  rateVal.textContent  = inv.quote?.rateText  ?? '—';
    }
    if (!payloadQuote || !isFinite(payloadQuote.total)) { alert('Не удалось рассчитать курс.'); return; }

    const payload = {
      type: 'order',
      from_currency: selFrom,
      to_currency: selTo,
      from_kind: fromPayType,
      to_kind: toPayType,
      city_from: cityFrom,
      city_to: cityTo,
      amount: round(amountToSend, 2),
      rate: payloadQuote.rate,
      total: round(payloadQuote.total, 2),
      contact: (contactInput?.value || '').trim(),
      requisites: (reqsInput?.value || '').trim(),
      note: (noteInput?.value || '').trim(),
      qr_filename: qrFile?.files?.[0]?.name || null
    };

    // внутри Telegram WebApp
    try {
      if (tg && tg.sendData) {
        tg.sendData(JSON.stringify(payload));
        if (tg.showPopup) tg.showPopup({ title: 'Заявка отправлена', message: 'Мы скоро свяжемся с вами.' });
        else alert('Заявка отправлена.');
        return;
      }
    } catch (e) { console.warn('sendData error', e); }

    // сайт → наш API
    try {
      const r = await fetch(`${API_BASE}/order`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));
      if (r.ok && j.ok) alert('Заявка отправлена (через сайт).');
      else alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
    } catch (e) {
      console.error(e);
      alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
    }
  }

  sendBtn && sendBtn.addEventListener('click', sendOrder);
})();
