// index.js v43 — стабильный UI + моментальный пересчёт
(function () {
  const tg = window.Telegram?.WebApp;

  // DOM элементы
  const fromPayBox = document.getElementById('from-pay');
  const toPayBox   = document.getElementById('to-pay');
  const fromCityBox= document.getElementById('from-citybox');
  const toCityBox  = document.getElementById('to-citybox');
  const cityFromSel= document.getElementById('cityFrom');
  const cityToSel  = document.getElementById('cityTo');
  const fromWrap   = document.getElementById('from-currencies');
  const toWrap     = document.getElementById('to-currencies');
  const amountInput= document.getElementById('amount');
  const rateVal    = document.getElementById('rateVal');
  const totalVal   = document.getElementById('totalVal');
  const contactInput= document.getElementById('contact');
  const reqsInput  = document.getElementById('requisites');
  const noteInput  = document.getElementById('note');
  const qrBox      = document.getElementById('qrbox');
  const qrFile     = document.getElementById('qrfile');
  const sendBtn    = document.getElementById('sendBtn');
  const hint       = document.getElementById('hint');

  // state
  let fromPayType='cash', toPayType='cash';
  let cityFrom='moscow', cityTo='moscow';
  let selFrom=null, selTo=null;
  let currentQuote={rate:null,total:null,rateText:'—',totalText:'—'};

  if (tg){ try{ tg.expand(); tg.ready(); }catch(e){} }
  else if (hint) hint.hidden=false;

  const clear = (node)=>{while(node.firstChild)node.removeChild(node.firstChild);};

  function tile(item, side){
    const btn=document.createElement('button');
    btn.type='button'; btn.className='tile'; btn.dataset.code=item.code;
    btn.innerHTML=`<div class="ico"><img src="${item.icon}" alt=""></div><div class="cap">${item.nameRu}</div>`;
    btn.onclick=()=>{ 
      if(side==='from'){ selFrom=item.code; markActive(fromWrap,item.code);} 
      else { selTo=item.code; markActive(toWrap,item.code);} 
      updateQr(); recalc(); 
    };
    return btn;
  }
  function markActive(cont,code){cont.querySelectorAll('.tile').forEach(t=>t.classList.remove('active')); cont.querySelector(`[data-code="${code}"]`)?.classList.add('active');}
  function renderTiles(cont,list,side){ clear(cont); list.forEach(it=>cont.appendChild(tile(it,side))); }
  function updateQr(){ const cnp=['ALIPAY','WECHAT','CN_CARD']; if(qrBox) qrBox.hidden=!(toPayType==='cnpay' && selTo && cnp.includes(selTo)); }

  function refreshFrom(){
    if(fromCityBox) fromCityBox.hidden=(fromPayType!=='cash');
    const list=window.PRICING?.currencies(fromPayType,cityFrom,'from')||[];
    renderTiles(fromWrap,list,'from'); selFrom=list[0]?.code||null; if(selFrom) markActive(fromWrap,selFrom);
  }
  function refreshTo(){
    if(toCityBox) toCityBox.hidden=(toPayType!=='cash');
    const list=window.PRICING?.currencies(toPayType,cityTo,'to')||[];
    renderTiles(toWrap,list,'to'); selTo=list[0]?.code||null; if(selTo) markActive(toWrap,selTo);
    updateQr();
  }

  function recalc(){
    const amt=+amountInput.value||0;
    if(!selFrom||!selTo||amt<=0){ rateVal.textContent='—'; totalVal.textContent='—'; return;}
    const q=window.PRICING?.quote({from:selFrom,to:selTo,amount:amt});
    currentQuote=q||{rate:null,total:null,rateText:'—',totalText:'—'};
    rateVal.textContent=q?.rateText||'—';
    totalVal.textContent=q?.totalText||'—';
  }

  function wireChips(box,cb){
    box.querySelectorAll('.chip').forEach(btn=>btn.onclick=()=>{box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));btn.classList.add('active');cb(btn.dataset.type);});
    const first=box.querySelector('.chip'); if(first){first.classList.add('active');cb(first.dataset.type);}
  }
  wireChips(fromPayBox,t=>{fromPayType=t;refreshFrom();recalc();});
  wireChips(toPayBox,t=>{toPayType=t;refreshTo();recalc();});
  cityFromSel?.addEventListener('change',()=>{cityFrom=cityFromSel.value;refreshFrom();recalc();});
  cityToSel?.addEventListener('change',()=>{cityTo=cityToSel.value;refreshTo();recalc();});
  amountInput?.addEventListener('input',recalc);

  function boot(){ if(!window.PRICING?.currencies){setTimeout(boot,100);return;} refreshFrom();refreshTo();recalc();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();

  async function sendOrder(){
    const amt=+amountInput.value||0;
    if(!selFrom||!selTo){alert('Выберите валюты.');return;}
    if(!(amt>0)){alert('Введите сумму.');return;}
    if(!currentQuote.rate){alert('Нет курса.');return;}
    const payload={type:'order',from_currency:selFrom,to_currency:selTo,from_kind:fromPayType,to_kind:toPayType,city_from:cityFrom,city_to:cityTo,amount:amt,rate:currentQuote.rate,total:currentQuote.total,contact:contactInput.value.trim(),requisites:reqsInput.value.trim(),note:noteInput.value.trim()};
    if(qrFile?.files[0]) payload.qr_filename=qrFile.files[0].name;
    if(tg?.sendData){tg.sendData(JSON.stringify(payload)); tg.showPopup?.({title:'Заявка отправлена',message:'Мы скоро свяжемся с вами.'}); return;}
    try{const r=await fetch('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();if(r.ok&&j.ok)alert('Заявка отправлена.');else alert('Ошибка.');}catch(e){alert('Ошибка сети');}
  }
  sendBtn?.addEventListener('click',sendOrder);
})();
