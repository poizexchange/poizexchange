// index.js v43 — бело-голубой UI, русские подписи, города только для cash,
// отправка заявки через Telegram WebApp (с безопасными уведомлениями)
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
  const rateVal  = document.getElementById('rateVal');
  const totalVal = document.getElementById('totalVal');

  const contactInput = document.getElementById('contact');
  const reqsInput    = document.getElementById('requisites');
  const noteInput    = document.getElementById('note');

  const qrBox  = document.getElementById('qrbox');
  const qrFile = document.getElementById('qrfile');

  const sendBtn = document.getElementById('sendBtn');
  const hint    = document.getElementById('hint');

  // state
  let fromPayType = 'cash';     // cash | bank | crypto
  let toPayType   = 'cash';     // cash | bank | crypto | cnpay
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;       // код валюты/сервиса
  let selTo       = null;       // код валюты/сервиса
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };

  // Инициализация WebApp + «пинг», чтобы бот увидел юзера
  try {
    if (tg) {
      tg.expand();
      tg.ready();
      tg.sendData(JSON.stringify({ action:'webapp_open' }));
    } else if (hint) {
      hint.hidden = false;
    }
  } catch (_) {}

  // утилиты
  function clear(node){ while (node && node.firstChild) node.removeChild(node.firstChild); }

  function safeAlert(message){
    try {
      if (tg && typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast('6.2') && typeof tg.showAlert === 'function') {
        tg.showAlert(message);
      } else {
        alert(message);
      }
    } catch (_) { alert(message); }
  }

  function tile(item, side){
    if (!item) return document.createTextNode('');
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
    if (!code) return;
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }

  function renderTiles(container, list, side){
    clear(container);
    (list || []).forEach(item => container.appendChild(tile(item, side)));
  }

  function updateQrVisibility(){
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    if (!qrBox) return;
    qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  function refreshFrom(){
    // селектор города показываем ТОЛЬКО для наличных
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');

    const pricing = window.PRICING;
    if (!pricing || typeof pricing.currencies !== 'function') {
      console.warn('PRICING.currencies не найден. Убедись, что pricing.js подключён перед index.js');
      renderTiles(fromWrap, [], 'from');
      selFrom = null;
      return;
    }
    const list = pricing.currencies(fromPayType, cityFrom, 'from') || [];
    renderTiles(fromWrap, list, 'from');
    selFrom = list[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    // селектор города показываем ТОЛЬКО для наличных
    if (toCityBox) toCityBox.hidden = (toPayType !== 'cash');

    const pricing = window.PRICING;
    if (!pricing || typeof pricing.currencies !== 'function') {
      console.warn('PRICING.currencies не найден. Убедись, что pricing.js подключён перед index.js');
      renderTiles(toWrap, [], 'to');
      selTo = null;
      updateQrVisibility();
      return;
    }
    const list = pricing.currencies(toPayType, cityTo, 'to') || [];
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  function recalc(){
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0){
      rateVal && (rateVal.textContent = '—');
      totalVal && (totalVal.textContent = '—');
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }
    const pricing = window.PRICING;
    if (!pricing || typeof pricing.quote !== 'function') {
      console.warn('PRICING.quote не найден.');
      return;
    }
    const q = pricing.quote({ from:selFrom, to:selTo, amount });
    currentQuote = q || { rate:null,total:null, rateText:'—', totalText:'—' };
    rateVal && (rateVal.textContent  = currentQuote.rateText || '—');
    totalVal && (totalVal.textContent = currentQuote.totalText || '—');
  }

  // chips handlers
  function wireChips(box, cb){
    if (!box) return;
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb(btn.dataset.type);
      });
    });
    // активировать первую (если есть)
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

  // Бизнес-правила (наличные CNY только Гуанчжоу)
  function validateBusinessRules(){
    if (fromPayType === 'cash' && selFrom === 'CNY' && cityFrom !== 'guangzhou') {
      safeAlert('Наличные юани можно ОТДАТЬ только в Гуанчжоу.');
      return false;
    }
    if (toPayType === 'cash' && selTo === 'CNY' && cityTo !== 'guangzhou') {
      safeAlert('Наличные юани можно ПОЛУЧИТЬ только в Гуанчжоу.');
      return false;
    }
    return true;
  }

  // ОТПРАВКА ЗАЯВКИ (WebApp)
  // === ОТПРАВКА ЗАЯВКИ ===
sendBtn?.addEventListener('click', async () => {
  const amountNum = Number(amountInput.value || 0);
  if (!selFrom || !selTo) { alert('Выберите валюты/сервис «Отдаю» и «Получаю».'); return; }
  if (!(amountNum > 0))   { alert('Введите сумму.'); return; }
  if (!currentQuote?.rate) { alert('Не удалось рассчитать курс.'); return; }

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

  // 1) Внутри Telegram WebApp — используем sendData (бот ловит web_app_data)
  if (tg) {
    try {
      tg.sendData(JSON.stringify(payload));
      // можно не закрывать, чтобы показать подтверждение
      if (tg.showPopup) {
        tg.showPopup({ title: 'Заявка отправлена', message: 'Мы скоро свяжемся с вами.' });
      } else {
        alert('✅ Заявка отправлена! Мы скоро свяжемся с вами.');
      }
      return;
    } catch (e) {
      console.error('sendData error', e);
      // если вдруг не получилось — попробуем через API
    }
  }

  // 2) Открыто как САЙТ — шлём в API
  // ВАРИАНТ A (если сайт и API на ОДНОМ домене под Nginx):
  let API_BASE = '/api';
  // ВАРИАНТ B (если сайт на GitHub Pages, а API на вашем сервере с доменом/айпи):
  // УКАЖИ ТУТ СВОЙ ДОМЕН/АЙПИ С HTTPS!!!
  // API_BASE = 'https://ВАШ_ДОМЕН_СЕРВЕРА/api';

  try {
    const resp = await fetch(`${API_BASE}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit'
    });

    // аккуратно читаем: если не JSON, покажем текст/HTML ошибки
    const ct = resp.headers.get('content-type') || '';
    if (!resp.ok) {
      let message = `HTTP ${resp.status}`;
      if (ct.includes('application/json')) {
        const j = await resp.json().catch(()=>null);
        if (j && (j.error || j.detail)) message += `: ${j.error || j.detail}`;
      } else {
        const t = await resp.text().catch(()=>null);
        if (t) message += `\n\n${t.slice(0,300)}`;
      }
      alert('Ошибка отправки заявки: ' + message);
      return;
    }

    let data;
    if (ct.includes('application/json')) {
      data = await resp.json().catch(()=>null);
    } else {
      const t = await resp.text().catch(()=>null);
      throw new Error('API вернул не JSON:\n' + t);
    }

    if (data?.ok) {
      alert('✅ Заявка отправлена! Менеджер скоро свяжется с вами.');
    } else {
      alert('Ошибка: ' + (data?.error || 'не удалось отправить заявку'));
    }
  } catch (e) {
    alert('Ошибка сети: ' + (e?.message || e));
  }
});
