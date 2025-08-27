// index.js v42.3 — стабильный рендер плиток, мгновенный пересчёт,
// показ курса "за валюту, которую получаем", отправка заявки (TG + REST)

(function () {
  // ====== НАСТРОЙКА API для сайта (вне Telegram) ======
  // Укажи свой домен/хост с Nginx→FastAPI (без завершающего '/')
  // Примеры: 'https://poiz.yourdomain.com' или 'http://<ip>'
  const API_BASE = 'https://<poizexchange.github.io/poizexchange>'; // ← ОБНОВИ ЭТО

  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // ------- элементы -------
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

  // ------- state -------
  let fromPayType = 'cash';   // cash | bank | crypto
  let toPayType   = 'cash';   // cash | bank | crypto | cnpay
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;     // код валюты/сервиса
  let selTo       = null;     // код валюты/сервиса
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };

  // ------- инициализация TG WebApp -------
  if (tg) { try { tg.expand(); tg.ready(); } catch (e) {} }
  else if (hint) { hint.hidden = false; }

  // ------- утилиты -------
  const fmt = (n, d=2) => (n==null || isNaN(n)) ? '—' : Number(n).toLocaleString('ru-RU', { maximumFractionDigits: d });

  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }

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

  // ------- фильтр бизнес-правил по CNY (скрываем невозможные опции) -------
  function filterByBusinessRules(codes, side, payType, city) {
    // Отдать CNY нельзя вообще
    if (side === 'from' && codes.includes('CNY')) {
      codes = codes.filter(c => c !== 'CNY');
    }
    // Получить CNY наличными можно только в Гуанчжоу
    if (side === 'to' && payType === 'cash') {
      if (city !== 'guangzhou' && codes.includes('CNY')) {
        codes = codes.filter(c => c !== 'CNY');
      }
    }
    return codes;
  }

  // ------- рендер списков -------
  function refreshFrom(){
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');

    let listCodes = [];
    if (window.PRICING?.currencies) {
      listCodes = window.PRICING.currencies(fromPayType, cityFrom, 'from');
    }

    // защита от «пусто»
    if (!Array.isArray(listCodes)) listCodes = [];

    // применим фильтры бизнес-логики
    const filtered = filterByBusinessRules(listCodes.map(i => i.code), 'from', fromPayType, cityFrom);

    // восстановим объекты (иконка/название)
    const finalList = listCodes.filter(i => filtered.includes(i.code));

    renderTiles(fromWrap, finalList, 'from');
    selFrom = finalList[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    if (toCityBox) toCityBox.hidden = (toPayType !== 'cash');

    let listCodes = [];
    if (window.PRICING?.currencies) {
      listCodes = window.PRICING.currencies(toPayType, cityTo, 'to');
    }

    if (!Array.isArray(listCodes)) listCodes = [];

    const filtered = filterByBusinessRules(listCodes.map(i => i.code), 'to', toPayType, cityTo);
    const finalList = listCodes.filter(i => filtered.includes(i.code));

    renderTiles(toWrap, finalList, 'to');
    selTo = finalList[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  // ------- пересчёт (показываем курс за валюту, которую получаем) -------
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

    // ВНИМАНИЕ: q.rate — это {to} за 1 {from}. Нужно показать "за валюту, которую получаем":
    // 1 {to} = (1 / rate) {from}
    let rev = null;
    if (q && typeof q.rate === 'number' && q.rate > 0) {
      rev = 1 / q.rate;
    }

    if (rateVal)  rateVal.textContent  = (rev != null) ? `1 ${selTo} = ${fmt(rev, 4)} ${selFrom}` : '—';
    if (totalVal) totalVal.textContent = q?.totalText ?? '—';
  }

  // мгновенный пересчёт при вводе
  if (amountInput) {
    ['input', 'keyup', 'change', 'paste'].forEach(ev => amountInput.addEventListener(ev, recalc));
  }

  // ------- кнопки-«чипы» -------
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

  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc();  });

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc();  });

  // ------- безопасная инициализация (ждём PRICING) -------
  function boot() {
    if (!window.PRICING?.currencies || !window.PRICING?.quote) {
      setTimeout(boot, 100);
      return;
    }
    refreshFrom();
    refreshTo();
    recalc();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ------- валидации перед отправкой -------
  function validateBusinessRulesForPayload(p){
    // Отдать CNY нельзя вообще
    if (p.from_kind === 'cash' && p.from_currency === 'CNY') {
      alert('Наличные CNY отдать нельзя.');
      return false;
    }
    // Получить CNY наличными только в Гуанчжоу
    if (p.to_kind === 'cash' && p.to_currency === 'CNY' && (p.city_to !== 'guangzhou')) {
      alert('Наличные CNY можно получить только в Гуанчжоу.');
      return false;
    }
    return true;
  }

  // ------- отправка заявки -------
  async function sendOrder(){
    const amountNum = Number(amountInput?.value || 0);
    if (!selFrom || !selTo) { alert('Выберите валюты «Отдаю» и «Получаю».'); return; }
    if (!(amountNum > 0))   { alert('Введите сумму.'); return; }
    if (!currentQuote.rate) { alert('Не удалось рассчитать курс.'); return; }

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
      note: (noteInput?.value || '').trim()
    };

    const file = qrFile?.files?.[0];
    if (file) payload.qr_filename = file.name || 'qr.png';

    if (!validateBusinessRulesForPayload(payload)) return;

    // 1) Пытаемся через Telegram WebApp
    let viaTelegram = false;
    try {
      if (window.Telegram?.WebApp?.sendData) {
        window.Telegram.WebApp.sendData(JSON.stringify(payload));
        viaTelegram = true;
        if (window.Telegram.WebApp.showPopup) {
          window.Telegram.WebApp.showPopup({ title: 'Заявка отправлена', message: 'Мы скоро свяжемся с вами.' });
        } else {
          alert('Заявка отправлена. Мы скоро свяжемся с вами.');
        }
      }
    } catch (e) {
      console.error('sendData failed', e);
    }

    // 2) Если не внутри Telegram — отправляем в REST API
    if (!viaTelegram) {
      if (!API_BASE || API_BASE.includes('<ВАШ-ДОМЕН-API>')) {
        alert('Ошибка: не настроен адрес API. Обратитесь к администратору.');
        return;
      }
      try {
        const r = await fetch(API_BASE + '/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_currency: payload.from_currency,
            to_currency: payload.to_currency,
            from_kind:    payload.from_kind,
            to_kind:      payload.to_kind,
            city_from:    payload.city_from,
            city_to:      payload.city_to,
            amount:       payload.amount,
            rate:         payload.rate,
            total:        payload.total,
            contact:      payload.contact,
            requisites:   payload.requisites,
            note:         payload.note,
            qr_filename:  payload.qr_filename || null
          })
        });
        const j = await r.json().catch(()=>({}));
        if (r.ok && j.ok) {
          alert('Заявка отправлена (через сайт). Мы скоро свяжемся с вами.');
        } else {
          alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
        }
      } catch (e) {
        console.error(e);
        alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
      }
    }
  }

  sendBtn && sendBtn.addEventListener('click', sendOrder);
})();
