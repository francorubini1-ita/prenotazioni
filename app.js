/* =====================================================
   URL DELLA WEB APP
===================================================== */
const API = "https://script.google.com/macros/s/AKfycbx7T_tfUmqL_xSlP-MCXjo9gW9XftTaowynlr2ZDZHnLteo_uKMi-fLPrURo3OfNrEb/exec";
/* =====================================================
   RIFERIMENTI AGLI ELEMENTI DEL DOM
===================================================== */
const checkBtn = document.getElementById("check");
const sendBtn = document.getElementById("send");
const statusBox = document.getElementById("status");
const icon = document.getElementById("icon");
const msg = document.getElementById("msg");
const detailsPanel = document.getElementById("detailsPanel");
const conflictList = document.getElementById("conflictList");
const suggestionsDiv = document.getElementById("suggestions");
const suggestList = document.getElementById("suggestList");
const confirmModal = document.getElementById("confirmModal");
const confirmText = document.getElementById("confirmText");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

/* =====================================================
   CONTROLLO DISPONIBILITÀ
===================================================== */
checkBtn.onclick = async () => {
  document.activeElement.blur();

  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  if (!date || !start || !end) {
    alert("Compila la data e gli orari");
    return;
  }

  statusBox.style.display = "flex";
  icon.textContent = "⏳";
  msg.textContent = "Controllo...";

  detailsPanel.style.display = "none";
  suggestionsDiv.style.display = "none";
  conflictList.innerHTML = "";
  suggestList.innerHTML = "";

  try {
    const res = await fetch(`${API}?action=check&date=${date}&start=${start}&end=${end}`);
    const data = await res.json();
    handleCheck(data);
  } catch (e) {
    icon.textContent = "⚠️";
    msg.textContent = "Errore server";
  }
};

/* =====================================================
   GESTIONE RISPOSTA CONTROLLO
===================================================== */
function handleCheck(res) {

  if (!res || res.error) {
    icon.textContent = "⚠️";
    msg.textContent = res?.error || "Errore";
    sendBtn.disabled = true;
    return;
  }

  if (res.ok) {
    icon.textContent = "✅";
    msg.textContent = "Orario disponibile";
    sendBtn.disabled = false;
    return;
  }

  icon.textContent = "❌";
  msg.textContent = "Sovrapposizione";
  sendBtn.disabled = true;

  detailsPanel.style.display = "block";
  conflictList.innerHTML = "";

  (res.with || []).forEach(c => {
    const li = document.createElement("li");
    li.textContent = `${c.name} — ${c.start}–${c.end}`;
    conflictList.appendChild(li);
  });

  suggestionsDiv.style.display = "block";
  suggestList.innerHTML = "";

  (res.suggestions || []).forEach(s => {
    const btn = document.createElement("button");
    btn.className = "suggest-btn";
    btn.textContent = `${s.start}–${s.end}`;

    btn.onclick = () => {
      document.getElementById("start").value = s.start;
      document.getElementById("end").value = s.end;
      suggestionsDiv.style.display = "none";
      checkBtn.click();
    };

    suggestList.appendChild(btn);
  });
}

/* =====================================================
   INVIO PRENOTAZIONE (APERTURA MODALE)
===================================================== */
sendBtn.onclick = () => {

  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const name = document.getElementById("name").value;
  const postazione = document.getElementById("postazione").value;

  confirmText.textContent =
    `${date.split("-").reverse().join("/")} ${start}–${end} — ${name} (Postazione ${postazione})`;

  confirmModal.style.display = "flex";
};

/* =====================================================
   CHIUSURA MODALE
===================================================== */
confirmNo.onclick = () => {
  confirmModal.style.display = "none";
};

/* =====================================================
   CONFERMA INVIO PRENOTAZIONE
===================================================== */
confirmYes.onclick = async () => {
  confirmYes.disabled = true;
  confirmYes.style.opacity = "0.5";
  confirmModal.style.display = "none";

  const data = {
    action: "submit",
    date: document.getElementById("date").value,
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    name: document.getElementById("name").value,
    postazione: document.getElementById("postazione").value
  };

  try {
    const res = await fetch(API, {
      method: "POST",
      body: JSON.stringify(data)
    });

    const r = await res.json();

    if (r.success) {
      if (navigator.vibrate) navigator.vibrate(30);

      const overlay = document.getElementById("loadingOverlay");
      overlay.style.display = "flex";
      overlay.style.pointerEvents = "auto";
      setTimeout(() => overlay.classList.add("show"), 20);

      setTimeout(() => {
        overlay.classList.remove("show");
        overlay.style.display = "none";
        overlay.style.pointerEvents = "none";
        window.location.reload();
      }, 1200);

    } else {
      alert("Errore: " + r.error);
      confirmYes.disabled = false;
      confirmYes.style.opacity = "1";
    }

  } catch (e) {
    alert("Errore di rete");
    confirmYes.disabled = false;
    confirmYes.style.opacity = "1";
  }
};

/* =====================================================
   EFFETTO RIPPLE + VIBRAZIONE
===================================================== */
document.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", function(e) {

    if (navigator.vibrate) navigator.vibrate(15);

    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    btn.style.setProperty("--ripple-x", `${x}px`);
    btn.style.setProperty("--ripple-y", `${y}px`);

    btn.classList.remove("ripple-active");

    setTimeout(() => btn.classList.add("ripple-active"), 10);
    setTimeout(() => btn.classList.remove("ripple-active"), 500);
  });
});

/* =====================================================
   SERVICE WORKER (PWA)
===================================================== */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("?sw");
}

/* =====================================================
   SCROLL AUTOMATICO AL RIEPILOGO DOPO RELOAD
===================================================== */
window.addEventListener("load", () => {
  if (window.location.hash === "#riepilogo") {
    const section = document.getElementById("riepilogo");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  }
});

/* =====================================================
   RIEPILOGO — CARICAMENTO
===================================================== */
async function caricaRiepilogo() {
  try {
    const res = await fetch(API + "?action=list");

    if (!res.ok) {
      const text = await res.text();
      console.error("Errore HTTP:", res.status, text);
      document.getElementById("riepilogo").innerHTML =
        "<div style='font-size:4vw;color:#666;'>Errore nel caricamento</div>";
      return;
    }

    const bookings = await res.json();
    renderRiepilogo(bookings);

  } catch (err) {
    console.error("Errore fetch:", err);
    document.getElementById("riepilogo").innerHTML =
      "<div style='font-size:4vw;color:#666;'>Errore di connessione</div>";
  }
}

/* =====================================================
   RIEPILOGO — RENDER
===================================================== */
function renderRiepilogo(bookings) {
  const grouped = {};

  bookings.forEach(b => {
    if (!grouped[b.date]) grouped[b.date] = [];
    grouped[b.date].push(b);
  });

  const dates = Object.keys(grouped).sort();
  let html = "";

  dates.forEach(date => {
    html += `<h3>${formattaData(date)}</h3>`;

    grouped[date].sort((a, b) => a.start.localeCompare(b.start));

    grouped[date].forEach(b => {
      html += `
        <div class="booking">
          <strong>Post. ${b.postazione}</strong> - ${b.name}<br>
          dalle ${b.start} alle ${b.end}
        </div>
      `;
    });
  });

  document.getElementById("riepilogo").innerHTML = html;
}

/* =====================================================
   FORMATTA DATA
===================================================== */
function formattaData(d) {
  const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const [y, m, day] = d.split("-");
  return `${parseInt(day)} ${mesi[parseInt(m)-1]} ${y}`;
}

/* =====================================================
   CARICAMENTO AUTOMATICO RIEPILOGO
===================================================== */
window.addEventListener("load", caricaRiepilogo);
