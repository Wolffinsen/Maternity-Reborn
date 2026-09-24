/**
 * Google Apps Script para Maternity Reborn.
 *
 * Configuración única:
 * 1. Abre Extensiones > Apps Script desde tu Google Sheet.
 * 2. Pega este archivo en Code.gs.
 * 3. En Configuración del proyecto > Propiedades del script crea:
 *    ADMIN_PASSWORD = una contraseña larga y privada.
 *    La primera autenticación la migra automáticamente a hash + sal.
 *    SITE_URL = la dirección pública de tu página, sin diagonal final
 *    (ej. https://www.tudominio.com). Solo se usa para que Google Sheets
 *    pueda mostrar las fotos cuando en el catálogo están guardadas como
 *    rutas relativas (ej. assets/img/producto.jpg).
 * 4. Implementa como aplicación web: ejecutar como tú y acceso para cualquiera.
 * 5. Conserva la misma URL /exec en assets/js/datos.js.
 *
 * La hoja debe llamarse "Ventas". Si no existe, se usa la primera hoja.
 * Encabezados recomendados:
 * Fecha | Folio | Cliente | Telefono | Diseno | Codigo | Precio | Estado | Es referencia | Codigo referencia | Vendedor referencia | Imagen
 *
 * Para llenar las fotos de las ventas que ya existían, ejecuta una sola vez
 * la función rellenarFotosVentas desde el editor de Apps Script.
 */

const SALES_SHEET_NAME = "Ventas";
const CATALOG_SHEET_NAME = "Catalogo";
const ADMIN_SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const ADMIN_LOCKOUT_MS = 15 * 60 * 1000;
const ADMIN_MAX_FAILED_ATTEMPTS = 5;
const ADMIN_SESSIONS_PROPERTY = "ADMIN_SESSIONS";
const ADMIN_LOGIN_STATE_PROPERTY = "ADMIN_LOGIN_STATE";
const REFERRAL_REGISTRY_PROPERTY = "REFERRAL_REGISTRY";
const CATEGORY_ORDER_PROPERTY = "CATEGORY_ORDER";
const SALES_IMAGE_ROW_HEIGHT = 90;
const SALES_IMAGE_COLUMN_WIDTH = 90;

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");

    if (payload.action === "authenticateAdmin") {
      return authenticateAdmin(payload.password);
    }

    if (payload.action === "changeAdminPassword") {
      return changeAdminPassword(payload);
    }

    if (payload.action === "readCategoryOrder") {
      return jsonResponse({ ok: true, action: "readCategoryOrder", data: readCategoryOrder() });
    }

    if (payload.action === "saveCategoryOrder") {
      return saveCategoryOrder(payload);
    }

    if (payload.action === "readSales") {
      if (!isAdminSessionValid(payload.sessionToken)) {
        return jsonResponse({ ok: false, error: "No autorizado" });
      }

      return jsonResponse({ ok: true, data: readSalesRows() });
    }

    if (payload.action === "readReferralCodes") {
      return jsonResponse({ ok: true, action: "readReferralCodes", data: readReferralCodes() });
    }

    if (payload.action === "saveReferralCodes") {
      return saveReferralCodes(payload);
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

    if (payload.action === "createReservation") {
      return createReservation(payload);
    }

    return jsonResponse({ ok: false, error: "Acción no válida." });
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

function readReferralCodes() {
  const raw = PropertiesService.getScriptProperties().getProperty(REFERRAL_REGISTRY_PROPERTY);
  try {
    const registry = JSON.parse(raw || "{}");
    return registry && typeof registry === "object" && !Array.isArray(registry) ? registry : {};
  } catch (error) {
    return {};
  }
}

function saveReferralCodes(payload) {
  if (!isAdminSessionValid(payload.sessionToken)) {
    return jsonResponse({ ok: false, error: "No autorizado" });
  }

  const registry = payload.registry;
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    return jsonResponse({ ok: false, error: "El registro de referencias no es válido." });
  }

  PropertiesService.getScriptProperties().setProperty(REFERRAL_REGISTRY_PROPERTY, JSON.stringify(registry));
  return jsonResponse({ ok: true, action: "saveReferralCodes" });
}

function readCategoryOrder() {
  const raw = PropertiesService.getScriptProperties().getProperty(CATEGORY_ORDER_PROPERTY);
  try {
    const order = JSON.parse(raw || "[]");
    return Array.isArray(order) ? order : [];
  } catch (error) {
    return [];
  }
}

function saveCategoryOrder(payload) {
  if (!isAdminSessionValid(payload.sessionToken)) {
    return jsonResponse({ ok: false, error: "No autorizado" });
  }
  if (!Array.isArray(payload.order)) {
    return jsonResponse({ ok: false, error: "El orden de categorías no es válido." });
  }
  PropertiesService.getScriptProperties().setProperty(CATEGORY_ORDER_PROPERTY, JSON.stringify(payload.order));
  return jsonResponse({ ok: true, action: "saveCategoryOrder" });
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
  const nombreCliente = String(payload.nombreCliente || "").trim();
  const telefonoCliente = String(payload.telefonoCliente || "").trim();
  const diseno = String(payload.diseno || "").trim();
  const codigo = String(payload.codigo || "").trim();
  const precio = Number(payload.precio);
  if (!nombreCliente || !telefonoCliente || !diseno || !Number.isFinite(precio) || precio <= 0) {
    return jsonResponse({ ok: false, error: "Los datos de la reserva están incompletos." });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSalesSheet();
    const headers = ensureHeaders(sheet);
    const folio = createFolio(sheet, headers);
    const referralCode = String(payload.referralCode || "").trim().toUpperCase();
    const referralRegistry = readReferralCodes();
    const referralSeller = referralCode && referralRegistry[referralCode]
      ? String(referralRegistry[referralCode].name || "").trim()
      : "";
    const imagenUrl = toAbsoluteImageUrl(resolveProductImage(payload.imagen, codigo, diseno));
    const now = new Date();
    const row = headers.map(function (header) {
      switch (normalizeHeader(header)) {
        case "fecha": return now;
        case "folio": return folio;
        case "cliente": return nombreCliente;
        case "telefono": return telefonoCliente;
        case "diseno": return diseno;
        case "codigo": return codigo;
        case "precio": return precio;
        case "estado": return "activo";
        case "esreferencia": return referralSeller ? "Sí" : "No";
        case "codigoreferencia": return referralSeller ? referralCode : "";
        case "vendedorreferencia": return referralSeller;
        default: return "";
      }
    });

    sheet.appendRow(row);
    if (imagenUrl) {
      writeSaleImage(sheet, headers, sheet.getLastRow(), imagenUrl);
    }

    return jsonResponse({
      ok: true,
      folio: folio,
      referralCode: referralSeller ? referralCode : "",
      referralSeller: referralSeller
    });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Imágenes de producto ---------- */

function getSiteUrl() {
  return String(PropertiesService.getScriptProperties().getProperty("SITE_URL") || "")
    .trim()
    .replace(/\/+$/, "");
}

// Google Sheets solo puede mostrar imágenes con una URL pública completa.
// Devuelve "" si la imagen no se puede usar en la hoja (base64 o ruta relativa sin SITE_URL).
function toAbsoluteImageUrl(url) {
  const value = String(url || "").trim();
  if (!value || /^data:/i.test(value)) return "";
  if (/^https?:\/\//i.test(value)) return value.replace(/ /g, "%20");

  const siteUrl = getSiteUrl();
  if (!siteUrl) return "";
  return siteUrl + "/" + value.replace(/^(\.\/|\/)+/, "").replace(/ /g, "%20");
}

function buildImageFormula(url) {
  return '=IMAGE("' + String(url).replace(/"/g, "%22") + '")';
}

function extractImageUrl(formula) {
  const match = String(formula || "").match(/^=IMAGE\(\s*"([^"]+)"/i);
  return match ? match[1] : "";
}

function findCatalogImage(catalogRows, codigo, diseno) {
  const code = normalizeHeader(codigo);
  const name = normalizeHeader(diseno);
  let product = code
    ? catalogRows.find(function (item) { return normalizeHeader(item.codigo) === code; })
    : null;
  if (!product && name) {
    product = catalogRows.find(function (item) { return normalizeHeader(item.nombre) === name; });
  }
  if (!product) return "";
  return String(product.imagen || (product.fotos && product.fotos[0]) || "").trim();
}

function readCatalogRowsSafe() {
  try {
    return readCatalogRows();
  } catch (error) {
    return [];
  }
}

// Usa la imagen que mande la página; si no viene, la busca en el catálogo por código o nombre.
function resolveProductImage(payloadImage, codigo, diseno) {
  const sent = String(payloadImage || "").trim();
  if (sent) return sent;
  return findCatalogImage(readCatalogRowsSafe(), codigo, diseno);
}

function writeSaleImage(sheet, headers, rowNumber, imageUrl) {
  const imagenIndex = headers.findIndex(function (header) {
    return normalizeHeader(header) === "imagen";
  });
  if (imagenIndex < 0) return;

  sheet.getRange(rowNumber, imagenIndex + 1).setFormula(buildImageFormula(imageUrl));
  sheet.setRowHeight(rowNumber, SALES_IMAGE_ROW_HEIGHT);
  sheet.setColumnWidth(imagenIndex + 1, SALES_IMAGE_COLUMN_WIDTH);
}

// Ejecuta esta función UNA VEZ desde el editor de Apps Script para
// agregar la foto a las ventas que ya estaban registradas.
function rellenarFotosVentas() {
  const sheet = getSalesSheet();
  const headers = ensureHeaders(sheet);
  if (sheet.getLastRow() < 2) return 0;

  const imagenIndex = headers.findIndex(function (header) {
    return normalizeHeader(header) === "imagen";
  });
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length);
  const values = range.getValues();
  const formulas = range.getFormulas();
  const catalogRows = readCatalogRowsSafe();
  let updated = 0;

  values.forEach(function (row, index) {
    if (formulas[index][imagenIndex] || row[imagenIndex]) return;
    const imageUrl = toAbsoluteImageUrl(findCatalogImage(
      catalogRows,
      getCell(row, headers, ["codigo"]),
      getCell(row, headers, ["diseno", "producto"])
    ));
    if (!imageUrl) return;
    writeSaleImage(sheet, headers, index + 2, imageUrl);
    updated += 1;
  });

  Logger.log("Fotos agregadas: " + updated);
  return updated;
}

/* ---------- Ventas ---------- */

function readSalesRows() {
  const sheet = getSalesSheet();
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return [];

  const formulas = range.getFormulas();
  const headers = values[0];
  const imagenIndex = headers.findIndex(function (header) {
    return normalizeHeader(header) === "imagen";
  });
  let catalogRows = null;

  return values.slice(1)
    .map(function (row, index) {
      const codigo = getCell(row, headers, ["codigo"]);
      const diseno = getCell(row, headers, ["diseno", "diseño", "producto"]);

      // 1) foto guardada en la hoja, 2) si no hay, la del catálogo.
      let imagen = "";
      if (imagenIndex >= 0) {
        imagen = extractImageUrl(formulas[index + 1][imagenIndex]) || String(row[imagenIndex] || "").trim();
      }
      if (!imagen) {
        if (catalogRows === null) catalogRows = readCatalogRowsSafe();
        imagen = findCatalogImage(catalogRows, codigo, diseno);
      }

      return {
        rowNumber: index + 2,
        folio: getCell(row, headers, ["folio"]),
        cliente: getCell(row, headers, ["cliente", "nombrecliente", "nombredelcliente", "nombre", "name"]),
        diseno: diseno,
        codigo: codigo,
        imagen: imagen,
        precio: Number(getCell(row, headers, ["precio", "total"]) || 0),
        estado: normalizeStatus(getCell(row, headers, ["estado", "estatus", "status"])),
        fecha: formatDate(getCell(row, headers, ["fecha", "timestamp", "fechadeapartado"])),
        isReferral: getCell(row, headers, ["esreferencia"]),
        referralCode: getCell(row, headers, ["codigoreferencia"]),
        referralSeller: getCell(row, headers, ["vendedorreferencia"])
      };
    })
    .filter(function (row) {
      return row.folio || row.cliente || row.diseno || row.precio || row.fecha;
    })
    .sort(function (first, second) {
      const dateOrder = String(second.fecha).localeCompare(String(first.fecha));
      return dateOrder || second.rowNumber - first.rowNumber;
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
        case "esoferta": return product.esOferta === true;
        case "codigo": return product.codigo || "";
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
        esNuevo: String(getCell(row, headers, ["esnuevo"])).toLowerCase() === "true",
        esOferta: String(getCell(row, headers, ["esoferta"])).toLowerCase() === "true",
        codigo: getCell(row, headers, ["codigo"])
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
  const headers = ["ID", "Nombre", "Categoria", "Descripcion", "Precio", "Imagen", "Fotos", "Disponible", "Talla", "Material", "EsNuevo", "EsOferta", "Codigo"];
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return headers;
  }

  let existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const missingHeaders = [];

  if (!existingHeaders.some(function (header) { return normalizeHeader(header) === "esoferta"; })) {
    missingHeaders.push("EsOferta");
  }
  if (!existingHeaders.some(function (header) { return normalizeHeader(header) === "codigo"; })) {
    missingHeaders.push("Codigo");
  }

  if (missingHeaders.length) {
    sheet.getRange(1, existingHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
    existingHeaders = existingHeaders.concat(missingHeaders);
  }

  return existingHeaders;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = ["Fecha", "Folio", "Cliente", "Telefono", "Diseno", "Codigo", "Precio", "Estado", "Es referencia", "Codigo referencia", "Vendedor referencia", "Imagen"];
    sheet.appendRow(headers);
    return headers;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const requiredHeaders = ["Codigo", "Es referencia", "Codigo referencia", "Vendedor referencia", "Imagen"];
  const normalizedHeaders = headers.map(normalizeHeader);
  const missingHeaders = requiredHeaders.filter(function (header) {
    return normalizedHeaders.indexOf(normalizeHeader(header)) < 0;
  });

  if (missingHeaders.length) {
    sheet.getRange(1, headers.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
    return headers.concat(missingHeaders);
  }

  return headers;
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