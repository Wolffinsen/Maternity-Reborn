function crearDiseno({
  id,
  nombre,
  categoria,
  descripcion,
  precio,
  imagen,
  fotos,
  codigo,
  disponible = true,
  talla,
  material = "Vinilo reborn",
  esNuevo = false,
  esOferta = false,
  incluye          // <-- nuevo
}) {
  return {
    id,
    nombre,
    slug: `${nombre.toLowerCase().replace(/\s+/g, "-")}-${categoria}`,
    descripcion: descripcion || `Bebé Reborn ${nombre}.`,
    precio,
    imagen,
    codigo: String(codigo || "").trim(),
    disponible,
    esNuevo,
    esOferta,
    subtitulo: `${categoria.replace(/_/g, " ")} · ${nombre}`,
    talla: talla || "Talla estándar",
    material,
    cabello: "Detalle pintado / mohair según diseño.",
    incluye: Array.isArray(incluye) && incluye.length ? incluye : [
      "Bebé Reborn con ropita, chupón y cobija.",
      "Ropita extra y accesorios según el diseño.",
      "Hoja de nacimiento y certificado de autenticidad."
    ],
    fotos: fotos && fotos.length ? fotos : [imagen],
    categorias: [categoria],
    certificacion: {
      texto: "Certificado de autenticidad y calidad del material.",
      archivoUrl: "#"
    },
    cuidados: [
      "Limpia la piel con un paño ligeramente humedecido.",
      "Evita la luz solar directa y calor excesivo.",
      "Mantén el cabello peinado con peine suave."
    ]
  };
}

const CATALOGO = [
  
];

const CATALOGO_STORAGE_KEY = "maternityRebornCatalogo";
const ADMIN_SESSION_KEY = "maternityRebornAdmin";
const ADMIN_TOKEN_SESSION_KEY = "maternityRebornAdminToken";
let CATALOGO_REMOTE_CHANGED = false;

function cargarCatalogoGuardado() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CATALOGO_STORAGE_KEY) || "null");
    if (Array.isArray(guardado)) {
      CATALOGO.splice(0, CATALOGO.length, ...guardado);
    }
  } catch (error) {
    console.warn("No se pudo cargar el catálogo guardado:", error);
  }
}

function guardarCatalogo() {
  try {
    localStorage.setItem(CATALOGO_STORAGE_KEY, JSON.stringify(CATALOGO));
    return { ok: true };
  } catch (error) {
    console.error("No se pudo guardar el catálogo:", error);
    return { ok: false, error };
  }
}

async function cargarCatalogoRemoto() {
  if (!URL_APPS_SCRIPT) return { ok: false };

  try {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "readCatalog" })
    });
    const result = await response.json();
    if (!result.ok || result.action !== "readCatalog" || !Array.isArray(result.data) || !result.data.length) return { ok: false };

    const remoteCatalog = result.data.map((item) => crearDiseno({
      ...item,
      categoria: item.categoria || item.categorias?.[0]
    }));
    const changed = JSON.stringify(CATALOGO) !== JSON.stringify(remoteCatalog);
    CATALOGO.splice(0, CATALOGO.length, ...remoteCatalog);
    CATALOGO_REMOTE_CHANGED = changed;
    guardarCatalogo();
    return { ok: true, changed };
  } catch (error) {
    console.warn("No se pudo cargar el catálogo desde Apps Script:", error);
    return { ok: false, error };
  }
}

async function guardarCatalogoRemoto(sessionToken) {
  if (!URL_APPS_SCRIPT) return { ok: false, error: "No hay conexión configurada con el servidor." };

  try {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "saveCatalog", sessionToken, data: CATALOGO })
    });
    const result = await response.json();
    if (!result.ok || result.action !== "saveCatalog") {
      return { ok: false, error: "El Apps Script publicado todavía no tiene la conexión del catálogo. Publica la versión actualizada." };
    }
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

cargarCatalogoGuardado();

// TODO: Configure the business WhatsApp number here before publishing.
const NUMERO_WHATSAPP = "5214423807369";
const COSTO_APARTADO = 200;
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbxcaIemJBxbnjoik3fm80WYtOc8kbvHiLKG5Odc83JDpElAQ1_NpAOPox2_Bg_l6AY5/exec";
const CATALOGO_READY = new Promise((resolve) => {
  const cargarDespuesDelPrimerRender = () => cargarCatalogoRemoto().then(resolve);
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(cargarDespuesDelPrimerRender, { timeout: 2000 });
  } else {
    window.setTimeout(cargarDespuesDelPrimerRender, 0);
  }
});