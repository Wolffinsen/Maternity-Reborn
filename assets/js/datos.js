function crearDiseno({
  id,
  nombre,
  categoria,
  descripcion,
  precio,
  imagen,
  fotos,
  disponible = true,
  talla,
  material = "Vinilo reborn",
  esNuevo = false
}) {
  return {
    id,
    nombre,
    slug: `${nombre.toLowerCase().replace(/\s+/g, "-")}-${categoria}`,
    descripcion: descripcion || `Bebé Reborn ${nombre}.`,
    precio,
    imagen,
    disponible,
    esNuevo,
    subtitulo: `${categoria.replace(/_/g, " ")} · ${nombre}`,
    talla: talla || "Talla estándar",
    material,
    cabello: "Detalle pintado / mohair según diseño.",
    incluye: [
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
  crearDiseno({
    id: 1,
    nombre: "Alexa",
    categoria: "prematuro",
    descripcion: "Bebé Reborn Alexa, diseño nuevo para talla prematuro.",
    precio: 2300,
    imagen: "assets/img/prematuros/Nuevo Alexa.jpg",
    fotos: [
      "assets/img/prematuros/Nuevo Alexa.jpg"
    ],
    talla: "35 cm · 1.800 kg aprox.",
    material: "Vinilo reborn",
    esNuevo: true
  }),
  crearDiseno({
    id: 2,
    nombre: "Jorge",
    categoria: "prematuro",
    descripcion: "Bebé Reborn Jorge, diseño nuevo para talla prematuro.",
    precio: 2300,
    imagen: "assets/img/prematuros/Nuevo Jorge.jpg",
    fotos: [
      "assets/img/prematuros/Nuevo Jorge.jpg"
    ],
    talla: "35 cm · 1.800 kg aprox.",
    material: "Vinilo reborn",
    esNuevo: true
  }),
  crearDiseno({
    id: 3,
    nombre: "Alejandro",
    categoria: "prematuro",
    descripcion: "Bebé Reborn Alejandro, diseño nuevo para talla prematuro.",
    precio: 2300,
    imagen: "assets/img/prematuros/Alejandro.jpg",
    fotos: [
      "assets/img/prematuros/Alejandro.jpg"
    ],
    talla: "35 cm · 1.800 kg aprox.",
    material: "Vinilo reborn",
    esNuevo: true
  }),
  crearDiseno({
    id: 4,
    nombre: "Dylan",
    categoria: "recien_nacido",
    descripcion: "Bebé Reborn Dylan, diseño nuevo para recién nacido.",
    precio: 2800,
    imagen: "assets/img/recien nacidos/KitDylan15.jpg",
    fotos: [
      "assets/img/recien nacidos/KitDylan15.jpg",
      "assets/img/recien nacidos/KitDylan16.jpg",
      "assets/img/recien nacidos/KitDylan17.JPG",
      "assets/img/recien nacidos/KitDylan18.jpg",
      "assets/img/recien nacidos/KitDylan19.jpg",
      "assets/img/recien nacidos/KitDylan20.jpg"
    ],
    talla: "42 cm · 2.200 kg aprox.",
    material: "Vinilo reborn",
    esNuevo: true
  }),
  crearDiseno({
    id: 5,
    nombre: "Santi",
    categoria: "prematuro",
    descripcion: "Bebé Reborn Santi, diseño nuevo para talla prematuro.",
    precio: 2300,
    imagen: "assets/img/prematuros/santi.jpg",
    fotos: [
      "assets/img/prematuros/santi.jpg",
      "assets/img/prematuros/santi1.jpg"
    ],
    talla: "35 cm · 1.800 kg aprox.",
    material: "Vinilo reborn",
    esNuevo: true
  }),
  crearDiseno({
    id: 6,
    nombre: "Sofía",
    categoria: "prematuro",
    descripcion: "Bebé Reborn Sofía, diseño base premium en talla prematuro.",
    precio: 2300,
    imagen: "assets/img/prematuros/Sofia Diseño Sorpresa.jpg",
    fotos: [
      "assets/img/prematuros/Sofia Diseño Sorpresa.jpg",
      "assets/img/prematuros/Sofia Diseño conejo.jpg",
      "assets/img/prematuros/Sofia2.jpg",
      "assets/img/prematuros/Sofia5.jpg"
    ],
    talla: "35 cm · 1.800 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 7,
    nombre: "Katy",
    categoria: "prematuro",
    descripcion: "Bebé Reborn Katy, diseño base para talla prematuro.",
    precio: 2300,
    imagen: "assets/img/prematuros/Kit Katy Diseño Sorpresa.jpg",
    fotos: [
      "assets/img/prematuros/Kit Katy Diseño Sorpresa.jpg",
      "assets/img/prematuros/Kit Katy Diseño Conejo.jpg",
      "assets/img/prematuros/Kit Katy.jpg",
      "assets/img/prematuros/katy1.jpg"
    ],
    talla: "35 cm · 1.800 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 8,
    nombre: "Lili",
    categoria: "prematuro",
    descripcion: "Bebé Reborn Lili, diseño base para talla prematuro.",
    precio: 2300,
    imagen: "assets/img/prematuros/Kit Lili Diseño Sorpresa.jpg",
    fotos: [
      "assets/img/prematuros/Kit Lili Diseño Sorpresa.jpg",
      "assets/img/prematuros/Kit Lili Diseño Conejo.PNG",
      "assets/img/prematuros/Kit Lili Diseño Tejido.jpg",
      "assets/img/prematuros/Kit Lili Diseño Gemelos Orejas.PNG",
      "assets/img/prematuros/Kit Lili Diseño Gemelas Conejo.JPG",
      "assets/img/prematuros/lili1.jpg",
      "assets/img/prematuros/lili2.jpg"
    ],
    talla: "35 cm · 1.800 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 9,
    nombre: "Tony",
    categoria: "recien_nacido",
    descripcion: "Bebé Reborn Tony, diseño base para recién nacido.",
    precio: 2800,
    imagen: "assets/img/recien nacidos/kitTony11.jpg",
    fotos: [
      "assets/img/recien nacidos/kitTony11.jpg",
      "assets/img/recien nacidos/KitTony12.jpg",
      "assets/img/recien nacidos/KitTony13.jpg",
      "assets/img/recien nacidos/KitTony14.jpg",
      "assets/img/recien nacidos/KitTony15.jpg",
      "assets/img/recien nacidos/KitTony16.jpg",
      "assets/img/recien nacidos/KitTony21.jpg",
      "assets/img/recien nacidos/KitTony23.jpg",
      "assets/img/recien nacidos/KitTony24.jpg",
      "assets/img/recien nacidos/KitTony27.jpg"
    ],
    talla: "42 cm · 2.200 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 15,
    nombre: "Sonriente",
    categoria: "recien_nacido",
    descripcion: "Bebé Reborn Sonriente, diseño base para recién nacido.",
    precio: 2800,
    imagen: "assets/img/recien nacidos/KitSonriente12.jpg",
    fotos: [
      "assets/img/recien nacidos/KitSonriente12.jpg",
      "assets/img/recien nacidos/KitSonriente20.jpg",
      "assets/img/recien nacidos/KitSonriente21.jpg",
      "assets/img/recien nacidos/KitSonriente22.JPG"
    ],
    talla: "42 cm · 2.200 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 10,
    nombre: "Dylan",
    categoria: "3_meses",
    descripcion: "Bebé Reborn Dylan, diseño nuevo para talla de 3 meses.",
    precio: 3200,
    imagen: "assets/img/tres meses/Kit dylan30.jpg",
    fotos: [
      "assets/img/tres meses/Kit dylan30.jpg"
    ],
    talla: "50 cm · 3.000 kg aprox.",
    material: "Vinilo reborn",
    esNuevo: true
  }),
  crearDiseno({
    id: 11,
    nombre: "Berengue",
    categoria: "3_meses",
    descripcion: "Bebé Reborn Berengue, diseño para talla de 3 meses.",
    precio: 3200,
    imagen: "assets/img/tres meses/KitBerengue1.jpg",
    fotos: [
      "assets/img/tres meses/KitBerengue1.jpg",
      "assets/img/tres meses/KitBerengue2.jpg"
    ],
    talla: "50 cm · 3.000 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 12,
    nombre: "Gael",
    categoria: "3_meses",
    descripcion: "Bebé Reborn Gael, diseño para talla de 3 meses.",
    precio: 3200,
    imagen: "assets/img/tres meses/KitGael1.jpg",
    fotos: [
      "assets/img/tres meses/KitGael1.jpg",
      "assets/img/tres meses/KitGael2.jpg"
    ],
    talla: "50 cm · 3.000 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 13,
    nombre: "Luis Angel",
    categoria: "3_meses",
    descripcion: "Bebé Reborn Luis Angel, diseño para talla de 3 meses.",
    precio: 3200,
    imagen: "assets/img/tres meses/KitLuisAngel1.jpg",
    fotos: [
      "assets/img/tres meses/KitLuisAngel1.jpg",
      "assets/img/tres meses/KitLuisAngel2.jpg",
      "assets/img/tres meses/KitLuisAngel3.jpg",
      "assets/img/tres meses/KitLuisAngel4.jpg",
      "assets/img/tres meses/KitLuisAngel5.jpg"
    ],
    talla: "50 cm · 3.000 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 14,
    nombre: "Toto",
    categoria: "3_meses",
    descripcion: "Bebé Reborn Toto, diseño para talla de 3 meses.",
    precio: 3200,
    imagen: "assets/img/tres meses/KitToto1.jpeg",
    fotos: [
      "assets/img/tres meses/KitToto1.jpeg",
      "assets/img/tres meses/KitToto3.jpg",
      "assets/img/tres meses/KitToto5.jpg",
      "assets/img/tres meses/KitToto6.jpg"
    ],
    talla: "50 cm · 3.000 kg aprox.",
    material: "Vinilo reborn"
  }),
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

    const remoteCatalog = result.data.map((item) => crearDiseno(item));
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
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbySrqVoFsPQpNVCT4zPaZbIwjJuXvhENOoYC-2TOwZMzgGzs63p0P16c09vjWnj1Gek/exec";
const CATALOGO_READY = new Promise((resolve) => {
  const cargarDespuesDelPrimerRender = () => cargarCatalogoRemoto().then(resolve);
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(cargarDespuesDelPrimerRender, { timeout: 2000 });
  } else {
    window.setTimeout(cargarDespuesDelPrimerRender, 0);
  }
});