// index.js v73 — drop-in без изменений дизайна: стабильные плитки, автопересчёт, WebApp+API, правила CNY
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

  // State
  let fromPayType = 'bank';   // старт: Отдаю — Банк
  let toPayType   = 'cnpay';  // старт: Получаю — Китайские сервисы
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;     // код валюты/сервиса
  let selTo       = null;     // код валюты/сервиса
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
  let sending = false;

  // API endpoint (для сайта; в WebApp уйдёт через sendData)
  const API_BASE = 'https://api.poizexchange.ru';

  // Инициализация WebApp
  if (tg) { try { tg.expand(); tg.ready(); } catch(e) {} }
  else if (hint) { hint.hidden = false; }

  // ---------- утилиты ----------
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }
  const round2 = (x)=> (isFinite(x)? Math.round(x*100)/100 : 0);

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
    if (!container) return;
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    // несколько одинаковых плиток не предполагается, но на всякий случай:
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }

  function renderTiles(container, list, side){
    clear(container);
    list.forEach(item => container.appendChild(tile(item, side)));
  }

  function updateQrVisibility(){
    const cnpay = ['ALIPAY','WECHAT','CN_CARD','CNY']; // CNY тут для кейса «получаю юани через CN»
    if (qrBox) qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  // ---------- вывод списков ----------
  function refreshFrom(){
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');

    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(fromPayType, cityFrom, 'from')
      : [];

    renderTiles(fromWrap, list, 'from');

    // дефолтный выбор: если был, сохраняем, иначе — первая валюта
    if (!selFrom || !list.find(x=>x.code===selFrom)) selFrom = list[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    if (toCityBox) toCityBox.hidden = (toPayType !== 'cash');

    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(toPayType, cityTo, 'to')
      : [];

    // скрываем наличные CNY в «Получаю», если город не Гуанчжоу
    const filtered = list.filter(item => {
      if (toPayType==='cash' && item.code==='CNY' && cityTo!=='guangzhou') return false;
      return true;
    });

    renderTiles(toWrap, filtered, 'to');

    if (!selTo || !filtered.find(x=>x.code===selTo)) selTo = filtered[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  // ---------- расчёт ----------
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

  // ---------- чипы (кнопки типов платежа) ----------
  function wireChips(box, cb, startType){
    if (!box) return;
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb && cb(btn.dataset.type);
      });
    });
    // стартовый актив — как просил: from=bank, to=cnpay
    const start = box.querySelector(`.chip[data-type="${startType}"]`) || box.querySelector('.chip');
    if (start){ start.classList.add('active'); cb && cb(start.dataset.type); }
  }

  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); }, 'bank');
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc();  }, 'cnpay');

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc();  });

  // пересчёт при вводе суммы
  amountInput && amountInput.addEventListener('input', recalc);

  // ---------- безопасная инициализация ----------
  function bootOnceReady(){
    if (!window.PRICING?.currencies || !window.PRICING?.quote) { setTimeout(bootOnceReady, 40); return; }
    refreshFrom();
    refreshTo();
    recalc();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootOnceReady);
  } else {
    bootOnceReady();
  }

  // ---------- бизнес-правила ----------
  function validateBusinessRules(){
    // отдать наличные CNY нельзя
    if (fromPayType === 'cash' && selFrom === 'CNY') { alert('Нельзя ОТДАТЬ наличные юани.'); return false; }
    // получить наличные CNY только в Гуанчжоу
    if (toPayType === 'cash' && selTo === 'CNY' && cityTo !== 'guangzhou') { alert('Наличные юани можно ПОЛУЧИТЬ только в Гуанчжоу.'); return false; }
    return true;
  }

  // ---------- отправка заявки ----------
  async function sendOrder(){
    if (sending) return;
    sending = true;
    try {
      const amountNum = Number(amountInput?.value || 0);
      if (!selFrom || !selTo) { alert('Выберите валюты «Отдаю» и «Получаю».'); return; }
      if (!(amountNum > 0))   { alert('Введите сумму.'); return; }
      if (!validateBusinessRules()) return;

      const q = window.PRICING?.quote ? window.PRICING.quote({ from: selFrom, to: selTo, amount: amountNum }) : null;
      if (!q || !q.rate) { alert('Не удалось рассчитать курс.'); return; }

      const payload = {
        type: 'order',
        from_currency: selFrom,
        to_currency: selTo,
        from_kind: fromPayType,
        to_kind: toPayType,
        city_from: cityFrom,
        city_to: cityTo,
        amount: round2(amountNum),
        rate: q.rate,
        total: round2(q.total ?? 0),
        contact: (contactInput?.value || '').trim(),
        requisites: (reqsInput?.value || '').trim(),
        note: (noteInput?.value || '').trim(),
        qr_filename: qrFile?.files?.[0]?.name || null
      };

      // WebApp → sendData
      try {
        if (tg && tg.sendData) {
          tg.sendData(JSON.stringify(payload));
          if (tg.showPopup) tg.showPopup({ title: 'Заявка отправлена', message: 'Мы скоро свяжемся с вами.' });
          else alert('Заявка отправлена.');
          return;
        }
      } catch (e) { console.warn('sendData error', e); }

      // Сайт → наш API
      try {
        const r = await fetch(`${API_BASE}/order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await r.json().catch(()=>({}));
        if (r.ok && j.ok) alert('Заявка отправлена (через сайт).');
        else alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
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


  sendBtn && sendBtn.addEventListener('click', sendOrder);
})();
