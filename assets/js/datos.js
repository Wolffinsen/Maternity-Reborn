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
    imagen: "assets/img/Nuevo Alexa.jpg",
    fotos: [
      "assets/img/Nuevo Alexa.jpg"
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
    imagen: "assets/img/Nuevo Jorge.jpg",
    fotos: [
      "assets/img/Nuevo Jorge.jpg"
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
    imagen: "assets/img/Alejandro.jpg",
    fotos: [
      "assets/img/Alejandro.jpg"
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
    imagen: "assets/img/Dylan1.jpg",
    fotos: [
      "assets/img/Dylan1.jpg",
      "assets/img/Dylan2.jpg",
      "assets/img/Dylan3.jpg"
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
    imagen: "assets/img/santi.jpg",
    fotos: [
      "assets/img/santi.jpg",
      "assets/img/santi1.jpg"
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
    imagen: "assets/img/Sofia Diseño Sorpresa.jpg",
    fotos: [
      "assets/img/Sofia Diseño Sorpresa.jpg",
      "assets/img/Sofia Diseño conejo.jpg"
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
    imagen: "assets/img/Kit Katy Diseño Sorpresa.jpg",
    fotos: [
      "assets/img/Kit Katy Diseño Sorpresa.jpg"
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
    imagen: "assets/img/Kit Lili Diseño Sorpresa.jpg",
    fotos: [
      "assets/img/Kit Lili Diseño Sorpresa.jpg",
      "assets/img/Kit Lili Diseño Conejo.PNG",
      "assets/img/Kit Lili Diseño Tejido.jpg"
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
    imagen: "assets/img/diseno-15.jpg",
    fotos: ["assets/img/diseno-15.jpg"],
    talla: "42 cm · 2.200 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 8,
    nombre: "Sonriente",
    categoria: "recien_nacido",
    descripcion: "Bebé Reborn Sonriente, diseño base para recién nacido.",
    precio: 2800,
    imagen: "assets/img/diseno-34.jpg",
    fotos: ["assets/img/diseno-34.jpg"],
    talla: "42 cm · 2.200 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 9,
    nombre: "Luis Ángel",
    categoria: "3_meses",
    descripcion: "Bebé Reborn Luis Ángel, diseño base para talla 3 meses.",
    precio: 3300,
    imagen: "assets/img/diseno-53.jpg",
    fotos: ["assets/img/diseno-53.jpg"],
    talla: "55 cm · 2.800 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 10,
    nombre: "Berengue",
    categoria: "3_meses",
    descripcion: "Bebé Reborn Berengue, diseño base para talla 3 meses.",
    precio: 3300,
    imagen: "assets/img/diseno-56.jpg",
    fotos: ["assets/img/diseno-56.jpg"],
    talla: "55 cm · 2.800 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 11,
    nombre: "Gael",
    categoria: "3_meses",
    descripcion: "Bebé Reborn Gael, diseño base para talla 3 meses.",
    precio: 3300,
    imagen: "assets/img/diseno-60.jpg",
    fotos: ["assets/img/diseno-60.jpg"],
    talla: "55 cm · 2.800 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 12,
    nombre: "Toto",
    categoria: "3_meses",
    descripcion: "Bebé Reborn Toto, diseño base para talla 3 meses.",
    precio: 3300,
    imagen: "assets/img/diseno-58.jpg",
    fotos: ["assets/img/diseno-58.jpg"],
    talla: "55 cm · 2.800 kg aprox.",
    material: "Vinilo reborn"
  }),
  crearDiseno({
    id: 18,
    nombre: "Santi",
    categoria: "prematuro",
    descripcion: "Bebé Reborn Santi, diseño nuevo para talla prematuro.",
    precio: 2300,
    imagen: "assets/img/santi.jpg",
    fotos: ["assets/img/santi.jpg", "assets/img/santi1.jpg"],
    talla: "35 cm · 1.800 kg aprox.",
    material: "Vinilo reborn",
    esNuevo: true
  }),
  crearDiseno({
    id: 14,
    nombre: "Lili",
    categoria: "silicona_premium",
    descripcion: "Bebé Reborn Lili, diseño base en silicona premium.",
    precio: 3500,
    imagen: "assets/img/diseno-66.jpg",
    fotos: ["assets/img/diseno-66.jpg", "assets/img/diseno-68.jpg"],
    talla: "32 cm · 1.800 kg aprox.",
    material: "Silicona premium"
  }),
  crearDiseno({
    id: 15,
    nombre: "Katy",
    categoria: "silicona_premium",
    descripcion: "Bebé Reborn Katy, diseño base en silicona premium.",
    precio: 3500,
    imagen: "assets/img/diseno-67.jpg",
    fotos: ["assets/img/diseno-67.jpg"],
    talla: "32 cm · 1.800 kg aprox.",
    material: "Silicona premium"
  })
];

const NUMERO_WHATSAPP = "5216692653343";
const COSTO_APARTADO = 200;
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbzrIJX4SrXc8IEEZ5qrsfp9ue9RVAvAv-SKi8AUEx2RFBDEumJdlj2dkq13dALGaz3v/exec";
