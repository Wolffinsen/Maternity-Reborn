const params = new URLSearchParams(window.location.search);
const id = Number(params.get("id"));
const modelo = params.get("modelo");
const bebeBase = CATALOGO.find((item) => item.id === id) || CATALOGO[0];
const variantes = CATALOGO.filter((item) => item.nombre === bebeBase.nombre);
const bebe = variantes.find((item) => item.id === id) || variantes[0] || bebeBase;

const mainImage = document.getElementById("detail-main-image");
const thumbs = document.getElementById("detail-thumbs");
const variantCards = document.getElementById("detail-variants");

function renderColeccion(modeloSeleccionado) {
  const items = CATALOGO.filter((item) => item.nombre === modeloSeleccionado);
  const contenedor = document.querySelector(".detail-layout");

  if (!contenedor || items.length === 0) {
    return;
  }

  contenedor.classList.add("detail-layout--collection");

  const cards = items.map((variant) => {
    const preview = variant.imagen || variant.fotos?.[0] || "assets/img/diseno-1.jpg";
    const precio = Number(variant.precio ?? 0);
    const paletteClass = ["palette-rose", "palette-green", "palette-cream", "palette-gold"][(Number(variant.id) - 1) % 4];
    const categoriasHtml = (variant.categorias || []).map((categoria) => {
      const label = CATEGORY_LABELS[categoria] || categoria.replace(/_/g, " ");
      return `<span class="product-badge">${label}</span>`;
    }).join("");

    return `
      <a href="detalle.html?id=${variant.id}" class="tarjeta tarjeta-link" data-id="${variant.id}">
        <div class="tarjeta-imagen-wrap ${paletteClass}">
          <span class="badge ${variant.disponible ? "" : "apartado"}">${variant.disponible ? "Disponible" : "Apartado"}</span>
          <div class="tarjeta-badges">${categoriasHtml}</div>
          <img src="${preview}" alt="${variant.nombre} ${variant.diseno || "diseño"}" loading="lazy">
        </div>
        <div class="tarjeta-info">
          <h3 class="tarjeta-nombre">${variant.diseno || variant.subtitulo || "Diseño"}</h3>
          <p class="tarjeta-sub">${variant.subtitulo || "Pieza única hecha a mano"}</p>
          <p class="tarjeta-precio">$${precio.toLocaleString("es-MX")} MXN</p>
          <span class="btn-detalle">Ver detalle</span>
        </div>
      </a>
    `;
  }).join("");

  contenedor.innerHTML = `
    <section class="detail-collection">
      <p class="eyebrow"><i></i><span>Diseños</span></p>
      <h1 class="detail-name">${modeloSeleccionado}</h1>
      <p class="detail-sub">Selecciona el diseño que más te guste</p>
      <div class="detail-variants-wrap">
        <div class="detail-variants-header">
          <h2>Todos los diseños</h2>
        </div>
        <div class="catalogo-grid detail-model-grid">${cards}</div>
      </div>
      <a class="btn-primary detail-back-collection-btn" href="index.html#catalogo">Volver al catálogo</a>
    </section>
  `;
}

const CATEGORY_LABELS = {
  prematuro: "Prematuro",
  recien_nacido: "Recién nacido",
  "3_meses": "3 meses",
  silicona: "Silicona",
  silicona_premium: "Silicona premium"
};

function mostrarFoto(src, alt) {
  if (!mainImage) return;
  mainImage.src = src;
  mainImage.alt = alt;

  if (thumbs) {
    thumbs.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.src === src);
    });
  }
}

function ocultarSeleccionesDetalle() {
  if (thumbs) {
    thumbs.innerHTML = "";
    thumbs.style.display = "none";
  }

  const wrapVariantes = document.querySelector(".detail-variants-wrap");
  if (wrapVariantes) {
    wrapVariantes.style.display = "none";
  }
}

function actualizarDetalles(variant) {
  const precio = Number(variant.precio ?? 0);

  document.title = `${variant.nombre} | Maternity Reborn`;
  document.getElementById("detail-status").textContent = variant.disponible ? "Disponible" : "Adoptado";
  document.getElementById("detail-code").textContent = `Diseño Nº ${String(variant.id).padStart(2, "0")}`;
  document.getElementById("detail-name").textContent = variant.nombre;
  document.getElementById("detail-sub").textContent = variant.subtitulo;
  document.getElementById("detail-price").textContent = `$${precio.toLocaleString("es-MX")} MXN`;

  const badges = document.getElementById("detail-badges");
  badges.innerHTML = (variant.categorias || []).map((categoria) => `<span class="detail-badge">${CATEGORY_LABELS[categoria] || categoria}</span>`).join("");

  const incluyeTexto = Array.isArray(variant.incluye) ? variant.incluye.join(", ") : (variant.incluye || "Incluye certificado de autenticidad.");

  document.getElementById("detail-specs").innerHTML = [
    ["Talla y peso", variant.talla],
    ["Material", variant.material],
    ["Cabello", variant.cabello],
    ["Incluye", incluyeTexto]
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");

  const certificacion = document.getElementById("detail-certificacion");
  const certLink = variant.certificacion && variant.certificacion.archivoUrl ? ` <a href="${variant.certificacion.archivoUrl}" target="_blank" rel="noreferrer">Ver certificado</a>` : "";
  certificacion.innerHTML = `
    <div class="certificacion-card">
      <div class="certificacion-icon" aria-hidden="true">✓</div>
      <div>
        <p>${variant.certificacion?.texto || "Este bebé cuenta con certificado de calidad y autenticidad."}</p>
        ${certLink}
      </div>
    </div>
  `;

  const cuidados = document.getElementById("detail-cuidados");
  cuidados.innerHTML = (variant.cuidados || ["Mantén el bebé lejos de la luz solar y del calor directo."]).map((item) => `<li>${item}</li>`).join("");

  const volverBtn = document.getElementById("detail-back-collection");
  if (volverBtn) {
    volverBtn.href = `detalle.html?modelo=${encodeURIComponent(variant.nombre)}`;
  }
}

function renderVariantCards(variantesDisponibles, activeId) {
  variantCards.innerHTML = variantesDisponibles.map((variant) => {
    const preview = variant.imagen || variant.fotos?.[0] || "assets/img/diseno-1.jpg";
    const precio = Number(variant.precio ?? 0);
    const isActive = variant.id === activeId ? "is-active" : "";
    return `
      <a href="detalle.html?id=${variant.id}" class="variant-card ${isActive}" data-id="${variant.id}">
        <img src="${preview}" alt="${variant.nombre} ${variant.diseno || "diseño"}">
        <div class="variant-card-body">
          <p class="variant-card-name">${variant.diseno || variant.subtitulo || "Diseño"}</p>
          <p class="variant-card-price">$${precio.toLocaleString("es-MX")} MXN</p>
        </div>
      </a>
    `;
  }).join("");
}

function cargarDetalle() {
  ocultarSeleccionesDetalle();

  const imagenInicial = (bebe.fotos || [bebe.imagen])[0] || bebe.imagen;
  actualizarDetalles(bebe);
  mostrarFoto(imagenInicial, `Bebé reborn ${bebe.nombre}`);
}

if (modelo) {
  renderColeccion(modelo);
} else {
  cargarDetalle();
}
