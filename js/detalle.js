const params = new URLSearchParams(window.location.search);
const id = Number(params.get("id"));
const bebe = CATALOGO.find((item) => item.id === id) || CATALOGO[0];
const fotos = bebe.fotos || [bebe.imagen];

const mainImage = document.getElementById("detail-main-image");
const thumbs = document.getElementById("detail-thumbs");

const CATEGORY_LABELS = {
  prematuro: "Prematuro",
  recien_nacido: "Recién nacido",
  "3_meses": "3 meses",
  silicona: "Silicona"
};

function mostrarFoto(src, alt) {
  mainImage.src = src;
  mainImage.alt = alt;
  thumbs.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.src === src);
  });
}

function cargarDetalle() {
  document.title = `${bebe.nombre} | Maternity Reborn`;
  document.getElementById("detail-status").textContent = bebe.disponible ? "Disponible" : "Adoptado";
  document.getElementById("detail-code").textContent = `Diseño Nº ${String(bebe.id).padStart(2, "0")}`;
  document.getElementById("detail-name").textContent = bebe.nombre;
  document.getElementById("detail-sub").textContent = bebe.subtitulo;
  document.getElementById("detail-price").textContent = `$${bebe.precio.toLocaleString("es-MX")} MXN`;

  const badges = document.getElementById("detail-badges");
  badges.innerHTML = (bebe.categorias || []).map((categoria) => `<span class="detail-badge">${CATEGORY_LABELS[categoria] || categoria}</span>`).join("");

  document.getElementById("detail-specs").innerHTML = [
    ["Talla y peso", bebe.talla],
    ["Material", bebe.material],
    ["Cabello", bebe.cabello],
    ["Incluye", bebe.incluye]
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");

  const certificacion = document.getElementById("detail-certificacion");
  const certLink = bebe.certificacion && bebe.certificacion.archivoUrl ? ` <a href="${bebe.certificacion.archivoUrl}" target="_blank" rel="noreferrer">Ver certificado</a>` : "";
  certificacion.innerHTML = `
    <div class="certificacion-card">
      <div class="certificacion-icon" aria-hidden="true">✓</div>
      <div>
        <p>${bebe.certificacion?.texto || "Este bebé cuenta con certificado de calidad y autenticidad."}</p>
        ${certLink}
      </div>
    </div>
  `;

  const cuidados = document.getElementById("detail-cuidados");
  cuidados.innerHTML = (bebe.cuidados || ["Mantén el bebé lejos de la luz solar y del calor directo."]).map((item) => `<li>${item}</li>`).join("");

  thumbs.innerHTML = fotos.map((foto, index) => `
    <button type="button" class="detail-thumb${index === 0 ? " is-active" : ""}" data-src="${foto}" aria-label="Ver foto ${index + 1}">
      <img src="${foto}" alt="${bebe.nombre}, foto ${index + 1}">
    </button>
  `).join("");

  thumbs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => mostrarFoto(button.dataset.src, `Bebé reborn ${bebe.nombre}`));
  });
  mostrarFoto(fotos[0], `Bebé reborn ${bebe.nombre}`);
}

cargarDetalle();
