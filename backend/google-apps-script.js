/**
 * Google Apps Script para Maternity Reborn.
 *
 * Configuración única:
 * 1. Abre Extensiones > Apps Script desde tu Google Sheet.
 * 2. Pega este archivo en Code.gs.
 * 3. En Configuración del proyecto > Propiedades del script crea:
 *    ADMIN_PASSWORD = una contraseña larga y privada.
 * 4. Implementa como aplicación web: ejecutar como tú y acceso para cualquiera.
 * 5. Conserva la misma URL /exec en assets/js/datos.js.
 *
 * La hoja debe llamarse "Ventas". Si no existe, se usa la primera hoja.
 * Encabezados recomendados:
 * Fecha | Folio | Cliente | Telefono | Diseno | Precio | Estado
 */

const SALES_SHEET_NAME = "Ventas";

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");

    if (payload.action === "authenticateAdmin") {
      return jsonResponse({ ok: isAdminPasswordValid(payload.password), action: "authenticateAdmin" });
    }

    if (payload.action === "changeAdminPassword") {
      return changeAdminPassword(payload);
    }

    if (payload.action === "readSales") {
      if (!isAdminPasswordValid(payload.password)) {
        return jsonResponse({ ok: false, error: "No autorizado" });
      }

      return jsonResponse({ ok: true, data: readSalesRows() });
    }

    if (payload.action === "updateSaleStatus") {
      return updateSaleStatus(payload);
    }

    return createReservation(payload);
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: "Maternity Reborn" });
}

function isAdminPasswordValid(password) {
  const configuredPassword = PropertiesService
    .getScriptProperties()
    .getProperty("ADMIN_PASSWORD");

  return Boolean(configuredPassword) && String(password || "") === configuredPassword;
}

function changeAdminPassword(payload) {
  if (!isAdminPasswordValid(payload.currentPassword)) {
    return jsonResponse({ ok: false, error: "La contraseña actual es incorrecta." });
  }

  const newPassword = String(payload.newPassword || "");
  if (newPassword.length < 8) {
    return jsonResponse({ ok: false, error: "La nueva contraseña debe tener al menos 8 caracteres." });
  }

  PropertiesService.getScriptProperties().setProperty("ADMIN_PASSWORD", newPassword);
  return jsonResponse({ ok: true, action: "changeAdminPassword" });
}

function createReservation(payload) {
  const sheet = getSalesSheet();
  const headers = ensureHeaders(sheet);
  const folio = createFolio(sheet, headers);
  const now = new Date();
  const row = headers.map(function (header) {
    switch (normalizeHeader(header)) {
      case "fecha": return now;
      case "folio": return folio;
      case "cliente": return payload.nombreCliente || "";
      case "telefono": return payload.telefonoCliente || "";
      case "diseno": return payload.diseno || "";
      case "precio": return payload.precio || "";
      case "estado": return "activo";
      default: return "";
    }
  });

  sheet.appendRow(row);
  return jsonResponse({ ok: true, folio: folio });
}

function readSalesRows() {
  const sheet = getSalesSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1)
    .filter(function (row) { return row.some(function (value) { return value !== ""; }); })
    .map(function (row, index) {
      return {
        rowNumber: index + 2,
        folio: getCell(row, headers, ["folio"]),
        cliente: getCell(row, headers, ["cliente", "nombrecliente", "nombredelcliente", "nombre", "name"]),
        diseno: getCell(row, headers, ["diseno", "diseño", "producto"]),
        precio: Number(getCell(row, headers, ["precio", "total"]) || 0),
        estado: normalizeStatus(getCell(row, headers, ["estado", "estatus", "status"])),
        fecha: formatDate(getCell(row, headers, ["fecha", "timestamp", "fechadeapartado"]))
      };
    })
    .sort(function (first, second) {
      return String(second.fecha).localeCompare(String(first.fecha));
    });
}

function updateSaleStatus(payload) {
  if (!isAdminPasswordValid(payload.password)) {
    return jsonResponse({ ok: false, error: "No autorizado" });
  }

  const estado = normalizeStatus(payload.estado);
  if (!payload.folio || ["activo", "vendido"].indexOf(estado) < 0) {
    return jsonResponse({ ok: false, error: "Datos de estado inválidos" });
  }

  const sheet = getSalesSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  const folioIndex = headers.findIndex(function (header) {
    return normalizeHeader(header) === "folio";
  });
  const statusIndex = headers.findIndex(function (header) {
    return ["estado", "estatus", "status"].indexOf(normalizeHeader(header)) >= 0;
  });
  const rowIndex = values.findIndex(function (row, index) {
    return index > 0 && String(row[folioIndex]) === String(payload.folio);
  });

  if (folioIndex < 0 || statusIndex < 0 || rowIndex < 1) {
    return jsonResponse({ ok: false, error: "Folio no encontrado" });
  }

  sheet.getRange(rowIndex + 1, statusIndex + 1).setValue(estado);
  return jsonResponse({ ok: true, action: "updateSaleStatus", folio: payload.folio, estado: estado });
}

function getSalesSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(SALES_SHEET_NAME) || spreadsheet.getSheets()[0];
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = ["Fecha", "Folio", "Cliente", "Telefono", "Diseno", "Precio", "Estado"];
    sheet.appendRow(headers);
    return headers;
  }

  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function createFolio(sheet, headers) {
  const folioIndex = headers.findIndex(function (header) {
    return normalizeHeader(header) === "folio";
  });
  const nextNumber = Math.max(sheet.getLastRow(), 1);
  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
  const prefix = "AP-" + date + "-";
  const previousFolios = folioIndex >= 0 && sheet.getLastRow() > 1
    ? sheet.getRange(2, folioIndex + 1, sheet.getLastRow() - 1, 1).getValues().flat()
    : [];
  const sequence = previousFolios.reduce(function (highest, value) {
    const match = String(value).match(/-(\d{4})$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, nextNumber - 1);

  return prefix + String(sequence + 1).padStart(4, "0");
}

function getCell(row, headers, aliases) {
  const index = headers.findIndex(function (header) {
    return aliases.indexOf(normalizeHeader(header)) >= 0;
  });
  return index >= 0 ? row[index] : "";
}

function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeStatus(value) {
  const status = normalizeHeader(value);
  if (["vendido", "pagado", "completado", "entregado"].indexOf(status) >= 0) return "vendido";
  return "activo";
}

function formatDate(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return value ? String(value) : "";
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
