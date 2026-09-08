/**
 * Google Apps Script para Maternity Reborn.
 *
 * Configuración única:
 * 1. Abre Extensiones > Apps Script desde tu Google Sheet.
 * 2. Pega este archivo en Code.gs.
 * 3. En Configuración del proyecto > Propiedades del script crea:
 *    ADMIN_PASSWORD = una contraseña larga y privada.
 *    La primera autenticación la migra automáticamente a hash + sal.
 * 4. Implementa como aplicación web: ejecutar como tú y acceso para cualquiera.
 * 5. Conserva la misma URL /exec en assets/js/datos.js.
 *
 * La hoja debe llamarse "Ventas". Si no existe, se usa la primera hoja.
 * Encabezados recomendados:
 * Fecha | Folio | Cliente | Telefono | Diseno | Precio | Estado
 */

const SALES_SHEET_NAME = "Ventas";
const CATALOG_SHEET_NAME = "Catalogo";
const ADMIN_SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const ADMIN_LOCKOUT_MS = 15 * 60 * 1000;
const ADMIN_MAX_FAILED_ATTEMPTS = 5;
const ADMIN_SESSIONS_PROPERTY = "ADMIN_SESSIONS";
const ADMIN_LOGIN_STATE_PROPERTY = "ADMIN_LOGIN_STATE";

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");

    if (payload.action === "authenticateAdmin") {
      return authenticateAdmin(payload.password);
    }

    if (payload.action === "changeAdminPassword") {
      return changeAdminPassword(payload);
    }

    if (payload.action === "readSales") {
      if (!isAdminSessionValid(payload.sessionToken)) {
        return jsonResponse({ ok: false, error: "No autorizado" });
      }

      return jsonResponse({ ok: true, data: readSalesRows() });
    }

    if (payload.action === "readCatalog") {
      return jsonResponse({ ok: true, action: "readCatalog", data: readCatalogRows() });
    }

    if (payload.action === "saveCatalog") {
      return saveCatalog(payload);
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
  const properties = PropertiesService.getScriptProperties();
  const configuredHash = properties.getProperty("ADMIN_PASSWORD_HASH");
  const configuredSalt = properties.getProperty("ADMIN_PASSWORD_SALT");
  const legacyPassword = properties.getProperty("ADMIN_PASSWORD");

  if (configuredHash && configuredSalt) {
    return hashesMatch(hashPassword(password, configuredSalt), configuredHash);
  }

  return Boolean(legacyPassword) && String(password || "") === legacyPassword;
}

function changeAdminPassword(payload) {
  if (!isAdminSessionValid(payload.sessionToken)) {
    return jsonResponse({ ok: false, error: "La sesión expiró. Inicia sesión nuevamente." });
  }

  const newPassword = String(payload.newPassword || "");
  if (newPassword.length < 8) {
    return jsonResponse({ ok: false, error: "La nueva contraseña debe tener al menos 8 caracteres." });
  }

  const properties = PropertiesService.getScriptProperties();
  const salt = createPasswordSalt();
  properties.setProperties({
    ADMIN_PASSWORD_HASH: hashPassword(newPassword, salt),
    ADMIN_PASSWORD_SALT: salt
  });
  properties.deleteProperty("ADMIN_PASSWORD");
  return jsonResponse({ ok: true, action: "changeAdminPassword" });
}

function authenticateAdmin(password) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    const properties = PropertiesService.getScriptProperties();
    const loginState = getLoginState(properties);
    const now = Date.now();

    if (loginState.lockedUntil > now) {
      return jsonResponse({
        ok: false,
        action: "authenticateAdmin",
        error: "Demasiados intentos. Intenta nuevamente más tarde.",
        retryAfterSeconds: Math.ceil((loginState.lockedUntil - now) / 1000)
      });
    }

    if (!isAdminPasswordValid(password)) {
      loginState.failedAttempts += 1;
      if (loginState.failedAttempts >= ADMIN_MAX_FAILED_ATTEMPTS) {
        loginState.lockedUntil = now + ADMIN_LOCKOUT_MS;
        loginState.failedAttempts = 0;
      }
      properties.setProperty(ADMIN_LOGIN_STATE_PROPERTY, JSON.stringify(loginState));
      return jsonResponse({
        ok: false,
        action: "authenticateAdmin",
        error: loginState.lockedUntil > now
          ? "Demasiados intentos. Intenta nuevamente más tarde."
          : "La contraseña es incorrecta.",
        retryAfterSeconds: loginState.lockedUntil > now ? Math.ceil((loginState.lockedUntil - now) / 1000) : 0
      });
    }

    migrateLegacyPassword(properties, password);
    loginState.failedAttempts = 0;
    loginState.lockedUntil = 0;
    properties.setProperty(ADMIN_LOGIN_STATE_PROPERTY, JSON.stringify(loginState));
    return jsonResponse({
      ok: true,
      action: "authenticateAdmin",
      sessionToken: createAdminSession(properties, now)
    });
  } finally {
    lock.releaseLock();
  }
}

function migrateLegacyPassword(properties, password) {
  if (properties.getProperty("ADMIN_PASSWORD_HASH")) return;

  const legacyPassword = properties.getProperty("ADMIN_PASSWORD");
  if (!legacyPassword || String(password || "") !== legacyPassword) return;

  const salt = createPasswordSalt();
  properties.setProperties({
    ADMIN_PASSWORD_HASH: hashPassword(password, salt),
    ADMIN_PASSWORD_SALT: salt
  });
  properties.deleteProperty("ADMIN_PASSWORD");
}

function hashPassword(password, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt || "") + String(password || ""),
    Utilities.Charset.UTF_8
  );

  return bytes.map(function (byte) {
    return (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0");
  }).join("");
}

function hashesMatch(firstHash, secondHash) {
  return String(firstHash || "") === String(secondHash || "");
}

function createPasswordSalt() {
  return Utilities.getUuid() + Utilities.getUuid();
}

function getLoginState(properties) {
  try {
    const state = JSON.parse(properties.getProperty(ADMIN_LOGIN_STATE_PROPERTY) || "{}");
    return {
      failedAttempts: Number(state.failedAttempts) || 0,
      lockedUntil: Number(state.lockedUntil) || 0
    };
  } catch (error) {
    return { failedAttempts: 0, lockedUntil: 0 };
  }
}

function getAdminSessions(properties) {
  try {
    return JSON.parse(properties.getProperty(ADMIN_SESSIONS_PROPERTY) || "{}");
  } catch (error) {
    return {};
  }
}

function createAdminSession(properties, now) {
  const sessions = getAdminSessions(properties);
  Object.keys(sessions).forEach(function (token) {
    if (Number(sessions[token]) <= now) delete sessions[token];
  });

  const token = Utilities.getUuid() + Utilities.getUuid();
  sessions[token] = now + ADMIN_SESSION_TTL_MS;
  properties.setProperty(ADMIN_SESSIONS_PROPERTY, JSON.stringify(sessions));
  return token;
}

function isAdminSessionValid(token) {
  if (!token) return false;

  const properties = PropertiesService.getScriptProperties();
  const sessions = getAdminSessions(properties);
  const expiresAt = Number(sessions[String(token)] || 0);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    delete sessions[String(token)];
    properties.setProperty(ADMIN_SESSIONS_PROPERTY, JSON.stringify(sessions));
    return false;
  }
  return true;
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
  if (!isAdminSessionValid(payload.sessionToken)) {
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

function saveCatalog(payload) {
  if (!isAdminSessionValid(payload.sessionToken)) {
    return jsonResponse({ ok: false, error: "No autorizado" });
  }

  if (!Array.isArray(payload.data)) {
    return jsonResponse({ ok: false, error: "El catálogo no tiene un formato válido." });
  }

  const sheet = getCatalogSheet();
  const headers = ensureCatalogHeaders(sheet);
  const rows = payload.data.map(function (product) {
    return headers.map(function (header) {
      switch (normalizeHeader(header)) {
        case "id": return product.id || "";
        case "nombre": return product.nombre || "";
        case "categoria": return product.categorias && product.categorias[0] || product.categoria || "";
        case "descripcion": return product.descripcion || "";
        case "precio": return Number(product.precio || 0);
        case "imagen": return product.imagen || "";
        case "fotos": return JSON.stringify(product.fotos || []);
        case "disponible": return product.disponible !== false;
        case "talla": return product.talla || "";
        case "material": return product.material || "";
        case "esnuevo": return product.esNuevo === true;
        default: return "";
      }
    });
  });

  if (sheet.getMaxRows() > 1) {
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, headers.length).clearContent();
  }
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  return jsonResponse({ ok: true, action: "saveCatalog", count: rows.length });
}

function readCatalogRows() {
  const sheet = getCatalogSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1)
    .filter(function (row) { return row.some(function (value) { return value !== ""; }); })
    .map(function (row) {
      let fotos = [];
      try {
        fotos = JSON.parse(getCell(row, headers, ["fotos"]) || "[]");
      } catch (error) {
        fotos = [];
      }

      const imagen = getCell(row, headers, ["imagen"]);
      return {
        id: Number(getCell(row, headers, ["id"]) || 0),
        nombre: getCell(row, headers, ["nombre"]),
        categoria: getCell(row, headers, ["categoria"]),
        descripcion: getCell(row, headers, ["descripcion"]),
        precio: Number(getCell(row, headers, ["precio"]) || 0),
        imagen: imagen,
        fotos: fotos.length ? fotos : [imagen],
        disponible: String(getCell(row, headers, ["disponible"])).toLowerCase() !== "false",
        talla: getCell(row, headers, ["talla"]),
        material: getCell(row, headers, ["material"]),
        esNuevo: String(getCell(row, headers, ["esnuevo"])).toLowerCase() === "true"
      };
    });
}

function getSalesSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(SALES_SHEET_NAME) || spreadsheet.getSheets()[0];
}

function getCatalogSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(CATALOG_SHEET_NAME) || spreadsheet.insertSheet(CATALOG_SHEET_NAME);
}

function ensureCatalogHeaders(sheet) {
  const headers = ["ID", "Nombre", "Categoria", "Descripcion", "Precio", "Imagen", "Fotos", "Disponible", "Talla", "Material", "EsNuevo"];
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return headers;
  }

  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
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
