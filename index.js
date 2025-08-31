// index.js v71 — начальные типы: Отдаю=bank, Получаю=cnpay; город виден только для cash;
// скрываем CNY в "Отдаю" всегда; в "Получаю cash" CNY виден только при cityTo=guangzhou.
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // DOM
  const fromPayBox   = document.getElementById('from-pay');
  const toPayBox     = document.getElementById('to-pay');
  const fromCityBox  = document.getElementById('from-citybox');
  const toCityBox    = document.getElementById('to-citybox');
  const cityTopBox   = document.getElementById('cityTop');
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

  // State (по умолчанию: bank → cnpay)
  let fromPayType = 'bank';
  let toPayType   = 'cnpay';
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;
  let selTo       = null;
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
  let sending = false;

  // API
  const API_BASE = 'https://api.poizexchange.ru';

  // Telegram init + лёгкий пинг
  if (tg) { try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({action:'webapp_open'})); } catch(e){} }
  else if (hint) { hint.hidden = false; }

  // Utils
  function clear(node){ while (node && node.firstChild) node.removeChild(node.firstChild); }
  function tile(item, side){
    const btn = document.createElement('button');
    btn.type='button'; btn.className='tile'; btn.setAttribute('data-code', item.code);
    btn.innerHTML = `<div class="ico"><img src="${item.icon}" alt=""></div><div class="cap">${item.nameRu}</div>`;
    btn.addEventListener('click',()=>{
      if (side==='from'){ selFrom=item.code; markActive(fromWrap,item.code); }
      else { selTo=item.code; markActive(toWrap,item.code); }
      updateQrVisibility(); recalc();
    });
    return btn;
  }
  function markActive(container, code){
    if (!container) return;
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }
  function renderTiles(container, list, side){ clear(container); list.forEach(i=>container.appendChild(tile(i,side))); }

  // Показывать/скрывать QR блок
  function updateQrVisibility(){
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    if (qrBox) qrBox.hidden = !(toPayType==='cnpay' && selTo && cnpay.includes(selTo));
  }

  // Город сверху показываем только при cash (если либо Отдаю cash, либо Получаю cash)
  function syncCityVisibility(){
    const anyCash = (fromPayType==='cash' || toPayType==='cash');
    if (cityTopBox) cityTopBox.hidden = !anyCash;
    if (fromCityBox) fromCityBox.hidden = (fromPayType!=='cash');
    if (toCityBox)   toCityBox.hidden   = (toPayType!=='cash');
  }

  // Рендер списков с фильтрами CNY
  function refreshFrom(){
    const listRaw = window.PRICING?.currencies ? window.PRICING.currencies(fromPayType, cityFrom, 'from') : [];
    // нельзя отдать юани вообще
    const list = listRaw.filter(i => i.code !== 'CNY');
    renderTiles(fromWrap, list, 'from');
    selFrom = list[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    let list = window.PRICING?.currencies ? window.PRICING.currencies(toPayType, cityTo, 'to') : [];
    // наличные юани можно получить только в Гуанчжоу — иначе скрываем CNY из выдачи при cash
    if (toPayType==='cash' && cityTo!=='guangzhou'){
      list = list.filter(i => i.code !== 'CNY');
    }
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  function recalc(){
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !amount || amount<=0 || !window.PRICING?.quote){
      rateVal && (rateVal.textContent='—'); totalVal && (totalVal.textContent='—');
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }
    const q = window.PRICING.quote({ from: selFrom, to: selTo, amount });
    currentQuote = q || {};
    rateVal  && (rateVal.textContent  = q?.rateText  ?? '—');
    totalVal && (totalVal.textContent = q?.totalText ?? '—');
  }

  // chips
  function wireChips(box, cb){
    if (!box) return;
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click',()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb && cb(btn.dataset.type);
      });
    });
  }

  wireChips(fromPayBox, (t)=>{ fromPayType=t; syncCityVisibility(); refreshFrom(); recalc(); });
  wireChips(toPayBox,   (t)=>{ toPayType=t;   syncCityVisibility(); refreshTo();  recalc(); });

  // город — общий селектор, синхронизируем оба значения
  cityFromSel && cityFromSel.addEventListener('change', ()=>{
    cityFrom = cityTo = cityFromSel.value;
    if (cityToSel) cityToSel.value = cityFromSel.value;
    refreshFrom(); refreshTo(); recalc();
  });

  // автопересчёт
  amountInput && amountInput.addEventListener('input', recalc);

  // стартовые активные чипы: Отдаю=bank, Получаю=cnpay
  function activateInitialChips(){
    const f = fromPayBox?.querySelector('.chip[data-type="bank"]');
    const t = toPayBox?.querySelector('.chip[data-type="cnpay"]');
    if (f){ f.classList.add('active'); }
    if (t){ t.classList.add('active'); }
  }

  // безопасный старт
  function boot(){
    if (!window.PRICING?.currencies || !window.PRICING?.quote) return setTimeout(boot,50);
    activateInitialChips();
    syncCityVisibility();
    refreshFrom(); refreshTo(); recalc();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // правила по CNY (доп.проверка перед отправкой)
  function validateBusiness(){
    if (fromPayType==='cash' && selFrom==='CNY'){ alert('Отдать наличные юани нельзя.'); return false; }
    if (toPayType==='cash' && selTo==='CNY' && cityTo!=='guangzhou'){ alert('Получить наличные юани можно только в Гуанчжоу.'); return false; }
    return true;
  }

  async function sendOrder(){
    if (sending) return; sending = true;
    try{
      const amountNum = Number(amountInput?.value || 0);
      if (!selFrom || !selTo){ alert('Выберите валюты «Отдаю» и «Получаю».'); return; }
      if (!(amountNum>0)){ alert('Введите сумму.'); return; }
      if (!currentQuote.rate){ alert('Не удалось рассчитать курс.'); return; }
      if (!validateBusiness()) return;

      const payload = {
        type:'order',
        from_currency: selFrom, to_currency: selTo,
        from_kind: fromPayType, to_kind: toPayType,
        city_from: cityFrom, city_to: cityTo,
        amount: amountNum, rate: currentQuote.rate, total: currentQuote.total,
        contact: (contactInput?.value||'').trim(),
        requisites: (reqsInput?.value||'').trim(),
        note: (noteInput?.value||'').trim(),
        qr_filename: qrFile?.files?.[0]?.name || null
      };

      // если в Telegram WebApp — отправляем в бота
      if (tg && tg.sendData){
        try{ tg.sendData(JSON.stringify(payload)); }catch(e){ console.warn('sendData error', e); }
        alert('Заявка отправлена.');
        return;
      }

      // иначе — на HTTPS API
      const r = await fetch(`${API_BASE}/order`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));
      if (r.ok && j.ok) alert('Заявка отправлена (через сайт).');
      else alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
    } finally { sending=false; }
  }

  document.getElementById('sendBtn')?.addEventListener('click', sendOrder);
})();
