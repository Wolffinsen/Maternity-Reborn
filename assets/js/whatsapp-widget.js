(function (window, document) {
  "use strict";

  if (document.getElementById("whatsapp-widget")) return;

  const numero = typeof NUMERO_WHATSAPP === "string" ? NUMERO_WHATSAPP : "";
  if (!numero) return;

  const enlace = document.createElement("a");
  enlace.id = "whatsapp-widget";
  enlace.className = "whatsapp-widget";
  enlace.href = `https://wa.me/${numero}?text=${encodeURIComponent("Hola, quiero apartar un bebé reborn para diciembre.")}`;
  enlace.target = "_blank";
  enlace.rel = "noopener noreferrer";
  enlace.setAttribute("aria-label", "Escribir por WhatsApp");
  enlace.innerHTML = `
    <span class="whatsapp-widget__icon" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.34.63 4.53 1.72 6.42L4 29l7.77-1.68A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.75c-1.95 0-3.83-.52-5.47-1.5l-.39-.23-4.61 1 1.03-4.5-.25-.46A9.7 9.7 0 0 1 5.75 15c0-5.66 4.6-10.25 10.254-10.25S26.25 9.34 26.25 15 21.66 24.75 16.004 24.75Z"/>
        <path d="M21.94 17.65c-.31-.16-1.85-.91-2.14-1.02-.29-.11-.5-.16-.71.16-.21.31-.81 1.02-.99 1.23-.18.21-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.93-.83-1.55-1.85-1.73-2.16-.18-.31-.02-.48.14-.63.14-.14.31-.36.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.02-.55-.08-.16-.71-1.7-.97-2.33-.26-.62-.52-.53-.71-.54h-.6c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.62s1.13 3.04 1.29 3.25c.16.21 2.22 3.4 5.39 4.77.75.32 1.34.52 1.8.66.76.24 1.45.21 2 .13.61-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.36Z"/>
      </svg>
    </span>
  `;
  document.body.appendChild(enlace);
})(window, document);