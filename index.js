// index.js v72 — двусторонний пересчёт суммы (отдаю/получаю) без изменений дизайна
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

  const amountInput  = document.getElementById('amount');     // "Сумма" (отдаю)
  const amountGetInp = document.getElementById('amountGet');  // "Хочу получить" (получаю)

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
  let fromPayType = 'cash';   // cash | bank | crypto
  let toPayType   = 'cash';   // cash | bank | crypto | cnpay
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;     // код валюты/сервиса
  let selTo       = null;     // код валюты/сервиса
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };

  // кто последний редактировал: 'from' | 'to'
  let lastEdited = 'from';
  let syncing = false; // чтобы не ловить рекурсивные инпут-события

  // API (на случай отправки заявки через сайт)
  const API_BASE = 'https://api.poizexchange.ru';

  // Telegram init
  if (tg) { try { tg.expand(); tg.ready(); } catch(e){} }
  else if (hint) { hint.hidden = false; }

  // Utils
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }

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
      updateQrVisibility();
      recalc();
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

  // Рендер списков
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

  // Форматирование для числа (простое: 2 знака; крипте можно больше)
  function fmt(n, decimals=2){
    if (!isFinite(n)) return '—';
    return Number(n).toFixed(decimals);
  }

  // Основной прямой расчёт по "Сумма" (отдаю)
  function recalcForward(){
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !(amount>0) || !window.PRICING?.quote){
      rateVal && (rateVal.textContent='—');
      totalVal && (totalVal.textContent='—');
      if (amountGetInp && !syncing) {
        syncing = true; amountGetInp.value = ''; syncing = false;
      }
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }
    const q = window.PRICING.quote({ from: selFrom, to: selTo, amount });
    currentQuote = q || {};
    rateVal && (rateVal.textContent = q?.rateText ?? '—');
    totalVal && (totalVal.textContent = q?.totalText ?? '—');

    // синхронизируем «Хочу получить»
    if (amountGetInp && !syncing) {
      syncing = true;
      if (q?.total != null) amountGetInp.value = fmt(q.total, 6); else amountGetInp.value = '';
      syncing = false;
    }
  }

  // Обратный расчёт: зная "хочу получить" => найти "сколько отдать"
  // Используем бинарный поиск по amount_from, вызывая PRICING.quote(), т.к. внутри могут быть ступени/наценки.
  function recalcInverse(){
    const want = Number(amountGetInp?.value || 0);
    if (!selFrom || !selTo || !(want>0) || !window.PRICING?.quote){
      // сброс
      rateVal && (rateVal.textContent='—');
      totalVal && (totalVal.textContent='—');
      if (amountInput && !syncing) { syncing = true; amountInput.value=''; syncing=false; }
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }

    // Поиск диапазона
    let lo = 0, hi = 1;
    // Увеличиваем hi пока не перекроем want
    for (let i=0; i<40; i++){
      const q = window.PRICING.quote({ from: selFrom, to: selTo, amount: hi });
      const out = q?.total || 0;
      if (out >= want) break;
      hi *= 2;
    }
    if (hi === 0) hi = 1;

    // Бинарный поиск
    let best = null;
    for (let i=0; i<50; i++){
      const mid = (lo + hi)/2;
      const q = window.PRICING.quote({ from: selFrom, to: selTo, amount: mid });
      const out = q?.total || 0;
      if (!q){ break; }
      best = { q, mid };
      if (Math.abs(out - want) <= Math.max(1e-8, want*1e-8)) break;
      if (out < want) lo = mid; else hi = mid;
    }

    if (best && best.q){
      currentQuote = best.q;
      rateVal && (rateVal.textContent = best.q.rateText ?? '—');
      totalVal && (totalVal.textContent = best.q.totalText ?? '—');

      // синхронизируем «Сумма» (отдаю)
      if (amountInput && !syncing) {
        syncing = true;
        amountInput.value = fmt(best.mid, 6);
        syncing = false;
      }
    } else {
      // не смогли посчитать
      rateVal && (rateVal.textContent='—');
      totalVal && (totalVal.textContent='—');
    }
  }

  // Обёртка пересчёта
  function recalc(){
    if (lastEdited === 'to') recalcInverse();
    else recalcForward();
  }

  // Chips
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
  wireChips(fromPayBox, (t)=>{ fromPayType=t; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (t)=>{ toPayType=t;   refreshTo();  recalc();  });

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc();  });

  // Автопересчёт при вводе
  amountInput && amountInput.addEventListener('input', ()=>{
    if (syncing) return;
    lastEdited = 'from';
    recalcForward();
  });
  amountGetInp && amountGetInp.addEventListener('input', ()=>{
    if (syncing) return;
    lastEdited = 'to';
    recalcInverse();
  });

  // Инициализация (ждём PRICING)
  function boot(){
    if (!window.PRICING?.currencies || !window.PRICING?.quote) return setTimeout(boot, 50);
    refreshFrom(); refreshTo(); recalc();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // Бизнес-правила
  function validateBusinessRules(){
    // наличные CNY — только Гуанчжоу
    if (fromPayType === 'cash' && selFrom === 'CNY' && cityFrom !== 'guangzhou') { alert('Наличные юани можно ОТДАТЬ только в Гуанчжоу.'); return false; }
    if (toPayType   === 'cash' && selTo   === 'CNY' && cityTo   !== 'guangzhou') { alert('Наличные юани можно ПОЛУЧИТЬ только в Гуанчжоу.'); return false; }
    return true;
  }

  // Отправка заявки
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

    // 1) Если открыто внутри Telegram — шлём через sendData
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

    // 2) Иначе — REST API
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
