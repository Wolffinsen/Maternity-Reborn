const params = new URLSearchParams(window.location.search);
const id = Number(params.get("id"));
const modelo = params.get("modelo");
const modeloSlug = params.get("modelo");
const bebeBase = CATALOGO.find((item) => item.id === id) || CATALOGO.find((item) => item.slug === modeloSlug) || CATALOGO[0];
const variantes = CATALOGO.filter((item) => item.nombre === bebeBase.nombre && item.categorias?.[0] === bebeBase.categorias?.[0]);
const bebe = variantes.find((item) => item.id === id) || variantes[0] || bebeBase;

const mainImage = document.getElementById("detail-main-image");
const thumbs = document.getElementById("detail-thumbs");
const variantCards = document.getElementById("detail-variants");
const requestBtn = document.getElementById("detail-request-button");

function abrirWhatsappApartado(diseno) {
  const nombre = diseno?.nombre || "Bebé Reborn";
  const precio = Number(diseno?.precio ?? 0);
  const mensaje =
    `Hola, quiero apartar mi bebé 👶\n\n` +
    `Diseño: ${nombre}\n` +
    `Precio del diseño: $${precio.toLocaleString("es-MX")} MXN\n` +
    `Anticipo de apartado: $${COSTO_APARTADO} MXN\n` +
    `Quiero reservarlo.`;

  const enlaceWhatsapp = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(enlaceWhatsapp, "_blank", "noopener,noreferrer");
}

function abrirWhatsappPorModelo(modeloSeleccionado, categoriaLabel) {
  const mensaje =
    `Hola, quiero apartar mi bebé 👶\n\n` +
    `Diseño: ${modeloSeleccionado}\n` +
    `Tipo de bebé: ${categoriaLabel}\n` +
    `Quiero apartar este bebé y me gustaría recibir más información sobre sus opciones de diseño.`;

  const enlaceWhatsapp = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(enlaceWhatsapp, "_blank", "noopener,noreferrer");
}

let GALLERY_PHOTOS = [];
let GALLERY_INDEX = 0;

function cerrarLightbox() {
  const lightbox = document.getElementById("image-lightbox");
  if (!lightbox) return;

  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
}

function pintarLightbox() {
  const lightbox = document.getElementById("image-lightbox");
  if (!lightbox || !GALLERY_PHOTOS.length) return;

  const photo = GALLERY_PHOTOS[GALLERY_INDEX];
  const image = lightbox.querySelector(".image-lightbox__image");
  const counter = lightbox.querySelector(".image-lightbox__counter");
  const previous = lightbox.querySelector(".image-lightbox__nav--prev");
  const next = lightbox.querySelector(".image-lightbox__nav--next");

  image.src = photo.src;
  image.alt = photo.alt;
  counter.textContent = `${GALLERY_INDEX + 1} / ${GALLERY_PHOTOS.length}`;
  previous.hidden = GALLERY_PHOTOS.length < 2;
  next.hidden = GALLERY_PHOTOS.length < 2;
  counter.hidden = GALLERY_PHOTOS.length < 2;
}

function moverLightbox(delta) {
  if (GALLERY_PHOTOS.length < 2) return;
  GALLERY_INDEX = (GALLERY_INDEX + delta + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length;
  pintarLightbox();
}

function crearLightbox() {
  let lightbox = document.getElementById("image-lightbox");

  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.id = "image-lightbox";
    lightbox.className = "image-lightbox";
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML = `
      <div class="image-lightbox__panel" role="dialog" aria-modal="true">
        <button type="button" class="image-lightbox__close" aria-label="Cerrar vista ampliada">×</button>
        <button type="button" class="image-lightbox__nav image-lightbox__nav--prev" aria-label="Foto anterior">‹</button>
        <img class="image-lightbox__image" src="" alt="Vista ampliada" width="1200" height="1600" decoding="async" />
        <button type="button" class="image-lightbox__nav image-lightbox__nav--next" aria-label="Foto siguiente">›</button>
        <p class="image-lightbox__counter" aria-live="polite"></p>
      </div>
    `;
    document.body.appendChild(lightbox);

    const closeBtn = lightbox.querySelector(".image-lightbox__close");
    const panel = lightbox.querySelector(".image-lightbox__panel");

    closeBtn.addEventListener("click", cerrarLightbox);
    lightbox.querySelector(".image-lightbox__nav--prev").addEventListener("click", () => moverLightbox(-1));
    lightbox.querySelector(".image-lightbox__nav--next").addEventListener("click", () => moverLightbox(1));

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox || event.target === panel) cerrarLightbox();
    });

    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") cerrarLightbox();
      if (event.key === "ArrowLeft") moverLightbox(-1);
      if (event.key === "ArrowRight") moverLightbox(1);
    });
  }

  return lightbox;
}

function abrirLightbox(index) {
  const lightbox = crearLightbox();
  GALLERY_INDEX = index;
  pintarLightbox();
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
}

function seleccionarFoto(index) {
  const hero = document.querySelector(".detail-gallery-hero img");
  const thumbs = document.querySelectorAll(".gallery-thumb");
  if (!hero || !GALLERY_PHOTOS[index]) return;

  hero.classList.add("is-changing");
  window.setTimeout(() => {
    hero.src = GALLERY_PHOTOS[index].src;
    hero.alt = GALLERY_PHOTOS[index].alt;
    hero.classList.remove("is-changing");
  }, 160);

  thumbs.forEach((thumb, thumbIndex) => thumb.classList.toggle("is-active", thumbIndex === index));
  const counter = document.querySelector(".detail-gallery-hero .gallery-counter");
  if (counter) counter.textContent = `${index + 1} / ${GALLERY_PHOTOS.length}`;
}

function renderGaleria(fotos, nombreAlt) {
  GALLERY_PHOTOS = fotos.map((src) => ({ src, alt: `Diseño ${nombreAlt}` }));
  const hero = GALLERY_PHOTOS[0];
  const secondary = GALLERY_PHOTOS.slice(1, 5);
  const remaining = Math.max(0, GALLERY_PHOTOS.length - 5);
  const bento = secondary.map((photo, index) => `
    <button type="button" class="gallery-bento-item" data-gallery-index="${index + 1}" aria-label="Ampliar foto ${index + 2}">
      <img src="${photo.src}" alt="${photo.alt}" width="1200" height="1600" loading="lazy" decoding="async">
      ${index === secondary.length - 1 && remaining ? `<span class="gallery-bento-more">+${remaining}</span>` : ""}
    </button>
  `).join("");
  const filmstrip = GALLERY_PHOTOS.map((photo, index) => `
    <button type="button" class="gallery-thumb${index === 0 ? " is-active" : ""}" data-gallery-index="${index}" aria-label="Ver foto ${index + 1}">
      <img src="${photo.src}" alt="${photo.alt}" width="1200" height="1600" loading="lazy" decoding="async">
    </button>
  `).join("");

  return `
    <div class="detail-model-gallery" data-count="${secondary.length}">
      <button type="button" class="detail-gallery-hero" data-gallery-index="0" aria-label="Ampliar foto principal">
        <img src="${hero.src}" alt="${hero.alt}" width="1200" height="1600" decoding="async">
        <span class="gallery-zoom-hint">Ampliar ✦</span>
        ${GALLERY_PHOTOS.length > 1 ? `<span class="gallery-counter">1 / ${GALLERY_PHOTOS.length}</span>` : ""}
      </button>
      ${GALLERY_PHOTOS.length > 1 ? `<div class="detail-gallery-bento">${bento}</div><div class="detail-gallery-filmstrip">${filmstrip}</div>` : ""}
    </div>
  `;
}

function bindGalleryEvents() {
  document.querySelectorAll("[data-gallery-index]").forEach((element) => {
    element.addEventListener("click", () => {
      const index = Number(element.dataset.galleryIndex);
      if (element.classList.contains("gallery-thumb")) seleccionarFoto(index);
      else abrirLightbox(index);
    });
  });
}

function renderColeccion(modeloSeleccionado) {
  const items = CATALOGO.filter((item) => item.slug === modeloSeleccionado || item.nombre === modeloSeleccionado);
  const contenedor = document.querySelector(".detail-layout");

  if (!contenedor || items.length === 0) {
    return;
  }

  const categoriaLabel = CATEGORY_LABELS[items[0]?.categorias?.[0]] || "Bebé personalizado";
  const descripcionModelo = items[0]?.descripcion || "Este tipo de bebé puede hacerse con varios acabados y detalles personalizados según el gusto de cada familia.";
  const precios = items.map((variant) => Number(variant.precio ?? 0));
  const precioMin = Math.min(...precios);
  const precioMax = Math.max(...precios);
  const precioEstimado = precioMin === precioMax
    ? `$${precioMin.toLocaleString("es-MX")} MXN`
    : `Desde $${precioMin.toLocaleString("es-MX")} MXN`;
  const fotosModelo = Array.from(new Set(items.flatMap((variant) => (variant.fotos || [variant.imagen]).filter(Boolean))));

  contenedor.classList.add("detail-layout--collection");

  const talla = items[0]?.talla || "Talla estándar";
  const material = items[0]?.material || "Vinilo reborn";
  const certificacion = items[0]?.certificacion?.texto || "Certificado de autenticidad y calidad del material.";

  contenedor.innerHTML = `
    <section class="detail-collection">
      <div class="detail-collection-layout">
        <div class="detail-collection-info">
          <p class="eyebrow"><i></i><span>Diseños</span></p>
          <h1 class="detail-name">${modeloSeleccionado}</h1>
          <p class="detail-sub">${descripcionModelo}</p>
          <p class="detail-variation-note">El diseño de la tela varía.</p>
          <p class="detail-estimated-price">Precio estimado: ${precioEstimado}</p>
          <button type="button" class="btn-primary" id="model-request-button">Quiero este bebé</button>
          <dl class="detail-collection-specs">
            <div><dt>Talla y peso</dt><dd>${talla}</dd></div>
            <div><dt>Material</dt><dd>${material}</dd></div>
          </dl>
          <div class="detail-collection-cert"><span aria-hidden="true">✓</span><p>${certificacion}</p></div>
          <a class="detail-back-link" href="index.html#catalogo">← Volver al catálogo</a>
        </div>
        <div class="detail-collection-gallery">${renderGaleria(fotosModelo, modeloSeleccionado)}</div>
      </div>
    </section>
  `;

  const requestButton = document.getElementById("model-request-button");
  if (requestButton) {
    requestButton.addEventListener("click", () => abrirWhatsappPorModelo(modeloSeleccionado, categoriaLabel));
  }

  bindGalleryEvents();
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

function renderThumbs(fotos) {
  if (!thumbs) return;

  const fotosUnicas = Array.from(new Set((fotos || []).filter(Boolean)));
  if (!fotosUnicas.length) {
    thumbs.innerHTML = "";
    thumbs.style.display = "none";
    return;
  }

  thumbs.innerHTML = fotosUnicas.map((src, index) => `
    <button
      type="button"
      class="detail-thumb"
      data-src="${src}"
      aria-label="Ver foto ${index + 1} del diseño"
    >
      <img src="${src}" alt="Detalle del diseño ${index + 1}" width="1200" height="1600" loading="lazy" decoding="async">
    </button>
  `).join("");

  thumbs.style.display = "grid";
  thumbs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => mostrarFoto(button.dataset.src, `Bebé reborn ${bebe?.nombre || "diseño"}`));
  });
}

function ocultarSeleccionesDetalle() {
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
    const preview = variant.imagen || variant.fotos?.[0] || "assets/img/prematuros/Alejandro.jpg";
    const precio = Number(variant.precio ?? 0);
    const isActive = variant.id === activeId ? "is-active" : "";
    return `
      <a href="detalle.html?id=${variant.id}" class="variant-card ${isActive}" data-id="${variant.id}">
        <img src="${preview}" alt="${variant.nombre} ${variant.diseno || "diseño"}" width="1200" height="1600" loading="lazy" decoding="async">
        <div class="variant-card-body">
          <p class="variant-card-name">${variant.diseno || variant.subtitulo || "Diseño"}</p>
          <p class="variant-card-price">$${precio.toLocaleString("es-MX")} MXN</p>
        </div>
      </a>
    `;
  }).join("");
}

function cargarDetalle() {
  if (!bebe) return;

  const modeloNombre = bebe.nombre;
  renderColeccion(modeloNombre);
}

if (modelo) {
  renderColeccion(modelo);
} else if (bebe && bebe.nombre) {
  renderColeccion(bebe.nombre);
} else {
  cargarDetalle();
}

CATALOGO_READY.then(() => {
  if (CATALOGO_REMOTE_CHANGED) window.location.reload();
});
