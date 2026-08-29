const params = new URLSearchParams(window.location.search);
const id = Number(params.get("id"));
const bebe = CATALOGO.find((item) => item.id === id) || CATALOGO[0];
const fotos = bebe.fotos || [bebe.imagen];

const mainImage = document.getElementById("detail-main-image");
const thumbs = document.getElementById("detail-thumbs");

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

  document.getElementById("detail-specs").innerHTML = [
    ["Talla y peso", bebe.talla],
    ["Material", bebe.material],
    ["Cabello", bebe.cabello],
    ["Incluye", bebe.incluye]
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");

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
