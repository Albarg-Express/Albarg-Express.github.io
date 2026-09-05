// Fallback data shown before Firestore loads or if it fails.
const FALLBACK_RATES = [
  { code: "USD", name: "US Dollar", sellRate: 10, buyRate: 9.8, updatedAt: null },
  { code: "EUR", name: "Euro", sellRate: 11, buyRate: 10.8, updatedAt: null }
];

const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", GBP: "£" };
function currencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || code;
}

let currentRates = FALLBACK_RATES.slice();
let selectedCurrency = "USD";
let direction = "toLYD"; // "toLYD" or "fromLYD"
let db = null;
let historyUnsub = null;
let chartInstance = null;

const I18N = {
  ar: {
    dir: "rtl",
    lang: "ar",
    hero_service: "نحوّل أموالك من Binance إلى ليبيا بدينار ليبي، بشفافية كاملة في الرسوم.",
    rate_title: "سعر الصرف اليوم",
    rate_to_lyd: "إلى الدينار الليبي",
    rate_sell_label: "سعر البيع",
    rate_buy_label: "سعر الشراء",
    last_updated: "آخر تحديث",
    calc_title: "احسب المبلغ المراد سحبه",
    calc_amount_label_to: "المبلغ المراد سحبه",
    calc_amount_label_from: "المبلغ بالدينار الليبي",
    dir_to_lyd: "إلى دينار ليبي",
    dir_from_lyd: "من دينار ليبي",
    r_total: "الإجمالي بالدينار الليبي",
    r_fee: "رسوم الخدمة (2%)",
    r_recipient: "المبلغ النهائي",
    r_reverse: "المبلغ المكافئ",
    history_title: "سجل الأسعار",
    history_empty: "لا يوجد سجل أسعار بعد لهذه العملة.",
    how_title: "كيف تعمل الخدمة",
    how_sub: "ثلاث خطوات بسيطة وشفافة لإتمام تحويلك.",
    step1_title: "أرسل المبلغ عبر Binance",
    step1_body: "أرسل المبلغ المراد سحبه إلى حسابنا على Binance باستخدام عملة USDT.",
    qr_download: "تحميل الصورة",
    step2_title: "اسم ورقم هاتف المستلم",
    step2_body: "زوّدنا باسم المستلم ورقم هاتفه.",
    step3_title: "توصيل سريع",
    step3_body: "نسلم المبلغ إلى المستلم فور حضوره.",
    contact_title: "تواصل معنا للبدء",
    contact_sub: "تواصل معنا عبر أي من القنوات التالية لبدء عملية التحويل.",
    contact_call: "اتصال",
    contact_whatsapp: "واتساب",
    contact_location: "موقعنا",
    contact_facebook: "فيسبوك",
    contact_hours: "ساعات العمل",
    hours_value: "10 صباحاً - 10 مساءً، من السبت إلى الخميس",
    about_title: "من نحن",
    about_body: "نحن شركة متخصصة في حلول الدفع الإلكتروني والخدمات الرقمية، نعمل على تقديم خدمات الدفع الإلكتروني، البطاقات الرقمية، دفع الفواتير، وشحن الألعاب والتطبيقات. المزيد من الخدمات قادمة قريباً.",
    footer_text: "جميع الحقوق محفوظة"
  },
  en: {
    dir: "ltr",
    lang: "en",
    hero_service: "We transfer your money from Binance to Libya in Libyan Dinar, with full fee transparency.",
    rate_title: "Today's Exchange Rate",
    rate_to_lyd: "to Libyan Dinar",
    rate_sell_label: "Sell Rate",
    rate_buy_label: "Buy Rate",
    last_updated: "Last updated",
    calc_title: "Calculate the Amount to Withdraw",
    calc_amount_label_to: "Amount to withdraw",
    calc_amount_label_from: "Amount in LYD",
    dir_to_lyd: "To LYD",
    dir_from_lyd: "From LYD",
    r_total: "Total in LYD",
    r_fee: "Service fee (2%)",
    r_recipient: "Final Amount",
    r_reverse: "Equivalent amount",
    history_title: "Rate History",
    history_empty: "No rate history yet for this currency.",
    how_title: "How It Works",
    how_sub: "Three simple, transparent steps to complete your transfer.",
    step1_title: "Send the Amount via Binance",
    step1_body: "Send the amount you want to withdraw to our Binance account using USDT.",
    qr_download: "Download Image",
    step2_title: "Recipient's Name & Phone Number",
    step2_body: "Give us the recipient's name and phone number.",
    step3_title: "Fast Delivery",
    step3_body: "We deliver the money to the recipient as soon as they arrive.",
    contact_title: "Contact Us to Start",
    contact_sub: "Reach out through any of the channels below to begin your transfer.",
    contact_call: "Call",
    contact_whatsapp: "WhatsApp",
    contact_location: "Our Location",
    contact_facebook: "Facebook",
    contact_hours: "Working Hours",
    hours_value: "10 AM - 10 PM, Saturday to Thursday",
    about_title: "About Us",
    about_body: "We are a company specialized in digital payment solutions and electronic services, offering electronic payments, digital card services, bill payments, and game/app top-ups. More services are coming soon.",
    footer_text: "All rights reserved"
  }
};

function getLang() {
  return localStorage.getItem("albarg_lang") || "ar";
}

function setLang(lang) {
  localStorage.setItem("albarg_lang", lang);
  applyLang(lang);
}

function applyLang(lang) {
  const t = I18N[lang];
  document.documentElement.setAttribute("lang", t.lang);
  document.documentElement.setAttribute("dir", t.dir);
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (t[key] !== undefined) el.textContent = t[key];
  });
  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  renderDirectionToggle();
  renderRates();

  const emptyEl = document.getElementById("chart-empty");
  if (!emptyEl.classList.contains("hidden")) emptyEl.textContent = t.history_empty;
  if (chartInstance) {
    chartInstance.data.datasets[0].label = t.rate_sell_label;
    chartInstance.data.datasets[1].label = t.rate_buy_label;
    chartInstance.update();
  }
}

function formatNumber(n, maxDigits = 2) {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: maxDigits, minimumFractionDigits: 0 });
}

function formatTimestamp(ts) {
  if (!ts) return "-";
  let date;
  if (typeof ts.toDate === "function") date = ts.toDate();
  else date = new Date(ts);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, { timeZone: "Africa/Tripoli" });
}

function getSelectedRate() {
  return currentRates.find((r) => r.code === selectedCurrency) || currentRates[0];
}

function renderCurrencyToggle() {
  const wrap = document.getElementById("currency-toggle");
  wrap.innerHTML = "";
  const codes = currentRates.map((r) => r.code);
  if (!codes.includes(selectedCurrency)) selectedCurrency = codes[0];
  codes.forEach((code) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `${currencySymbol(code)} ${code}`;
    btn.className = selectedCurrency === code ? "active" : "";
    btn.addEventListener("click", () => {
      selectedCurrency = code;
      renderRates();
      subscribeHistory();
    });
    wrap.appendChild(btn);
  });
}

function renderDirectionToggle() {
  const t = I18N[getLang()];
  const wrap = document.getElementById("direction-toggle");
  wrap.innerHTML = "";
  const options = [
    { key: "toLYD", label: t.dir_to_lyd },
    { key: "fromLYD", label: t.dir_from_lyd }
  ];
  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = opt.label;
    btn.className = direction === opt.key ? "active" : "";
    btn.addEventListener("click", () => {
      direction = opt.key;
      renderDirectionToggle();
      runCalculator();
    });
    wrap.appendChild(btn);
  });
}

function renderRates() {
  const t = I18N[getLang()];
  renderCurrencyToggle();
  const rate = getSelectedRate();

  document.getElementById("rate-currency-label").textContent = `${selectedCurrency} ${t.rate_to_lyd}`;
  document.getElementById("sell-rate-label").textContent = t.rate_sell_label;
  document.getElementById("buy-rate-label").textContent = t.rate_buy_label;
  document.getElementById("sell-rate-value").textContent = rate ? formatNumber(rate.sellRate) : "-";
  document.getElementById("buy-rate-value").textContent = rate ? formatNumber(rate.buyRate) : "-";
  document.getElementById("rate-updated-value").textContent = rate ? formatTimestamp(rate.updatedAt) : "-";

  runCalculator();
}

function runCalculator() {
  const t = I18N[getLang()];
  const rate = getSelectedRate();
  const input = document.getElementById("calc-amount-input");
  const amount = parseFloat(input.value) || 0;

  document.getElementById("calc-amount-currency").textContent =
    direction === "toLYD" ? currencySymbol(selectedCurrency) : "LYD";
  document.getElementById("calc-amount-label-text").textContent =
    direction === "toLYD" ? t.calc_amount_label_to : t.calc_amount_label_from;

  const forwardEl = document.getElementById("forward-results");
  const reverseEl = document.getElementById("reverse-results");

  if (direction === "toLYD") {
    forwardEl.classList.remove("hidden");
    reverseEl.classList.add("hidden");

    const sellRate = rate ? Number(rate.sellRate) : 0;
    const total = amount * sellRate;
    const feeLYD = total * 0.02;
    const feeCur = amount * 0.02;
    const netLYD = total * 0.98;

    document.getElementById("result-total").textContent = formatNumber(total) + " LYD";
    document.getElementById("result-fee").textContent = `${formatNumber(feeLYD)} LYD (${formatNumber(feeCur)} ${selectedCurrency})`;
    document.getElementById("result-recipient").textContent = formatNumber(netLYD) + " LYD";
  } else {
    forwardEl.classList.add("hidden");
    reverseEl.classList.remove("hidden");

    const buyRate = rate ? Number(rate.buyRate) : 0;
    const result = buyRate > 0 ? amount / buyRate : 0;
    document.getElementById("result-reverse").textContent = `${formatNumber(result)} ${selectedCurrency}`;
  }
}

function subscribeHistory() {
  if (!db) return renderChartEmpty();
  if (historyUnsub) {
    historyUnsub();
    historyUnsub = null;
  }
  const t = I18N[getLang()];
  document.getElementById("history-currency-label").textContent = selectedCurrency;

  historyUnsub = db
    .collection(window.RATES_COLLECTION)
    .doc(selectedCurrency)
    .collection("history")
    .orderBy("updatedAt", "asc")
    .limitToLast(50)
    .onSnapshot(
      (snapshot) => {
        const points = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          points.push({ x: formatTimestamp(data.updatedAt), sell: data.sellRate, buy: data.buyRate });
        });
        renderChart(points);
      },
      () => renderChartEmpty()
    );
}

function renderChartEmpty() {
  const t = I18N[getLang()];
  document.getElementById("chart-canvas-wrap").classList.add("hidden");
  const emptyEl = document.getElementById("chart-empty");
  emptyEl.textContent = t.history_empty;
  emptyEl.classList.remove("hidden");
}

function renderChart(points) {
  const t = I18N[getLang()];
  if (!window.Chart || points.length === 0) {
    renderChartEmpty();
    return;
  }
  document.getElementById("chart-canvas-wrap").classList.remove("hidden");
  document.getElementById("chart-empty").classList.add("hidden");

  const ctx = document.getElementById("history-chart").getContext("2d");
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: points.map((p) => p.x),
      datasets: [
        {
          label: t.rate_sell_label,
          data: points.map((p) => p.sell),
          borderColor: "#0b3d5c",
          backgroundColor: "rgba(11, 61, 92, 0.08)",
          tension: 0.25,
          fill: true,
          pointRadius: 3
        },
        {
          label: t.rate_buy_label,
          data: points.map((p) => p.buy),
          borderColor: "#14a76c",
          backgroundColor: "rgba(20, 167, 108, 0.08)",
          tension: 0.25,
          fill: true,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: {
        y: { beginAtZero: false }
      }
    }
  });
}

function loadFirebase() {
  if (!window.firebase || !window.FIREBASE_CONFIG) {
    subscribeHistory();
    return;
  }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
    db = firebase.firestore();
    db.collection(window.RATES_COLLECTION).onSnapshot(
      (snapshot) => {
        if (snapshot.empty) return;
        const rates = [];
        snapshot.forEach((doc) => rates.push(doc.data()));
        rates.sort((a, b) => (a.code === "USD" ? -1 : b.code === "USD" ? 1 : a.code.localeCompare(b.code)));
        currentRates = rates;
        renderRates();
        subscribeHistory();
      },
      (err) => {
        console.warn("Firestore read failed, using fallback rates.", err);
      }
    );
  } catch (err) {
    console.warn("Firebase init failed, using fallback rates.", err);
  }
}

function currentTheme() {
  const stored = localStorage.getItem("albarg_theme");
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function syncThemeButtons() {
  const active = currentTheme();
  document.querySelectorAll(".theme-toggle button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === active);
  });
}

function setTheme(theme) {
  localStorage.setItem("albarg_theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
  syncThemeButtons();
}

document.addEventListener("DOMContentLoaded", () => {
  applyLang(getLang());
  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
  document.querySelectorAll(".theme-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(btn.dataset.theme));
  });
  syncThemeButtons();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!localStorage.getItem("albarg_theme")) syncThemeButtons();
  });
  document.getElementById("calc-amount-input").addEventListener("input", runCalculator);
  document.getElementById("year").textContent = new Date().getFullYear();
  loadFirebase();
});
