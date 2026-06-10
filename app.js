const CONFIG = {
  // Pega aqui la URL /exec del despliegue de Google Apps Script.
  scriptEndpoint: "https://script.google.com/macros/s/AKfycbz-MM0pjswfivKFFakbDl7oUtHZDvhCtpvpip4Hmn3uq982DX8CirmMTEMp1goRLx92/exec",
  betaUrl: "https://play.google.com/store/apps/details?id=com.nicolasjoya.prosaber",
  groupUrl: "https://groups.google.com/g/prosaber-beta-testers",
  historyLimit: 8,
};

const betaForm = document.querySelector("#beta-form");
const formMessage = document.querySelector("#form-message");
const downloadCard = document.querySelector("#download-card");
const downloadLink = document.querySelector("#download-link");
const groupLink = document.querySelector("#group-link");
const historyList = document.querySelector("#history-list");
const historyCount = document.querySelector("#history-count");
const latestCourse = document.querySelector("#latest-course");
const driveStatus = document.querySelector("#drive-status");
const refreshHistory = document.querySelector("#refresh-history");

const localHistoryKey = "prosaber-beta-history";

downloadLink.href = CONFIG.betaUrl;
groupLink.href = CONFIG.groupUrl;
downloadLink.target = "_blank";
downloadLink.rel = "noopener";
downloadLink.removeAttribute("download");

function endpointReady() {
  return Boolean(CONFIG.scriptEndpoint && CONFIG.scriptEndpoint.startsWith("https://"));
}

function setMessage(text, type = "") {
  formMessage.textContent = text;
  formMessage.classList.toggle("is-error", type === "error");
  formMessage.classList.toggle("is-ok", type === "ok");
}

function setDriveStatus() {
  driveStatus.textContent = endpointReady() ? "Drive activo" : "Drive pendiente";
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function maskEmail(email) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  return `${user.slice(0, 2)}...@${domain}`;
}

function readLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem(localHistoryKey) || "[]");
  } catch {
    return [];
  }
}

function saveLocalRecord(record) {
  const current = readLocalHistory();
  const next = [
    {
      createdAt: new Date().toISOString(),
      name: record.fullName,
      course: record.course,
      email: record.email,
    },
    ...current,
  ].slice(0, CONFIG.historyLimit);

  localStorage.setItem(localHistoryKey, JSON.stringify(next));
}

function renderHistory(records) {
  const safeRecords = Array.isArray(records) ? records : [];
  historyCount.textContent = String(safeRecords.length);
  latestCourse.textContent = safeRecords[0]?.course || "-";

  if (!safeRecords.length) {
    historyList.innerHTML = '<li class="history-empty">Sin registros todavia.</li>';
    return;
  }

  historyList.innerHTML = safeRecords
    .map((record) => {
      const name = record.name || "Registro beta";
      const course = record.course || "Curso sin dato";
      const email = record.email ? maskEmail(record.email) : "Correo protegido";
      const date = record.createdAt ? new Date(record.createdAt) : new Date();
      const dateText = Number.isNaN(date.getTime())
        ? "Fecha reciente"
        : date.toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });

      return `
        <li class="history-item">
          <span class="history-avatar">${getInitials(name) || "B"}</span>
          <div>
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(course)} · ${escapeHtml(email)}</span>
            <span>${escapeHtml(dateText)}</span>
          </div>
        </li>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fetchHistoryWithJsonp() {
  if (!endpointReady()) {
    renderHistory(readLocalHistory());
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const callbackName = `prosaberHistory${Date.now()}`;
    const script = document.createElement("script");
    const url = new URL(CONFIG.scriptEndpoint);

    url.searchParams.set("action", "history");
    url.searchParams.set("limit", String(CONFIG.historyLimit));
    url.searchParams.set("callback", callbackName);

    window[callbackName] = (payload) => {
      renderHistory(payload?.records || []);
      cleanup();
      resolve();
    };

    script.onerror = () => {
      renderHistory(readLocalHistory());
      cleanup();
      resolve();
    };

    function cleanup() {
      delete window[callbackName];
      script.remove();
    }

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

async function submitToDrive(payload) {
  if (!endpointReady()) {
    return { mode: "local" };
  }

  await fetch(CONFIG.scriptEndpoint, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  return { mode: "drive" };
}

function buildPayload(formData) {
  return {
    fullName: String(formData.get("fullName") || "").trim(),
    course: String(formData.get("course") || "").trim(),
    email: String(formData.get("email") || "").trim().toLowerCase(),
  };
}

function validatePayload(payload) {
  if (payload.fullName.length < 3) {
    return "Escribe el nombre y apellido.";
  }

  if (!payload.course) {
    return "Escribe el curso.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return "Escribe un correo valido.";
  }

  return "";
}

betaForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = betaForm.querySelector("button[type='submit']");
  const payload = buildPayload(new FormData(betaForm));
  const error = validatePayload(payload);

  if (error) {
    setMessage(error, "error");
    return;
  }

  submitButton.disabled = true;
  setMessage("Registrando acceso...");

  try {
    const result = await submitToDrive(payload);
    saveLocalRecord(payload);
    downloadCard.hidden = false;

    if (result.mode === "drive") {
      setMessage("Registro enviado al historial de Drive.", "ok");
    } else {
      setMessage("Registro listo en modo prueba. Falta conectar la URL de Drive.", "ok");
    }

    betaForm.reset();
    await fetchHistoryWithJsonp();
  } catch (error) {
    setMessage("No se pudo enviar el registro. Revisa la URL de Drive.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

refreshHistory.addEventListener("click", () => {
  refreshHistory.disabled = true;
  fetchHistoryWithJsonp().finally(() => {
    refreshHistory.disabled = false;
  });
});

setDriveStatus();
fetchHistoryWithJsonp();
