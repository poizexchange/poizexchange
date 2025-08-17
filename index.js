// Telegram helpers
const tg=(window.Telegram&&window.Telegram.WebApp)?window.Telegram.WebApp:null; if(tg){tg.expand(); tg.ready();}
const inTG=()=>{ try{ return !!(tg && tg.initDataUnsafe); } catch(e){ return false; } };

const ICON = n => `./icons/${n}.svg`;

// Datasets
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
  {code:'RAIFFEISEN',title:'Райф',icon:ICON('raif')},
];
const CNPAY=[
  {code:'ALIPAY',title:'Alipay',icon:ICON('alipay')},
  {code:'WECHAT',title:'WeChat',icon:ICON('wechat')},
  {code:'BANKCN',title:'Bank CN',icon:ICON('bankcn')},
];

// Elements
const fromRow=document.getElementById('from-pay');
const toRow  =document.getElementById('to-pay');
const fromCityBox=document.getElementById('from-citybox');
const toCityBox  =document.getElementById('to-citybox');
const cityFromEl =document.getElementById('cityFrom');
const cityToEl   =document.getElementById('cityTo');
const tilesFrom  =document.getElementById('from-currencies');
const tilesTo    =document.getElementById('to-currencies');
const amountEl   =document.getElementById('amount');
const rateEl     =document.getElementById('rateVal');
const totalEl    =document.getElementById('totalVal');
const qrBox      =document.getElementById('qrbox');
const qrFile     =document.getElementById('qrfile');

let pFrom=null, pTo=null; // cash, bank, crypto, (to-only) cnpay
let cityFrom='moscow', cityTo='moscow';
let kindFrom='currency', kindTo='currency'; // 'bank' | 'currency' | 'cnpay'
let codeFrom=null, codeTo=null;

function toggleCityBoxes(){ fromCityBox.hidden = pFrom!=='cash'; toCityBox.hidden = pTo!=='cash'; }
function toggleQr(){ qrBox.hidden = !(kindTo==='cnpay'); }

function applyGuangzhou(list, side){
  if (side==='from' && pFrom==='cash' && cityFrom==='guangzhou') return list.filter(x=>x.code==='USD');
  if (side==='to'   && pTo==='cash'   && cityTo==='guangzhou')   return list.filter(x=>x.code==='USD'||x.code==='CNY');
  return list;
}

// Allowed lists with CN services logic
function allowedList(side){
  const isFrom = side==='from';

  if (!isFrom){ // TO side
    if (pTo==='cnpay'){ kindTo='cnpay'; return CNPAY.slice(); }
    if (pTo==='bank'){ kindTo='bank'; return BANKS.slice(); }
    if (pTo==='crypto'){ kindTo='currency'; return CURRENCIES.filter(x=>['USDT','BTC','ETH','XMR'].includes(x.code)); }
    if (pTo==='cash'){
      kindTo='currency';
      let list=CURRENCIES.filter(x=>['RUB','USD','CNY'].includes(x.code));
      list=applyGuangzhou(list,'to');
      return list;
    }
    kindTo='currency'; return CURRENCIES.slice();
  }

  // FROM side (may be restricted by TO selection, when cn services chosen)
  let list=[];
  if (pFrom==='bank'){ kindFrom='bank'; list=BANKS.slice(); }
  else if (pFrom==='crypto'){ kindFrom='currency'; list=CURRENCIES.filter(x=>['USDT','BTC','ETH','XMR'].includes(x.code)); }
  else if (pFrom==='cash'){ kindFrom='currency'; list=CURRENCIES.filter(x=>['RUB','USD','CNY'].includes(x.code)); list=applyGuangzhou(list,'from'); if (cityFrom!=='guangzhou'){ list=list.filter(x=>x.code!=='CNY'); } }
  else { kindFrom='currency'; list=CURRENCIES.slice(); }

  // Restrictions if receiving via CN services
  if (kindTo==='cnpay'){
    // Allowed sources: cash RUB, any RF bank, USDT
    list = list.filter(x=>
      (pFrom==='bank') ||
      (pFrom==='cash' && x.code==='RUB') ||
      (pFrom==='crypto' && x.code==='USDT')
    );
  }
  return list;
}

function renderTiles(root, list, activeCode, onPick){
  root.innerHTML='';
  list.forEach(item=>{
    const btn=document.createElement('button');
    btn.type='button'; btn.className='tile'+(item.code===activeCode?' active':'');
    btn.innerHTML=`<span class="ico"><img src="${item.icon}" alt=""></span><span class="cap">${item.title||item.code}</span>`;
    btn.onclick=()=>onPick(item.code);
    root.appendChild(btn);
  });
}

function recalc(){
  const a=parseFloat(amountEl.value||'0');
  if (typeof quotePair==='function' && kindFrom==='currency' && kindTo==='currency'){
    const q=quotePair(codeFrom||'USDT', codeTo||'RUB', a||0);
    if (q){ rateEl.textContent=q.rate.toFixed(6); totalEl.textContent=q.total.toLocaleString('ru-RU'); return; }
  }
  rateEl.textContent='—'; totalEl.textContent=(a>0&&codeFrom&&codeTo)?a.toLocaleString('ru-RU'):'—';
}

function rerender(){
  toggleCityBoxes(); toggleQr();
  const lf=allowedList('from'); if(!codeFrom || !lf.find(x=>x.code===codeFrom)) codeFrom=lf[0]?.code;
  const lt=allowedList('to');   if(!codeTo   || !lt.find(x=>x.code===codeTo))   codeTo  =lt[0]?.code;
  if (kindFrom==='currency' && kindTo==='currency' && codeFrom===codeTo){
    const alt=lt.find(x=>x.code!==codeFrom); if(alt) codeTo=alt.code;
  }
  renderTiles(tilesFrom, lf, codeFrom, c=>{ codeFrom=c; rerender(); recalc(); });
  renderTiles(tilesTo,   lt, codeTo,   c=>{ codeTo  =c; rerender(); recalc(); }); // <- FIX: codeTo (не toCode)
  recalc();
}

function bindRow(root, setter){
  root.querySelectorAll('.chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      root.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      setter(btn.dataset.type);
      rerender();
    });
  });
}
bindRow(fromRow, v=>pFrom=v);
bindRow(toRow,   v=>pTo=v);

// city handlers
cityFromEl.addEventListener('change', ()=>{ cityFrom=cityFromEl.value; rerender(); });
cityToEl  .addEventListener('change', ()=>{ cityTo  =cityToEl.value;   rerender(); });

// Init defaults
(function init(){
  fromRow.querySelector('[data-type="crypto"]').click();
  toRow  .querySelector('[data-type="cash"]').click();
  cityFrom=cityFromEl.value='moscow';
  cityTo  =cityToEl.value  ='moscow';
  if (!inTG()) document.getElementById('hint')?.removeAttribute('hidden');
  rerender();
})();

// Send
document.getElementById('sendBtn').addEventListener('click', ()=>{
  const amount=parseFloat(amountEl.value||'0');
  if (!pFrom||!pTo){ alert('Выберите тип оплаты (отдаю/получаю).'); return; }
  if (pFrom==='cash' && !cityFrom){ alert('Выберите город для «Отдаю (наличные)».'); return; }
  if (pTo==='cash'   && !cityTo){   alert('Выберите город для «Получаю (наличные)».'); return; }
  if (!codeFrom||!codeTo){ alert('Выберите валюты/банки.'); return; }
  if (!(amount>0)){ alert('Введите сумму больше нуля.'); return; }

  const payload={
    action:'request',
    payment_from:pFrom, payment_to:pTo,
    city_from: pFrom==='cash'?cityFrom:null,
    city_to:   pTo==='cash'?cityTo:null,
    from_kind:(pFrom==='bank'?'bank':'currency'),
    to_kind:(pTo==='bank'?'bank': (pTo==='cnpay'?'cnpay':'currency')),
    from_code:codeFrom, to_code:codeTo,
    direction:`${(pFrom==='bank'?'bank':'currency')}:${codeFrom}>${(pTo==='bank'?'bank':(pTo==='cnpay'?'cnpay':'currency'))}:${codeTo}`,
    amount,
    contact:(document.getElementById('contact').value||'').trim(),
    requisites:(document.getElementById('requisites').value||'').trim(),
    note:(document.getElementById('note').value||'').trim(),
    has_qr: (pTo==='cnpay' && qrFile && qrFile.files && qrFile.files.length>0) ? true : false,
    qr_filename: (pTo==='cnpay' && qrFile && qrFile.files && qrFile.files[0]) ? qrFile.files[0].name : null
  };

  if (tg){
    try{
      tg.HapticFeedback && tg.HapticFeedback.impactOccurred('medium');
      tg.showPopup && tg.showPopup({ title:'Отправка', message:'Заявка отправляется…' });
      tg.sendData(JSON.stringify(payload));
      tg.close();
    }catch(e){
      console.error(e);
      alert('Не удалось отправить заявку. Попробуйте ещё раз или напишите @poizmanager');
    }
  } else {
    alert('Откройте форму из кнопки бота в Telegram.');
  }
});
