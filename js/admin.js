let db = null;
let latestRates = [];

const ADMIN_I18N = {
  ar: {
    dir: "rtl",
    lang: "ar",
    admin_title: "ALBARG Express — إدارة الأسعار",
    current_title: "العملات الحالية",
    th_code: "الرمز",
    th_name: "الاسم",
    th_sell: "سعر البيع",
    th_buy: "سعر الشراء",
    th_updated: "آخر تحديث",
    th_actions: "إجراءات",
    add_title: "إضافة عملة",
    lbl_code: "الرمز",
    lbl_name: "الاسم",
    lbl_sell: "سعر البيع",
    lbl_buy: "سعر الشراء",
    btn_add: "إضافة عملة",
    btn_save: "حفظ",
    btn_delete: "حذف",
    admin_footer: "إدارة"
  },
  en: {
    dir: "ltr",
    lang: "en",
    admin_title: "ALBARG Express — Rate Admin",
    current_title: "Current Currencies",
    th_code: "Code",
    th_name: "Name",
    th_sell: "Sell Rate",
    th_buy: "Buy Rate",
    th_updated: "Last Updated",
    th_actions: "Actions",
    add_title: "Add Currency",
    lbl_code: "Code",
    lbl_name: "Name",
    lbl_sell: "Sell Rate",
    lbl_buy: "Buy Rate",
    btn_add: "Add Currency",
    btn_save: "Save",
    btn_delete: "Delete",
    admin_footer: "Admin"
  }
};

function getAdminLang() {
  return localStorage.getItem("albarg_lang") || "ar";
}

function setAdminLang(lang) {
  localStorage.setItem("albarg_lang", lang);
  applyAdminLang(lang);
}

function applyAdminLang(lang) {
  const t = ADMIN_I18N[lang];
  document.documentElement.setAttribute("lang", t.lang);
  document.documentElement.setAttribute("dir", t.dir);
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (t[key] !== undefined) el.textContent = t[key];
  });
  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  renderTable(latestRates);
}

function initFirebase() {
  if (!window.firebase || !window.FIREBASE_CONFIG) {
    showStatus("Firebase not configured. Fill in js/firebase-config.js first.", true);
    return false;
  }
  if (!firebase.apps.length) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
  }
  db = firebase.firestore();
  return true;
}

function showStatus(msg, isError) {
  const el = document.getElementById("status-msg");
  el.textContent = msg;
  el.className = "status-msg " + (isError ? "err" : "ok");
  setTimeout(() => {
    el.textContent = "";
    el.className = "status-msg";
  }, 4000);
}

function formatTimestamp(ts) {
  if (!ts) return "-";
  let date;
  if (typeof ts.toDate === "function") date = ts.toDate();
  else date = new Date(ts);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, { timeZone: "Africa/Tripoli" });
}

function renderTable(rates) {
  const t = ADMIN_I18N[getAdminLang()];
  const tbody = document.getElementById("admin-table-body");
  tbody.innerHTML = "";
  rates
    .slice()
    .sort((a, b) => (a.code === "USD" ? -1 : b.code === "USD" ? 1 : a.code.localeCompare(b.code)))
    .forEach((r) => {
      const tr = document.createElement("tr");
      const isUSD = r.code === "USD";
      tr.innerHTML = `
        <td>${r.code}</td>
        <td><input type="text" value="${r.name || ""}" data-field="name" data-id="${r.id}"></td>
        <td><input type="number" step="any" value="${r.sellRate}" data-field="sellRate" data-id="${r.id}"></td>
        <td><input type="number" step="any" value="${r.buyRate}" data-field="buyRate" data-id="${r.id}"></td>
        <td class="timestamp">${formatTimestamp(r.updatedAt)}</td>
        <td>
          <button class="btn btn-success btn-sm" data-action="save" data-id="${r.id}">${t.btn_save}</button>
          ${isUSD ? "" : `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${r.id}">${t.btn_delete}</button>`}
        </td>`;
      tbody.appendChild(tr);
    });

  tbody.querySelectorAll('[data-action="save"]').forEach((btn) => {
    btn.addEventListener("click", () => saveCurrency(btn.dataset.id));
  });
  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => deleteCurrency(btn.dataset.id));
  });
}

function saveCurrency(id) {
  const nameInput = document.querySelector(`[data-field="name"][data-id="${id}"]`);
  const sellInput = document.querySelector(`[data-field="sellRate"][data-id="${id}"]`);
  const buyInput = document.querySelector(`[data-field="buyRate"][data-id="${id}"]`);
  const name = nameInput.value.trim();
  const sellRate = parseFloat(sellInput.value);
  const buyRate = parseFloat(buyInput.value);
  if (!sellRate || sellRate <= 0 || !buyRate || buyRate <= 0) {
    showStatus("Sell and buy rates must be positive numbers.", true);
    return;
  }
  const now = firebase.firestore.FieldValue.serverTimestamp();
  db.collection(window.RATES_COLLECTION)
    .doc(id)
    .set({ code: id, name, sellRate, buyRate, updatedAt: now }, { merge: true })
    .then(() => {
      db.collection(window.RATES_COLLECTION).doc(id).collection("history").add({ sellRate, buyRate, updatedAt: now });
      showStatus(`${id} updated.`, false);
    })
    .catch((err) => showStatus("Save failed: " + err.message, true));
}

function deleteCurrency(id) {
  if (!confirm(`Delete ${id}? This cannot be undone.`)) return;
  db.collection(window.RATES_COLLECTION)
    .doc(id)
    .delete()
    .then(() => showStatus(`${id} deleted.`, false))
    .catch((err) => showStatus("Delete failed: " + err.message, true));
}

function addCurrency(e) {
  e.preventDefault();
  const code = document.getElementById("new-code").value.trim().toUpperCase();
  const name = document.getElementById("new-name").value.trim();
  const sellRate = parseFloat(document.getElementById("new-sell").value);
  const buyRate = parseFloat(document.getElementById("new-buy").value);

  if (!code || !/^[A-Z]{3,5}$/.test(code)) {
    showStatus("Enter a valid currency code (e.g. EUR).", true);
    return;
  }
  if (!sellRate || sellRate <= 0 || !buyRate || buyRate <= 0) {
    showStatus("Sell and buy rates must be positive numbers.", true);
    return;
  }

  const now = firebase.firestore.FieldValue.serverTimestamp();
  db.collection(window.RATES_COLLECTION)
    .doc(code)
    .set({ code, name: name || code, sellRate, buyRate, updatedAt: now })
    .then(() => {
      db.collection(window.RATES_COLLECTION).doc(code).collection("history").add({ sellRate, buyRate, updatedAt: now });
      showStatus(`${code} added.`, false);
      document.getElementById("add-form").reset();
    })
    .catch((err) => showStatus("Add failed: " + err.message, true));
}

function ensureSeedCurrencies() {
  const seeds = [
    { code: "USD", name: "US Dollar", sellRate: 10, buyRate: 9.8 },
    { code: "EUR", name: "Euro", sellRate: 11, buyRate: 10.8 }
  ];
  seeds.forEach((seed) => {
    const ref = db.collection(window.RATES_COLLECTION).doc(seed.code);
    ref.get().then((doc) => {
      if (!doc.exists) {
        const now = firebase.firestore.FieldValue.serverTimestamp();
        ref.set({ ...seed, updatedAt: now });
        ref.collection("history").add({ sellRate: seed.sellRate, buyRate: seed.buyRate, updatedAt: now });
      }
    });
  });
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
  document.getElementById("year").textContent = new Date().getFullYear();
  applyAdminLang(getAdminLang());
  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => setAdminLang(btn.dataset.lang));
  });
  document.querySelectorAll(".theme-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(btn.dataset.theme));
  });
  syncThemeButtons();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!localStorage.getItem("albarg_theme")) syncThemeButtons();
  });

  if (!initFirebase()) return;

  ensureSeedCurrencies();

  db.collection(window.RATES_COLLECTION).onSnapshot(
    (snapshot) => {
      const rates = [];
      snapshot.forEach((doc) => rates.push({ id: doc.id, ...doc.data() }));
      latestRates = rates;
      renderTable(rates);
    },
    (err) => showStatus("Load failed: " + err.message, true)
  );

  document.getElementById("add-form").addEventListener("submit", addCurrency);
});
