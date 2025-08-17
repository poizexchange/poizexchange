const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

// Валюты с иконками
const CURRENCIES = [
  {code:'RUB', title:'₽ RUB', icon:'rub.svg'},
  {code:'USD', title:'$ USD', icon:'usd.svg'},
  {code:'CNY', title:'¥ CNY', icon:'cny.svg'},
  {code:'USDT', title:'USDT', icon:'usdt.svg'},
  {code:'BTC', title:'₿ BTC', icon:'btc.svg'},
  {code:'ETH', title:'Ξ ETH', icon:'eth.svg'},
  {code:'XMR', title:'Ⓜ XMR', icon:'xmr.svg'}
];

// рендер валют
function renderCurrencies(containerId) {
  const box=document.getElementById(containerId);
  box.innerHTML='';
  CURRENCIES.forEach(c=>{
    const div=document.createElement('div');
    div.className='curr';
    div.dataset.code=c.code;
    div.innerHTML=`<img src="./icons/${c.icon}"><div>${c.code}</div>`;
    box.appendChild(div);
  });
}
renderCurrencies('from-currencies');
renderCurrencies('to-currencies');

// выбор валют
function bindCurrencySelect(containerId){
  const box=document.getElementById(containerId);
  box.querySelectorAll('.curr').forEach(div=>{
    div.onclick=()=>{
      box.querySelectorAll('.curr').forEach(x=>x.classList.remove('active'));
