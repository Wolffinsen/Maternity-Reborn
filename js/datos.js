/* =========================================================
   DATOS DEL CATÁLOGO
   -----------------------------------------------------------
   Para AGREGAR un diseño nuevo: copia un bloque { ... } completo,
   pégalo antes del ], cambia sus datos y ponle un "id" que no
   se repita.

   Para MARCAR como apartado: cambia "disponible: true" a
   "disponible: false" en ese diseño.

   Para QUITAR un diseño: borra su bloque { ... } completo.
   ========================================================= */

const CATALOGO = [
  {
    id: 1,
    nombre: "Sofía",
    precio: 18900,
    imagen: "img/diseno-1.jpg",
    disponible: true,
    subtitulo: "Recién nacida · dormida",
    talla: "48 cm · 2.9 kg",
    material: "Silicona vinílica premium",
    cabello: "Mohair implantado",
    incluye: "Manta, bonete y acta",
    fotos: ["img/diseno-1.jpg", "img/diseno-2.jpg", "img/diseno-3.jpg"]
  },
  {
    id: 2,
    nombre: "Mateo",
    precio: 21400,
    imagen: "img/diseno-2.jpg",
    disponible: true,
    subtitulo: "Recién nacido · despierto",
    talla: "50 cm · 3.1 kg",
    material: "Vinilo de grado médico",
    cabello: "Pintado a mano",
    incluye: "Ropón, caja y acta",
    fotos: ["img/diseno-2.jpg", "img/diseno-1.jpg", "img/diseno-4.jpg"]
  },
  {
    id: 3,
    nombre: "Lucía",
    precio: 24900,
    imagen: "img/diseno-3.jpg",
    disponible: false,
    subtitulo: "Recién nacida · edición dorada",
    talla: "49 cm · 3.0 kg",
    material: "Vinilo con acabado Genesis",
    cabello: "Mohair implantado",
    incluye: "Vestido de encaje y acta",
    fotos: ["img/diseno-3.jpg", "img/diseno-1.jpg", "img/diseno-2.jpg"]
  },
  {
    id: 4,
    nombre: "Noah",
    precio: 17500,
    imagen: "img/diseno-4.jpg",
    disponible: true,
    subtitulo: "Recién nacido · minimal",
    talla: "47 cm · 2.7 kg",
    material: "Vinilo en tono cálido",
    cabello: "Mohair rubio claro",
    incluye: "Body de algodón y acta",
    fotos: ["img/diseno-4.jpg", "img/diseno-2.jpg", "img/diseno-1.jpg"]
  },
  {
    id: 5,
    nombre: "Emma",
    precio: 28600,
    imagen: "img/diseno-1.jpg",
    disponible: true,
    subtitulo: "Toddler · despierta",
    talla: "62 cm · 4.4 kg",
    material: "Vinilo de grado médico",
    cabello: "Mohair rizado implantado",
    incluye: "Suéter de punto y acta",
    fotos: ["img/diseno-1.jpg", "img/diseno-3.jpg", "img/diseno-4.jpg"]
  },
  {
    id: 6,
    nombre: "Theo",
    precio: 19800,
    imagen: "img/diseno-2.jpg",
    disponible: false,
    subtitulo: "Recién nacido · dormido",
    talla: "46 cm · 2.6 kg",
    material: "Vinilo de grado médico",
    cabello: "Mohair castaño",
    incluye: "Muselina dorada y acta",
    fotos: ["img/diseno-2.jpg", "img/diseno-4.jpg", "img/diseno-3.jpg"]
  }
];

/* =========================================================
   CONFIGURACIÓN GENERAL
   ========================================================= */

// Número de WhatsApp que recibirá los apartados.
// Formato: código de país + número, SIN espacios, SIN "+" ni "00".
// Ejemplo México: 521 + 10 dígitos
const NUMERO_WHATSAPP = "5216692653343";

// Costo del apartado (solo para mostrarlo en los mensajes/textos)
const COSTO_APARTADO = 200;

// URL de tu Google Apps Script (paso 5 de la guía de conexión).
// Debe terminar en /exec. Mientras la dejes vacía (""), el catálogo
// seguirá generando folios temporales sin guardar nada en Sheets.
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbziHnzeHKmQ8dEAw_3aFTCPqzjQvCqQEeLvMLqb2c-hBfwXPJSxq68QpdGGNBMzaseF/exec";
