// index.js v74 — фикс алерта после 200 OK, поле «Хочу получить», город только при наличных, старт: Банк→Китайские сервисы
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // --- DOM ---
  const fromPayBox   = document.getElementById('from-pay');
  const toPayBox     = document.getElementById('to-pay');

  // верхний общий блок города
  const cityTop      = document.getElementById('cityTop');
  const cityLabel    = document.getElementById('cityLabel');
  const cityFromSel  = document.getElementById('cityFrom');
  const cityToSel    = document.getElementById('cityTo');

  // старые пустые боксы оставляем, но не используем
  const fromWrap     = document.getElementById('from-currencies');
  const toWrap       = document.getElementById('to-currencies');

  const amountInput  = document.getElementById('amount');
  const amountGetInp = document.getElementById('amountGet');
  const rateVal      = document.getElementById('rateVal');
  const totalVal     = document.getElementById('totalVal');

  const contactInput = document.getElementById('contact');
  const reqsInput    = document.getElementById('requisites');
  const noteInput    = document.getElementById('note');

  const qrBox        = document.getElementById('qrbox');
  const qrFile       = document.getElementById('qrfile');

  const sendBtn      = document.getElementById('sendBtn');
  const hint         = document.getElementById('hint');

  // --- CONST / API ---
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
  let changingBy = null; // 'from' | 'to' — защита от рекурсии полей сумм

  // --- Telegram init ---
  if (tg) { try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({action:'webapp_open'})); } catch(e){} }
  else if (hint) { hint.hidden = false; }

  // helpers
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }
  function markActive(container, code){
    if (!container) return;
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }
  function tile(item, side){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `<div class="ico"><img src="${item.icon}" alt=""></div><div class="cap">${item.nameRu}</div>`;
    if (side === 'from' && item.code === 'CNY') { btn.classList.add('disabled'); btn.title='Отдавать юани нельзя'; }
    btn.addEventListener('click', ()=>{
      if (side === 'from' && item.code === 'CNY') return;
      if (side === 'from'){ selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
      updateQrVisibility(); recalc();
    });
    return btn;
  }
  function renderTiles(container, list, side){ clear(container); list.forEach(i=>container.appendChild(tile(i, side))); }
  function updateQrVisibility(){
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    if (qrBox) qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  // город — показываем только когда какой-то из режимов = cash
  function updateCityTopVisibility(){
    const fromCash = fromPayType === 'cash';
    const toCash   = toPayType   === 'cash';
    const show = fromCash || toCash;
    cityTop.hidden = !show;
    if (!show) return;

    if (fromCash && !toCash){
      cityLabel.textContent = 'Город (отдаю)';
      cityFromSel.hidden = false; cityToSel.hidden = true;
    } else if (!fromCash && toCash){
      cityLabel.textContent = 'Город (получаю)';
      cityFromSel.hidden = true; cityToSel.hidden = false;
    } else {
      cityLabel.textContent = 'Город';
      cityFromSel.hidden = false; cityToSel.hidden = false;
    }
  }

  // списки валют
  function refreshFrom(){
    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(fromPayType, cityFrom, 'from')
      : [];
    renderTiles(fromWrap, list, 'from');
    const firstAllowed = list.find(x => x.code !== 'CNY');
    selFrom = (firstAllowed ? firstAllowed.code : list[0]?.code) || null;
    if (selFrom) markActive(fromWrap, selFrom);
    updateCityTopVisibility();
  }
  function refreshTo(){
    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(toPayType, cityTo, 'to')
      : [];
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
    updateCityTopVisibility();
  }

  // пересчёт по сумме "отдаю"
  function recalc(){
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0 || !window.PRICING?.quote){
      rateVal && (rateVal.textContent='—'); totalVal && (totalVal.textContent='—');
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }
    const q = window.PRICING.quote({ from: selFrom, to: selTo, amount });
    currentQuote = q || {};
    rateVal && (rateVal.textContent = q?.rateText ?? '—');
    totalVal && (totalVal.textContent = q?.totalText ?? '—');

    // если пересчёт идёт из поля "отдаю" — синхронизируем "хочу получить"
    if (changingBy !== 'to' && amountGetInp && q?.total != null) {
      changingBy = 'from';
      amountGetInp.value = String(Number(q.total.toFixed(6)));
      changingBy = null;
    }
  }

  // обратный пересчёт (по желаемому получению) — бинарный поиск по «сколько нужно отдать»
  function recalcFromDesired(){
    const want = Number(amountGetInp?.value || 0);
    if (!selFrom || !selTo || !want || want <= 0 || !window.PRICING?.quote){
      return;
    }
    // быстрые границы
    let lo = 0, hi = 1;
    // находим верхнюю границу, где total >= want
    for (let i=0;i<20;i++){
      const q = window.PRICING.quote({ from: selFrom, to: selTo, amount: hi });
      if (q?.total >= want || !q?.total) break;
      hi *= 2;
      if (hi > 1e14) break; // защита
    }
    // бинарный поиск
    let best = hi;
    for (let i=0;i<40;i++){
      const mid = (lo + hi) / 2;
      const q = window.PRICING.quote({ from: selFrom, to: selTo, amount: mid });
      const tot = q?.total ?? 0;
      if (tot >= want && tot > 0) { best = mid; hi = mid; }
      else { lo = mid; }
    }
    // проставляем «отдаю» и делаем обычный пересчёт
    if (amountInput){
      changingBy = 'to';
      amountInput.value = String(Number(best.toFixed(2)));
      changingBy = null;
      recalc();
    }
  }

  // чипы
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

  // бизнес-правила (минимальные проверки)
  function validateBusiness(){
    if (selFrom === 'CNY'){ alert('Отдавать юани нельзя.'); return false; }
    if (toPayType === 'cash' && selTo === 'CNY' && cityTo !== 'guangzhou'){
      alert('Наличные юани получить можно только в Гуанчжоу.'); return false;
    }
    return true;
  }

  // отправка
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

      // WebApp дублируем
      try { if (tg && tg.sendData) tg.sendData(JSON.stringify(payload)); } catch(e){}

      // Основной маршрут — API
      let ok = false;
      try{
        const r = await fetch(`${API_BASE}/order`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
        ok = !!r.ok;
        // даже если JSON сломан/пуст — при 200 считаем успехом
        try{
          const j = await r.json();
          if (j && j.ok === false) ok = false;
        }catch(_){}
      }catch(_){ ok = false; }

      if (ok){
        if (tg?.showPopup) tg.showPopup({title:'Заявка отправлена', message:'Мы скоро свяжемся с вами.'});
        else alert('Заявка отправлена. Мы скоро свяжемся с вами.');
      } else {
        alert('Ошибка при отправке заявки. Попробуйте ещё раз.');
      }
    } finally { sending = false; }
  }

  // события
  wireChips(fromPayBox, (t)=>{ fromPayType=t; updateCityTopVisibility(); refreshFrom(); recalc(); }, 'bank');
  wireChips(toPayBox,   (t)=>{ toPayType=t;   updateCityTopVisibility(); refreshTo();  recalc(); }, 'cnpay');

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc(); });

  amountInput  && amountInput.addEventListener('input', ()=>{ if (changingBy==='to') return; recalc(); });
  amountGetInp && amountGetInp.addEventListener('input', ()=>{ if (changingBy==='from') return; recalcFromDesired(); });

  sendBtn && sendBtn.addEventListener('click', sendOrder);

  // старт
  function boot(){
    if (!window.PRICING?.currencies || !window.PRICING?.quote) return setTimeout(boot, 50);
    updateCityTopVisibility();
    refreshFrom(); refreshTo(); recalc();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
