(function () {
  "use strict";

  if (sessionStorage.getItem(ADMIN_SESSION_KEY) !== "true") return;

  /* =========================================================
     CONFIGURA AQUÍ TU CUENTA GRATIS DE CLOUDINARY
     1. Crea una cuenta en https://cloudinary.com (plan free)
     2. Copia tu "Cloud name" del Dashboard
     3. Crea un Upload Preset con Signing Mode = Unsigned
        (Settings → Upload → Upload presets → Add upload preset)
     4. Pega ambos valores abajo
     ========================================================= */
  const CLOUDINARY_CLOUD_NAME = "iuyecqml";
  const CLOUDINARY_UPLOAD_PRESET = "maternity_catalogo";
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];

  const CATEGORIA_LABELS = {
    prematuro: "Prematuro",
    recien_nacido: "Recién nacido",
    "3_meses": "3 meses",
    silicona: "Silicona",
    silicona_premium: "Silicona premium"
  };

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
      <div class="catalogo-admin-products" id="catalogo-admin-products"></div>
      <form id="catalogo-admin-form" class="catalogo-admin-form" hidden>
        <input type="hidden" id="catalogo-admin-id">
        <label class="field-label" for="catalogo-admin-name">Nombre</label>
        <input class="field-input" id="catalogo-admin-name" required>
        <label class="field-label" for="catalogo-admin-description">Descripción</label>
        <textarea class="field-input" id="catalogo-admin-description" rows="3" required></textarea>
        <div class="catalogo-admin-fields">
          <div><label class="field-label" for="catalogo-admin-category">Categoría</label><select class="field-input" id="catalogo-admin-category"><option value="prematuro">Prematuro</option><option value="recien_nacido">Recién nacido</option><option value="3_meses">3 meses</option><option value="silicona">Silicona</option><option value="silicona_premium">Silicona premium</option></select></div>
          <div><label class="field-label" for="catalogo-admin-price">Precio MXN</label><input class="field-input" id="catalogo-admin-price" type="number" min="0" step="1" required></div>
          <div><label class="field-label" for="catalogo-admin-size">Talla</label><input class="field-input" id="catalogo-admin-size" required></div>
          <div><label class="field-label" for="catalogo-admin-material">Material</label><input class="field-input" id="catalogo-admin-material" required></div>
        </div>
        <div class="catalogo-admin-gallery-head"><label class="field-label" for="catalogo-admin-gallery-files">Imágenes del producto</label><button type="button" class="btn-secondary catalogo-admin-add-images" id="catalogo-admin-add-images">Añadir imágenes</button></div>
        <input class="catalogo-admin-file-hidden" id="catalogo-admin-gallery-files" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple>
        <div class="catalogo-admin-gallery" id="catalogo-admin-gallery" aria-live="polite"></div>
        <p class="catalogo-admin-hint" id="catalogo-admin-upload-hint">Arrastra para ordenar. La primera imagen será la portada. Sólo JPEG, JPG o PNG de máximo 5 MB.</p>
        <label class="catalogo-admin-check"><input id="catalogo-admin-available" type="checkbox"> Disponible</label>
        <label class="catalogo-admin-check"><input id="catalogo-admin-new" type="checkbox"> Marcar como nuevo</label>
        <div class="catalogo-admin-actions"><button type="submit" class="btn-primary">Guardar cambios</button><button type="button" class="btn-secondary" id="catalogo-admin-cancel">Cancelar</button></div>
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
  const storageNote = overlay.querySelector("#catalogo-admin-storage-note");
  const imageGallery = overlay.querySelector("#catalogo-admin-gallery");
  const imageFileInput = overlay.querySelector("#catalogo-admin-gallery-files");
  let editingProduct = null;
  let galleryImages = [];
  let draggedImageIndex = null;

  function cloudinaryConfigurado() {
    return Boolean(
      CLOUDINARY_CLOUD_NAME && !CLOUDINARY_CLOUD_NAME.startsWith("TU_") &&
      CLOUDINARY_UPLOAD_PRESET && !CLOUDINARY_UPLOAD_PRESET.startsWith("TU_")
    );
  }

  async function subirImagenCloudinary(file) {
    if (!file) return "";
    validarImagen(file);
    if (!cloudinaryConfigurado()) {
      throw new Error("Falta configurar Cloudinary en catalogo-admin.js (CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET).");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData
    });
    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      throw new Error(data?.error?.message || "No se pudo subir la imagen a Cloudinary.");
    }

    return data.secure_url;
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
        <img src="${image}" alt="Imagen ${index + 1}" onerror="this.style.opacity='0.35'">
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

  function openEditor(product) {
    editingProduct = product || null;
    overlay.hidden = false;
    form.hidden = false;
    products.hidden = true;
    overlay.querySelector("#catalogo-admin-title").textContent = product ? `Editar ${product.nombre}` : "Agregar producto";
    overlay.querySelector("#catalogo-admin-id").value = product ? product.id : "";
    overlay.querySelector("#catalogo-admin-name").value = product?.nombre || "";
    overlay.querySelector("#catalogo-admin-description").value = product?.descripcion || "";
    overlay.querySelector("#catalogo-admin-category").value = product?.categorias?.[0] || "recien_nacido";
    overlay.querySelector("#catalogo-admin-price").value = product?.precio || "";
    overlay.querySelector("#catalogo-admin-size").value = product?.talla || "Talla estándar";
    overlay.querySelector("#catalogo-admin-material").value = product?.material || "Vinilo reborn";
    galleryImages = imagenesUnicas([product?.imagen, ...(product?.fotos || [])]);
    imageFileInput.value = "";
    renderImageGallery();
    overlay.querySelector("#catalogo-admin-available").checked = product ? product.disponible !== false : true;
    overlay.querySelector("#catalogo-admin-new").checked = Boolean(product?.esNuevo);
    overlay.querySelector("#catalogo-admin-message").hidden = true;
    overlay.querySelector("#catalogo-admin-name").focus();
  }

  function renderProductList() {
    if (!CATALOGO.length) {
      products.innerHTML = '<p class="catalogo-admin-empty">Todavía no hay productos en el catálogo.</p>';
      return;
    }

    products.innerHTML = CATALOGO.map((product) => {
      const categoriaKey = product.categorias?.[0] || "";
      const categoriaLabel = CATEGORIA_LABELS[categoriaKey] || categoriaKey.replace(/_/g, " ") || "Sin categoría";
      const precio = Number(product.precio || 0).toLocaleString("es-MX");
      const disponible = product.disponible !== false;

      return `
        <div class="catalogo-admin-card" data-id="${product.id}">
          <div class="catalogo-admin-card-image">
            <img src="${product.imagen || ""}" alt="" onerror="this.style.opacity='0'">
            ${product.esNuevo ? '<span class="catalogo-admin-tag is-new">Nuevo</span>' : ""}
            <span class="catalogo-admin-tag ${disponible ? "is-available" : "is-unavailable"}">${disponible ? "Disponible" : "Apartado"}</span>
          </div>
          <div class="catalogo-admin-card-body">
            <h3>${product.nombre}</h3>
            <p class="catalogo-admin-card-meta">${categoriaLabel}</p>
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
    const remoto = await guardarCatalogoRemoto(sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY));
    if (!resultado.ok || !remoto.ok) {
      CATALOGO.splice(0, CATALOGO.length, ...respaldo);
      guardarCatalogo();
      alert(`No se pudo eliminar el producto: ${remoto.error || "falló el guardado local"}`);
      return;
    }

    window.dispatchEvent(new Event("catalogo:render"));
    renderProductList();
    actualizarAvisoTamano();
  }

  function showProductGrid() {
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
      const remoto = await guardarCatalogoRemoto(sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY));
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saveButton = form.querySelector("button[type=submit]");
    const message = overlay.querySelector("#catalogo-admin-message");
    saveButton.disabled = true;
    saveButton.textContent = "Guardando...";

    const respaldo = CATALOGO.slice();

    try {
      saveButton.textContent = "Guardando...";
      const images = imagenesUnicas(galleryImages);
      if (!images.length) throw new Error("Agrega al menos una imagen para el producto.");

      const nombre = overlay.querySelector("#catalogo-admin-name").value.trim();
      if (!nombre) throw new Error("Agrega un nombre para el producto.");

      const product = {
        id: editingProduct ? editingProduct.id : Math.max(0, ...CATALOGO.map((item) => Number(item.id) || 0)) + 1,
        nombre,
        categoria: overlay.querySelector("#catalogo-admin-category").value,
        descripcion: overlay.querySelector("#catalogo-admin-description").value.trim(),
        precio: Number(overlay.querySelector("#catalogo-admin-price").value || 0),
        imagen: images[0],
        fotos: images,
        disponible: overlay.querySelector("#catalogo-admin-available").checked,
        talla: overlay.querySelector("#catalogo-admin-size").value.trim(),
        material: overlay.querySelector("#catalogo-admin-material").value.trim(),
        esNuevo: overlay.querySelector("#catalogo-admin-new").checked
      };
      const normalized = crearDiseno(product);
      if (editingProduct) {
        const index = CATALOGO.findIndex((item) => String(item.id) === String(editingProduct.id));
        CATALOGO[index] = { ...editingProduct, ...normalized, id: editingProduct.id };
      } else {
        CATALOGO.push(normalized);
      }

      const resultado = guardarCatalogo();
      const remoto = await guardarCatalogoRemoto(sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY));
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
    }
  });
})();