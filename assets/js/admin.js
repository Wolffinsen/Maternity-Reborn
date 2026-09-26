(function () {
  "use strict";

  const dashboard = document.getElementById("admin-dashboard");
  const guard = document.getElementById("admin-guard");
  const secretInput = document.getElementById("admin-secret");
  const btnAccess = document.getElementById("btn-admin-access");
  const btnLogout = document.getElementById("btn-admin-logout");
  const errorMessage = document.getElementById("admin-error");
  const tableBody = document.getElementById("admin-table-body");
  const clientSearchInput = document.getElementById("admin-client-search");
  const changePasswordForm = document.getElementById("change-password-form");
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const passwordChangeMessage = document.getElementById("password-change-message");
  const referralForm = document.getElementById("referral-form");
  const referralCodeInput = document.getElementById("referral-code");
  const referralNameInput = document.getElementById("referral-name");
  const referralCommissionInput = document.getElementById("referral-commission");
  const referralSubmit = document.getElementById("referral-submit");
  const referralCancel = document.getElementById("referral-cancel");
  const referralMessage = document.getElementById("referral-message");
  const referralList = document.getElementById("referral-list");
  const referralSearchInput = document.getElementById("admin-referral-search");
  const referralModal = document.getElementById("referral-modal");
  const referralModalTitle = document.getElementById("referral-modal-title");
  const newReferralButton = document.getElementById("btn-new-referral");
  const referralModalClose = document.getElementById("referral-modal-close");
  const salesCards = document.getElementById("admin-sales-cards");
  const adminToast = document.getElementById("admin-toast");
  const adminToastTitle = document.getElementById("admin-toast-title");
  const adminToastMessage = document.getElementById("admin-toast-message");
  const adminToastClose = document.getElementById("admin-toast-close");
  const pagination = document.getElementById("admin-pagination");
  const previousPageButton = document.getElementById("btn-previous-page");
  const nextPageButton = document.getElementById("btn-next-page");
  const pageStatus = document.getElementById("admin-page-status");
  const selectAllCheckbox = document.getElementById("admin-select-all");
  const btnDeleteSelected = document.getElementById("btn-delete-selected");
  const btnNewSale = document.getElementById("btn-new-sale");
  const saleModal = document.getElementById("sale-modal");
  const saleModalClose = document.getElementById("sale-modal-close");
  const saleForm = document.getElementById("sale-form");
  const saleProductSelect = document.getElementById("sale-product");
  const saleClientName = document.getElementById("sale-client-name");
  const saleClientPhone = document.getElementById("sale-client-phone");
  const salePrice = document.getElementById("sale-price");
  const saleStatusSelect = document.getElementById("sale-status");
  const saleReferralCodeInput = document.getElementById("sale-referral-code");
  const saleSubmit = document.getElementById("sale-submit");
  const saleCancel = document.getElementById("sale-cancel");
  const saleMessage = document.getElementById("sale-message");
  const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;
  const SALES_PAGE_SIZE = 10;
  const exportExcelButton = document.getElementById("btn-export-excel");
  let adminToken = sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY) || "";
  let inactivityTimer = null;
  let salesRows = [];
  let salesPage = 1;
  let editingReferralCode = "";
  let toastTimer = null;
  let selectedFolios = new Set();
  let catalogProductsCache = null;

  const STATUS_META = {
    apartado: { label: "Apartado", className: "is-apartado" },
    confirmado: { label: "Confirmado", className: "is-confirmado" },
    en_proceso: { label: "En proceso", className: "is-proceso" },
    entregado: { label: "Entregado", className: "is-entregado" }
  };
  const STATUS_ORDER = ["apartado", "confirmado", "en_proceso", "entregado"];
  const REVENUE_STATUSES = new Set(["confirmado", "en_proceso", "entregado"]);

  const stats = {
    vendidos: document.getElementById("stat-vendidos"),
    activos: document.getElementById("stat-activos"),
    ingresos: document.getElementById("stat-ingresos"),
    ultimo: document.getElementById("stat-ultimo")
  };

  function statusMeta(estado) {
    return STATUS_META[estado] || STATUS_META.apartado;
  }

  // Comisión fija que le corresponde al vendedor por un código de referencia.
  function getSellerCommission(code) {
    if (!code) return 0;
    const seller = ReferralTracking.getSellerRegistry()[code];
    return seller ? Number(seller.commissionAmount) || 0 : 0;
  }

  // Texto para la columna "Comisión" de un folio: cuánto ganará el
  // referenciado por esa venta. Si el folio todavía es "apartado" se marca
  // como pendiente, porque esa venta todavía se puede cancelar.
  function renderRowCommission(row) {
    if (!row.referralCode) return "—";
    const amount = getSellerCommission(row.referralCode);
    if (!amount) return "—";
    const text = formatCommission(amount);
    return REVENUE_STATUSES.has(row.estado) ? text : `${text} (pendiente)`;
  }

  // Ventas y ganancia acumulada de un vendedor referido, a partir de los
  // folios ya cargados. Solo cuenta como ganancia confirmada los folios en
  // Confirmado, En proceso o Entregado (igual que el cálculo de Ingresos).
  function getReferralStats(code) {
    const matching = salesRows.filter((row) => row.referralCode === code);
    const counted = matching.filter((row) => REVENUE_STATUSES.has(row.estado));
    return { total: matching.length, counted: counted.length };
  }

  function setAccess(isAllowed) {
    if (isAllowed) {
      guard.hidden = true;
      dashboard.hidden = false;
      startInactivityTimer();
    } else {
      guard.hidden = false;
      dashboard.hidden = true;
      stopInactivityTimer();
    }
  }

  function startInactivityTimer() {
    stopInactivityTimer();
    inactivityTimer = window.setTimeout(() => {
      logout("La sesión se cerró por inactividad.");
    }, INACTIVITY_TIMEOUT_MS);
  }

  function stopInactivityTimer() {
    if (inactivityTimer) window.clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  function registerActivity() {
    if (adminToken) startInactivityTimer();
  }

  function logout(message) {
    setAccess(false);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_TOKEN_SESSION_KEY);
    adminToken = "";
    secretInput.value = "";
    clearError();
    if (message) showError(message);
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }

  function clearError() {
    errorMessage.hidden = true;
  }

  function showPasswordMessage(message, isError) {
    passwordChangeMessage.textContent = message;
    passwordChangeMessage.classList.toggle("is-success", !isError);
    passwordChangeMessage.hidden = false;
  }

  function showReferralMessage(message, isError) {
    referralMessage.textContent = message;
    referralMessage.classList.toggle("is-success", !isError);
    referralMessage.hidden = false;
  }

  function showSaleMessage(message, isError = true) {
    saleMessage.textContent = message;
    saleMessage.classList.toggle("is-success", !isError);
    saleMessage.hidden = false;
  }

  function showToast(title, message, isError = false) {
    adminToastTitle.textContent = title;
    adminToastMessage.textContent = message;
    adminToast.classList.toggle("is-error", isError);
    adminToast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => adminToast.classList.remove("is-visible"), 4200);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[character]));
  }

  function getSellerInitials(name) {
    return String(name || "V")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "V";
  }

  // Comisión fija por venta: muestra centavos solo si los tiene (ej. $500 o $499.50).
  function formatCommission(value) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function renderReferralList() {
    const search = referralSearchInput.value.trim().toLowerCase();
    const sellers = Object.entries(ReferralTracking.getSellerRegistry()).filter(([code, seller]) =>
      `${code} ${seller.name || ""}`.toLowerCase().includes(search));
    if (!sellers.length) {
      referralList.innerHTML = `<div class="admin-empty-state">
        <span class="admin-empty-icon" aria-hidden="true">↗</span>
        <strong>${search ? "No encontramos vendedores" : "Aún no hay vendedores"}</strong>
        <p>${search ? "Prueba con otro nombre o código." : "Crea el primer enlace para empezar a atribuir tus ventas."}</p>
        ${search ? "" : '<button class="btn-primary" type="button" data-empty-new-referral>+ Nuevo vendedor</button>'}
      </div>`;
      referralList.querySelector("[data-empty-new-referral]")?.addEventListener("click", openReferralModal);
      return;
    }

    referralList.innerHTML = sellers.map(([code, seller]) => {
      const stats = getReferralStats(code);
      const commissionAmount = Number(seller.commissionAmount) || 0;
      const earnings = stats.counted * commissionAmount;
      const pendingNote = stats.total > stats.counted
        ? ` <small>(+${stats.total - stats.counted} pendiente${stats.total - stats.counted === 1 ? "" : "s"})</small>`
        : "";
      return `
      <article class="referral-card">
        <div class="referral-card-top">
          <span class="referral-avatar">${escapeHtml(getSellerInitials(seller.name))}</span>
          <span class="referral-commission">${escapeHtml(formatCommission(commissionAmount))} por venta</span>
        </div>
        <div class="referral-card-info">
          <span class="referral-seller-name">${escapeHtml(seller.name)}</span>
          <strong class="referral-code">${escapeHtml(code)}</strong>
        </div>
        <div class="referral-metrics">
          <span><small>Ventas atribuidas</small><strong>${stats.counted}${pendingNote}</strong></span>
          <span><small>Ganancia acumulada</small><strong>${escapeHtml(formatCommission(earnings))}</strong></span>
        </div>
        <div class="referral-card-actions">
          <button class="referral-copy" type="button" data-referral-code="${escapeHtml(code)}">Copiar link</button>
          <button class="referral-edit" type="button" data-referral-code="${escapeHtml(code)}" aria-label="Editar ${escapeHtml(seller.name)}">Editar</button>
          <button class="referral-delete" type="button" data-referral-code="${escapeHtml(code)}" aria-label="Eliminar ${escapeHtml(seller.name)}">Eliminar</button>
        </div>
      </article>
    `;
    }).join("");

    referralList.querySelectorAll(".referral-copy").forEach((button) => {
      button.addEventListener("click", async () => {
        const url = ReferralTracking.getReferralUrl(button.dataset.referralCode);
        try {
          await navigator.clipboard.writeText(url);
          button.textContent = "Copiado";
          showToast("Enlace copiado", "Ya puedes compartir el link del vendedor.");
          window.setTimeout(() => { button.textContent = "Copiar link"; }, 1800);
        } catch (error) {
          window.prompt("Copia este enlace de referencia:", url);
        }
      });
    });

    referralList.querySelectorAll(".referral-delete").forEach((button) => {
      button.addEventListener("click", () => {
        if (!window.confirm(`¿Eliminar el código ${button.dataset.referralCode}?`)) return;
        const result = ReferralTracking.deleteSeller(button.dataset.referralCode);
        if (!result.ok) showReferralMessage(result.error, true);
        else {
          renderReferralList();
          showToast("Vendedor eliminado", "El código se quitó de este navegador.");
          ReferralTracking.syncRegistry(adminToken).then((syncResult) => {
            if (!syncResult.ok) showToast("Guardado localmente", syncResult.error, true);
          });
        }
      });
    });

    referralList.querySelectorAll(".referral-edit").forEach((button) => {
      button.addEventListener("click", () => {
        const seller = ReferralTracking.getSellerRegistry()[button.dataset.referralCode];
        if (!seller) return;
        editingReferralCode = button.dataset.referralCode;
        referralCodeInput.value = editingReferralCode;
        referralNameInput.value = seller.name || "";
        referralCommissionInput.value = seller.commissionAmount ?? "";
        referralSubmit.textContent = "Actualizar vendedor";
        referralCancel.hidden = false;
        referralModalTitle.textContent = "Editar vendedor";
        referralModal.hidden = false;
        referralCodeInput.focus();
      });
    });
  }

  function openReferralModal() {
    referralModalTitle.textContent = editingReferralCode ? "Editar vendedor" : "Agregar vendedor";
    referralModal.hidden = false;
    referralCodeInput.focus();
  }

  function closeReferralModal() {
    referralModal.hidden = true;
    cancelReferralEdit();
  }

  function cancelReferralEdit() {
    editingReferralCode = "";
    referralForm.reset();
    referralSubmit.textContent = "Guardar vendedor";
    referralCancel.hidden = true;
    referralModalTitle.textContent = "Agregar vendedor";
  }

  document.querySelectorAll(".password-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const input = document.getElementById(toggle.dataset.passwordTarget);
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      toggle.textContent = isHidden ? "Ocultar" : "Mostrar";
      toggle.setAttribute("aria-label", `${isHidden ? "Ocultar" : "Mostrar"} contraseña`);
    });
  });

  async function authenticate(password) {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "authenticateAdmin", password })
    });
    return response.json();
  }

  async function changePassword(newPassword) {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "changeAdminPassword",
        sessionToken: adminToken,
        newPassword
      })
    });
    return response.json();
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function renderStats(rows) {
    const entregados = rows.filter((row) => row.estado === "entregado").length;
    const pendientes = rows.length - entregados;
    // Solo se cuentan como ingresos los folios que ya se confirmaron, están
    // en proceso o se entregaron; un "apartado" todavía puede cancelarse.
    const ingresos = rows.reduce((total, row) => {
      const precio = Number(row.precio || 0);
      return total + (REVENUE_STATUSES.has(row.estado) ? precio : 0);
    }, 0);
    const ultimo = rows.length ? rows[0].folio : "—";

    stats.vendidos.textContent = String(entregados);
    stats.activos.textContent = String(pendientes);
    stats.ingresos.textContent = formatMoney(ingresos);
    stats.ultimo.textContent = ultimo;
  }

  function renderSaleThumb(row, large = false) {
    const src = String(row.imagen || "").trim();
    const size = large ? " sale-thumb--large" : "";
    if (!src) return `<span class="sale-thumb-empty${size}" aria-hidden="true">Sin foto</span>`;
    const alt = `Producto ${row.diseno || row.folio || ""}`;
    return `<a class="sale-thumb-link" href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer"><img class="sale-thumb${size}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"></a>`;
  }

  function bindThumbFallbacks() {
    document.querySelectorAll(".sale-thumb").forEach((img) => {
      img.addEventListener("error", () => {
        const placeholder = document.createElement("span");
        placeholder.className = "sale-thumb-empty" + (img.classList.contains("sale-thumb--large") ? " sale-thumb--large" : "");
        placeholder.textContent = "Sin foto";
        (img.closest(".sale-thumb-link") || img).replaceWith(placeholder);
      }, { once: true });
    });
  }

  function renderStatusOptions(currentEstado) {
    return STATUS_ORDER.map((value) => {
      const meta = statusMeta(value);
      return `<option value="${value}" ${currentEstado === value ? "selected" : ""}>${meta.label}</option>`;
    }).join("");
  }

  function renderRows(rows) {
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="13" class="table-empty">No hay folios registrados todavía.</td></tr>';
      salesCards.innerHTML = '<div class="admin-empty-state"><span class="admin-empty-icon" aria-hidden="true">◎</span><strong>No hay folios todavía</strong><p>Los nuevos apartados aparecerán aquí.</p></div>';
      selectAllCheckbox.checked = false;
      return;
    }

    tableBody.innerHTML = rows.map((row) => {
      const meta = statusMeta(row.estado);
      const checked = selectedFolios.has(row.folio) ? "checked" : "";
      return `
      <tr>
        <td><input type="checkbox" class="row-select" data-folio="${escapeHtml(row.folio)}" aria-label="Seleccionar folio ${escapeHtml(row.folio)}" ${checked}></td>
        <td>${renderSaleThumb(row)}</td>
        <td>${row.folio}</td>
        <td>${row.cliente || "—"}</td>
        <td>${row.diseno || "—"}</td>
        <td>${row.codigo || "—"}</td>
        <td>${formatMoney(row.precio)}</td>
        <td><span class="status-badge ${meta.className}">${meta.label}</span></td>
        <td>${row.referralSeller || "—"}</td>
        <td>${renderRowCommission(row)}</td>
        <td>${row.fecha || "—"}</td>
        <td>
          <select class="status-select" data-folio="${escapeHtml(row.folio)}" aria-label="Cambiar estado de ${escapeHtml(row.folio)}">
            ${renderStatusOptions(row.estado)}
          </select>
        </td>
        <td><button class="referral-delete btn-row-delete" type="button" data-folio="${escapeHtml(row.folio)}" aria-label="Eliminar ${escapeHtml(row.folio)}">Eliminar</button></td>
      </tr>
    `;
    }).join("");

    salesCards.innerHTML = rows.map((row) => {
      const meta = statusMeta(row.estado);
      const checked = selectedFolios.has(row.folio) ? "checked" : "";
      return `
      <article class="sale-card">
        <div class="sale-card-heading">
          <label class="sale-card-select"><input type="checkbox" class="row-select" data-folio="${escapeHtml(row.folio)}" aria-label="Seleccionar folio ${escapeHtml(row.folio)}" ${checked}> <strong>${row.folio}</strong></label>
          <span class="status-badge ${meta.className}">${meta.label}</span>
        </div>
        <div class="sale-card-photo">${renderSaleThumb(row, true)}</div>
        <dl>
          <div><dt>Cliente</dt><dd>${row.cliente || "—"}</dd></div>
          <div><dt>Diseño</dt><dd>${row.diseno || "—"}</dd></div>
          <div><dt>Código</dt><dd>${row.codigo || "—"}</dd></div>
          <div><dt>Precio</dt><dd>${formatMoney(row.precio)}</dd></div>
          <div><dt>Referencia</dt><dd>${row.referralSeller || "—"}</dd></div>
          <div><dt>Comisión</dt><dd>${renderRowCommission(row)}</dd></div>
          <div><dt>Fecha</dt><dd>${row.fecha || "—"}</dd></div>
        </dl>
        <select class="status-select" data-folio="${escapeHtml(row.folio)}" aria-label="Cambiar estado de ${escapeHtml(row.folio)}">
          ${renderStatusOptions(row.estado)}
        </select>
        <button class="referral-delete btn-row-delete" type="button" data-folio="${escapeHtml(row.folio)}" aria-label="Eliminar ${escapeHtml(row.folio)}">Eliminar folio</button>
      </article>
    `;
    }).join("");

    bindThumbFallbacks();
    selectAllCheckbox.checked = rows.length > 0 && rows.every((row) => selectedFolios.has(row.folio));
  }

  function renderFilteredRows() {
    const search = clientSearchInput.value.trim().toLowerCase();
    const filteredRows = salesRows.filter((row) => {
      const searchableText = [row.cliente, row.folio, row.diseno, row.codigo, row.referralSeller]
        .join(" ")
        .toLowerCase();
      return searchableText.includes(search);
    });

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / SALES_PAGE_SIZE));
    salesPage = Math.min(salesPage, totalPages);
    const start = (salesPage - 1) * SALES_PAGE_SIZE;
    renderRows(filteredRows.slice(start, start + SALES_PAGE_SIZE));
    pagination.hidden = filteredRows.length <= SALES_PAGE_SIZE;
    pageStatus.textContent = `Página ${salesPage} de ${totalPages}`;
    previousPageButton.disabled = salesPage === 1;
    nextPageButton.disabled = salesPage === totalPages;
  }

  function exportSalesToExcel() {
    if (typeof XLSX === "undefined") {
      showToast("No disponible", "No se pudo cargar la librería de Excel. Revisa tu conexión.", true);
      return;
    }

    const search = clientSearchInput.value.trim().toLowerCase();
    const filteredRows = salesRows.filter((row) => {
      const searchableText = [row.cliente, row.folio, row.diseno, row.codigo, row.referralSeller].join(" ").toLowerCase();
      return searchableText.includes(search);
    });

    if (!filteredRows.length) {
      showToast("Sin datos", "No hay folios para exportar.", true);
      return;
    }

    const data = filteredRows.map((row) => ({
      Folio: row.folio || "",
      Cliente: row.cliente || "",
      Diseño: row.diseno || "",
      Código: row.codigo || "",
      Precio: Number(row.precio || 0),
      Estado: statusMeta(row.estado).label,
      Fecha: row.fecha || "",
      "Es referencia": row.isReferral || "",
      "Código referencia": row.referralCode || "",
      "Vendedor referencia": row.referralSeller || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `maternity-reborn-ventas-${fecha}.xlsx`);
  }

  async function updateSaleStatus(select) {
    const previousStatus = select.dataset.previousStatus || select.value;
    select.disabled = true;

    try {
      const response = await fetch(URL_APPS_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "updateSaleStatus",
          sessionToken: adminToken,
          folio: select.dataset.folio,
          estado: select.value
        })
      });
      const result = await response.json();
      if (!result.ok || result.action !== "updateSaleStatus") {
        throw new Error(result.error || "No se pudo actualizar el estado");
      }

      select.dataset.previousStatus = select.value;
      await fetchSalesData();
    } catch (error) {
      select.value = previousStatus;
      alert("No se pudo actualizar el estado. Revisa la conexión con Google Sheets.");
      console.error("No se pudo actualizar el estado:", error);
    } finally {
      select.disabled = false;
    }
  }

  function updateBulkDeleteButton() {
    const count = selectedFolios.size;
    btnDeleteSelected.disabled = count === 0;
    btnDeleteSelected.textContent = count ? `Eliminar seleccionados (${count})` : "Eliminar seleccionados";
  }

  function toggleRowSelection(checkbox) {
    const folio = checkbox.dataset.folio;
    if (!folio) return;
    if (checkbox.checked) selectedFolios.add(folio);
    else selectedFolios.delete(folio);
    // Sincroniza cualquier otra casilla del mismo folio (tabla y tarjeta comparten folio).
    document.querySelectorAll(`.row-select[data-folio="${CSS.escape(folio)}"]`).forEach((other) => {
      other.checked = checkbox.checked;
    });
    updateBulkDeleteButton();
  }

  async function requestDeleteSales(folios) {
    try {
      const response = await fetch(URL_APPS_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "deleteSales", sessionToken: adminToken, folios })
      });
      return response.json();
    } catch (error) {
      console.error("No se pudo eliminar el folio:", error);
      return { ok: false, error: "No se pudo eliminar. Revisa la conexión." };
    }
  }

  async function deleteSingleFolio(folio) {
    if (!folio) return;
    if (!window.confirm(`¿Eliminar el folio ${folio}? Esta acción no se puede deshacer.`)) return;
    const result = await requestDeleteSales([folio]);
    if (result.ok) {
      selectedFolios.delete(folio);
      showToast("Folio eliminado", `Se eliminó ${folio}.`);
      await fetchSalesData();
      updateBulkDeleteButton();
    } else {
      showToast("No se pudo eliminar", result.error || "Intenta nuevamente.", true);
    }
  }

  async function fetchSalesData() {
    if (!URL_APPS_SCRIPT) {
      const fallbackRows = [
        { folio: "AP-202608-1001", cliente: "María López", diseno: "Sofía", precio: 18900, estado: "entregado", fecha: "2026-08-29" },
        { folio: "AP-202608-1002", cliente: "José Ramírez", diseno: "Mateo", precio: 21400, estado: "apartado", fecha: "2026-08-29" },
        { folio: "AP-202608-1003", cliente: "Alicia S.", diseno: "Emma", precio: 28600, estado: "confirmado", fecha: "2026-08-29" }
      ];
      salesRows = fallbackRows;
      renderStats(salesRows);
      renderFilteredRows();
      renderReferralList();
      return;
    }

    try {
      const response = await fetch(URL_APPS_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "readSales", sessionToken: adminToken })
      });
      const result = await response.json();
      if (!result.ok) {
        if (result.error === "No autorizado" || result.error?.includes("sesión")) logout("Tu sesión expiró. Inicia sesión nuevamente.");
        throw new Error(result.error || "No autorizado");
      }
      salesRows = Array.isArray(result?.data) ? result.data : [];
      renderStats(salesRows);
      renderFilteredRows();
      renderReferralList();
      return true;
    } catch (error) {
      console.error("No se pudo cargar la data del panel:", error);
      tableBody.innerHTML = '<tr><td colspan="13" class="table-empty">No se pudo cargar la información. Revisa la conexión con Google Sheets.</td></tr>';
      salesCards.innerHTML = '<div class="admin-empty-state"><span class="admin-empty-icon" aria-hidden="true">!</span><strong>No se pudo cargar la información</strong><p>Revisa la conexión con Google Sheets.</p></div>';
      return false;
    }
  }

  /* ---------- Agregar folio manual ---------- */

  async function loadCatalogProducts() {
    if (catalogProductsCache) return catalogProductsCache;
    if (!URL_APPS_SCRIPT) {
      catalogProductsCache = [];
      return catalogProductsCache;
    }
    try {
      const response = await fetch(URL_APPS_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "readCatalog" })
      });
      const result = await response.json();
      catalogProductsCache = result.ok && Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      console.error("No se pudo cargar el catálogo:", error);
      catalogProductsCache = [];
    }
    return catalogProductsCache;
  }

  function populateSaleProductSelect(products) {
    if (!products.length) {
      saleProductSelect.innerHTML = '<option value="">No hay bebés en el catálogo</option>';
      return;
    }
    const options = products.map((product, index) => {
      const value = String(product.id ?? index);
      const label = product.codigo ? `${product.nombre} (${product.codigo})` : (product.nombre || "Sin nombre");
      const imagen = product.imagen || (product.fotos && product.fotos[0]) || "";
      return `<option value="${escapeHtml(value)}" data-nombre="${escapeHtml(product.nombre || "")}" data-codigo="${escapeHtml(product.codigo || "")}" data-precio="${Number(product.precio) || 0}" data-imagen="${escapeHtml(imagen)}">${escapeHtml(label)}</option>`;
    }).join("");
    saleProductSelect.innerHTML = `<option value="">Selecciona un bebé...</option>${options}`;
  }

  async function openSaleModal() {
    saleForm.reset();
    saleMessage.hidden = true;
    saleStatusSelect.value = "apartado";
    saleModal.hidden = false;
    saleSubmit.disabled = true;
    saleSubmit.textContent = "Cargando bebés...";
    const products = await loadCatalogProducts();
    populateSaleProductSelect(products);
    saleSubmit.disabled = false;
    saleSubmit.textContent = "Guardar folio";
    saleProductSelect.focus();
  }

  function closeSaleModal() {
    saleModal.hidden = true;
  }

  saleProductSelect.addEventListener("change", () => {
    const option = saleProductSelect.selectedOptions[0];
    if (option && option.value) {
      salePrice.value = option.dataset.precio || "";
    }
  });

  saleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    saleMessage.hidden = true;

    const option = saleProductSelect.selectedOptions[0];
    if (!option || !option.value) {
      showSaleMessage("Selecciona un bebé del catálogo.");
      return;
    }
    const nombreCliente = saleClientName.value.trim();
    const precio = Number(salePrice.value);
    if (!nombreCliente) {
      showSaleMessage("Escribe el nombre del cliente.");
      return;
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      showSaleMessage("Escribe un precio válido.");
      return;
    }

    saleSubmit.disabled = true;
    saleSubmit.textContent = "Guardando...";

    try {
      const response = await fetch(URL_APPS_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "adminCreateSale",
          sessionToken: adminToken,
          nombreCliente,
          telefonoCliente: saleClientPhone.value.trim(),
          diseno: option.dataset.nombre || "",
          codigo: option.dataset.codigo || "",
          precio,
          estado: saleStatusSelect.value,
          referralCode: saleReferralCodeInput.value.trim(),
          imagen: option.dataset.imagen || ""
        })
      });
      const result = await response.json();
      if (!result.ok || result.action !== "adminCreateSale") {
        showSaleMessage(result.error || "No se pudo guardar el folio.");
        return;
      }
      closeSaleModal();
      showToast("Folio agregado", `Se creó el folio ${result.folio}.`);
      await fetchSalesData();
    } catch (error) {
      console.error("No se pudo crear el folio:", error);
      showSaleMessage("No se pudo guardar el folio. Revisa la conexión.");
    } finally {
      saleSubmit.disabled = false;
      saleSubmit.textContent = "Guardar folio";
    }
  });

  btnNewSale.addEventListener("click", openSaleModal);
  saleModalClose.addEventListener("click", closeSaleModal);
  saleCancel.addEventListener("click", closeSaleModal);
  saleModal.addEventListener("click", (event) => {
    if (event.target === saleModal) closeSaleModal();
  });

  /* ---------- Selección y borrado de folios ---------- */

  selectAllCheckbox.addEventListener("change", () => {
    const checked = selectAllCheckbox.checked;
    document.querySelectorAll("#admin-table-body .row-select, #admin-sales-cards .row-select").forEach((checkbox) => {
      checkbox.checked = checked;
      toggleRowSelection(checkbox);
    });
  });

  btnDeleteSelected.addEventListener("click", async () => {
    const folios = Array.from(selectedFolios);
    if (!folios.length) return;
    if (!window.confirm(`¿Eliminar ${folios.length} folio(s) seleccionados? Esta acción no se puede deshacer.`)) return;
    btnDeleteSelected.disabled = true;
    const result = await requestDeleteSales(folios);
    if (result.ok) {
      selectedFolios.clear();
      showToast("Folios eliminados", `Se eliminaron ${result.deleted ?? folios.length} folio(s).`);
      await fetchSalesData();
    } else {
      showToast("No se pudo eliminar", result.error || "Intenta nuevamente.", true);
    }
    updateBulkDeleteButton();
  });

  // Delegación de eventos: la tabla y las tarjetas se vuelven a dibujar en
  // cada búsqueda o cambio de página, así que escuchamos en el contenedor.
  [tableBody, salesCards].forEach((container) => {
    container.addEventListener("change", (event) => {
      const select = event.target.closest(".status-select");
      if (select) { updateSaleStatus(select); return; }
      const checkbox = event.target.closest(".row-select");
      if (checkbox) toggleRowSelection(checkbox);
    });
    container.addEventListener("click", (event) => {
      const deleteButton = event.target.closest(".btn-row-delete");
      if (deleteButton) deleteSingleFolio(deleteButton.dataset.folio);
    });
  });

  clientSearchInput.addEventListener("input", () => {
    salesPage = 1;
    renderFilteredRows();
  });
  previousPageButton.addEventListener("click", () => {
    if (salesPage > 1) {
      salesPage -= 1;
      renderFilteredRows();
    }
  });
  exportExcelButton.addEventListener("click", exportSalesToExcel);
  nextPageButton.addEventListener("click", () => {
    salesPage += 1;
    renderFilteredRows();
  });

  btnAccess.addEventListener("click", async () => {
    const candidate = secretInput.value.trim();
    clearError();

    if (!candidate) {
      showError("Escribe tu contraseña.");
      return;
    }

    if (!URL_APPS_SCRIPT) {
      showError("No hay conexión configurada con el servidor.");
      return;
    }

    btnAccess.disabled = true;
    btnAccess.textContent = "Verificando...";

    try {
      const result = await authenticate(candidate);
      if (result.action !== "authenticateAdmin") {
        showError("El servidor todavía usa una versión anterior. Actualiza la implementación de Apps Script.");
      } else if (result.ok && result.sessionToken) {
        adminToken = result.sessionToken;
        sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
        sessionStorage.setItem(ADMIN_TOKEN_SESSION_KEY, adminToken);
        setAccess(true);
        await fetchSalesData();
      } else {
        showError(result.ok
          ? "El servidor todavía usa una versión anterior. Actualiza la implementación de Apps Script."
          : (result.error || "La contraseña es incorrecta."));
      }
    } catch (error) {
      console.error("No se pudo verificar la contraseña:", error);
      showError("No se pudo verificar la contraseña. Revisa la conexión.");
    } finally {
      btnAccess.disabled = false;
      btnAccess.textContent = "Entrar";
    }
  });

  btnLogout.addEventListener("click", () => logout());

  secretInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      btnAccess.click();
    }
  });

  changePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    passwordChangeMessage.hidden = true;

    if (newPasswordInput.value !== confirmPasswordInput.value) {
      showPasswordMessage("Las contraseñas nuevas no coinciden.", true);
      return;
    }

    if (newPasswordInput.value.length < 8) {
      showPasswordMessage("La nueva contraseña debe tener al menos 8 caracteres.", true);
      return;
    }

    const submitButton = changePasswordForm.querySelector("button[type=submit]");
    submitButton.disabled = true;
    submitButton.textContent = "Guardando...";

    try {
      const result = await changePassword(newPasswordInput.value);
      if (!result.ok || result.action !== "changeAdminPassword") {
        if (result.error?.includes("sesión")) logout("Tu sesión expiró. Inicia sesión nuevamente.");
        showPasswordMessage(result.error || "La contraseña actual es incorrecta.", true);
        return;
      }

      changePasswordForm.reset();
      showPasswordMessage("Contraseña actualizada correctamente.", false);
    } catch (error) {
      console.error("No se pudo cambiar la contraseña:", error);
      showPasswordMessage("No se pudo cambiar la contraseña. Revisa la conexión.", true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Guardar nueva contraseña";
    }
  });

  referralForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    referralSubmit.disabled = true;
    referralSubmit.textContent = editingReferralCode ? "Actualizando..." : "Guardando...";
    const result = ReferralTracking.saveSeller({
      code: referralCodeInput.value,
      name: referralNameInput.value,
      commissionAmount: referralCommissionInput.value,
      previousCode: editingReferralCode
    });
    if (!result.ok) {
      showReferralMessage(result.error, true);
      referralSubmit.disabled = false;
      referralSubmit.textContent = editingReferralCode ? "Actualizar vendedor" : "Guardar vendedor";
      return;
    }
    closeReferralModal();
    showToast("Vendedor guardado", "El enlace está listo. Sincronizando...");
    renderReferralList();
    const syncResult = await ReferralTracking.syncRegistry(adminToken);
    showToast(syncResult.ok ? "Vendedor sincronizado" : "Guardado localmente", syncResult.ok ? "El registro remoto está actualizado." : syncResult.error, !syncResult.ok);
    referralSubmit.disabled = false;
    referralSubmit.textContent = "Guardar vendedor";
  });

  referralCancel.addEventListener("click", closeReferralModal);
  newReferralButton.addEventListener("click", openReferralModal);
  referralModalClose.addEventListener("click", closeReferralModal);
  referralModal.addEventListener("click", (event) => {
    if (event.target === referralModal) closeReferralModal();
  });
  adminToastClose.addEventListener("click", () => adminToast.classList.remove("is-visible"));
  referralSearchInput.addEventListener("input", renderReferralList);
  document.querySelectorAll("[data-admin-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-admin-tab]").forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });
      document.querySelectorAll(".admin-view").forEach((view) => {
        const isActive = view.id === tab.dataset.adminTab;
        view.classList.toggle("is-active", isActive);
        view.hidden = !isActive;
      });
    });
  });

  window.addEventListener("referral:updated", renderReferralList);

  ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, registerActivity, { passive: true });
  });

  setAccess(false);
  renderReferralList();
  if (adminToken) {
    setAccess(true);
    fetchSalesData().then((isValid) => {
      if (!isValid) logout();
    });
  }
})();