// Telegram WebApp
const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
if (tg) { tg.expand(); tg.ready(); }
function inTG(){ try{ return !!(tg && tg.initDataUnsafe); }catch(e){ return false; } }

// Иконки валют/типов
const ICON = code => `./icons/${code}.svg`;
const ICONS = {
  RUB: ICON('rub'),
  USD: ICON('usd'),
  CNY: ICON('cny'),
  USDT: ICON('usdt'),
  BTC: ICON('btc'),
  ETH: ICON('eth'),
  XMR: ICON('xmr'),
};

// Набор валют в справочнике
const CURRENCIES = ["RUB","USD","CNY","USDT","BTC","ETH","XMR"];

// DOM
const boxFromPay = document.getElementById('from-pay');
const boxToPay   = document.getElementById('to-pay');
const fromCityBox= document.getElementById('from-citybox');
const toCityBox  = document.getElementById('to-citybox');
const cityFromEl = document.getElementById('cityFrom');
const cityToEl   = document.getElementById('cityTo');
const coinsFrom  = document.getElementById('from-currencies');
const coinsTo    = document.getElementById('to-currencies');
const amountEl   = document.getElementById('amount');
const resultEl   = document.getElementById('result');
const hintEl     = document.getElementById('hint');

let paymentFrom=null; // 'cash'|'bank'|'crypto'
let paymentTo=null;
let cityFrom="moscow";
let cityTo="moscow";
let curFrom=null; // 'RUB'|'USD'|...
let curTo=null;

// Ограничения:
// - Город показываем только при «наличных»
function toggleCityBoxes(){
  fromCityBox.hidden = paymentFrom !== 'cash';
  toCityBox.hidden   = paymentTo !== 'cash';
}

// - В Гуанчжоу: отдавать (наличные) только USD; получать (наличные) только USD,CNY
function filterByGuangzhou(list, side){
  if (side==='from' && paymentFrom==='cash' && cityFrom==='guangzhou'){
    return list.filter(c => c==="USD");
  }
  if (side==='to' && paymentTo==='cash' && cityTo==='guangzhou'){
    return list.filter(c => c==="USD" || c==="CNY");
  }
  return list;
}

// Рисуем плитки валют
function renderCoins(root, list, activeCode, onPick){
  root.innerHTML = '';
  list.forEach(code=>{
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'coin' + (code===activeCode ? ' active':'');
    d.innerHTML = `
      <img class="iconimg" src="${ICONS[code]||''}" alt="">
      <div class="cap">${code}</div>`;
    d.onclick = ()=>onPick(code);
    root.appendChild(d);
  });
}

// Получить список допустимых валют с учётом типа/города
function allowedList(side){
  // Базово: всё
  let list = [...CURRENCIES];

  // Можно сузить по типу оплаты (если хочешь — включи ниже логику)
  // пример: банк чаще фиат + USDT, крипта — crypto, наличные — фиат
  if (side==='from'){
    if (paymentFrom==='bank')  list = ["RUB","USD","CNY","USDT"];
    if (paymentFrom==='crypto')list = ["USDT","BTC","ETH","XMR"];
    if (paymentFrom==='cash')  list = ["RUB","USD"]; // юань наличными — отдавать нельзя
  } else {
    if (paymentTo==='bank')  list = ["RUB","USD","CNY","USDT"];
    if (paymentTo==='crypto')list = ["USDT","BTC","ETH","XMR"];
    if (paymentTo==='cash')  list = ["RUB","USD","CNY"]; // но CNY зависит от города
  }

  // Спец-ограничения Гуанчжоу:
  list = filterByGuangzhou(list, side);
  return list;
}

function rerender(){
  toggleCityBoxes();

  // если валюты ещё не выбраны — поставим дефолты
  if (!curFrom){
    const l = allowedList('from');
    curFrom = l.includes('USDT') ? 'USDT' : l[0];
  }
  if (!curTo){
    const l = allowedList('to');
    curTo = l.includes('RUB') ? 'RUB' : l[0];
  }

  // если из-за смены условий текущие валюты недопустимы — заменим
  const lf = allowedList('from');
  if (!lf.includes(curFrom)) curFrom = lf[0];
  const lt = allowedList('to');
  if (!lt.includes(curTo)) curTo = lt[0];
  if (curTo === curFrom){
    // попытка выбрать другое
    const alt = lt.find(x=>x!==curFrom);
    if (alt) curTo = alt;
  }

  renderCoins(coinsFrom, lf, curFrom, code=>{ curFrom=code; rerender(); recalc(); });
  renderCoins(coinsTo,   lt, curTo,   code=>{ curTo=code; rerender(); recalc(); });

  recalc();
}

// Заглушка расчёта (если у тебя есть pricing.js с quotePair — подключи и используй его)
function recalc(){
  const a = parseFloat(amountEl.value||'0');
  // если есть quotePair(from,to,a) — раскомментируй:
  // const q = (typeof quotePair==='function') ? quotePair(curFrom, curTo, a) : null;
  // if (q){ resultEl.textContent = `Курс: ${q.rate.toFixed(6)} | К получению: ${q.total.toLocaleString('ru-RU')}`; return; }
  // элегантная заглушка:
  resultEl.textContent = (a>0 && curFrom && curTo) ? `Направление: ${curFrom}→${curTo} | Сумма: ${a}` : `Курс: — | К получению: —`;
}

amountEl.addEventListener('input', recalc);

// Выбор «типа оплаты» с переключением aria-pressed
function bindPayRow(root, setter){
  root.querySelectorAll('.pay').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      root.querySelectorAll('.pay').forEach(b=>b.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
      setter(btn.dataset.type);
      rerender();
    });
  });
}
bindPayRow(boxFromPay, v=>paymentFrom=v);
bindPayRow(boxToPay,   v=>paymentTo=v);

// Выбор города (активен только при «наличных»)
cityFromEl.addEventListener('change', ()=>{ cityFrom = cityFromEl.value; rerender(); });
cityToEl  .addEventListener('change', ()=>{ cityTo   = cityToEl.value; rerender(); });

// Стартовые значения
(function init(){
  // по умолчанию «Отдаю: крипто», «Получаю: наличные»
  boxFromPay.querySelector('[data-type="crypto"]').click();
  boxToPay  .querySelector('[data-type="cash"]').click();
  // города по умолчанию
  cityFrom = cityFromEl.value = 'moscow';
  cityTo   = cityToEl.value   = 'moscow';
  // первичный рендер
  rerender();
  // подсказка для браузера вне Telegram
  if (!inTG()) document.getElementById('hint').hidden = false;
})();

// Отправка заявки в бота
document.getElementById('sendBtn').addEventListener('click', ()=>{
  const amount = parseFloat(amountEl.value||'0');
  if (!paymentFrom || !paymentTo){ alert('Выберите тип оплаты (отдаю/получаю).'); return; }
  if (paymentFrom==='cash' && !cityFrom){ alert('Выберите город для «Отдаю (наличные)».'); return; }
  if (paymentTo==='cash'   && !cityTo){   alert('Выберите город для «Получаю (наличные)».'); return; }
  if (!curFrom || !curTo){ alert('Выберите валюты обмена.'); return; }
  if (!(amount>0)){ alert('Введите сумму больше нуля.'); return; }

  const payload = {
    action: 'request',
    payment_from: paymentFrom,
    payment_to:   paymentTo,
    city_from:    paymentFrom==='cash' ? cityFrom : null,
    city_to:      paymentTo==='cash'   ? cityTo   : null,
    direction: `${curFrom}>${curTo}`,
    amount,
    contact: (document.getElementById('contact').value||'').trim(),
    requisites: (document.getElementById('requisites').value||'').trim(),
    note: (document.getElementById('note').value||'').trim(),
  };

  if (inTG()){
    try{
      tg.HapticFeedback?.impactOccurred('medium');
      tg.showPopup?.({ title:'Отправка', message:'Заявка отправляется…' });
      tg.sendData(JSON.stringify(payload));
      tg.close();
    }catch(e){
      console.error(e); alert('Не удалось отправить заявку. Попробуйте ещё раз.');
    }
  } else {
    alert('Откройте форму из кнопки бота в Telegram.');
  }
});
