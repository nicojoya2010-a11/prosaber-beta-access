const CONFIG = {
  SPREADSHEET_ID: "1xg_dP4u5pa1rJM3EnBYEMtgu_Xi_QowI1160VszI3_g",
  SHEET_NAME: "Historial beta",
  BETA_URL: "https://play.google.com/apps/internaltest/4701357693854014512",
};

const HEADERS = [
  "Fecha",
  "Nombre y apellido",
  "Curso",
  "Correo a usar",
];

function doPost(e) {
  try {
    const payload = parsePayload(e);
    validatePayload(payload);

    const sheet = getSheet();
    sheet.appendRow([
      new Date(),
      payload.fullName,
      payload.course,
      payload.email,
    ]);

    return respond({
      ok: true,
      downloadUrl: CONFIG.BETA_URL,
    });
  } catch (error) {
    return respond({
      ok: false,
      error: error.message,
    });
  }
}

function doGet(e) {
  const action = e.parameter.action || "status";
  const callback = e.parameter.callback || "";

  if (action === "history") {
    const limit = Math.min(Number(e.parameter.limit || 8), 30);
    return respond(
      {
        ok: true,
        records: getPublicHistory(limit),
      },
      callback
    );
  }

  return respond(
    {
      ok: true,
      status: "ready",
    },
    callback
  );
}

function parsePayload(e) {
  const raw = e.postData && e.postData.contents ? e.postData.contents : "{}";

  try {
    return JSON.parse(raw);
  } catch (error) {
    return Object.fromEntries(
      raw.split("&").map(function (pair) {
        const parts = pair.split("=");
        return [
          decodeURIComponent(parts[0] || ""),
          decodeURIComponent((parts[1] || "").replace(/\+/g, " ")),
        ];
      })
    );
  }
}

function validatePayload(payload) {
  if (!payload.fullName || payload.fullName.trim().length < 3) {
    throw new Error("Nombre incompleto");
  }

  if (!payload.course || !payload.course.trim()) {
    throw new Error("Curso requerido");
  }

  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("Correo invalido");
  }
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
  }

  const existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsHeaders = existingHeaders.every(function (value) {
    return value === "";
  });

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getPublicHistory(limit) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  const startRow = Math.max(2, lastRow - limit + 1);
  const values = sheet.getRange(startRow, 1, lastRow - startRow + 1, 4).getValues();

  return values
    .reverse()
    .map(function (row) {
      return {
        createdAt: row[0] instanceof Date ? row[0].toISOString() : String(row[0] || ""),
        name: maskName(String(row[1] || "")),
        course: String(row[2] || ""),
        email: maskEmail(String(row[3] || "")),
      };
    });
}

function maskName(name) {
  return name
    .trim()
    .split(/\s+/)
    .map(function (part, index) {
      return index === 0 ? part : part.charAt(0) + ".";
    })
    .join(" ");
}

function maskEmail(email) {
  const parts = email.split("@");
  if (parts.length !== 2) {
    return "correo protegido";
  }

  return parts[0].slice(0, 2) + "...@" + parts[1];
}

function respond(payload, callback) {
  const json = JSON.stringify(payload);

  if (callback) {
    return ContentService.createTextOutput(callback + "(" + json + ");").setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }

  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
