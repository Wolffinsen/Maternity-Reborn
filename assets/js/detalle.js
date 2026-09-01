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
        <img class="image-lightbox__image" src="" alt="Vista ampliada" />
      </div>
    `;
    document.body.appendChild(lightbox);

    const closeBtn = lightbox.querySelector(".image-lightbox__close");
    const panel = lightbox.querySelector(".image-lightbox__panel");
    const img = lightbox.querySelector(".image-lightbox__image");

    closeBtn.addEventListener("click", () => {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      img.src = "";
      img.alt = "Vista ampliada";
    });

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox || event.target === panel) {
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        img.src = "";
        img.alt = "Vista ampliada";
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        img.src = "";
        img.alt = "Vista ampliada";
      }
    });
  }

  return lightbox;
}

function abrirLightbox(src, alt) {
  const lightbox = crearLightbox();
  const img = lightbox.querySelector(".image-lightbox__image");
  img.src = src;
  img.alt = alt;
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
}

function bindImageZoom() {
  document.querySelectorAll('[data-lightbox="true"]').forEach((image) => {
    image.addEventListener("click", () => abrirLightbox(image.src, image.alt || "Imagen del bebé"));
  });

  document.querySelectorAll(".detail-model-gallery img").forEach((image) => {
    image.setAttribute("data-lightbox", "true");
    image.addEventListener("click", () => abrirLightbox(image.src, image.alt || "Imagen del bebé"));
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

  const galleryImages = fotosModelo.map((src) => `
    <img src="${src}" alt="Diseño ${modeloSeleccionado}" loading="lazy" data-lightbox="true">
  `).join("");

  contenedor.innerHTML = `
    <section class="detail-collection">
      <p class="eyebrow"><i></i><span>Diseños</span></p>
      <div class="detail-model-header">
        <div>
          <h1 class="detail-name">${modeloSeleccionado}</h1>
          <p class="detail-sub">${descripcionModelo}</p>
          <p class="detail-variation-note">El diseño de la tela varía.</p>
          <p class="detail-estimated-price">Precio estimado: ${precioEstimado}</p>
        </div>
        <button type="button" class="btn-primary" id="model-request-button">Quiero este bebé</button>
      </div>

      <div class="detail-model-gallery">${galleryImages}</div>

      <a class="btn-primary detail-back-collection-btn" href="index.html#catalogo">Volver al catálogo</a>
    </section>
  `;

  const requestButton = document.getElementById("model-request-button");
  if (requestButton) {
    requestButton.addEventListener("click", () => abrirWhatsappPorModelo(modeloSeleccionado, categoriaLabel));
  }

  bindImageZoom();
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
      <img src="${src}" alt="Detalle del diseño ${index + 1}" loading="lazy">
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
