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
    slug: "sofia",
    descripcion: "Bebé reborn de silicona con acabados suaves y detalle realista de rostro y manos.",
    precio: 18900,
    imagen: "assets/img/diseno-1.jpg",
    disponible: true,
    subtitulo: "Recién nacida · dormida",
    talla: "48 cm · 2.9 kg",
    material: "Silicona",
    cabello: "Mohair implantado",
    incluye: "Manta, bonete y acta",
    fotos: ["assets/img/diseno-1.jpg", "assets/img/diseno-2.jpg", "assets/img/diseno-3.jpg"],
    categorias: ["recién_nacido", "silicona"],
    certificacion: {
      texto: "Certificado de autenticidad y calidad del material. Verifica la artesanía, lista de materiales y proceso de terminación a mano.",
      archivoUrl: "#"
    },
    cuidados: [
      "Limpia la piel con un paño ligeramente humedecido y sin productos químicos.",
      "Evita la luz solar directa y el calor excesivo para proteger la pintura.",
      "Mantén el pelo peinado con peine suave y agua únicamente.",
      "No uses gorros ni colas para evitar que dañe el pelo injertado."
    ]
  },
  {
    id: 2,
    nombre: "Mateo",
    slug: "mateo",
    descripcion: "Bebé reborn recién nacido con mirada tranquila y detalle de vitrinas artesanales.",
    precio: 21400,
    imagen: "assets/img/diseno-2.jpg",
    disponible: true,
    subtitulo: "Recién nacido · despierto",
    talla: "50 cm · 3.1 kg",
    material: "Vinilo",
    cabello: "Pintado a mano",
    incluye: "Ropón, caja y acta",
    fotos: ["assets/img/diseno-2.jpg", "assets/img/diseno-1.jpg", "assets/img/diseno-4.jpg"],
    categorias: ["recién_nacido"],
    certificacion: {
      texto: "Certificado de calidad de vinilo y acabado artístico. Incluye materiales, proceso de pintura y revisión final.",
      archivoUrl: "#"
    },
    cuidados: [
      "Usa un paño seco para retirar el polvo sin frotar demasiado la pintura.",
      "Guárdalo en un lugar limpio, seco y protegido de la humedad.",
      "Evita perfumes o toallitas húmedas en la piel y el pelo.",
      "Mantén la zona de almacenamiento alejada de la luz solar directa."
    ]
  },
  {
    id: 3,
    nombre: "Lucía",
    slug: "lucia",
    descripcion: "Modelo de acabado premium para coleccionistas con detalle de encaje y tonalidades delicadas.",
    precio: 24900,
    imagen: "assets/img/diseno-3.jpg",
    disponible: false,
    subtitulo: "Recién nacida · edición dorada",
    talla: "49 cm · 3.0 kg",
    material: "Vinilo",
    cabello: "Mohair implantado",
    incluye: "Vestido de encaje y acta",
    fotos: ["assets/img/diseno-3.jpg", "assets/img/diseno-1.jpg", "assets/img/diseno-2.jpg"],
    categorias: ["prematuro", "recién_nacido"],
    certificacion: {
      texto: "Certificación especial de acabado premium: material, pintura detallada y revisión de calidad antes de entrega.",
      archivoUrl: "#"
    },
    cuidados: [
      "Haz limpieza con paño ligeramente humedecido y sin jabones ni cremas.",
      "Evita perfumes en la piel y en la cabellera para proteger la pintura.",
      "Mantén lejos del sol y de calor directo para conservar los tonos.",
      "Péinalo con peine suave si presenta nudos en el cabello implantado."
    ]
  },
  {
    id: 4,
    nombre: "Noah",
    slug: "noah",
    descripcion: "Bebé reborn estilo minimal con realismo delicado y una expresión serena.",
    precio: 17500,
    imagen: "assets/img/diseno-4.jpg",
    disponible: true,
    subtitulo: "Recién nacido · minimal",
    talla: "47 cm · 2.7 kg",
    material: "Silicona",
    cabello: "Mohair rubio claro",
    incluye: "Body de algodón y acta",
    fotos: ["assets/img/diseno-4.jpg", "assets/img/diseno-2.jpg", "assets/img/diseno-1.jpg"],
    categorias: ["prematuro", "silicona"],
    certificacion: {
      texto: "Certificado de material en silicona y toque terapéutico. Incluye cuidados específicos y garantía de terminación artesanal.",
      archivoUrl: "#"
    },
    cuidados: [
      "La silicona requiere limpieza con paño seco y suave, sin alcohol ni productos abrasivos.",
      "No lo expongas a rayos solares ni a calor fuerte para evitar deformaciones.",
      "Protege su cabeza y su cabello del roce constante con gorras o colas.",
      "Guárdalo en caja o funda limpia para mayor protección."
    ]
  },
  {
    id: 5,
    nombre: "Emma",
    slug: "emma",
    descripcion: "Modelo de 3 meses con posesidad más madura y acabado de colección.",
    precio: 28600,
    imagen: "assets/img/diseno-1.jpg",
    disponible: true,
    subtitulo: "3 meses · despierta",
    talla: "62 cm · 4.4 kg",
    material: "Silicona",
    cabello: "Mohair rizado implantado",
    incluye: "Suéter de punto y acta",
    fotos: ["assets/img/diseno-1.jpg", "assets/img/diseno-3.jpg", "assets/img/diseno-4.jpg"],
    categorias: ["3_meses", "silicona"],
    certificacion: {
      texto: "Certificado de calidad para pieza de 3 meses. Acredita silicona, terminación y revisión final del fabricante.",
      archivoUrl: "#"
    },
    cuidados: [
      "Mantén la piel limpia con paño suave y seco, evitando toallitas húmedas.",
      "Péina el cabello mojado con agua y peine de púas suaves.",
      "Evita que la colonia toque la pieza y detériore la pintura.",
      "Guárdalo en un lugar seguro y alejado del sol."
    ]
  },
  {
    id: 6,
    nombre: "Theo",
    slug: "theo",
    descripcion: "Bebé reborn con tonalidad cálida, ideal para colección o terapia emocional.",
    precio: 19800,
    imagen: "assets/img/diseno-2.jpg",
    disponible: false,
    subtitulo: "Recién nacido · dormido",
    talla: "46 cm · 2.6 kg",
    material: "Vinilo",
    cabello: "Mohair castaño",
    incluye: "Muselina dorada y acta",
    fotos: ["assets/img/diseno-2.jpg", "assets/img/diseno-4.jpg", "assets/img/diseno-3.jpg"],
    categorias: ["prematuro", "recién_nacido"],
    certificacion: {
      texto: "Certificado de revisión y material del fabricante, con detalle de pintura y acabado final de la pieza.",
      archivoUrl: "#"
    },
    cuidados: [
      "Usa solo paño levemente húmedo en la piel sin jabón ni crema.",
      "Evita las colas y gorros para conservar la cabellera injertada.",
      "No uses toallitas ni perfumes sobre la pieza.",
      "Mantén una limpieza constante para preservar la calidad del acabado."
    ]
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
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbzrIJX4SrXc8IEEZ5qrsfp9ue9RVAvAv-SKi8AUEx2RFBDEumJdlj2dkq13dALGaz3v/exec";
