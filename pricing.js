// Курсы обмена
const rates = {
    "USDT>RUB": [
        { min: 0, max: 999, rate: 82.5 },
        { min: 1000, max: 5000, rate: 81.9 },
        { min: 5000, max: 10000, rate: 81.4 },
        { min: 10000, max: Infinity, rate: 81.1 }
    ],
    "USD>RUB": [
        { min: 0, max: 999, rate: 82.9 },
        { min: 1000, max: 5000, rate: 82.5 },
        { min: 5000, max: 10000, rate: 81.9 },
        { min: 10000, max: Infinity, rate: 81.5 }
    ],
    "USDT>CNY": [
        { min: 0, max: 1000, rate: 6.9 },
        { min: 1000, max: 5000, rate: 7.0 },
        { min: 5000, max: 10000, rate: 7.03 },
        { min: 10000, max: Infinity, rate: 7.07 }
    ],
    "RUB>CNY": [
        { min: 1000, max: 3000, rate: 11.8 },
        { min: 3000, max: 15000, rate: 11.7 },
        { min: 15000, max: 30000, rate: 11.65 },
        { min: 30000, max: 70000, rate: 11.6 },
        { min: 70000, max: Infinity, rate: 11.5 }
    ],
    "RUB>USDT": [
        { min: 0, max: Infinity, rate: 79.3 }
    ],
    "RUB>USD": [
        { min: 0, max: Infinity, rate: 79.9 }
    ],
    "RUB>CNYfix": [
        { min: 0, max: Infinity, rate: 10 }
    ]
};

function getRate(direction, amount) {
    const rules = rates[direction];
    for (let r of rules) {
        if (amount >= r.min && amount <= r.max) return r.rate;
    }
    return null;
}

function getRatesHTML() {
    let html = '<table><tr><th>Направление</th><th>Курс</th></tr>';
    for (let dir in rates) {
        html += `<tr><td>${dir}</td><td>${rates[dir][0].rate}</td></tr>`;
    }
    html += '</table>';
    return html;
}

function calculate() {
    const from = document.getElementById('fromCurrency').value;
    const to = document.getElementById('toCurrency').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (!from || !to || isNaN(amount)) {
        alert("Заполните все поля!");
        return;
    }

    const dir = `${from}>${to}`;
    const rate = getRate(dir, amount);

    if (!rate) {
        document.getElementById('result').innerText = "Курс не найден";
        return;
    }

    const resultAmount = amount * rate;
    document.getElementById('result').innerText = `Вы получите: ${resultAmount.toFixed(2)} ${to}`;
}

function sendRequest() {
    alert("Заявка отправлена!");
}

window.onload = () => {
    const currencies = ["USDT", "USD", "RUB", "CNY"];
    const fromSelect = document.getElementById('fromCurrency');
    const toSelect = document.getElementById('toCurrency');

    currencies.forEach(c => {
        let opt = document.createElement("option");
        opt.value = c;
        opt.innerText = c;
        fromSelect.appendChild(opt.cloneNode(true));
        toSelect.appendChild(opt);
    });
};
