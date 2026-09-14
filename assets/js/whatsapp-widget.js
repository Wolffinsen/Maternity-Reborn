(function (window, document) {
  "use strict";

  if (document.getElementById("whatsapp-widget")) return;

  const numero = typeof NUMERO_WHATSAPP === "string" ? NUMERO_WHATSAPP : "";
  if (!numero) return;

  const enlace = document.createElement("a");
  enlace.id = "whatsapp-widget";
  enlace.className = "whatsapp-widget";
  enlace.href = `https://wa.me/${numero}?text=${encodeURIComponent("Hola, me gustaría recibir información sobre los bebés reborn disponibles.")}`;
  enlace.target = "_blank";
  enlace.rel = "noopener noreferrer";
  enlace.setAttribute("aria-label", "Escribir por WhatsApp");
  enlace.innerHTML = `
    <span class="whatsapp-widget__label">¿Tienes alguna duda? Escríbenos</span>
    <span class="whatsapp-widget__icon" aria-hidden="true">☎</span>
  `;
  document.body.appendChild(enlace);
})(window, document);
