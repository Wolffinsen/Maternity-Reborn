/* =========================================================
   CATALOGO.JS
   Renderiza el catálogo, controla el modal de apartado,
   genera el folio y arma el mensaje de WhatsApp.

   NOTA IMPORTANTE:
   El folio que se genera aquí es temporal (fecha + número
   aleatorio). Cuando conectemos Google Sheets (Fase 2 del
   proyecto), el folio consecutivo real vendrá de ahí y solo
   hay que reemplazar la función generarFolio() por la llamada
   al Apps Script.
   ========================================================= */

(function () {
  "use strict";

  const ES_LABELS = {
    prematuro: "Prematuro",
    recien_nacido: "Recién nacido",
    "3_meses": "3 meses",
    silicona: "Silicona"
  };

  function activarScrollSuave() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href");
        if (!targetId || targetId === "#") return;

        const target = document.querySelector(targetId);
        if (!target) return;

        event.preventDefault();

        const top = target.getBoundingClientRect().top + window.scrollY - 90;
        const start = window.scrollY;
        const distance = top - start;
        const duration = 700;
        const startTime = performance.now();

        function paso(timestamp) {
          const progress = Math.min((timestamp - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          window.scrollTo({ top: start + distance * eased, behavior: "auto" });

          if (progress < 1) {
            requestAnimationFrame(paso);
          } else {
            window.scrollTo({ top, behavior: "auto" });
            history.pushState(null, "", targetId);
          }
        }

        requestAnimationFrame(paso);
      });
    });
  }

  const grid = document.getElementById("catalogo-grid");
  const searchInput = document.getElementById("catalogo-search");
  const categoryFilters = document.getElementById("category-filters");
  const emptyState = document.getElementById("catalogo-empty");
  const modalOverlay = document.getElementById("modal-overlay");
  const modalClose = document.getElementById("modal-close");
  const modalFormView = document.getElementById("modal-form-view");
  const modalSuccessView = document.getElementById("modal-success-view");
  const modalTitle = document.getElementById("modal-title");
  const modalPrice = document.getElementById("modal-price");
  const formApartado = document.getElementById("form-apartado");
  const inputNombre = document.getElementById("input-nombre");
  const inputTelefono = document.getElementById("input-telefono");
  const folioDisplay = document.getElementById("folio-display");
  const btnAbrirWhatsapp = document.getElementById("btn-abrir-whatsapp");
  const btnCerrarExito = document.getElementById("btn-cerrar-exito");

  let disenoSeleccionado = null;
  let categoriaActiva = "todas";

  function normalizarCategoria(categoria) {
    return categoria
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function getCategoriasDisponibles() {
    const categorias = new Set();
    CATALOGO.forEach((diseno) => {
      (diseno.categorias || []).forEach((categoria) => categorias.add(normalizarCategoria(ES_LABELS[categoria] || categoria)));
    });
    return [...categorias].sort();
  }

  function renderCategoryFilters() {
    if (!categoryFilters) return;

    const categorias = ["todas", ...getCategoriasDisponibles()];
    categoryFilters.innerHTML = categorias.map((categoria) => {
      const label = categoria === "todas" ? "Todas" : (ES_LABELS[categoria] || categoria.replace(/_/g, " "));
      const activeClass = categoria === categoriaActiva ? "is-active" : "";
      return `<button type="button" class="filter-chip ${activeClass}" data-category="${categoria}">${label}</button>`;
    }).join("");

    categoryFilters.querySelectorAll(".filter-chip").forEach((button) => {
      button.addEventListener("click", () => {
        categoriaActiva = button.dataset.category;
        renderCatalogo();
      });
    });
  }

  function filtrarCatalogo() {
    const valorBusqueda = (searchInput ? searchInput.value : "").trim().toLowerCase();

    return CATALOGO.filter((diseno) => {
      const categorias = (diseno.categorias || []).map((categoria) => normalizarCategoria(ES_LABELS[categoria] || categoria));
      const coincideCategoria = categoriaActiva === "todas" || categorias.includes(categoriaActiva);

      if (!coincideCategoria) return false;

      if (!valorBusqueda) return true;

      const textoBusqueda = [
        diseno.nombre,
        diseno.subtitulo,
        diseno.material,
        diseno.descripcion,
        ...(diseno.categorias || []).map((categoria) => ES_LABELS[categoria] || categoria)
      ].join(" ").toLowerCase();

      return textoBusqueda.includes(valorBusqueda);
    });
  }

  function renderCatalogo() {
    if (!grid) return;

    renderCategoryFilters();
    const productos = filtrarCatalogo();
    grid.innerHTML = "";

    if (productos.length === 0) {
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;

    productos.forEach((diseno) => {
      const tarjeta = document.createElement("div");
      tarjeta.className = "tarjeta";

      const categoriasHtml = (diseno.categorias || []).map((categoria) => {
        const label = ES_LABELS[categoria] || categoria.replace(/_/g, " ");
        return `<span class="product-badge">${label}</span>`;
      }).join("");

      tarjeta.innerHTML = `
        <div class="tarjeta-imagen-wrap">
          <span class="badge ${diseno.disponible ? "" : "apartado"}">
            ${diseno.disponible ? "Disponible" : "Apartado"}
          </span>
          <div class="tarjeta-badges">${categoriasHtml}</div>
          <img src="${diseno.imagen}" alt="Diseño ${diseno.nombre}" loading="lazy">
        </div>
        <div class="tarjeta-info">
          <h3 class="tarjeta-nombre">${diseno.nombre}</h3>
          <p class="tarjeta-sub">${diseno.subtitulo || "Pieza única hecha a mano"}</p>
          <p class="tarjeta-precio">$${diseno.precio} MXN</p>
          <a class="btn-detalle" href="detalle.html?id=${diseno.id}">Ver características</a>
          <button
            type="button"
            class="btn-apartar"
            data-id="${diseno.id}"
            ${diseno.disponible ? "" : "disabled"}
          >
            ${diseno.disponible ? "Apartar este bebé" : "Ya apartado"}
          </button>
        </div>
      `;

      grid.appendChild(tarjeta);
    });

    document.querySelectorAll(".btn-apartar").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        abrirModal(id);
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", renderCatalogo);
  }

  /* ---------------------------------------------------------
     2. MODAL: abrir / cerrar
     --------------------------------------------------------- */
  function abrirModal(id) {
    disenoSeleccionado = CATALOGO.find((d) => d.id === id);
    if (!disenoSeleccionado) return;

    modalTitle.textContent = disenoSeleccionado.nombre;
    modalPrice.textContent = `$${disenoSeleccionado.precio} MXN`;

    modalFormView.hidden = false;
    modalSuccessView.hidden = true;
    formApartado.reset();

    modalOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function cerrarModal() {
    modalOverlay.hidden = true;
    document.body.style.overflow = "";
    disenoSeleccionado = null;
  }

  modalClose.addEventListener("click", cerrarModal);
  btnCerrarExito.addEventListener("click", cerrarModal);

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) cerrarModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay.hidden) cerrarModal();
  });

  /* ---------------------------------------------------------
     3. FOLIO
     -----------------------------------------------------------
     Si URL_APPS_SCRIPT está configurada, el folio consecutivo
     real viene de Google Sheets. Si no, o si falla la conexión,
     se genera un folio temporal local (fecha + aleatorio) para
     que el cliente nunca se quede sin poder apartar.
     --------------------------------------------------------- */
  function generarFolioTemporal() {
    const ahora = new Date();
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, "0");
    const dd = String(ahora.getDate()).padStart(2, "0");
    const aleatorio = Math.floor(1000 + Math.random() * 9000); // 4 dígitos

    return `AP-${yyyy}${mm}${dd}-${aleatorio}`;
  }

  async function obtenerFolio(diseno, nombreCliente, telefonoCliente) {
    // Sin URL configurada todavía → folio temporal, sin guardar en Sheets
    if (!URL_APPS_SCRIPT) {
      return generarFolioTemporal();
    }

    try {
      const respuesta = await fetch(URL_APPS_SCRIPT, {
        method: "POST",
        body: JSON.stringify({
          diseno: diseno.nombre,
          precio: diseno.precio,
          nombreCliente: nombreCliente,
          telefonoCliente: telefonoCliente
        })
      });

      const resultado = await respuesta.json();

      if (resultado.ok && resultado.folio) {
        return resultado.folio;
      }
      // Si Sheets respondió pero con error, usamos folio temporal como respaldo
      return generarFolioTemporal();

    } catch (error) {
      // Sin internet o el script falló: el cliente igual puede apartar
      console.error("No se pudo conectar con Google Sheets:", error);
      return generarFolioTemporal();
    }
  }

  /* ---------------------------------------------------------
     4. ARMAR MENSAJE Y ABRIR WHATSAPP
     --------------------------------------------------------- */
  function construirEnlaceWhatsapp(folio, nombreCliente, diseno) {
    const mensaje =
      `Hola, quiero apartar mi bebé 👶\n\n` +
      `Diseño: ${diseno.nombre}\n` +
      `Folio: ${folio}\n` +
      `Precio del diseño: $${diseno.precio} MXN\n` +
      `Anticipo de apartado: $${COSTO_APARTADO} MXN\n` +
      `Nombre: ${nombreCliente}`;

    const mensajeCodificado = encodeURIComponent(mensaje);
    return `https://wa.me/${NUMERO_WHATSAPP}?text=${mensajeCodificado}`;
  }

  /* ---------------------------------------------------------
     5. ENVÍO DEL FORMULARIO
     --------------------------------------------------------- */
  const btnConfirmar = document.getElementById("btn-confirmar");

  formApartado.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!disenoSeleccionado) return;

    const nombreCliente = inputNombre.value.trim();
    const telefonoCliente = inputTelefono.value.trim();

    if (!nombreCliente || !telefonoCliente) return;

    // Estado de carga mientras se genera/guarda el folio
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Generando tu folio...";

    const folio = await obtenerFolio(disenoSeleccionado, nombreCliente, telefonoCliente);

    const enlaceWhatsapp = construirEnlaceWhatsapp(
      folio,
      nombreCliente,
      disenoSeleccionado
    );

    // Mostrar vista de éxito con el folio
    folioDisplay.textContent = folio;
    btnAbrirWhatsapp.href = enlaceWhatsapp;

    modalFormView.hidden = true;
    modalSuccessView.hidden = false;

    btnConfirmar.disabled = false;
    btnConfirmar.textContent = "Continuar a WhatsApp";

    // Abrir WhatsApp automáticamente en una pestaña nueva
    window.open(enlaceWhatsapp, "_blank");
  });

  /* ---------------------------------------------------------
     INICIAR
     --------------------------------------------------------- */
  document.getElementById("anio-actual").textContent = new Date().getFullYear();
  activarScrollSuave();
  renderCatalogo();
})();
