(function () {
  "use strict";

  if (!sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY)) return;

  const CLOUDINARY_CLOUD_NAME = "iuyecqml";
  const CLOUDINARY_UPLOAD_PRESET = "maternity_catalogo";
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];
  const CATEGORY_DEFAULTS_STORAGE_KEY = "maternityRebornCategoryDefaults";
    const progressStyleTag = document.createElement("style");
  progressStyleTag.textContent = `
    @keyframes catalogoAdminIndeterminado {
      0%   { left: -40%; width: 40%; }
      50%  { width: 60%; }
      100% { left: 100%; width: 40%; }
    }
  `;
  document.head.appendChild(progressStyleTag);

  const CATEGORIA_LABELS = {
    prematuro: "Prematuro",
    recien_nacido: "Recién nacido",
    "3_meses": "3 meses",
    silicona: "Silicona",
    silicona_premium: "Silicona premium"
  };

  function crearClaveCategoria(label) {
    return String(label || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function obtenerCategorias() {
    return [...new Set(CATALOGO.flatMap((product) => product.categorias || []))].filter(Boolean);
  }

  function actualizarOpcionesCategoria(selectedCategory = "") {
    const select = overlay.querySelector("#catalogo-admin-category");
    if (!select) return;
    const categories = obtenerCategorias();
    select.innerHTML = categories.map((category) => `<option value="${category}">${CATEGORIA_LABELS[category] || category.replace(/_/g, " ")}</option>`).join("");
    if (selectedCategory && !categories.includes(selectedCategory)) {
      select.insertAdjacentHTML("beforeend", `<option value="${selectedCategory}">${CATEGORIA_LABELS[selectedCategory] || selectedCategory.replace(/_/g, " ")}</option>`);
    }
    select.value = selectedCategory || categories[0] || "recien_nacido";
  }

  // ===== Valores estándar por categoría (talla, material, descripción, qué incluye) =====
  // Se guardan localmente en el navegador del admin; no viajan a Google Sheets,
  // sólo se usan para prellenar el formulario cuando eliges/creas una categoría.
  function obtenerDefaultsCategorias() {
    try {
      return JSON.parse(localStorage.getItem(CATEGORY_DEFAULTS_STORAGE_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function guardarDefaultsCategoria(key, defaults) {
    const todos = obtenerDefaultsCategorias();
    todos[key] = defaults;
    try {
      localStorage.setItem(CATEGORY_DEFAULTS_STORAGE_KEY, JSON.stringify(todos));
    } catch (error) {
      console.warn("No se pudieron guardar los valores estándar de la categoría:", error);
    }
  }

  function obtenerDefaultsCategoria(key) {
    return obtenerDefaultsCategorias()[key] || null;
  }

  // Aviso de tamaño en localStorage (ahora solo guardamos URLs de texto,
  // así que este límite ya casi nunca se debería alcanzar).
  const AVISO_TAMANO_BYTES = 3.5 * 1024 * 1024;

  const catalogoHeading = document.querySelector(".catalogo-heading");
  if (!catalogoHeading) return;

  const editor = document.createElement("section");
  editor.className = "catalogo-admin-tools";
    editor.innerHTML = `
    <div>
      <p class="eyebrow"><i></i>Modo administrador</p>
      <p>Los cambios se guardan en Google Sheets y se reflejan para todos tus clientes.</p>
    </div>
    <button type="button" class="btn-primary" id="catalogo-admin-add">Agregar producto</button>
    <button type="button" class="btn-secondary" id="catalogo-admin-manage">Editar productos</button>
    <button type="button" class="btn-secondary" id="catalogo-admin-order">Ordenar categorías</button>
    <a href="admin.html" class="btn-secondary" id="catalogo-admin-back" style="text-align:center;text-decoration:none;">Ir al panel admin</a>
  `;
  catalogoHeading.insertAdjacentElement("afterend", editor);

  const overlay = document.createElement("div");
  overlay.className = "catalogo-admin-modal";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="catalogo-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="catalogo-admin-title">
      <button type="button" class="modal-close" id="catalogo-admin-close" aria-label="Cerrar">&times;</button>
      <p class="eyebrow">Editor de catálogo</p>
      <h2 id="catalogo-admin-title">Editar producto</h2>
      <p class="catalogo-admin-storage-note" id="catalogo-admin-storage-note" hidden></p>

      <div class="catalogo-admin-grid-header" id="catalogo-admin-grid-header" style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px;">
        <label class="search-field" for="catalogo-admin-search" style="flex:1;min-width:200px;">
          <span class="search-label">Buscar producto</span>
          <input id="catalogo-admin-search" type="search" placeholder="Nombre o código" autocomplete="off">
        </label>
        <button type="button" class="btn-primary" id="catalogo-admin-add-in-grid">Agregar producto</button>
      </div>

      <div class="catalogo-admin-bulk-bar" id="catalogo-admin-bulk-bar">
        <label class="catalogo-admin-select-all">
          <input type="checkbox" id="catalogo-admin-select-all-input">
          Seleccionar todo
        </label>
        <span id="catalogo-admin-bulk-count">0 seleccionados</span>
        <button type="button" class="catalogo-admin-delete" id="catalogo-admin-bulk-delete" disabled>Eliminar seleccionados</button>
      </div>
      <div class="catalogo-admin-products" id="catalogo-admin-products"></div>

      <form id="catalogo-admin-form" class="catalogo-admin-form" hidden>
        <input type="hidden" id="catalogo-admin-id">
        <label class="field-label" for="catalogo-admin-name">Nombre</label>
        <input class="field-input" id="catalogo-admin-name" required>
        <textarea id="catalogo-admin-description" hidden></textarea>

        <div class="catalogo-admin-fields">
          <div><label class="field-label" for="catalogo-admin-code">Código</label><input class="field-input" id="catalogo-admin-code" required></div>
          <div>
            <label class="field-label" for="catalogo-admin-category">Categoría</label>
            <div class="catalogo-admin-category-control">
              <select class="field-input" id="catalogo-admin-category"></select>
              <button type="button" class="btn-primary catalogo-admin-new-category-btn" id="catalogo-admin-new-category">+ Nueva categoría</button>
              <button type="button" class="btn-secondary" id="catalogo-admin-edit-category">Editar estándar</button>
            </div>
          </div>
          <div><label class="field-label" for="catalogo-admin-price">Precio MXN</label><input class="field-input" id="catalogo-admin-price" type="number" min="0" step="1" required></div>
        </div>

        <input type="hidden" id="catalogo-admin-size">
        <input type="hidden" id="catalogo-admin-material">

        <div class="catalogo-admin-category-summary" id="catalogo-admin-category-summary" style="border:1px solid rgba(0,0,0,0.08);border-radius:12px;padding:14px 16px;margin:4px 0 16px;background:rgba(0,0,0,0.02);font-size:0.9em;color:#555;line-height:1.5;"></div>

        <div class="catalogo-admin-category-card" id="catalogo-admin-category-card" hidden style="border:1px solid rgba(0,0,0,0.12);border-radius:12px;padding:16px;margin:4px 0 16px;background:rgba(0,0,0,0.02);">
          <p class="eyebrow" id="catalogo-admin-category-card-title">Nueva categoría estándar</p>
          <label class="field-label" for="catalogo-admin-new-cat-name">Nombre de la categoría</label>
          <input class="field-input" id="catalogo-admin-new-cat-name" placeholder="Ej. 6 meses">
          <label class="field-label" for="catalogo-admin-new-cat-talla">Talla / medida estándar</label>
          <textarea class="field-input" id="catalogo-admin-new-cat-talla" rows="2" placeholder="Ej. 45 cm&#10;Peso 1.800 kg aprox."></textarea>
          <label class="field-label" for="catalogo-admin-new-cat-material">Material estándar</label>
          <input class="field-input" id="catalogo-admin-new-cat-material" placeholder="Ej. Vinilo reborn">
          <label class="field-label" for="catalogo-admin-new-cat-descripcion">Descripción estándar</label>
          <textarea class="field-input" id="catalogo-admin-new-cat-descripcion" rows="3" placeholder="Descripción que llevarán todos los bebés de esta categoría"></textarea>
          <label class="field-label" for="catalogo-admin-new-cat-incluye">Qué incluye (una línea por elemento)</label>
          <textarea class="field-input" id="catalogo-admin-new-cat-incluye" rows="3" placeholder="Bebé Reborn con ropita, chupón y cobija&#10;Ropita extra y accesorios&#10;Hoja de nacimiento y certificado"></textarea>
          <p class="admin-error" id="catalogo-admin-new-cat-message" role="status" hidden></p>
          <div class="catalogo-admin-actions">
            <button type="button" class="btn-primary" id="catalogo-admin-new-cat-save">Guardar categoría</button>
            <button type="button" class="btn-secondary" id="catalogo-admin-new-cat-cancel">Cancelar</button>
          </div>
        </div>

        <div class="catalogo-admin-gallery-head"><label class="field-label" for="catalogo-admin-gallery-files">Imágenes del producto</label><button type="button" class="btn-secondary catalogo-admin-add-images" id="catalogo-admin-add-images">Añadir imágenes</button></div>
        <div id="catalogo-admin-upload-progress" hidden style="margin:8px 0 14px;">
          <div style="display:flex;justify-content:space-between;font-size:0.85em;color:#666;margin-bottom:4px;">
            <span id="catalogo-admin-upload-progress-label">Subiendo...</span>
            <span id="catalogo-admin-upload-progress-percent">0%</span>
          </div>
          <div style="width:100%;height:8px;border-radius:999px;background:rgba(0,0,0,0.08);overflow:hidden;">
            <div id="catalogo-admin-upload-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#a97fb3,#7c5a92);border-radius:999px;transition:width 0.2s ease;"></div>
          </div>
        </div>
        <input class="catalogo-admin-file-hidden" id="catalogo-admin-gallery-files" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple>
        <div class="catalogo-admin-gallery" id="catalogo-admin-gallery" aria-live="polite"></div>
        <p class="catalogo-admin-hint" id="catalogo-admin-upload-hint">Arrastra para ordenar. La primera imagen será la portada. Sólo JPEG, JPG o PNG de máximo 5 MB.</p>
        <label class="catalogo-admin-check"><input id="catalogo-admin-available" type="checkbox"> Disponible</label>
        <label class="catalogo-admin-check"><input id="catalogo-admin-new" type="checkbox"> Marcar como nuevo</label>
        <label class="catalogo-admin-check"><input id="catalogo-admin-promotion" type="checkbox"> Mostrar banner de promoción</label>
        <div class="catalogo-admin-actions"><button type="submit" class="btn-primary">Guardar cambios</button><button type="button" class="btn-secondary" id="catalogo-admin-cancel">Cancelar</button></div>
        <div id="catalogo-admin-save-progress" hidden style="margin:10px 0;">
          <div style="font-size:0.85em;color:#666;margin-bottom:4px;">Guardando en Google Sheets...</div>
          <div style="position:relative;width:100%;height:8px;border-radius:999px;background:rgba(0,0,0,0.08);overflow:hidden;">
            <div id="catalogo-admin-save-progress-bar" style="position:absolute;top:0;height:100%;width:40%;left:-40%;background:linear-gradient(90deg,#a97fb3,#7c5a92);border-radius:999px;animation:catalogoAdminIndeterminado 1.1s ease-in-out infinite;"></div>
  </div>
</div>
<p class="admin-error" id="catalogo-admin-message" role="status" hidden></p>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  const migrationInput = document.createElement("input");
  migrationInput.type = "file";
  migrationInput.accept = ".jpg,.jpeg,.png,image/jpeg,image/png";
  migrationInput.multiple = true;
  migrationInput.webkitdirectory = true;
  migrationInput.id = "catalogo-admin-migration-files";
  migrationInput.hidden = true;
  document.body.appendChild(migrationInput);

  const products = overlay.querySelector("#catalogo-admin-products");
  const form = overlay.querySelector("#catalogo-admin-form");
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
      event.preventDefault();
    }
  });
  const storageNote = overlay.querySelector("#catalogo-admin-storage-note");
  const imageGallery = overlay.querySelector("#catalogo-admin-gallery");
  const imageFileInput = overlay.querySelector("#catalogo-admin-gallery-files");
  const bulkCount = overlay.querySelector("#catalogo-admin-bulk-count");
  const bulkDeleteBtn = overlay.querySelector("#catalogo-admin-bulk-delete");
  const selectAllCheckbox = overlay.querySelector("#catalogo-admin-select-all-input");
  const bulkBar = overlay.querySelector("#catalogo-admin-bulk-bar");
  const gridHeader = overlay.querySelector("#catalogo-admin-grid-header");
  const searchInput = overlay.querySelector("#catalogo-admin-search");
  const addInGridBtn = overlay.querySelector("#catalogo-admin-add-in-grid");
  const categorySelect = overlay.querySelector("#catalogo-admin-category");
  const categoryCard = overlay.querySelector("#catalogo-admin-category-card");
  const categoryCardTitle = overlay.querySelector("#catalogo-admin-category-card-title");
  const categorySummary = overlay.querySelector("#catalogo-admin-category-summary");
  const newCategoryBtn = overlay.querySelector("#catalogo-admin-new-category");
  const editCategoryBtn = overlay.querySelector("#catalogo-admin-edit-category");
  const newCategoryNameInput = overlay.querySelector("#catalogo-admin-new-cat-name");
  const newCategoryTallaInput = overlay.querySelector("#catalogo-admin-new-cat-talla");
  const newCategoryMaterialInput = overlay.querySelector("#catalogo-admin-new-cat-material");
  const newCategoryDescInput = overlay.querySelector("#catalogo-admin-new-cat-descripcion");
  const newCategoryIncluyeInput = overlay.querySelector("#catalogo-admin-new-cat-incluye");
  const newCategoryMessage = overlay.querySelector("#catalogo-admin-new-cat-message");
  const newCategorySaveBtn = overlay.querySelector("#catalogo-admin-new-cat-save");
  const newCategoryCancelBtn = overlay.querySelector("#catalogo-admin-new-cat-cancel");
    const uploadProgressWrap = overlay.querySelector("#catalogo-admin-upload-progress");
  const uploadProgressBar = overlay.querySelector("#catalogo-admin-upload-progress-bar");
  const uploadProgressLabel = overlay.querySelector("#catalogo-admin-upload-progress-label");
  const uploadProgressPercent = overlay.querySelector("#catalogo-admin-upload-progress-percent");
  const saveProgressWrap = overlay.querySelector("#catalogo-admin-save-progress");

  function mostrarProgresoSubida(label) {
    uploadProgressLabel.textContent = label;
    uploadProgressPercent.textContent = "0%";
    uploadProgressBar.style.width = "0%";
    uploadProgressWrap.hidden = false;
  }

  function actualizarProgresoSubida(percent, label) {
    if (label) uploadProgressLabel.textContent = label;
    const clamped = Math.max(0, Math.min(100, percent));
    uploadProgressBar.style.width = `${clamped}%`;
    uploadProgressPercent.textContent = `${Math.round(clamped)}%`;
  }

  function ocultarProgresoSubida() {
    uploadProgressWrap.hidden = true;
  }

  function mostrarProgresoGuardado() {
    saveProgressWrap.hidden = false;
  }

  function ocultarProgresoGuardado() {
    saveProgressWrap.hidden = true;
  }

  let editingProduct = null;
  let selectedIds = new Set();
  let galleryImages = [];
  let draggedImageIndex = null;
  let categoriaIncluyeActual = null;

  function obtenerProductosFiltrados() {
    const term = (searchInput.value || "").trim().toLowerCase();
    if (!term) return CATALOGO;
    return CATALOGO.filter((product) => {
      const categoriaLabel = (product.categorias || []).join(" ");
      return [product.nombre, product.codigo, categoriaLabel].filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }

  function actualizarBarraSeleccion(filtrados) {
    const lista = filtrados || CATALOGO;
    selectedIds = new Set([...selectedIds].filter((id) => CATALOGO.some((item) => String(item.id) === id)));
    const count = selectedIds.size;
    bulkCount.textContent = `${count} seleccionado${count === 1 ? "" : "s"}`;
    bulkDeleteBtn.disabled = count === 0;
    const visibleSelectedCount = lista.filter((item) => selectedIds.has(String(item.id))).length;
    selectAllCheckbox.checked = lista.length > 0 && visibleSelectedCount === lista.length;
    selectAllCheckbox.indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < lista.length;
  }

  function cloudinaryConfigurado() {
    return Boolean(
      CLOUDINARY_CLOUD_NAME && !CLOUDINARY_CLOUD_NAME.startsWith("TU_") &&
      CLOUDINARY_UPLOAD_PRESET && !CLOUDINARY_UPLOAD_PRESET.startsWith("TU_")
    );
  }

  function subirImagenCloudinary(file, onProgress) {
    return new Promise((resolve, reject) => {
      try {
        validarImagen(file);
      } catch (error) {
        reject(error);
        return;
      }
      if (!cloudinaryConfigurado()) {
        reject(new Error("Falta configurar Cloudinary en catalogo-admin.js (CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET)."));
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress((event.loaded / event.total) * 100);
        }
      });

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
            resolve(data.secure_url);
          } else {
            reject(new Error(data?.error?.message || "No se pudo subir la imagen a Cloudinary."));
          }
        } catch (error) {
          reject(new Error("Respuesta inválida de Cloudinary."));
        }
      };

      xhr.onerror = () => reject(new Error("No se pudo conectar con Cloudinary."));
      xhr.send(formData);
    });
  }

  function validarImagen(file) {
    const extensionValida = /\.(jpe?g|png)$/i.test(file.name || "");
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || !extensionValida) {
      throw new Error(`"${file.name}" no es válido. Sólo se permiten archivos JPEG, JPG o PNG.`);
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`"${file.name}" supera el máximo de 5 MB.`);
    }
  }

  function rutaNormalizada(ruta) {
    return String(ruta || "").replace(/\\/g, "/").replace(/^\.\//, "");
  }

  function tamanoActualCatalogo() {
    try {
      return JSON.stringify(CATALOGO).length;
    } catch (error) {
      return 0;
    }
  }

  function actualizarAvisoTamano() {
    const tamano = tamanoActualCatalogo();
    if (tamano > AVISO_TAMANO_BYTES) {
      const mb = (tamano / (1024 * 1024)).toFixed(1);
      storageNote.textContent = `Aviso: el catálogo ya ocupa ~${mb} MB en este navegador. Revisa si hay imágenes guardadas como base64 (de antes de usar Cloudinary) y reemplázalas por URL.`;
      storageNote.hidden = false;
    } else {
      storageNote.hidden = true;
    }
  }

  function imagenesUnicas(images) {
    return images.filter(Boolean).filter((image, index, values) => values.indexOf(image) === index);
  }

  function renderImageGallery() {
    if (!galleryImages.length) {
      imageGallery.innerHTML = '<p class="catalogo-admin-gallery-empty">Aún no hay imágenes. Añade archivos para crear la galería.</p>';
      return;
    }

    imageGallery.innerHTML = galleryImages.map((image, index) => `
      <article class="catalogo-admin-gallery-item${index === 0 ? " is-main" : ""}" draggable="true" data-image-index="${index}">
        <img src="${cloudinaryUrl(image, 200)}" alt="Imagen ${index + 1}" width="1200" height="1600" loading="lazy" decoding="async" onerror="this.style.opacity='0.35'">
        ${index === 0 ? '<span class="catalogo-admin-gallery-badge">Principal</span>' : '<button type="button" class="catalogo-admin-gallery-main" data-gallery-action="main">Hacer principal</button>'}
        <button type="button" class="catalogo-admin-gallery-remove" data-gallery-action="remove" aria-label="Eliminar imagen ${index + 1}">&times;</button>
        <span class="catalogo-admin-gallery-order">${index + 1}</span>
      </article>
    `).join("");

    imageGallery.querySelectorAll(".catalogo-admin-gallery-item").forEach((item) => {
      item.addEventListener("dragstart", () => {
        draggedImageIndex = Number(item.dataset.imageIndex);
        item.classList.add("is-dragging");
      });
      item.addEventListener("dragend", () => {
        draggedImageIndex = null;
        item.classList.remove("is-dragging");
      });
      item.addEventListener("dragover", (event) => event.preventDefault());
      item.addEventListener("drop", (event) => {
        event.preventDefault();
        const targetIndex = Number(item.dataset.imageIndex);
        if (draggedImageIndex === null || draggedImageIndex === targetIndex) return;
        const [movedImage] = galleryImages.splice(draggedImageIndex, 1);
        galleryImages.splice(targetIndex, 0, movedImage);
        renderImageGallery();
      });
      item.addEventListener("click", (event) => {
        const action = event.target.closest("[data-gallery-action]")?.dataset.galleryAction;
        if (!action) return;
        const index = Number(item.dataset.imageIndex);
        if (action === "remove") galleryImages.splice(index, 1);
        if (action === "main") galleryImages.unshift(...galleryImages.splice(index, 1));
        renderImageGallery();
      });
    });
  }

  // ===== Aplicar valores estándar de categoría al formulario y a la tarjeta resumen =====
  function aplicarDefaultsCategoria(categoryKey, fallback = {}) {
    const defaults = obtenerDefaultsCategoria(categoryKey);
    categoriaIncluyeActual = defaults?.incluye || fallback.incluye || null;

    const tallaInput = overlay.querySelector("#catalogo-admin-size");
    const descInput = overlay.querySelector("#catalogo-admin-description");
    const materialInput = overlay.querySelector("#catalogo-admin-material");

    const talla = defaults?.talla || fallback.talla || "";
    const descripcion = defaults?.descripcion || fallback.descripcion || "";
    const material = defaults?.material || fallback.material || "Vinilo reborn";

    tallaInput.value = talla;
    descInput.value = descripcion;
    materialInput.value = material;

    renderCategorySummary({ talla, descripcion, material, incluye: categoriaIncluyeActual });
  }

  function renderCategorySummary({ talla, descripcion, material, incluye }) {
    const incluyeHtml = (incluye || []).length
      ? `<ul style="margin:4px 0 0;padding-left:18px;">${incluye.map((item) => `<li>${item}</li>`).join("")}</ul>`
      : '<span style="color:#a8a8a8;">Sin definir aún.</span>';

    categorySummary.innerHTML = `
      <strong>Estándar de esta categoría</strong><br>
      <strong>Talla:</strong><br>${(talla || "—").replace(/\n/g, "<br>")} &nbsp;·&nbsp; <strong>Material:</strong> ${material || "—"}<br>
      <strong>Descripción:</strong> ${descripcion || "—"}<br>
      <strong>Incluye:</strong> ${incluyeHtml}
    `;
  }

  categorySelect.addEventListener("change", (event) => aplicarDefaultsCategoria(event.target.value));

  function abrirTarjetaCategoria(editKey = null) {
    categoryCard.hidden = false;
    newCategoryBtn.setAttribute("aria-expanded", "true");

    if (editKey) {
      const defaults = obtenerDefaultsCategoria(editKey) || {};
      categoryCardTitle.textContent = "Editar categoría estándar";
      newCategoryNameInput.value = CATEGORIA_LABELS[editKey] || editKey.replace(/_/g, " ");
      newCategoryNameInput.disabled = true;
      newCategoryTallaInput.value = defaults.talla || "";
      newCategoryMaterialInput.value = defaults.material || "Vinilo reborn";
      newCategoryDescInput.value = defaults.descripcion || "";
      newCategoryIncluyeInput.value = (defaults.incluye || []).join("\n");
      categoryCard.dataset.editingKey = editKey;
    } else {
      categoryCardTitle.textContent = "Nueva categoría estándar";
      newCategoryNameInput.value = "";
      newCategoryNameInput.disabled = false;
      newCategoryTallaInput.value = "";
      newCategoryMaterialInput.value = "Vinilo reborn";
      newCategoryDescInput.value = "";
      newCategoryIncluyeInput.value = "";
      delete categoryCard.dataset.editingKey;
    }
    newCategoryMessage.hidden = true;
    newCategoryNameInput.focus();
  }

  function cerrarTarjetaCategoria() {
    categoryCard.hidden = true;
    newCategoryBtn.setAttribute("aria-expanded", "false");
    newCategoryNameInput.disabled = false;
    delete categoryCard.dataset.editingKey;
  }

  newCategoryBtn.addEventListener("click", () => {
    if (categoryCard.hidden || categoryCard.dataset.editingKey) abrirTarjetaCategoria(null);
    else cerrarTarjetaCategoria();
  });

  editCategoryBtn.addEventListener("click", () => {
    const currentKey = categorySelect.value;
    if (!currentKey) return;
    if (categoryCard.hidden || !categoryCard.dataset.editingKey) abrirTarjetaCategoria(currentKey);
    else cerrarTarjetaCategoria();
  });

  newCategoryCancelBtn.addEventListener("click", cerrarTarjetaCategoria);

  newCategorySaveBtn.addEventListener("click", () => {
    const editingKey = categoryCard.dataset.editingKey || null;
    const label = newCategoryNameInput.value.trim();
    const key = editingKey || crearClaveCategoria(label);
    if (!key) {
      newCategoryMessage.textContent = "Escribe un nombre para la categoría.";
      newCategoryMessage.hidden = false;
      return;
    }
    if (!editingKey) CATEGORIA_LABELS[key] = label;

    const defaults = {
      talla: newCategoryTallaInput.value.trim(),
      material: newCategoryMaterialInput.value.trim() || "Vinilo reborn",
      descripcion: newCategoryDescInput.value.trim(),
      incluye: newCategoryIncluyeInput.value.split("\n").map((line) => line.trim()).filter(Boolean)
    };
    guardarDefaultsCategoria(key, defaults);
    actualizarOpcionesCategoria(key);
    aplicarDefaultsCategoria(key);
    cerrarTarjetaCategoria();
  });

  function openEditor(product) {
    editingProduct = product || null;
    overlay.hidden = false;
    form.hidden = false;
    products.hidden = true;
    bulkBar.style.display = "none";
    gridHeader.style.display = "none";
    cerrarTarjetaCategoria();
    overlay.querySelector("#catalogo-admin-title").textContent = product ? `Editar ${product.nombre}` : "Agregar producto";
    overlay.querySelector("#catalogo-admin-id").value = product ? product.id : "";
    overlay.querySelector("#catalogo-admin-name").value = product?.nombre || "";
    overlay.querySelector("#catalogo-admin-code").value = product?.codigo || "";
    actualizarOpcionesCategoria(product?.categorias?.[0] || "recien_nacido");
    overlay.querySelector("#catalogo-admin-price").value = product?.precio || "";

    aplicarDefaultsCategoria(categorySelect.value, {
      talla: product?.talla,
      descripcion: product?.descripcion,
      material: product?.material,
      incluye: product?.incluye
    });

    galleryImages = imagenesUnicas([product?.imagen, ...(product?.fotos || [])]);
      imageFileInput.addEventListener("change", async () => {
        const files = [...imageFileInput.files];
        if (!files.length) return;
        const message = overlay.querySelector("#catalogo-admin-message");
        message.hidden = true;

        try {
          files.forEach(validarImagen);
          for (let index = 0; index < files.length; index++) {
            const file = files[index];
            const etiqueta = `Subiendo imagen ${index + 1} de ${files.length}: ${file.name}`;
            mostrarProgresoSubida(etiqueta);
            const url = await subirImagenCloudinary(file, (percent) => {
              actualizarProgresoSubida(percent, etiqueta);
            });
            galleryImages.push(url);
          }
          ocultarProgresoSubida();
          renderImageGallery();
          } catch (error) {
            ocultarProgresoSubida();
            message.textContent = error.message || "No se pudieron subir las imágenes.";
            message.hidden = false;
          } finally {
          imageFileInput.value = "";
        }
      });
    renderImageGallery();
    overlay.querySelector("#catalogo-admin-available").checked = product ? product.disponible !== false : true;
    overlay.querySelector("#catalogo-admin-new").checked = Boolean(product?.esNuevo);
    overlay.querySelector("#catalogo-admin-promotion").checked = Boolean(product?.esOferta);
    overlay.querySelector("#catalogo-admin-message").hidden = true;
    overlay.querySelector("#catalogo-admin-name").focus();
  }

  function renderProductList() {
    const filtrados = obtenerProductosFiltrados();

    if (!CATALOGO.length) {
      products.innerHTML = '<p class="catalogo-admin-empty">Todavía no hay productos en el catálogo.</p>';
      actualizarBarraSeleccion([]);
      return;
    }

    if (!filtrados.length) {
      products.innerHTML = '<p class="catalogo-admin-empty">No encontramos productos con esa búsqueda.</p>';
      actualizarBarraSeleccion(filtrados);
      return;
    }

    products.innerHTML = filtrados.map((product) => {
      const categoriaKey = product.categorias?.[0] || "";
      const categoriaLabel = CATEGORIA_LABELS[categoriaKey] || categoriaKey.replace(/_/g, " ") || "Sin categoría";
      const precio = Number(product.precio || 0).toLocaleString("es-MX");
      const disponible = product.disponible !== false;

      return `
        <div class="catalogo-admin-card" data-id="${product.id}">
          <label class="catalogo-admin-select">
            <input type="checkbox" class="catalogo-admin-select-input" data-id="${product.id}" ${selectedIds.has(String(product.id)) ? "checked" : ""}>
          </label>
          <div class="catalogo-admin-card-image">
            <img src="${cloudinaryUrl(product.imagen || "", 250)}" alt="" width="1200" height="1600" loading="lazy" decoding="async" onerror="this.style.opacity='0'">
            ${product.esNuevo ? '<span class="catalogo-admin-tag is-new">Nuevo</span>' : ""}
            ${product.esOferta ? '<span class="catalogo-admin-tag is-promotion">Promoción</span>' : ""}
            <span class="catalogo-admin-tag ${disponible ? "is-available" : "is-unavailable"}">${disponible ? "Disponible" : "Apartado"}</span>
          </div>
          <div class="catalogo-admin-card-body">
            <h3>${product.nombre}</h3>
            <p class="catalogo-admin-card-meta">${categoriaLabel}${product.codigo ? ` · ${product.codigo}` : ""}</p>
            <p class="catalogo-admin-card-price">$${precio} MXN</p>
          </div>
          <div class="catalogo-admin-card-actions">
            <button type="button" class="btn-secondary catalogo-admin-edit" data-id="${product.id}">Editar</button>
            <button type="button" class="catalogo-admin-delete" data-id="${product.id}" aria-label="Eliminar ${product.nombre}">Eliminar</button>
          </div>
        </div>
      `;
    }).join("");

    products.querySelectorAll(".catalogo-admin-edit").forEach((button) => {
      button.addEventListener("click", () => {
        const product = CATALOGO.find((item) => String(item.id) === button.dataset.id);
        openEditor(product);
      });
    });

    products.querySelectorAll(".catalogo-admin-delete").forEach((button) => {
      button.addEventListener("click", () => eliminarProducto(button.dataset.id));
    });

    products.querySelectorAll(".catalogo-admin-select-input").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const id = checkbox.dataset.id;
        if (checkbox.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        actualizarBarraSeleccion(filtrados);
      });
    });

    actualizarBarraSeleccion(filtrados);
  }

  async function eliminarProducto(id) {
    const product = CATALOGO.find((item) => String(item.id) === String(id));
    if (!product) return;

    const confirmado = window.confirm(`¿Eliminar "${product.nombre}" del catálogo? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    const respaldo = CATALOGO.slice();
    const index = CATALOGO.findIndex((item) => String(item.id) === String(id));
    CATALOGO.splice(index, 1);

    const resultado = guardarCatalogo();
    const remoto = await guardarCatalogoRemoto(sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY));
    if (!resultado.ok || !remoto.ok) {
      CATALOGO.splice(0, CATALOGO.length, ...respaldo);
      guardarCatalogo();
      alert(`No se pudo eliminar el producto: ${remoto.error || "falló el guardado local"}`);
      return;
    }

    selectedIds.delete(String(id));
    window.dispatchEvent(new Event("catalogo:render"));
    renderProductList();
    actualizarAvisoTamano();
  }

  function showProductGrid() {
    bulkBar.style.display = "";
    gridHeader.style.display = "flex";
    cerrarTarjetaCategoria();
    renderProductList();
    actualizarAvisoTamano();
    overlay.hidden = false;
    form.hidden = true;
    products.hidden = false;
    overlay.querySelector("#catalogo-admin-title").textContent = "Editar productos";
  }

  function closeEditor() {
    overlay.hidden = true;
    form.hidden = true;
    products.hidden = false;
    cerrarTarjetaCategoria();
    editingProduct = null;
  }

  async function migrarImagenesExistentes(files) {
    const message = overlay.querySelector("#catalogo-admin-message");
    const imageMap = new Map();
    const archivos = [...files];

    if (!archivos.length) return;
    overlay.hidden = false;
    form.hidden = true;
    products.hidden = false;
    message.hidden = false;

    try {
      for (let index = 0; index < archivos.length; index++) {
        const file = archivos[index];
        message.textContent = `Subiendo imagen ${index + 1} de ${archivos.length}: ${file.name}`;
        const url = await subirImagenCloudinary(file);
        imageMap.set(rutaNormalizada(file.webkitRelativePath || file.name), url);
      }

      let cambios = 0;
      CATALOGO.forEach((product) => {
        const fotosOriginales = product.fotos || [product.imagen];
        const buscarUrl = (foto) => {
          const ruta = rutaNormalizada(foto);
          const coincidencia = [...imageMap.entries()].find(([archivo]) => archivo === ruta || archivo.endsWith(`/${ruta}`) || ruta.endsWith(`/${archivo}`));
          return coincidencia ? coincidencia[1] : foto;
        };
        const fotosActualizadas = fotosOriginales.map(buscarUrl);
        const imagenActualizada = buscarUrl(product.imagen) || fotosActualizadas[0] || product.imagen;
        if (imagenActualizada !== product.imagen || JSON.stringify(fotosActualizadas) !== JSON.stringify(fotosOriginales)) {
          product.imagen = imagenActualizada;
          product.fotos = fotosActualizadas;
          cambios++;
        }
      });

      const resultado = guardarCatalogo();
      const remoto = await guardarCatalogoRemoto(sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY));
      if (!resultado.ok || !remoto.ok) throw new Error(remoto.error || "No se pudo guardar el catálogo actualizado.");

      window.dispatchEvent(new Event("catalogo:render"));
      renderProductList();
      message.textContent = `Migración terminada: ${archivos.length} imágenes subidas y ${cambios} productos actualizados.`;
      message.classList.add("is-success");
    } catch (error) {
      message.textContent = error.message || "No se pudo completar la migración.";
      message.classList.remove("is-success");
    }
  }

  editor.querySelector("#catalogo-admin-add").addEventListener("click", () => openEditor(null));
  editor.querySelector("#catalogo-admin-manage").addEventListener("click", showProductGrid);
  addInGridBtn.addEventListener("click", () => openEditor(null));
  searchInput.addEventListener("input", () => renderProductList());

  migrationInput.addEventListener("change", () => {
    migrarImagenesExistentes(migrationInput.files);
    migrationInput.value = "";
  });
  overlay.querySelector("#catalogo-admin-close").addEventListener("click", closeEditor);
  overlay.querySelector("#catalogo-admin-add-images").addEventListener("click", () => imageFileInput.click());
  imageFileInput.addEventListener("change", async () => {
    const files = [...imageFileInput.files];
    if (!files.length) return;
    const message = overlay.querySelector("#catalogo-admin-message");
    try {
      files.forEach(validarImagen);
      for (let index = 0; index < files.length; index++) {
        message.hidden = false;
        message.classList.remove("is-success");
        message.textContent = `Subiendo imagen ${index + 1} de ${files.length}...`;
        galleryImages.push(await subirImagenCloudinary(files[index]));
      }
      message.hidden = true;
      renderImageGallery();
    } catch (error) {
      message.textContent = error.message || "No se pudieron subir las imágenes.";
      message.hidden = false;
    } finally {
      imageFileInput.value = "";
    }
  });
  overlay.querySelector("#catalogo-admin-cancel").addEventListener("click", () => {
    if (CATALOGO.length) {
      showProductGrid();
    } else {
      closeEditor();
    }
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeEditor();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) closeEditor();
  });

  selectAllCheckbox.addEventListener("change", () => {
    const filtrados = obtenerProductosFiltrados();
    if (selectAllCheckbox.checked) {
      filtrados.forEach((item) => selectedIds.add(String(item.id)));
    } else {
      filtrados.forEach((item) => selectedIds.delete(String(item.id)));
    }
    renderProductList();
  });

  bulkDeleteBtn.addEventListener("click", async () => {
    if (!selectedIds.size) return;
    const confirmado = window.confirm(`¿Eliminar ${selectedIds.size} producto(s) del catálogo? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    const respaldo = CATALOGO.slice();
    const idsAEliminar = new Set(selectedIds);
    CATALOGO.splice(0, CATALOGO.length, ...CATALOGO.filter((item) => !idsAEliminar.has(String(item.id))));

    const resultado = guardarCatalogo();
    const remoto = await guardarCatalogoRemoto(sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY));
    if (!resultado.ok || !remoto.ok) {
      CATALOGO.splice(0, CATALOGO.length, ...respaldo);
      guardarCatalogo();
      alert(`No se pudieron eliminar los productos: ${remoto.error || "falló el guardado local"}`);
      return;
    }

    selectedIds.clear();
    window.dispatchEvent(new Event("catalogo:render"));
    renderProductList();
    actualizarAvisoTamano();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saveButton = form.querySelector("button[type=submit]");
    const message = overlay.querySelector("#catalogo-admin-message");
    saveButton.disabled = true;
    saveButton.textContent = "Guardando...";
    mostrarProgresoGuardado();

    const respaldo = CATALOGO.slice();

    try {
      saveButton.textContent = "Guardando...";
      const images = imagenesUnicas(galleryImages);
      if (!images.length) throw new Error("Agrega al menos una imagen para el producto.");

      const nombre = overlay.querySelector("#catalogo-admin-name").value.trim();
      if (!nombre) throw new Error("Agrega un nombre para el producto.");

      const codigo = overlay.querySelector("#catalogo-admin-code").value.trim();
      if (!codigo) throw new Error("Agrega un código para el producto.");

      const codigoDuplicado = CATALOGO.some((item) =>
      String(item.codigo || "").trim().toLowerCase() === codigo.toLowerCase() &&
      String(item.id) !== String(editingProduct?.id ?? "")
      );
      if (codigoDuplicado) throw new Error(`Ya existe un producto con el código "${codigo}". Usa un código distinto.`);

      const product = {
        id: editingProduct ? editingProduct.id : Math.max(0, ...CATALOGO.map((item) => Number(item.id) || 0)) + 1,
        codigo,
        nombre,
        categoria: overlay.querySelector("#catalogo-admin-category").value,
        descripcion: overlay.querySelector("#catalogo-admin-description").value.trim(),
        precio: Number(overlay.querySelector("#catalogo-admin-price").value || 0),
        imagen: images[0],
        fotos: images,
        disponible: overlay.querySelector("#catalogo-admin-available").checked,
        talla: overlay.querySelector("#catalogo-admin-size").value.trim(),
        material: overlay.querySelector("#catalogo-admin-material").value.trim(),
        esNuevo: overlay.querySelector("#catalogo-admin-new").checked,
        esOferta: overlay.querySelector("#catalogo-admin-promotion").checked,
        incluye: categoriaIncluyeActual || editingProduct?.incluye || undefined
      };
      const normalized = crearDiseno(product);
      if (editingProduct) {
        const index = CATALOGO.findIndex((item) => String(item.id) === String(editingProduct.id));
        CATALOGO[index] = { ...editingProduct, ...normalized, id: editingProduct.id };
      } else {
        CATALOGO.push(normalized);
      }

      const resultado = guardarCatalogo();
      const remoto = await guardarCatalogoRemoto(sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY));
      if (!resultado.ok || !remoto.ok) {
        CATALOGO.splice(0, CATALOGO.length, ...respaldo);
        guardarCatalogo();
        throw new Error(remoto.error || "No se pudo guardar el catálogo en Google Sheets.");
      }

      window.dispatchEvent(new Event("catalogo:render"));
      message.textContent = "Producto guardado correctamente.";
      message.classList.add("is-success");
      message.hidden = false;
      showProductGrid();
    } catch (error) {
      message.textContent = error.message || "No se pudo guardar el producto.";
      message.classList.remove("is-success");
      message.hidden = false;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Guardar cambios";
      ocultarProgresoGuardado();
    }
  });

    // ===== Orden de categorías del catálogo =====
  const orderModal = document.createElement("div");
  orderModal.className = "catalogo-admin-modal";
  orderModal.hidden = true;
  orderModal.innerHTML = `
    <div class="catalogo-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="catalogo-order-title" style="max-width:480px;">
      <button type="button" class="modal-close" id="catalogo-order-close" aria-label="Cerrar">&times;</button>
      <p class="eyebrow">Catálogo</p>
      <h2 id="catalogo-order-title">Ordenar categorías</h2>
      <p class="catalogo-admin-hint" style="margin-top:-8px;">Así se van a mostrar las filas del catálogo para tus clientes, de arriba hacia abajo.</p>
      <div id="catalogo-order-list" style="display:grid;gap:8px;margin:16px 0;"></div>
      <div class="catalogo-admin-actions">
        <button type="button" class="btn-primary" id="catalogo-order-save">Guardar orden</button>
        <button type="button" class="btn-secondary" id="catalogo-order-cancel">Cancelar</button>
      </div>
      <p class="admin-error" id="catalogo-order-message" role="status" hidden></p>
    </div>
  `;
  document.body.appendChild(orderModal);

  const orderList = orderModal.querySelector("#catalogo-order-list");
  const orderMessage = orderModal.querySelector("#catalogo-order-message");
  let ordenActual = [];

  function etiquetaCategoria(key) {
    return CATEGORIA_LABELS[key] || key.replace(/_/g, " ");
  }

  function obtenerOrdenActual() {
    const categoriasExistentes = obtenerCategorias();
    const base = (Array.isArray(CATEGORY_ORDER_REMOTE) && CATEGORY_ORDER_REMOTE.length) ? CATEGORY_ORDER_REMOTE.slice() : [];
    categoriasExistentes.forEach((cat) => { if (!base.includes(cat)) base.push(cat); });
    return base.filter((cat) => categoriasExistentes.includes(cat));
  }

  function renderOrderList() {
    orderList.innerHTML = ordenActual.map((cat, index) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--color-line);border-radius:10px;background:var(--color-bg);">
        <span style="font-weight:600;color:var(--color-wine-dark);">${etiquetaCategoria(cat)}</span>
        <span style="display:flex;gap:6px;">
          <button type="button" class="btn-secondary" data-order-action="up" data-index="${index}" style="width:auto;margin:0;padding:6px 10px;" ${index === 0 ? "disabled" : ""} aria-label="Subir">▲</button>
          <button type="button" class="btn-secondary" data-order-action="down" data-index="${index}" style="width:auto;margin:0;padding:6px 10px;" ${index === ordenActual.length - 1 ? "disabled" : ""} aria-label="Bajar">▼</button>
        </span>
      </div>
    `).join("");
  }

  orderList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-order-action]");
    if (!button) return;
    const index = Number(button.dataset.index);
    const targetIndex = index + (button.dataset.orderAction === "up" ? -1 : 1);
    if (targetIndex < 0 || targetIndex >= ordenActual.length) return;
    [ordenActual[index], ordenActual[targetIndex]] = [ordenActual[targetIndex], ordenActual[index]];
    renderOrderList();
  });

  function openOrderModal() {
    ordenActual = obtenerOrdenActual();
    orderMessage.hidden = true;
    renderOrderList();
    orderModal.hidden = false;
  }

  function closeOrderModal() {
    orderModal.hidden = true;
  }

  orderModal.querySelector("#catalogo-order-close").addEventListener("click", closeOrderModal);
  orderModal.querySelector("#catalogo-order-cancel").addEventListener("click", closeOrderModal);
  orderModal.addEventListener("click", (event) => {
    if (event.target === orderModal) closeOrderModal();
  });

  orderModal.querySelector("#catalogo-order-save").addEventListener("click", async () => {
    const saveBtn = orderModal.querySelector("#catalogo-order-save");
    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando...";
    const resultado = await guardarOrdenCategoriasRemoto(ordenActual, sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY));
    saveBtn.disabled = false;
    saveBtn.textContent = "Guardar orden";
    if (!resultado.ok) {
      orderMessage.textContent = resultado.error || "No se pudo guardar el orden.";
      orderMessage.hidden = false;
      return;
    }
    window.dispatchEvent(new Event("catalogo:render"));
    closeOrderModal();
  });

  editor.querySelector("#catalogo-admin-order").addEventListener("click", openOrderModal);
})();