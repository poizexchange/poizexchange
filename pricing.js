// Все курсы редактируешь тут. Комиссия = 0.
const TARIFFS = {
  "USDT>RUB":[
    {min:0,rate:82.5},{min:1000,rate:81.9},{min:5000,rate:81.4},{min:10000,rate:81.1}
  ],
  "USD>RUB":[
    {min:0,rate:82.9},{min:1000,rate:82.5},{min:5000,rate:81.9},{min:10000,rate:81.5}
  ],
  "USDT>CNY":[
    {min:0,rate:6.9},{min:1000,rate:7.0},{min:5000,rate:7.03},{min:10000,rate:7.07}
  ],
  "RUB>CNY":[
    {min:0,rate:12.9},{min:1000,rate:11.8},{min:3000,rate:11.7},{min:15000,rate:11.65},{min:30000,rate:11.6},{min:70000,rate:11.5}
  ],
  "RUB>USDT":[{min:0,rate:79.3}],
  "RUB>USD":[{min:0,rate:79.9}],
  "RUB>CNYF":[{min:0,rate:10.0}] // фикс 10
};

const CURRENCIES = [
  { code: "USDT", title: "💲 USDT" },
  { code: "USD",  title: "💵 USD" },
  { code: "RUB",  title: "🇷🇺 RUB" },
  { code: "CNY",  title: "🇨🇳 CNY" },
];

function pickTariff(dir, amount){
  const list = TARIFFS[dir] || [];
  if(!list.length) return null;
  let chosen = list[0];
  for(const t of list){ if(amount >= t.min) chosen = t; else break; }
  return chosen;
}

function buildDirection(from, to, rubCnyMode){
  if (from==="RUB" && to==="CNY") return rubCnyMode==="fix" ? "RUB>CNYF" : "RUB>CNY";
  return `${from}>${to}`;
}

// Расчёт (RUB->CNY считаем как RUB / rate)
function quote(dir, amount){
  if (!isFinite(amount) || amount<=0) return null;
  const t = pickTariff(dir, amount); if(!t) return null;
  let total;
  if (dir.endsWith(">RUB")) total = amount * t.rate;
  else if (dir==="RUB>CNY" || dir==="RUB>CNYF") total = amount / t.rate;
  else total = amount * t.rate;
  return { rate: t.rate, total };
}

function formatN(x){ return Number(x).toLocaleString('ru-RU',{maximumFractionDigits:2}); }
