// index.js v73 — дефолт: Отдаю=bank, Получаю=cnpay; город только для cash; двусторонний пересчёт; отправка заявки
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // DOM
  const fromPayBox   = document.getElementById('from-pay');
  const toPayBox     = document.getElementById('to-pay');
  const fromCityBox  = document.getElementById('from-citybox') || document.getElementById('cityTop');
  const toCityBox    = document.getElementById('to-citybox')   || document.getElementById('cityTop');
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

  // State (дефолт — банк → китайские сервисы)
  let fromPayType = 'bank';   // cash | bank | crypto
  let toPayType   = 'cnpay';  // cash | bank | crypto | cnpay
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;     // код валюты/сервиса
  let selTo       = null;     // код валюты/сервиса
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };

  let lastEdited = 'from'; // кто последний менял: 'from' | 'to'
  let syncing = false;

  // API
  const API_BASE = 'https://api.poizexchange.ru';

  // Telegram init
  if (tg) { try { tg.expand(); tg.ready(); } catch(e){} }
  else if (hint) { hint.hidden = false; }

  // Utils
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }
  function fmt(n, decimals=2){ if (!isFinite(n)) return '—'; return Number(n).toFixed(decimals); }

  function tile(item, side){
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `
      <div class="ico"><img src="${item.icon}" alt=""></div>
      <div class="cap">${item.nameRu}</div>
    `;
    btn.addEventListener('click', () => {
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
      updateQrVisibility(); updateCityVisibility(); recalc();
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
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    if (qrBox) qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  function updateCityVisibility(){
    // Город показываем только при выборе Наличных (хватает одного общего блока)
    const showCity = (fromPayType === 'cash') || (toPayType === 'cash');
    const box = document.getElementById('cityTop');
    if (box) box.hidden = !showCity;

    // Доп.правила по юаню наличными
    // (здесь лишь визуальная часть — блокировка валидации ниже)
  }

  // --- Рендер списков
  function refreshFrom(){
    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(fromPayType, cityFrom, 'from')
      : [];
    renderTiles(fromWrap, list, 'from');
    selFrom = list[0]?.code || null;
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

  // --- Расчёт вперёд: по "Сумма" (отдаю)
  function recalcForward(){
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !(amount>0) || !window.PRICING?.quote){
      rateVal && (rateVal.textContent='—');
      totalVal && (totalVal.textContent='—');
      if (amountGetInp && !syncing){ syncing=true; amountGetInp.value=''; syncing=false; }
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }
    const q = window.PRICING.quote({ from: selFrom, to: selTo, amount });
    currentQuote = q || {};
    rateVal  && (rateVal.textContent  = q?.rateText  ?? '—');
    totalVal && (totalVal.textContent = q?.totalText ?? '—');

    if (amountGetInp && !syncing) {
      syncing = true;
      amountGetInp.value = (q?.total != null) ? fmt(q.total, 6) : '';
      syncing = false;
    }
  }

  // --- Расчёт назад: по "Хочу получить"
  function recalcInverse(){
    const want = Number(amountGetInp?.value || 0);
    if (!selFrom || !selTo || !(want>0) || !window.PRICING?.quote){
      rateVal && (rateVal.textContent='—');
      totalVal && (totalVal.textContent='—');
      if (amountInput && !syncing){ syncing=true; amountInput.value=''; syncing=false; }
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }

    // Поиск подходящего "amount" с учётом возможных ступеней
    let lo=0, hi=1;
    for(let i=0;i<40;i++){
      const q = window.PRICING.quote({ from: selFrom, to: selTo, amount: hi });
      if ((q?.total||0) >= want) break;
      hi *= 2;
    }
    let best=null;
    for(let i=0;i<50;i++){
      const mid=(lo+hi)/2;
      const q = window.PRICING.quote({ from: selFrom, to: selTo, amount: mid });
      if (!q) break;
      best = { q, mid };
      const out=q.total||0;
      if (Math.abs(out - want) <= Math.max(1e-8, want*1e-8)) break;
      if (out < want) lo=mid; else hi=mid;
    }
    if (best){
      currentQuote=best.q;
      rateVal  && (rateVal.textContent  = best.q.rateText  ?? '—');
      totalVal && (totalVal.textContent = best.q.totalText ?? '—');
      if (amountInput && !syncing){ syncing=true; amountInput.value=fmt(best.mid,6); syncing=false; }
    } else {
      rateVal && (rateVal.textContent='—');
      totalVal && (totalVal.textContent='—');
    }
  }

  function recalc(){
    if (lastEdited==='to') recalcInverse();
    else recalcForward();
  }

  // --- Чипы (с поддержкой дефолтного значения)
  function wireChips(box, defaultType, cb){
    if (!box) return;
    const chips = box.querySelectorAll('.chip');
    function activate(btn){
      chips.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      cb && cb(btn.dataset.type);
    }
    chips.forEach(btn=>{
      btn.addEventListener('click', ()=> activate(btn));
    });
    // активируем по умолчанию
    const def = defaultType ? box.querySelector(`.chip[data-type="${defaultType}"]`) : chips[0];
    if (def) activate(def);
  }

  wireChips(fromPayBox, 'bank',  (t)=>{ fromPayType=t; updateCityVisibility(); refreshFrom(); recalc(); });
  wireChips(toPayBox,   'cnpay', (t)=>{ toPayType=t;   updateCityVisibility(); refreshTo();  recalc(); });

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; recalc(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   recalc(); });

  amountInput && amountInput.addEventListener('input', ()=>{
    if (syncing) return; lastEdited='from'; recalcForward();
  });
  amountGetInp && amountGetInp.addEventListener('input', ()=>{
    if (syncing) return; lastEdited='to'; recalcInverse();
  });

  // --- Инициализация (ждём PRICING)
  function boot(){
    if (!window.PRICING?.currencies || !window.PRICING?.quote) return setTimeout(boot, 50);
    refreshFrom(); refreshTo(); updateCityVisibility(); recalc();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // --- Бизнес-правила
  function validateBusinessRules(){
    // наличные CNY: получить можно только в Гуанчжоу, отдать наличные юани нельзя
    if (fromPayType==='cash' && selFrom==='CNY') { alert('Отдать наличные юани нельзя.'); return false; }
    if (toPayType==='cash' && selTo==='CNY' && cityTo!=='guangzhou') { alert('Получить наличные юани можно только в Гуанчжоу.'); return false; }
    if (fromPayType==='cash' && selFrom==='CNY' && cityFrom!=='guangzhou') { alert('Наличные юани можно ОТДАТЬ только в Гуанчжоу.'); return false; } // если всё-таки появится
    return true;
  }

  // --- Отправка заявки
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
      qr_filename: qrFile?.files?.[0]?.name || null
    };

    // Внутри Telegram — WebApp.sendData
    try {
      if (window.Telegram?.WebApp?.sendData) {
        window.Telegram.WebApp.sendData(JSON.stringify(payload));
        if (window.Telegram.WebApp.showPopup) {
          window.Telegram.WebApp.showPopup({ title: 'Заявка отправлена', message: 'Мы скоро свяжемся с вами.' });
        } else {
          alert('Заявка отправлена. Мы скоро свяжемся с вами.');
        }
        return;
      }
    } catch (e) { console.warn('sendData failed', e); }

    // Иначе — REST API
    try {
      const r = await fetch(`${API_BASE}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));
      if (r.ok && j.ok) alert('Заявка отправлена (через сайт). Мы скоро свяжемся с вами.');
      else alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
    } catch (e) {
      console.error(e);
      alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
    }
  }

  sendBtn && sendBtn.addEventListener('click', sendOrder);
})();
