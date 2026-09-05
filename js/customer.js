// Fallback data shown before Firestore loads or if it fails.
const FALLBACK_RATES = [
  { code: "USD", name: "US Dollar", rateToLYD: 10, updatedAt: null }
];

let currentRates = FALLBACK_RATES.slice();
let db = null;

const I18N = {
  ar: {
    dir: "rtl",
    lang: "ar",
    nav_home: "الرئيسية",
    hero_title: "شركتك الموثوقة للدفع الإلكتروني والخدمات الرقمية",
    hero_sub: "نقدم حلول الدفع الإلكتروني، خدمات البطاقات الرقمية، دفع الفواتير، وشحن الألعاب والتطبيقات.",
    hero_service: "خدمتنا الحالية: تحويل الأموال من Binance إلى ليبيا بدينار ليبي، بشفافية كاملة في الرسوم.",
    rate_title: "سعر الصرف اليوم",
    rate_sub: "الأسعار محدّثة مباشرة من قبل الإدارة، وتُعرض هنا فور تعديلها.",
    rate_label: "دولار أمريكي إلى دينار ليبي",
    rate_per_usd: "لكل 1 دولار",
    other_currencies: "عملات أخرى",
    th_code: "الرمز",
    th_name: "العملة",
    th_rate: "السعر مقابل الدينار الليبي",
    calc_title: "احسب تحويلك",
    calc_sub: "أدخل المبلغ بالدولار وشاهد النتيجة فوراً، بما في ذلك رسومنا الشفافة بنسبة 2%.",
    calc_input_label: "المبلغ المرسل (دولار أمريكي)",
    r_total: "الإجمالي بالدينار الليبي",
    r_fee: "رسوم الخدمة (2%)",
    r_recipient: "المبلغ الذي يستلمه المستفيد في ليبيا (98%)",
    how_title: "كيف تعمل الخدمة",
    how_sub: "ثلاث خطوات بسيطة وشفافة لإتمام تحويلك.",
    step1_title: "أرسل الدولار عبر Binance",
    step1_body: "أرسل المبلغ المطلوب بالدولار إلى حساب Binance الخاص بنا.",
    step2_title: "أخبرنا بمن سيستلم المبلغ",
    step2_body: "زوّدنا باسم وبيانات المستلم في ليبيا.",
    step3_title: "نحوّل ونسلّم فوراً",
    step3_body: "نحوّل المبلغ حسب سعر اليوم ونسلّم 98% للمستفيد، مع احتفاظنا بـ 2% رسوم شفافة.",
    contact_title: "تواصل معنا للبدء",
    contact_sub: "تواصل معنا عبر أي من القنوات التالية لبدء عملية التحويل.",
    contact_whatsapp: "واتساب",
    contact_telegram: "تيليجرام",
    contact_email: "البريد الإلكتروني",
    placeholder_value: "سيتم إضافته لاحقاً",
    about_title: "من نحن",
    about_body: "نحن شركة متخصصة في حلول الدفع الإلكتروني والخدمات الرقمية، نعمل على تقديم خدمات الدفع الإلكتروني، البطاقات الرقمية، دفع الفواتير، وشحن الألعاب والتطبيقات. المزيد من الخدمات قادمة قريباً.",
    footer_text: "جميع الحقوق محفوظة",
    last_updated: "آخر تحديث"
  },
  en: {
    dir: "ltr",
    lang: "en",
    nav_home: "Home",
    hero_title: "Your Trusted Partner for Digital Payments",
    hero_sub: "We provide electronic payment solutions, digital card services, bill payments, and game/app top-ups.",
    hero_service: "Our current service: transferring money from Binance to Libya in Libyan Dinar, with full fee transparency.",
    rate_title: "Today's Exchange Rate",
    rate_sub: "Rates are updated live by our team and shown here the moment they change.",
    rate_label: "US Dollar to Libyan Dinar",
    rate_per_usd: "per 1 USD",
    other_currencies: "Other Currencies",
    th_code: "Code",
    th_name: "Currency",
    th_rate: "Rate to LYD",
    calc_title: "Calculate Your Transfer",
    calc_sub: "Enter a USD amount and see the result instantly, including our transparent 2% fee.",
    calc_input_label: "Amount to send (USD)",
    r_total: "Total in LYD",
    r_fee: "Service fee (2%)",
    r_recipient: "Recipient receives in Libya (98%)",
    how_title: "How It Works",
    how_sub: "Three simple, transparent steps to complete your transfer.",
    step1_title: "Send USD via Binance",
    step1_body: "Send the desired USD amount to our Binance account.",
    step2_title: "Tell us the recipient",
    step2_body: "Give us the recipient's name and details in Libya.",
    step3_title: "We convert and deliver",
    step3_body: "We convert at today's rate and deliver 98% to the recipient, keeping a transparent 2% fee.",
    contact_title: "Contact Us to Start",
    contact_sub: "Reach out through any of the channels below to begin your transfer.",
    contact_whatsapp: "WhatsApp",
    contact_telegram: "Telegram",
    contact_email: "Email",
    placeholder_value: "To be added",
    about_title: "About Us",
    about_body: "We are a company specialized in digital payment solutions and electronic services, offering electronic payments, digital card services, bill payments, and game/app top-ups. More services are coming soon.",
    footer_text: "All rights reserved",
    last_updated: "Last updated"
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
  renderRates();
}

function formatNumber(n, maxDigits = 2) {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: maxDigits, minimumFractionDigits: 0 });
}

function renderRates() {
  const lang = getLang();
  const t = I18N[lang];
  const usd = currentRates.find((r) => r.code === "USD");
  const mainValueEl = document.getElementById("main-rate-value");
  if (usd) {
    mainValueEl.innerHTML = `${formatNumber(usd.rateToLYD)} <small>${t.rate_per_usd}</small>`;
  }

  const tbody = document.getElementById("rates-table-body");
  tbody.innerHTML = "";
  const others = currentRates.filter((r) => r.code !== "USD");
  if (others.length === 0) {
    document.getElementById("other-rates-wrap").classList.add("hidden");
  } else {
    document.getElementById("other-rates-wrap").classList.remove("hidden");
    others.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.code}</td><td>${r.name || ""}</td><td class="rate-value">${formatNumber(r.rateToLYD)}</td>`;
      tbody.appendChild(tr);
    });
  }

  runCalculator();
}

function runCalculator() {
  const usd = currentRates.find((r) => r.code === "USD");
  const rate = usd ? Number(usd.rateToLYD) : 0;
  const input = document.getElementById("calc-usd-input");
  const amount = parseFloat(input.value) || 0;

  const total = amount * rate;
  const feeLYD = total * 0.02;
  const feeUSD = amount * 0.02;
  const recipientLYD = total * 0.98;

  document.getElementById("result-total").textContent = formatNumber(total) + " LYD";
  document.getElementById("result-fee").textContent = `${formatNumber(feeLYD)} LYD (${formatNumber(feeUSD)} USD)`;
  document.getElementById("result-recipient").textContent = formatNumber(recipientLYD) + " LYD";
}

function loadFirebase() {
  if (!window.firebase || !window.FIREBASE_CONFIG) return;
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
      },
      (err) => {
        console.warn("Firestore read failed, using fallback rates.", err);
      }
    );
  } catch (err) {
    console.warn("Firebase init failed, using fallback rates.", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyLang(getLang());
  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
  document.getElementById("calc-usd-input").addEventListener("input", runCalculator);
  document.getElementById("year").textContent = new Date().getFullYear();
  loadFirebase();
});
