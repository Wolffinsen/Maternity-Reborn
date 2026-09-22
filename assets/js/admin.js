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
  const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;
  const SALES_PAGE_SIZE = 10;
  const exportExcelButton = document.getElementById("btn-export-excel");
  let adminToken = sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY) || "";
  let inactivityTimer = null;
  let salesRows = [];
  let salesPage = 1;
  let editingReferralCode = "";
  let toastTimer = null;

  const stats = {
    vendidos: document.getElementById("stat-vendidos"),
    activos: document.getElementById("stat-activos"),
    ingresos: document.getElementById("stat-ingresos"),
    ultimo: document.getElementById("stat-ultimo")
  };

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

    referralList.innerHTML = sellers.map(([code, seller]) => `
      <article class="referral-card">
        <div class="referral-card-top">
          <span class="referral-avatar">${escapeHtml(getSellerInitials(seller.name))}</span>
          <span class="referral-commission">${escapeHtml(seller.commissionPercent)}% comisión</span>
        </div>
        <div class="referral-card-info">
          <span class="referral-seller-name">${escapeHtml(seller.name)}</span>
          <strong class="referral-code">${escapeHtml(code)}</strong>
        </div>
        <div class="referral-metrics">
          <span><small>Ventas atribuidas</small><strong>Próximamente</strong></span>
          <span><small>Ganancia acumulada</small><strong>Próximamente</strong></span>
        </div>
        <div class="referral-card-actions">
          <button class="referral-copy" type="button" data-referral-code="${escapeHtml(code)}">Copiar link</button>
          <button class="referral-edit" type="button" data-referral-code="${escapeHtml(code)}" aria-label="Editar ${escapeHtml(seller.name)}">Editar</button>
          <button class="referral-delete" type="button" data-referral-code="${escapeHtml(code)}" aria-label="Eliminar ${escapeHtml(seller.name)}">Eliminar</button>
        </div>
      </article>
    `).join("");

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
        referralCommissionInput.value = seller.commissionPercent ?? "";
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
    const vendidos = rows.filter((row) => row.estado === "vendido").length;
    const activos = rows.filter((row) => row.estado === "activo").length;
    const ingresos = rows.reduce((total, row) => {
      const precio = Number(row.precio || 0);
      return total + (row.estado === "vendido" ? precio : 0);
    }, 0);
    const ultimo = rows.length ? rows[0].folio : "—";

    stats.vendidos.textContent = String(vendidos);
    stats.activos.textContent = String(activos);
    stats.ingresos.textContent = formatMoney(ingresos);
    stats.ultimo.textContent = ultimo;
  }

  function renderRows(rows) {
  if (!rows.length) {
    tableBody.innerHTML = '<tr><td colspan="8" class="table-empty">No hay folios registrados todavía.</td></tr>';
    salesCards.innerHTML = '<div class="admin-empty-state"><span class="admin-empty-icon" aria-hidden="true">◎</span><strong>No hay folios todavía</strong><p>Los nuevos apartados aparecerán aquí.</p></div>';
    return;
  }

    tableBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${row.folio}</td>
        <td>${row.cliente || "—"}</td>
        <td>${row.diseno || "—"}</td>
        <td>${row.codigo || "—"}</td>
        <td>${formatMoney(row.precio)}</td>
        <td><span class="status-badge ${row.estado === "vendido" ? "is-sold" : "is-active"}">${row.estado === "vendido" ? "Vendido" : "Activo"}</span></td>
        <td>${row.fecha || "—"}</td>
        <td>
          <select class="status-select" data-folio="${row.folio}" aria-label="Cambiar estado de ${row.folio}">
            <option value="activo" ${row.estado === "activo" ? "selected" : ""}>Activo</option>
            <option value="vendido" ${row.estado === "vendido" ? "selected" : ""}>Vendido</option>
          </select>
        </td>
      </tr>
    `).join("");

    salesCards.innerHTML = rows.map((row) => `
      <article class="sale-card">
        <div class="sale-card-heading"><strong>${row.folio}</strong><span class="status-badge ${row.estado === "vendido" ? "is-sold" : "is-active"}">${row.estado === "vendido" ? "Vendido" : "Activo"}</span></div>
        <dl><div><dt>Cliente</dt><dd>${row.cliente || "—"}</dd></div><div><dt>Diseño</dt><dd>${row.diseno || "—"}</dd></div><div><dt>Código</dt><dd>${row.codigo || "—"}</dd></div><div><dt>Precio</dt><dd>${formatMoney(row.precio)}</dd></div><div><dt>Fecha</dt><dd>${row.fecha || "—"}</dd></div></dl>
        <select class="status-select" data-folio="${row.folio}" aria-label="Cambiar estado de ${row.folio}"><option value="activo" ${row.estado === "activo" ? "selected" : ""}>Activo</option><option value="vendido" ${row.estado === "vendido" ? "selected" : ""}>Vendido</option></select>
      </article>
    `).join("");

    tableBody.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", () => updateSaleStatus(select));
    });
    salesCards.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", () => updateSaleStatus(select));
    });
  }

  function renderFilteredRows() {
    const search = clientSearchInput.value.trim().toLowerCase();
    const filteredRows = salesRows.filter((row) => {
      const searchableText = [row.cliente, row.folio, row.diseno, row.estado]
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
      const searchableText = [row.cliente, row.folio, row.diseno, row.codigo, row.estado].join(" ").toLowerCase();
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
      Estado: row.estado === "vendido" ? "Vendido" : "Activo",
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
    const previousStatus = select.dataset.previousStatus || (select.value === "vendido" ? "activo" : "vendido");
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

  async function fetchSalesData() {
    if (!URL_APPS_SCRIPT) {
      const fallbackRows = [
        { folio: "AP-202608-1001", cliente: "María López", diseno: "Sofía", precio: 18900, estado: "vendido", fecha: "2026-08-29" },
        { folio: "AP-202608-1002", cliente: "José Ramírez", diseno: "Mateo", precio: 21400, estado: "activo", fecha: "2026-08-29" },
        { folio: "AP-202608-1003", cliente: "Alicia S.", diseno: "Emma", precio: 28600, estado: "vendido", fecha: "2026-08-29" }
      ];
      salesRows = fallbackRows;
      renderStats(salesRows);
      renderFilteredRows();
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
      return true;
    } catch (error) {
      console.error("No se pudo cargar la data del panel:", error);
      tableBody.innerHTML = '<tr><td colspan="8" class="table-empty">No se pudo cargar la información. Revisa la conexión con Google Sheets.</td></tr>';
      salesCards.innerHTML = '<div class="admin-empty-state"><span class="admin-empty-icon" aria-hidden="true">!</span><strong>No se pudo cargar la información</strong><p>Revisa la conexión con Google Sheets.</p></div>';
      return false;
    }
  }

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
      commissionPercent: referralCommissionInput.value,
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
