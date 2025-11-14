const GIFT_NAMES = {
    pepe: "Plush Pepe",
    moon: "Heart Locket",
    cap: "Durov's Cap",
    plum: "Precious Peach",
    spartan: "Heroic Helmet",
    gold: "Mighty Arm"
};

const GIFT_ID_MAP = {
    "Plush Pepe": "pepe",
    "Heart Locket": "moon",
    "Durov's Cap": "cap",
    "Precious Peach": "plum",
    "Heroic Helmet": "spartan",
    "Mighty Arm": "gold"
};

const MONTH_NAMES = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const THERMOS_API_URL = 'https://proxy.thermos.gifts/api/v1/gifts';
const NANO_TO_TON = 1000000000;

function formatPrice(price) {
    if (!price) return 'N/A';
    return Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function fetchFloorPrice(giftName) {
    try {
        const response = await fetch(THERMOS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ordering: "PRICE_ASC", page: 1, per_page: 1, collections: [giftName] })
        });
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            return { name: giftName, price: parseFloat(data.items[0].price) / NANO_TO_TON, market: data.items[0].marketplace };
        }
        return { name: giftName, price: 0, market: 'N/A' };
    } catch (e) {
        console.error(`Error fetching ${giftName}:`, e);
        return { name: giftName, price: 0, market: 'Error' };
    }
}

async function fetchData() {
    const now = new Date();
    document.getElementById('current-day').textContent = now.getDate();
    document.getElementById('current-month').textContent = MONTH_NAMES[now.getMonth()];

    const [tickerRes, klinesRes] = await Promise.all([
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT'),
        fetch('https://api.binance.com/api/v3/klines?symbol=TONUSDT&interval=15m&limit=96')
    ]);
    const tickerData = await tickerRes.json();
    const klinesData = await klinesRes.json();
    const currentTonPrice = parseFloat(tickerData.price);
    const history = klinesData.map(c => parseFloat(c[4]));

    const startPrice = history[0];
    const change = ((currentTonPrice - startPrice) / startPrice) * 100;
    const sign = change >= 0 ? '+' : '';
    const colorClass = change >= 0 ? 'text-[#00B84B]' : 'text-[#FF3D00]';
    const chartColor = change >= 0 ? '#00B84B' : '#FF3D00';

    const tonPriceEl = document.getElementById('ton-price-usdt');
    const tonChangeEl = document.getElementById('ton-change-percent');
    
    tonPriceEl.textContent = currentTonPrice.toFixed(2) + '$';
    tonChangeEl.textContent = `${sign}${change.toFixed(2)}%`;
    tonChangeEl.className = `font-inter font-bold text-2xl ${colorClass}`;
    tonPriceEl.classList.remove('pulse-loader');
    tonChangeEl.classList.remove('pulse-loader');

    const giftPromises = Object.values(GIFT_NAMES).map(name => fetchFloorPrice(name));
    const giftsData = await Promise.all(giftPromises);

    giftsData.forEach(gift => {
        const id = GIFT_ID_MAP[gift.name];
        if (!id) return;
        document.getElementById(`price-${id}-ton`).textContent = formatPrice(gift.price);
        document.getElementById(`price-${id}-usdt`).textContent = formatPrice(gift.price * currentTonPrice);
        document.getElementById(`market-${id}`).textContent = gift.market;
        document.getElementById(`price-${id}-ton`).classList.remove('pulse-loader');
        document.getElementById(`price-${id}-usdt`).classList.remove('pulse-loader');
    });

    drawChart(history, chartColor);
}

function drawChart(data, color) {
    const svg = document.getElementById('chart-svg');
    const linePath = document.getElementById('chart-line');
    const fillPath = document.getElementById('chart-fill');
    const labelsContainer = document.getElementById('chart-labels');
    const stops = document.querySelectorAll('#chartGradient stop');

    linePath.setAttribute('stroke', color);
    stops.forEach(stop => stop.setAttribute('stop-color', color));

    const width = 600;
    const height = 170;
    const padding = 8; 

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    labelsContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const price = max - (range * (i / 4));
        const label = document.createElement('div');
        label.className = 'h-0 relative'; 
        label.innerHTML = `<span class="absolute right-0 -translate-y-1/2 pr-1">${price.toFixed(2)}</span>`;
        labelsContainer.appendChild(label);
    }

    if (range === 0) { 
         const y = height / 2;
         const points = data.map((price, i) => `${(i / (data.length - 1)) * width},${y}`);
         linePath.setAttribute('d', `M ${points.join(' L ')}`);
         fillPath.setAttribute('d', `M ${points.join(' L ')} L ${width},${height} L 0,${height} Z`);
         return;
    }

    const points = data.map((price, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - padding - (((price - min) / range) * (height - padding * 2));
        return `${x},${y}`;
    });

    const lineD = `M ${points.join(' L ')}`;
    linePath.setAttribute('d', lineD);

    const fillD = `${lineD} L ${width},${height} L 0,${height} Z`;
    fillPath.setAttribute('d', fillD);
}

fetchData();
setInterval(fetchData, 60000);