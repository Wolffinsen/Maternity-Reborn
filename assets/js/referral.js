/*
 * Referral attribution foundation.
 *
 * Add seller codes to SELLER_REFERRAL_CODES when the seller registry is ready:
 * {
 *   SELLER_CODE: { name: "Seller name", commissionPercent: 10 }
 * }
 * Keep the seller code as the object key; names and commission percentages are
 * metadata for a future backend/dashboard and are not trusted as sale proof.
 */
(function (window) {
  "use strict";

  const REFERRAL_STORAGE_KEY = "maternityRebornReferral";
  const REFERRAL_QUERY_PARAM = "ref";
  const REFERRAL_CODE_PATTERN = /^[A-Z0-9_-]{2,64}$/;

  // TODO: Add each seller's unique code, name, and commission percentage here.
  // TODO: Move this registry to the backend/API when confirmed sales are tracked.
  const SELLER_REFERRAL_CODES = {
    // SELLER_CODE: { name: "Seller name", commissionPercent: 10 }
  };

  function normalizarCodigo(value) {
    return String(value || "").trim().toUpperCase();
  }

  function codigoValido(value) {
    const code = normalizarCodigo(value);
    if (!REFERRAL_CODE_PATTERN.test(code)) return false;

    // Until a seller registry exists, the format check keeps this foundation usable.
    // Once codes are configured, only registered sellers are accepted.
    const registeredCodes = Object.keys(SELLER_REFERRAL_CODES);
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
      // Browsers can block storage; the current-page attribution still works.
    }
  }

  function obtenerCodigo() {
    const guardado = leerGuardado();
    return guardado && codigoValido(guardado.code) ? normalizarCodigo(guardado.code) : "";
  }

  function capturarDesdeUrl() {
    const code = normalizarCodigo(new URLSearchParams(window.location.search).get(REFERRAL_QUERY_PARAM));
    if (!codigoValido(code)) return;

    // First-touch attribution is the default. Change this rule here if later
    // campaigns should replace an existing referral.
    if (!obtenerCodigo()) guardarCodigo(code);
  }

  function obtenerLineaWhatsapp() {
    const code = obtenerCodigo();
    return code ? `Código de referencia: ${code}` : "";
  }

  // TODO: Send referral attribution and confirmed-sale events to your backend/API here.
  window.ReferralTracking = {
    getCode: obtenerCodigo,
    getWhatsappLine: obtenerLineaWhatsapp,
    getSellerRegistry: () => ({ ...SELLER_REFERRAL_CODES })
  };

  capturarDesdeUrl();
})(window);