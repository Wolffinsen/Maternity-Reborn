/*
 * Base de atribución por referencia.
 *
 * Agrega códigos a SELLER_REFERRAL_CODES cuando necesites una configuración fija:
 * {
 *   SELLER_CODE: { name: "Seller name", commissionPercent: 10 }
 * }
 * El código es la clave; el nombre y el porcentaje son datos para un futuro
 * backend o panel y no sustituyen la confirmación de una venta.
 */
(function (window) {
  "use strict";

  const REFERRAL_STORAGE_KEY = "maternityRebornReferral";
  const SELLER_REGISTRY_STORAGE_KEY = "maternityRebornSellerRegistry";
  const REFERRAL_QUERY_PARAM = "ref";
  const REFERRAL_CODE_PATTERN = /^[A-Z0-9_-]{2,64}$/;
  let remoteRegistry = {};

  // TODO: Agrega aquí códigos, nombres y porcentajes si deseas una configuración fija.
  // TODO: Migra este registro a la API/base de datos al confirmar ventas.
  const SELLER_REFERRAL_CODES = {
    // SELLER_CODE: { name: "Seller name", commissionPercent: 10 }
  };

  function normalizarCodigo(value) {
    return String(value || "").trim().toUpperCase();
  }

  function crearSlug(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

    function leerRegistro() {
      try {
        const guardado = JSON.parse(window.localStorage.getItem(SELLER_REGISTRY_STORAGE_KEY) || "null");
        return guardado && typeof guardado === "object" && !Array.isArray(guardado) ? guardado : {};
      } catch (error) {
        return {};
      }
    }

    function obtenerRegistroCompleto() {
      return { ...SELLER_REFERRAL_CODES, ...remoteRegistry, ...leerRegistro() };
    }

  function codigoValido(value) {
    const code = normalizarCodigo(value);
    if (!REFERRAL_CODE_PATTERN.test(code)) return false;

    // Mientras no exista un registro, la validación de formato mantiene activa la base.
    // Cuando se agregan códigos, solo se aceptan vendedores registrados.
      const registeredCodes = Object.keys(obtenerRegistroCompleto());
    return registeredCodes.length === 0 || registeredCodes.includes(code);
  }

  function leerGuardado() {
    try {
      return JSON.parse(window.localStorage.getItem(REFERRAL_STORAGE_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function guardarCodigo(code) {
    try {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify({
        code,
        capturedAt: new Date().toISOString()
      }));
    } catch (error) {
      // Algunos navegadores bloquean el almacenamiento; la página actual sigue funcionando.
    }
  }

  function obtenerCodigo() {
    const guardado = leerGuardado();
    return guardado && codigoValido(guardado.code) ? normalizarCodigo(guardado.code) : "";
  }

  function capturarDesdeUrl() {
    const code = normalizarCodigo(new URLSearchParams(window.location.search).get(REFERRAL_QUERY_PARAM));
    if (codigoValido(code)) {
      // First-touch attribution is the default. Change this rule here if later
      // campaigns should replace an existing referral.
      if (!obtenerCodigo()) guardarCodigo(code);
      return;
    }

    const pathSlug = window.location.pathname
      .split("/")
      .filter(Boolean)
      .pop();
    if (!pathSlug || pathSlug === "index.html" || pathSlug === "admin.html") return;

    const seller = Object.entries(obtenerRegistroCompleto())
      .find(([, data]) => crearSlug(data.name) === crearSlug(pathSlug));
    if (!seller || obtenerCodigo()) return;

    // First-touch attribution is the default. Change this rule here if later
    // campaigns should replace an existing referral.
    guardarCodigo(seller[0]);
  }

  function obtenerLineaWhatsapp() {
    const code = obtenerCodigo();
    const seller = obtenerRegistroCompleto()[code];
    return code
      ? `Referencia: ${seller?.name || code} (código ${code})`
      : "";
  }

  function obtenerAtribucion() {
    const code = obtenerCodigo();
    const seller = obtenerRegistroCompleto()[code];
    return {
      code,
      sellerName: seller?.name || ""
    };
  }

  function guardarVendedor({ code, name, commissionPercent, previousCode = "" }) {
    const normalizedCode = normalizarCodigo(code);
    const normalizedPreviousCode = normalizarCodigo(previousCode);
    const normalizedName = String(name || "").trim();
    const percentage = Number(commissionPercent);
    if (!REFERRAL_CODE_PATTERN.test(normalizedCode)) {
      return { ok: false, error: "El código debe tener entre 2 y 64 caracteres alfanuméricos." };
    }
    if (!normalizedName) return { ok: false, error: "Escribe el nombre del vendedor." };
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      return { ok: false, error: "El porcentaje debe estar entre 0 y 100." };
    }

    const registry = obtenerRegistroCompleto();
    if (normalizedCode !== normalizedPreviousCode && registry[normalizedCode]) {
      return { ok: false, error: "Ese código ya está registrado." };
    }
    if (normalizedPreviousCode && normalizedPreviousCode !== normalizedCode) {
      delete registry[normalizedPreviousCode];
    }
    registry[normalizedCode] = { name: normalizedName, commissionPercent: percentage };
    try {
      window.localStorage.setItem(SELLER_REGISTRY_STORAGE_KEY, JSON.stringify(registry));
      return { ok: true, code: normalizedCode };
    } catch (error) {
      return { ok: false, error: "No se pudo guardar el vendedor en este navegador." };
    }
  }

  function eliminarVendedor(code) {
    const normalizedCode = normalizarCodigo(code);
    const registry = leerRegistro();
    if (!registry[normalizedCode]) return { ok: false, error: "El vendedor no existe." };
    delete registry[normalizedCode];
    try {
      window.localStorage.setItem(SELLER_REGISTRY_STORAGE_KEY, JSON.stringify(registry));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: "No se pudo actualizar el registro en este navegador." };
    }
  }

  function obtenerEnlaceReferencia(code) {
    const normalizedCode = normalizarCodigo(code);
    const url = new URL("/index.html", window.location.origin);
    url.searchParams.set(REFERRAL_QUERY_PARAM, normalizedCode);
    return url.href;
  }

  async function cargarRegistroRemoto() {
    if (typeof URL_APPS_SCRIPT === "undefined" || !URL_APPS_SCRIPT) return;
    try {
      const response = await fetch(URL_APPS_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "readReferralCodes" })
      });
      const result = await response.json();
      if (result.ok && result.action === "readReferralCodes" && result.data) {
        remoteRegistry = result.data;
        capturarDesdeUrl();
        window.dispatchEvent(new Event("referral:updated"));
      }
    } catch (error) {
      console.warn("No se pudo cargar el registro de referencias:", error);
    }
  }

  async function sincronizarRegistro(sessionToken) {
    if (typeof URL_APPS_SCRIPT === "undefined" || !URL_APPS_SCRIPT) {
      return { ok: false, error: "No hay conexión configurada con el servidor." };
    }
    try {
      const response = await fetch(URL_APPS_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "saveReferralCodes",
          sessionToken,
          registry: leerRegistro()
        })
      });
      return response.json();
    } catch (error) {
      return { ok: false, error: "No se pudo sincronizar el registro de referencias." };
    }
  }

  // TODO: Send referral attribution and confirmed-sale events to your backend/API here.
  window.ReferralTracking = {
    getCode: obtenerCodigo,
    getWhatsappLine: obtenerLineaWhatsapp,
    getAttribution: obtenerAtribucion,
    getSellerRegistry: obtenerRegistroCompleto,
    saveSeller: guardarVendedor,
    deleteSeller: eliminarVendedor,
    getReferralUrl: obtenerEnlaceReferencia,
    syncRegistry: sincronizarRegistro,
    loadRemoteRegistry: cargarRegistroRemoto
  };

  capturarDesdeUrl();
  cargarRegistroRemoto();
})(window);