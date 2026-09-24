/* =========================================================
   CATALOGO.JS
   Renderiza el catálogo dividido automáticamente por
   categorías. Cada categoría es una fila con scroll horizontal
   (deslizas con el dedo en móvil, o usas las flechas en escritorio).

   Las categorías salen solas de CATALOGO: si en el panel de
   administrador creas una categoría nueva, aparece como fila nueva.
   ========================================================= */

(function () {
  "use strict";

  const ES_LABELS = {
    prematuro: "Prematuro",
    recien_nacido: "Recién nacido",
    "3_meses": "3 meses",
    silicona: "Silicona",
    silicona_premium: "Silicona premium"
  };

  // Orden en que aparecen las filas (por talla). Las categorías nuevas van al final.
  const CATEGORY_ORDER_DEFAULT = Object.keys(ES_LABELS);

  const grid = document.getElementById("catalogo-grid");
  const searchInput = document.getElementById("catalogo-search");
  const categoryFilters = document.getElementById("category-filters");
  const emptyState = document.getElementById("catalogo-empty");

  let categoriaActiva = "todas";
  let CATALOGO_CARGADO = false;

  /* ---------------------------------------------------------
     Utilidades
     --------------------------------------------------------- */
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function labelCategoria(key) {
    if (ES_LABELS[key]) return ES_LABELS[key];
    const texto = String(key || "").replace(/_/g, " ").trim();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function ordenCategoria(key) {
    const orden = (Array.isArray(CATEGORY_ORDER_REMOTE) && CATEGORY_ORDER_REMOTE.length) ? CATEGORY_ORDER_REMOTE : CATEGORY_ORDER_DEFAULT;
    const index = orden.indexOf(key);
    return index === -1 ? orden.length : index;
  }

  function getCategoriasDisponibles() {
    const categorias = new Set();
    CATALOGO.forEach((diseno) => (diseno.categorias || []).forEach((c) => categorias.add(c)));
    return [...categorias].sort((a, b) => ordenCategoria(a) - ordenCategoria(b) || a.localeCompare(b));
  }

  /* ---------------------------------------------------------
     Aviso de anticipo
     --------------------------------------------------------- */
  function mostrarToastAnticipo() {
    if (document.getElementById("anticipo-toast")) return;

    const toast = document.createElement("div");
    toast.id = "anticipo-toast";
    toast.className = "anticipo-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = `
      <div class="anticipo-toast__content">
        <strong>Anticipo</strong>
        <p>Puedes apartar tu bebé con un anticipo de $${COSTO_APARTADO} MXN</p>
      </div>
      <button type="button" class="anticipo-toast__close" aria-label="Cerrar aviso">Entendido</button>
    `;
    document.body.appendChild(toast);

    const cerrar = () => toast.classList.remove("is-visible");
    toast.querySelector(".anticipo-toast__close").addEventListener("click", cerrar);

    requestAnimationFrame(() => toast.classList.add("is-visible"));
    window.setTimeout(cerrar, 9000); // se va solo para no estorbar en móvil
  }

  /* ---------------------------------------------------------
     Filtros
     --------------------------------------------------------- */
  function renderCategoryFilters() {
    if (!categoryFilters) return;

    const categorias = ["todas", ...getCategoriasDisponibles()];
    categoryFilters.innerHTML = categorias.map((categoria) => {
      const label = categoria === "todas" ? "Todas" : labelCategoria(categoria);
      const active = categoria === categoriaActiva;
      return `<button type="button" class="filter-chip${active ? " is-active" : ""}" data-category="${esc(categoria)}" aria-pressed="${active}">${esc(label)}</button>`;
    }).join("");
  }

  function filtrarCatalogo() {
    const valorBusqueda = (searchInput ? searchInput.value : "").trim().toLowerCase();

    return CATALOGO.filter((diseno) => {
      const categorias = diseno.categorias || [];
      if (categoriaActiva !== "todas" && !categorias.includes(categoriaActiva)) return false;
      if (!valorBusqueda) return true;

      const textoBusqueda = [
        diseno.nombre,
        diseno.subtitulo,
        diseno.material,
        diseno.descripcion,
        ...categorias.map(labelCategoria)
      ].join(" ").toLowerCase();

      return textoBusqueda.includes(valorBusqueda);
    });
  }

  function agruparPorPersonaje(productos) {
    const grupos = new Map();

    productos.forEach((diseno) => {
      const key = `${diseno.nombre}-${diseno.categorias?.[0] || "general"}`;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key).push(diseno);
    });

    return [...grupos.values()].map((grupo) => ({
      nombre: grupo[0].nombre,
      precio: Number(grupo[0].precio ?? 0),
      disponible: grupo.some((item) => item.disponible),
      esOferta: grupo.some((item) => item.esOferta),
      esNuevo: grupo.some((item) => item.esNuevo),
      categoria: (grupo[0].categorias || [])[0] || "recien_nacido",
      talla: grupo[0].talla,
      variantes: grupo,
      slug: grupo[0].slug
    }));
  }

  /* ---------------------------------------------------------
     Render
     --------------------------------------------------------- */
  function renderTarjeta(grupo) {
    const diseno = grupo.variantes[0];
    const paletteClass = ["palette-rose", "palette-green", "palette-cream", "palette-gold"][((Number(diseno.id) || 1) - 1) % 4];

    const badges = [
      grupo.esNuevo ? '<span class="badge nuevo">Nuevo</span>' : "",
      grupo.esOferta ? '<span class="badge promocion">Promoción</span>' : "",
      !grupo.esNuevo && !grupo.esOferta
        ? `<span class="badge${grupo.disponible ? "" : " apartado"}">${grupo.disponible ? "Disponible" : "Apartado"}</span>`
        : ""
    ].join("");

    const subtitulo = grupo.variantes.length > 1
      ? `${grupo.variantes.length} diseños disponibles`
      : "Pieza única hecha a mano";

    const href = `detalle.html?modelo=${encodeURIComponent(grupo.slug)}`;

    return `
      <article class="tarjeta">
        <a class="tarjeta-imagen-wrap ${paletteClass}" href="${href}" aria-label="Ver a ${esc(diseno.nombre)}">
          <img src="${esc(cloudinaryUrl(diseno.imagen, 500))}" alt="Bebé reborn ${esc(diseno.nombre)}" width="1200" height="1600" loading="lazy" decoding="async" onerror="this.style.display='none'; this.parentElement.classList.add('is-placeholder');">
          <div class="tarjeta-badges">${badges}</div>
        </a>
        <div class="tarjeta-info">
          <h4 class="tarjeta-nombre">${esc(diseno.nombre)}</h4>
          <p class="tarjeta-sub">${subtitulo}</p>
          <p class="tarjeta-precio">$${grupo.precio.toLocaleString("es-MX")} MXN</p>
          <a class="btn-detalle" href="${href}">Quiero apartarlo</a>
        </div>
      </article>
    `;
  }

  function renderFila(categoria, grupos, expandida) {
    const label = labelCategoria(categoria);
    const total = grupos.length;
    const talla = grupos[0]?.talla;
    const meta = `${total} ${total === 1 ? "diseño" : "diseños"}${talla ? ` · ${esc(talla)}` : ""}`;

    return `
      <section class="cat-row${expandida ? " is-expanded" : ""}" data-category="${esc(categoria)}" aria-labelledby="cat-${esc(categoria)}">
        <header class="cat-row-head">
          <div>
            <h3 class="cat-row-title" id="cat-${esc(categoria)}">${esc(label)}</h3>
            <p class="cat-row-meta">${meta}</p>
          </div>
          <div class="cat-row-tools">
            <span class="cat-hint" aria-hidden="true">desliza</span>
          </div>
        </header>
        <div class="cat-row-viewport">
          <button type="button" class="cat-arrow cat-arrow-prev" data-dir="-1" aria-label="Ver diseños anteriores de ${esc(label)}">&#8249;</button>
          <div class="cat-track" tabindex="0" role="list" aria-label="Diseños de ${esc(label)}">
            ${grupos.map(renderTarjeta).join("")}
          </div>
          <button type="button" class="cat-arrow cat-arrow-next" data-dir="1" aria-label="Ver más diseños de ${esc(label)}">&#8250;</button>
        </div>
      </section>
    `;
  }

  function actualizarEstadoFila(row) {
    const track = row.querySelector(".cat-track");
    if (!track) return;

    const max = track.scrollWidth - track.clientWidth;
    const scrollable = !row.classList.contains("is-expanded") && max > 4;

    row.classList.toggle("is-scrollable", scrollable);
    row.classList.toggle("at-start", track.scrollLeft <= 4);
    row.classList.toggle("at-end", track.scrollLeft >= max - 4);

    const [prev, next] = row.querySelectorAll(".cat-arrow");
    if (prev) prev.disabled = track.scrollLeft <= 4;
    if (next) next.disabled = track.scrollLeft >= max - 4;
  }

  function actualizarTodasLasFilas() {
    if (!grid) return;
    grid.querySelectorAll(".cat-row").forEach(actualizarEstadoFila);
  }

  function renderCatalogo() {
    if (!grid) return;

    // Si la categoría activa ya no existe (por ejemplo, se eliminó), volvemos a "todas".
    if (categoriaActiva !== "todas" && !getCategoriasDisponibles().includes(categoriaActiva)) {
      categoriaActiva = "todas";
    }

    renderCategoryFilters();

    const grupos = agruparPorPersonaje(filtrarCatalogo());
    const porCategoria = new Map();
    grupos.forEach((grupo) => {
      if (!porCategoria.has(grupo.categoria)) porCategoria.set(grupo.categoria, []);
      porCategoria.get(grupo.categoria).push(grupo);
    });

    if (!grupos.length) {
      grid.innerHTML = "";
      const hayBusquedaOFiltro = (searchInput && searchInput.value.trim()) || categoriaActiva !== "todas";
      emptyState.textContent = (!CATALOGO_CARGADO && !hayBusquedaOFiltro)
        ? "Cargando catálogo..."
        : "No encontramos bebés con ese nombre, prueba con otra búsqueda.";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const expandida = categoriaActiva !== "todas";
    const categorias = [...porCategoria.keys()].sort((a, b) => ordenCategoria(a) - ordenCategoria(b) || a.localeCompare(b));
    grid.innerHTML = categorias.map((categoria) => renderFila(categoria, porCategoria.get(categoria), expandida)).join("");

    grid.querySelectorAll(".cat-row").forEach((row) => {
      const track = row.querySelector(".cat-track");
      let ticking = false;
      track.addEventListener("scroll", () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          actualizarEstadoFila(row);
          ticking = false;
        });
      }, { passive: true });
    });

    requestAnimationFrame(actualizarTodasLasFilas);
  }

  /* ---------------------------------------------------------
     Eventos (delegados: sobreviven a cada re-render)
     --------------------------------------------------------- */
  if (grid) {
    grid.addEventListener("click", (event) => {
      const arrow = event.target.closest(".cat-arrow");
      if (!arrow) return;
      const row = arrow.closest(".cat-row");
      const track = row.querySelector(".cat-track");
      const direction = Number(arrow.dataset.dir);
      row.classList.remove("is-moving-prev", "is-moving-next");
      void row.offsetWidth;
      row.classList.add(direction < 0 ? "is-moving-prev" : "is-moving-next");
      window.setTimeout(() => row.classList.remove("is-moving-prev", "is-moving-next"), 360);
      track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: "smooth" });
    });
  }

  if (categoryFilters) {
    categoryFilters.addEventListener("click", (event) => {
      const chip = event.target.closest(".filter-chip");
      if (!chip) return;
      categoriaActiva = chip.dataset.category;
      renderCatalogo();
    });
  }

  if (searchInput) searchInput.addEventListener("input", renderCatalogo);

  let resizeQueued = false;
  window.addEventListener("resize", () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      actualizarTodasLasFilas();
      resizeQueued = false;
    });
  });

  window.addEventListener("catalogo:render", renderCatalogo);
  window.renderCatalogo = renderCatalogo;

  /* ---------------------------------------------------------
     INICIAR
     --------------------------------------------------------- */
  const anio = document.getElementById("anio-actual");
  if (anio) anio.textContent = new Date().getFullYear();

    mostrarToastAnticipo();
  renderCatalogo();
  CATALOGO_READY.then(() => {
    CATALOGO_CARGADO = true;
    renderCatalogo();
  });
  CATEGORY_ORDER_READY.then(() => renderCatalogo());
})();