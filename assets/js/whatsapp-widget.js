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
    <span class="whatsapp-widget__label">QUIERO APARTAR POR WHATSAPP</span>
    <span class="whatsapp-widget__icon" aria-hidden="true">☎</span>
  `;
  document.body.appendChild(enlace);
})(window, document);
