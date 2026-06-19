// src/services/prospector.js
// Prospección de clientes potenciales: escanea negocios reales de una zona
// usando datos de mapas y evalúa su presencia digital para detectar
// oportunidades de venta de servicios de marketing.
//
//   - Nominatim (OpenStreetMap) → geocodifica la ciudad/zona  [GRATIS, sin key]
//   - Overpass API (OpenStreetMap) → lista negocios del rubro  [GRATIS, sin key]
//   - Google Places API → se usa automáticamente si GOOGLE_MAPS_API_KEY existe
//
// Señales de oportunidad: un negocio SIN sitio web ni redes sociales es un
// candidato ideal para ofrecerle pauta digital y presencia online.

const TIMEOUT_MS = 30000;

async function fetchConTimeout(url, opciones = {}, timeout = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      ...opciones,
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'TraffickerHubPro/1.0 (prospeccion comercial; contacto local)',
        ...opciones.headers
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Rubros disponibles y su equivalencia en etiquetas de OpenStreetMap
const CATEGORIAS = [
  { id: 'restaurantes',  nombre: 'Restaurantes',          osm: [['amenity', 'restaurant']] },
  { id: 'cafeterias',    nombre: 'Cafeterías',            osm: [['amenity', 'cafe']] },
  { id: 'gimnasios',     nombre: 'Gimnasios',             osm: [['leisure', 'fitness_centre']] },
  { id: 'dentistas',     nombre: 'Clínicas dentales',     osm: [['amenity', 'dentist']] },
  { id: 'clinicas',      nombre: 'Clínicas y consultorios', osm: [['amenity', 'clinic'], ['amenity', 'doctors']] },
  { id: 'veterinarias',  nombre: 'Veterinarias',          osm: [['amenity', 'veterinary']] },
  { id: 'peluquerias',   nombre: 'Peluquerías y barberías', osm: [['shop', 'hairdresser']] },
  { id: 'ropa',          nombre: 'Tiendas de ropa',       osm: [['shop', 'clothes']] },
  { id: 'panaderias',    nombre: 'Panaderías',            osm: [['shop', 'bakery']] },
  { id: 'ferreterias',   nombre: 'Ferreterías',           osm: [['shop', 'hardware'], ['shop', 'doityourself']] },
  { id: 'talleres',      nombre: 'Talleres mecánicos',    osm: [['shop', 'car_repair']] },
  { id: 'inmobiliarias', nombre: 'Inmobiliarias',         osm: [['office', 'estate_agent']] },
  { id: 'abogados',      nombre: 'Bufetes de abogados',   osm: [['office', 'lawyer']] },
  { id: 'hoteles',       nombre: 'Hoteles y hospedajes',  osm: [['tourism', 'hotel'], ['tourism', 'guest_house']] },
  { id: 'farmacias',     nombre: 'Farmacias',             osm: [['amenity', 'pharmacy']] }
];

// Diccionario de sinónimos en español → etiquetas de OpenStreetMap.
// Permite buscar por TEXTO LIBRE (ej: "spa", "lavadero", "jardin infantil")
// aunque la palabra no aparezca en el nombre del negocio.
const SINONIMOS = {
  // Variantes de las categorías del menú (para que el texto libre también las cubra)
  barberia: [['shop', 'hairdresser']], peluqueria: [['shop', 'hairdresser']], salon: [['shop', 'hairdresser']],
  restaurante: [['amenity', 'restaurant']], restaurantes: [['amenity', 'restaurant']],
  cafeteria: [['amenity', 'cafe']], cafe: [['amenity', 'cafe']],
  dentista: [['amenity', 'dentist']], odontologia: [['amenity', 'dentist']], odontologo: [['amenity', 'dentist']],
  veterinaria: [['amenity', 'veterinary']], veterinario: [['amenity', 'veterinary']],
  ferreteria: [['shop', 'hardware'], ['shop', 'doityourself']],
  farmacia: [['amenity', 'pharmacy']], droguería: [['amenity', 'pharmacy']], drogueria: [['amenity', 'pharmacy']],
  abogado: [['office', 'lawyer']], abogados: [['office', 'lawyer']], bufete: [['office', 'lawyer']],
  inmobiliaria: [['office', 'estate_agent']], 'finca raiz': [['office', 'estate_agent']],
  taller: [['shop', 'car_repair']], 'taller mecanico': [['shop', 'car_repair']], mecanico: [['shop', 'car_repair']],
  clinica: [['amenity', 'clinic'], ['amenity', 'doctors']], consultorio: [['amenity', 'doctors']], medico: [['amenity', 'doctors']],
  ropa: [['shop', 'clothes']], boutique: [['shop', 'clothes']],
  // Rubros adicionales
  spa: [['leisure', 'spa']], masajes: [['shop', 'massage']],
  'lavadero': [['shop', 'car_wash']], 'lavadero de autos': [['shop', 'car_wash']], autolavado: [['shop', 'car_wash']],
  'jardin infantil': [['amenity', 'kindergarten']], guarderia: [['amenity', 'kindergarten']], kinder: [['amenity', 'kindergarten']],
  colegio: [['amenity', 'school']], escuela: [['amenity', 'school']], universidad: [['amenity', 'university']],
  'academia': [['amenity', 'language_school'], ['office', 'educational_institution']],
  optica: [['shop', 'optician']], opticas: [['shop', 'optician']],
  joyeria: [['shop', 'jewelry']], relojeria: [['shop', 'watches']],
  floristeria: [['shop', 'florist']], flores: [['shop', 'florist']],
  zapateria: [['shop', 'shoes']], zapatos: [['shop', 'shoes']],
  juguteria: [['shop', 'toys']], jugueteria: [['shop', 'toys']],
  libreria: [['shop', 'books']], papeleria: [['shop', 'stationery']],
  supermercado: [['shop', 'supermarket']], minimercado: [['shop', 'convenience']], tienda: [['shop', 'convenience']],
  carniceria: [['shop', 'butcher']], fruteria: [['shop', 'greengrocer']],
  licorera: [['shop', 'alcohol']], 'tienda de mascotas': [['shop', 'pet']], mascotas: [['shop', 'pet']],
  mueblería: [['shop', 'furniture']], mueblerias: [['shop', 'furniture']], muebles: [['shop', 'furniture']],
  electronica: [['shop', 'electronics']], celulares: [['shop', 'mobile_phone']], computadores: [['shop', 'computer']],
  bicicletas: [['shop', 'bicycle']], motos: [['shop', 'motorcycle']], 'concesionario': [['shop', 'car']], autos: [['shop', 'car']],
  bar: [['amenity', 'bar'], ['amenity', 'pub']], discoteca: [['amenity', 'nightclub']],
  heladeria: [['amenity', 'ice_cream'], ['shop', 'ice_cream']], pizzeria: [['amenity', 'restaurant']],
  'comida rapida': [['amenity', 'fast_food']], 'fast food': [['amenity', 'fast_food']],
  hotel: [['tourism', 'hotel']], hostal: [['tourism', 'hostel'], ['tourism', 'guest_house']],
  banco: [['amenity', 'bank']], notaria: [['office', 'notary']], contador: [['office', 'accountant']], contaduria: [['office', 'accountant']],
  seguros: [['office', 'insurance']], 'agencia de viajes': [['shop', 'travel_agency']], viajes: [['shop', 'travel_agency']],
  fisioterapia: [['amenity', 'clinic']], psicologo: [['healthcare', 'psychotherapist']], laboratorio: [['healthcare', 'laboratory']],
  estetica: [['shop', 'beauty']], 'centro de estetica': [['shop', 'beauty']], belleza: [['shop', 'beauty']], manicure: [['shop', 'beauty']],
  tatuajes: [['shop', 'tattoo']], 'gimnasio': [['leisure', 'fitness_centre']], yoga: [['leisure', 'fitness_centre']],
  panaderia: [['shop', 'bakery']], reposteria: [['shop', 'pastry']], pasteleria: [['shop', 'pastry']]
};

function normalizar(s) {
  return s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Limpia el texto para usarlo dentro de una regex de Overpass (sin comillas ni metacaracteres)
function escaparRegex(s) {
  return s.replace(/["\\]/g, '').replace(/[.*+?^${}()|[\]]/g, '\\$&');
}

async function geocodificar(ciudad, pais) {
  const q = encodeURIComponent(`${ciudad}, ${pais}`);
  const data = await fetchConTimeout(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&addressdetails=0`
  );
  if (!data.length) return null;
  const [sur, norte, oeste, este] = data[0].boundingbox.map(Number);
  return { nombre: data[0].display_name, bbox: { sur, norte, oeste, este } };
}

function extraerNegocio(el, categoria) {
  const t = el.tags || {};
  if (!t.name) return null;

  const web = t.website || t['contact:website'] || null;
  const facebook = t['contact:facebook'] || null;
  const instagram = t['contact:instagram'] || null;
  const telefono = t.phone || t['contact:phone'] || t['contact:mobile'] || null;
  const email = t.email || t['contact:email'] || null;

  const direccion = [
    t['addr:street'] && `${t['addr:street']} ${t['addr:housenumber'] || ''}`.trim(),
    t['addr:city']
  ].filter(Boolean).join(', ') || null;

  // Score de oportunidad: mientras menos presencia digital, más nos necesita
  let score = 0;
  const senales = [];
  if (!web) { score += 45; senales.push('Sin sitio web'); }
  if (!facebook && !instagram) { score += 30; senales.push('Sin redes sociales visibles'); }
  if (!email) { score += 10; senales.push('Sin email público'); }
  if (!t.opening_hours) { score += 15; senales.push('Sin horarios publicados'); }

  const nivel = score >= 70 ? 'alta' : score >= 40 ? 'media' : 'baja';

  return {
    nombre: t.name,
    categoria,
    direccion,
    telefono,
    email,
    web,
    redes: { facebook, instagram },
    lat: el.lat || el.center?.lat || null,
    lon: el.lon || el.center?.lon || null,
    contactable: Boolean(telefono || email),
    score,
    nivel,
    senales,
    fuente: 'openstreetmap'
  };
}

// Ejecuta una consulta Overpass probando varios espejos públicos
async function ejecutarOverpass(consulta) {
  const espejos = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.osm.jp/api/interpreter'
  ];
  let ultimoError = null;
  for (const espejo of espejos) {
    try {
      const data = await fetchConTimeout(espejo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(consulta)
      }, 45000);
      // Overpass a veces responde 200 con un "remark" de timeout/sobrecarga y
      // lista vacía: eso NO es un resultado válido, hay que probar otro espejo.
      if (data.remark && (!data.elements || data.elements.length === 0)) {
        throw new Error(`remark: ${data.remark}`);
      }
      return data;
    } catch (e) {
      ultimoError = e;
      console.warn(`Overpass ${espejo} falló (${e.message}), probando espejo...`);
    }
  }
  throw ultimoError || new Error('Todos los servidores de mapas saturados, reintenta en unos segundos');
}

function procesarElementos(elementos, nombreCategoria, limite) {
  const vistos = new Set();
  const negocios = [];
  for (const el of elementos || []) {
    const n = extraerNegocio(el, nombreCategoria);
    if (!n || vistos.has(n.nombre.toLowerCase())) continue;
    vistos.add(n.nombre.toLowerCase());
    negocios.push(n);
  }
  // Primero las mejores oportunidades contactables
  negocios.sort((a, b) => (b.contactable - a.contactable) || (b.score - a.score));
  return negocios.slice(0, limite);
}

// Búsqueda por categoría predefinida (menú)
async function buscarEnOSM({ categoria, bbox, limite }) {
  const cat = CATEGORIAS.find((c) => c.id === categoria);
  if (!cat) throw new Error(`Categoría desconocida: ${categoria}`);

  const area = `(${bbox.sur},${bbox.oeste},${bbox.norte},${bbox.este})`;
  const bloques = cat.osm
    .map(([k, v]) => `node["${k}"="${v}"]${area};\nway["${k}"="${v}"]${area};`)
    .join('\n');

  const consulta = `[out:json][timeout:25];\n(\n${bloques}\n);\nout center tags ${limite * 3};`;
  const data = await ejecutarOverpass(consulta);
  return procesarElementos(data.elements, cat.nombre, limite);
}

// Búsqueda por TEXTO LIBRE: combina sinónimos conocidos + coincidencia por nombre
async function buscarLibreEnOSM({ texto, bbox, limite }) {
  const area = `(${bbox.sur},${bbox.oeste},${bbox.norte},${bbox.este})`;
  const clave = normalizar(texto);
  const bloques = [];

  // 1) Si el texto coincide con un sinónimo conocido, usa sus etiquetas exactas
  const tags = SINONIMOS[clave];
  const setTags = new Set((tags || []).map(([k, v]) => `${k}=${v}`));
  if (tags) {
    for (const [k, v] of tags) {
      bloques.push(`node["${k}"="${v}"]${area};`, `way["${k}"="${v}"]${area};`);
    }
  }

  // 2) Además, busca negocios cuyo NOMBRE contenga el texto (cualquier rubro)
  const kw = escaparRegex(texto.trim());
  if (kw.length >= 3) {
    for (const k of ['shop', 'amenity', 'office', 'craft', 'leisure', 'tourism', 'healthcare']) {
      bloques.push(`node["${k}"]["name"~"${kw}",i]${area};`, `way["${k}"]["name"~"${kw}",i]${area};`);
    }
  }

  if (!bloques.length) {
    throw new Error('Escribe un tipo de negocio de al menos 3 letras.');
  }

  const consulta = `[out:json][timeout:25];\n(\n${bloques.join('\n')}\n);\nout center tags ${limite * 6};`;
  const data = await ejecutarOverpass(consulta);

  // Filtra falsos positivos: acepta el negocio si tiene una etiqueta de sinónimo
  // O si su nombre contiene la palabra completa (no como subcadena de otra palabra).
  const palabra = new RegExp(`(^|[^a-záéíóúñ])${clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-záéíóúñ]|$)`, 'i');
  const filtrados = (data.elements || []).filter((el) => {
    const t = el.tags || {};
    const porTag = setTags.size && Object.entries(t).some(([k, v]) => setTags.has(`${k}=${v}`));
    const porNombre = t.name && palabra.test(normalizar(t.name));
    return porTag || porNombre;
  });

  const etiqueta = texto.trim().charAt(0).toUpperCase() + texto.trim().slice(1);
  return procesarElementos(filtrados, etiqueta, limite);
}

// Soporte opcional para Google Places API (si el usuario tiene key con billing)
async function buscarEnGooglePlaces({ termino, ciudad, pais, limite }) {
  const data = await fetchConTimeout('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount'
    },
    body: JSON.stringify({
      textQuery: `${termino} en ${ciudad}, ${pais}`,
      maxResultCount: Math.min(limite, 20),
      languageCode: 'es'
    })
  });

  return (data.places || []).map((p) => {
    const web = p.websiteUri || null;
    let score = 0;
    const senales = [];
    if (!web) { score += 45; senales.push('Sin sitio web'); }
    if ((p.userRatingCount || 0) < 20) { score += 25; senales.push('Pocas reseñas (poca visibilidad)'); }
    if ((p.rating || 0) > 0 && p.rating < 4) { score += 15; senales.push('Calificación mejorable'); }
    const nivel = score >= 60 ? 'alta' : score >= 35 ? 'media' : 'baja';
    return {
      nombre: p.displayName?.text,
      categoria: termino,
      direccion: p.formattedAddress || null,
      telefono: p.nationalPhoneNumber || null,
      email: null,
      web,
      redes: {},
      rating: p.rating || null,
      resenas: p.userRatingCount || 0,
      contactable: Boolean(p.nationalPhoneNumber),
      score,
      nivel,
      senales,
      fuente: 'google-places'
    };
  });
}

function estadisticas(negocios) {
  const total = negocios.length;
  if (!total) return null;
  const conWeb = negocios.filter((n) => n.web).length;
  const conRedes = negocios.filter((n) => n.redes?.facebook || n.redes?.instagram).length;
  const contactables = negocios.filter((n) => n.contactable).length;
  const altaOportunidad = negocios.filter((n) => n.nivel === 'alta').length;
  return {
    total,
    conWeb,
    pctConWeb: Math.round((conWeb / total) * 100),
    conRedes,
    pctConRedes: Math.round((conRedes / total) * 100),
    contactables,
    altaOportunidad,
    lectura: `De ${total} negocios del rubro escaneados, solo el ${Math.round((conWeb / total) * 100)}% tiene sitio web y el ${Math.round((conRedes / total) * 100)}% muestra redes sociales: el resto es mercado abierto para servicios de marketing digital.`
  };
}

async function buscar({ categoria, tipoLibre, ciudad, pais, limite = 25 }) {
  // El término a buscar: texto libre tiene prioridad sobre el menú
  const cat = CATEGORIAS.find((c) => c.id === categoria);
  const termino = (tipoLibre && tipoLibre.trim()) || cat?.nombre || categoria;

  // Motor Google Places (si hay key con facturación activa)
  if (process.env.GOOGLE_MAPS_API_KEY) {
    const negocios = await buscarEnGooglePlaces({ termino, ciudad, pais, limite });
    return { zona: `${ciudad}, ${pais}`, motor: 'google-places', termino, negocios, estadisticas: estadisticas(negocios) };
  }

  // Motor OpenStreetMap (gratis, por defecto)
  const zona = await geocodificar(ciudad, pais);
  if (!zona) throw new Error(`No se encontró la zona "${ciudad}, ${pais}". Prueba con otra ciudad.`);

  const negocios = (tipoLibre && tipoLibre.trim())
    ? await buscarLibreEnOSM({ texto: tipoLibre, bbox: zona.bbox, limite })
    : await buscarEnOSM({ categoria, bbox: zona.bbox, limite });

  return { zona: zona.nombre, motor: 'openstreetmap', termino, negocios, estadisticas: estadisticas(negocios) };
}

module.exports = { buscar, CATEGORIAS };
