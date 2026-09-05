let db = null;

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
  return date.toLocaleString();
}

function renderTable(rates) {
  const tbody = document.getElementById("admin-table-body");
  tbody.innerHTML = "";
  rates
    .sort((a, b) => (a.code === "USD" ? -1 : b.code === "USD" ? 1 : a.code.localeCompare(b.code)))
    .forEach((r) => {
      const tr = document.createElement("tr");
      const isUSD = r.code === "USD";
      tr.innerHTML = `
        <td>${r.code}</td>
        <td><input type="text" value="${r.name || ""}" data-field="name" data-id="${r.id}"></td>
        <td><input type="number" step="any" value="${r.rateToLYD}" data-field="rateToLYD" data-id="${r.id}"></td>
        <td class="timestamp">${formatTimestamp(r.updatedAt)}</td>
        <td>
          <button class="btn btn-success btn-sm" data-action="save" data-id="${r.id}">Save</button>
          ${isUSD ? "" : `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${r.id}">Delete</button>`}
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
  const rateInput = document.querySelector(`[data-field="rateToLYD"][data-id="${id}"]`);
  const name = nameInput.value.trim();
  const rate = parseFloat(rateInput.value);
  if (!rate || rate <= 0) {
    showStatus("Rate must be a positive number.", true);
    return;
  }
  db.collection(window.RATES_COLLECTION)
    .doc(id)
    .set({ code: id, name, rateToLYD: rate, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
    .then(() => showStatus(`${id} updated.`, false))
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
  const rate = parseFloat(document.getElementById("new-rate").value);

  if (!code || !/^[A-Z]{3,5}$/.test(code)) {
    showStatus("Enter a valid currency code (e.g. EUR).", true);
    return;
  }
  if (!rate || rate <= 0) {
    showStatus("Rate must be a positive number.", true);
    return;
  }

  db.collection(window.RATES_COLLECTION)
    .doc(code)
    .set({
      code,
      name: name || code,
      rateToLYD: rate,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      showStatus(`${code} added.`, false);
      document.getElementById("add-form").reset();
    })
    .catch((err) => showStatus("Add failed: " + err.message, true));
}

function ensureSeedUSD() {
  db.collection(window.RATES_COLLECTION)
    .doc("USD")
    .get()
    .then((doc) => {
      if (!doc.exists) {
        db.collection(window.RATES_COLLECTION).doc("USD").set({
          code: "USD",
          name: "US Dollar",
          rateToLYD: 10,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  if (!initFirebase()) return;

  ensureSeedUSD();

  db.collection(window.RATES_COLLECTION).onSnapshot(
    (snapshot) => {
      const rates = [];
      snapshot.forEach((doc) => rates.push({ id: doc.id, ...doc.data() }));
      renderTable(rates);
    },
    (err) => showStatus("Load failed: " + err.message, true)
  );

  document.getElementById("add-form").addEventListener("submit", addCurrency);
});
