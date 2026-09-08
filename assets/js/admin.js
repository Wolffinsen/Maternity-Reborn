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
  const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;
  let adminToken = sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY) || "";
  let inactivityTimer = null;
  let salesRows = [];

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
      tableBody.innerHTML = '<tr><td colspan="7" class="table-empty">No hay folios registrados todavía.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${row.folio}</td>
        <td>${row.cliente || "—"}</td>
        <td>${row.diseno || "—"}</td>
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

    tableBody.querySelectorAll(".status-select").forEach((select) => {
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

    renderRows(filteredRows);
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
      tableBody.innerHTML = '<tr><td colspan="7" class="table-empty">No se pudo cargar la información. Revisa la conexión con Google Sheets.</td></tr>';
      return false;
    }
  }

  clientSearchInput.addEventListener("input", renderFilteredRows);

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

  ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, registerActivity, { passive: true });
  });

  setAccess(false);
  if (adminToken) {
    setAccess(true);
    fetchSalesData().then((isValid) => {
      if (!isValid) logout();
    });
  }
})();
