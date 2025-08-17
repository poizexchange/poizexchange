const tg=(window.Telegram&&window.Telegram.WebApp)?window.Telegram.WebApp:null; if(tg){tg.expand();tg.ready();}
function inTG(){try{return !!(tg&&tg.initDataUnsafe);}catch(e){return false;}}
const ICON = n => `./icons/${n}.svg`;
const CURRENCIES=[
  {code:'RUB',title:'RUB',icon:ICON('rub')},
  {code:'USD',title:'USD',icon:ICON('usd')},
  {code:'CNY',title:'CNY',icon:ICON('cny')},
  {code:'USDT',title:'USDT',icon:ICON('usdt')},
  {code:'BTC',title:'BTC',icon:ICON('btc')},
  {code:'ETH',title:'ETH',icon:ICON('eth')},
  {code:'XMR',title:'XMR',icon:ICON('xmr')},
];
const BANKS=[
  {code:'SBP',title:'СБП',icon:ICON('sbp')},
  {code:'SBER',title:'Сбер',icon:ICON('sber')},
  {code:'TBANK',title:'Т-Банк',icon:ICON('tbank')},
  {code:'VTB',title:'ВТБ',icon:ICON('vtb')},
  {code:'ALFA',title:'Альфа',icon:ICON('alfa')},
  {code:'OZON',title:'Ozon',icon:ICON('ozon')},
  {code:'RAIFFEISEN',title:'Райффайзен',icon:ICON('raif')},
];
const boxFromPay=document.getElementById('from-pay'), boxToPay=document.getElementById('to-pay');
const fromCityBox=document.getElementById('from-citybox'), toCityBox=document.getElementById('to-citybox');
const cityFromEl=document.getElementById('cityFrom'), cityToEl=document.getElementById('cityTo');
const tilesFrom=document.getElementById('from-currencies'), tilesTo=document.getElementById('to-currencies');
const amountEl=document.getElementById('amount'), resultEl=document.getElementById('result');
let paymentFrom=null,paymentTo=null,cityFrom='moscow',cityTo='moscow',fromKind='currency',toKind='currency',fromCode=null,toCode=null;
function toggleCityBoxes(){ fromCityBox.hidden=paymentFrom!=='cash'; toCityBox.hidden=paymentTo!=='cash'; }
function applyGuangzhou(list, side){
  if(side==='from'&&paymentFrom==='cash'&&cityFrom==='guangzhou') return list.filter(x=>x.code==='USD');
  if(side==='to'&&paymentTo==='cash'&&cityTo==='guangzhou') return list.filter(x=>x.code==='USD'||x.code==='CNY');
  return list;
}
function allowedList(side){
  const isFrom=side==='from'; const p=isFrom?paymentFrom:paymentTo;
  if(p==='bank'){ if(isFrom) fromKind='bank'; else toKind='bank'; return BANKS.slice(); }
  if(isFrom) fromKind='currency'; else toKind='currency';
  let list=CURRENCIES.slice();
  if(p==='cash'){ list=list.filter(x=>x.code==='RUB'||x.code==='USD'||x.code==='CNY'); list=applyGuangzhou(list, side); if(isFrom&&cityFrom!=='guangzhou'){ list=list.filter(x=>x.code!=='CNY'); } }
  if(p==='crypto'){ list=list.filter(x=>['USDT','BTC','ETH','XMR'].includes(x.code)); }
  return list;
}
function renderTiles(root,list,active,onPick){
  root.innerHTML=''; list.forEach(item=>{ const b=document.createElement('button'); b.type='button'; b.className='coin'+(item.code===active?' active':''); b.innerHTML=`<img class="iconimg" src="${item.icon}" alt=""><div class="cap">${item.title}</div>`; b.onclick=()=>onPick(item.code); root.appendChild(b); });
}
function recalc(){
  const a=parseFloat(amountEl.value||'0');
  if(typeof quotePair==='function' && fromKind==='currency' && toKind==='currency'){
    const q=quotePair(fromCode||'USDT', toCode||'RUB', a||0);
    if(q){ resultEl.textContent=`Курс: ${q.rate.toFixed(6)} | К получению: ${q.total.toLocaleString('ru-RU')}`; return; }
  }
  resultEl.textContent=(a>0&&fromCode&&toCode)?`Направление: ${fromKind}:${fromCode} → ${toKind}:${toCode} | Сумма: ${a}`:`Курс: — | К получению: —`;
}
function rerender(){
  toggleCityBoxes();
  const lf=allowedList('from'); if(!fromCode||!lf.find(x=>x.code===fromCode)) fromCode=lf[0]?.code;
  const lt=allowedList('to');   if(!toCode  ||!lt.find(x=>x.code===toCode))   toCode  =lt[0]?.code;
  if(fromKind==='currency'&&toKind==='currency'&&fromCode===toCode){ const alt=lt.find(x=>x.code!==fromCode); if(alt) toCode=alt.code; }
  renderTiles(tilesFrom, lf, fromCode, c=>{fromCode=c; rerender(); recalc();});
  renderTiles(tilesTo,   lt, toCode,   c=>{toCode  =c; rerender(); recalc();});
  recalc();
}
function bindPayRow(root,setter){ root.querySelectorAll('.pay').forEach(btn=>{ btn.addEventListener('click', ()=>{ root.querySelectorAll('.pay').forEach(b=>b.setAttribute('aria-pressed','false')); btn.setAttribute('aria-pressed','true'); setter(btn.dataset.type); rerender(); }); }); }
bindPayRow(boxFromPay, v=>paymentFrom=v); bindPayRow(boxToPay, v=>paymentTo=v);
cityFromEl.addEventListener('change', ()=>{cityFrom=cityFromEl.value; rerender();});
cityToEl.addEventListener('change', ()=>{cityTo=cityToEl.value; rerender();});
(function init(){ boxFromPay.querySelector('[data-type="crypto"]').click(); boxToPay.querySelector('[data-type="cash"]').click(); cityFrom=cityFromEl.value='moscow'; cityTo=cityToEl.value='moscow'; rerender(); if(!inTG()) document.getElementById('hint').hidden=false; })();
document.getElementById('sendBtn').addEventListener('click', ()=>{
  const amount=parseFloat(amountEl.value||'0');
  if(!paymentFrom||!paymentTo){ alert('Выберите тип оплаты (отдаю/получаю).'); return; }
  if(paymentFrom==='cash'&&!cityFrom){ alert('Выберите город для «Отдаю (наличные)».'); return; }
  if(paymentTo==='cash'&&!cityTo){ alert('Выберите город для «Получаю (наличные)».'); return; }
  if(!fromCode||!toCode){ alert('Выберите валюты/банки.'); return; }
  if(!(amount>0)){ alert('Введите сумму больше нуля.'); return; }
  const payload={action:'request', payment_from:paymentFrom,payment_to:paymentTo, city_from:paymentFrom==='cash'?cityFrom:null, city_to:paymentTo==='cash'?cityTo:null, from_kind:(paymentFrom==='bank'?'bank':'currency'), to_kind:(paymentTo==='bank'?'bank':'currency'), from_code:fromCode, to_code:toCode, direction:`${(paymentFrom==='bank'?'bank':'currency')}:${fromCode}>${(paymentTo==='bank'?'bank':'currency')}:${toCode}`, amount, contact:(document.getElementById('contact').value||'').trim(), requisites:(document.getElementById('requisites').value||'').trim(), note:(document.getElementById('note').value||'').trim() };
  if(tg){ try{ tg.HapticFeedback?.impactOccurred('medium'); tg.showPopup?.({title:'Отправка',message:'Заявка отправляется…'}); tg.sendData(JSON.stringify(payload)); tg.close(); }catch(e){ console.error(e); alert('Не удалось отправить заявку.'); } } else { alert('Откройте форму из кнопки бота в Telegram.'); }
});
