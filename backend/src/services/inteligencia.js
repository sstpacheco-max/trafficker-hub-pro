// src/services/inteligencia.js
// Inteligencia de jurisdicción: obtiene datos REALES en vivo de fuentes
// públicas (sin API keys) para enriquecer la decisión de campaña.
//   - Banco Mundial → catálogo de países, nivel de ingreso, población,
//                     % usuarios de internet, PIB per cápita, móviles/100 hab
//   - Wikipedia (es) → resumen contextual de la jurisdicción
// Si no hay internet, el endpoint devuelve error claro y el frontend lo muestra.

const TIMEOUT_MS = 10000;

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'TraffickerHubPro/1.0 (herramienta de planificacion)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// El Banco Mundial usa nombres en inglés; alias para los nombres en español más comunes
const ALIAS_ES = {
  'espana': 'spain', 'españa': 'spain',
  'estados unidos': 'united states', 'eeuu': 'united states', 'usa': 'united states',
  'mexico': 'mexico', 'méxico': 'mexico',
  'brasil': 'brazil',
  'peru': 'peru', 'perú': 'peru',
  'panama': 'panama', 'panamá': 'panama',
  'republica dominicana': 'dominican republic', 'república dominicana': 'dominican republic',
  'reino unido': 'united kingdom',
  'alemania': 'germany', 'francia': 'france', 'italia': 'italy',
  'paises bajos': 'netherlands', 'países bajos': 'netherlands', 'holanda': 'netherlands',
  'suiza': 'switzerland', 'belgica': 'belgium', 'bélgica': 'belgium',
  'canada': 'canada', 'canadá': 'canada',
  'japon': 'japan', 'japón': 'japan', 'china': 'china', 'india': 'india',
  'turquia': 'turkiye', 'turquía': 'turkiye'
};

// Monedas e idiomas de referencia para los mercados hispanos más frecuentes
const INFO_LOCAL = {
  CO: { idiomas: ['Español'], moneda: 'Peso colombiano (COP)' },
  MX: { idiomas: ['Español'], moneda: 'Peso mexicano (MXN)' },
  AR: { idiomas: ['Español'], moneda: 'Peso argentino (ARS)' },
  CL: { idiomas: ['Español'], moneda: 'Peso chileno (CLP)' },
  PE: { idiomas: ['Español'], moneda: 'Sol peruano (PEN)' },
  EC: { idiomas: ['Español'], moneda: 'Dólar estadounidense (USD)' },
  ES: { idiomas: ['Español'], moneda: 'Euro (EUR)' },
  US: { idiomas: ['Inglés', 'Español'], moneda: 'Dólar estadounidense (USD)' },
  BR: { idiomas: ['Portugués'], moneda: 'Real brasileño (BRL)' },
  PA: { idiomas: ['Español'], moneda: 'Balboa / USD' },
  UY: { idiomas: ['Español'], moneda: 'Peso uruguayo (UYU)' },
  PY: { idiomas: ['Español', 'Guaraní'], moneda: 'Guaraní (PYG)' },
  BO: { idiomas: ['Español'], moneda: 'Boliviano (BOB)' },
  CR: { idiomas: ['Español'], moneda: 'Colón costarricense (CRC)' },
  GT: { idiomas: ['Español'], moneda: 'Quetzal (GTQ)' },
  DO: { idiomas: ['Español'], moneda: 'Peso dominicano (DOP)' },
  VE: { idiomas: ['Español'], moneda: 'Bolívar (VES)' }
};

function normalizar(s) {
  // NFD separa los acentos en marcas combinantes (U+0300–U+036F) y las elimina
  return s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Catálogo de países del Banco Mundial (se carga una vez por proceso)
let catalogoPaises = null;
async function obtenerCatalogo() {
  if (catalogoPaises) return catalogoPaises;
  const data = await fetchJson('https://api.worldbank.org/v2/country?format=json&per_page=400');
  catalogoPaises = (data?.[1] || []).filter((p) => p.region?.id !== 'NA'); // excluye agregados
  return catalogoPaises;
}

async function buscarPais(nombre) {
  const catalogo = await obtenerCatalogo();
  const buscado = ALIAS_ES[normalizar(nombre)] || normalizar(nombre);
  return (
    catalogo.find((p) => normalizar(p.name) === buscado) ||
    catalogo.find((p) => p.iso2Code.toLowerCase() === buscado) ||
    catalogo.find((p) => normalizar(p.name).includes(buscado))
  );
}

// Último valor disponible de un indicador del Banco Mundial
async function indicador(iso2, codigo) {
  try {
    const data = await fetchJson(
      `https://api.worldbank.org/v2/country/${iso2}/indicator/${codigo}?format=json&mrnev=1`
    );
    const fila = data?.[1]?.[0];
    return fila && fila.value != null ? { valor: fila.value, anio: fila.date } : null;
  } catch {
    return null;
  }
}

async function resumenWikipedia(termino) {
  try {
    const data = await fetchJson(
      `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(termino)}`
    );
    return data.extract || null;
  } catch {
    return null;
  }
}

// Tier publicitario según la clasificación oficial de ingreso del Banco Mundial
const TIERS = {
  HIC: { tier: 'Premium',   cpmUsd: [8, 15] },   // High income
  UMC: { tier: 'Alto',      cpmUsd: [4, 8] },    // Upper middle income
  LMC: { tier: 'Medio',     cpmUsd: [2, 5] },    // Lower middle income
  LIC: { tier: 'Emergente', cpmUsd: [1, 3] }     // Low income
};

async function analizarJurisdiccion({ pais, ciudad }) {
  const fuentes = [];

  const encontrado = await buscarPais(pais);
  if (!encontrado) {
    return {
      ok: false,
      error: `No se encontró el país "${pais}" en el catálogo del Banco Mundial. Verifica el nombre (ej: Colombia, México, España).`
    };
  }
  fuentes.push('api.worldbank.org');

  const iso2 = encontrado.iso2Code;
  const [poblacion, internet, pibPc, moviles] = await Promise.all([
    indicador(iso2, 'SP.POP.TOTL'),     // población total
    indicador(iso2, 'IT.NET.USER.ZS'),  // % población usuaria de internet
    indicador(iso2, 'NY.GDP.PCAP.CD'),  // PIB per cápita USD
    indicador(iso2, 'IT.CEL.SETS.P2')   // móviles por 100 habitantes
  ]);

  const wiki = await resumenWikipedia(ciudad || encontrado.name);
  if (wiki) fuentes.push('es.wikipedia.org');

  const pob = poblacion?.valor ?? 0;
  const pctInternet = internet?.valor ?? 65;
  const audienciaDigital = Math.round(pob * (pctInternet / 100));

  const nivel = TIERS[encontrado.incomeLevel?.id] || TIERS.LMC;
  const local = INFO_LOCAL[iso2] || {};

  return {
    ok: true,
    consultadoEn: new Date().toISOString(),
    fuentes,
    pais: {
      nombreOficial: encontrado.name,
      iso2,
      poblacion: pob,
      capital: encontrado.capitalCity || null,
      region: encontrado.region?.value || '',
      nivelIngreso: encontrado.incomeLevel?.value || '',
      idiomas: local.idiomas || [],
      monedas: local.moneda ? [local.moneda] : []
    },
    ciudad: ciudad || null,
    indicadores: {
      internetPct: internet
        ? { valor: Number(internet.valor.toFixed(1)), anio: internet.anio }
        : { valor: pctInternet, anio: 'estimado', estimado: true },
      pibPerCapitaUsd: pibPc
        ? { valor: Math.round(pibPc.valor), anio: pibPc.anio }
        : { valor: 6000, anio: 'estimado', estimado: true },
      movilesPor100: moviles ? { valor: Number(moviles.valor.toFixed(1)), anio: moviles.anio } : null
    },
    audienciaDigital,
    mercadoPublicitario: { tier: nivel.tier, cpmEstimadoUsd: nivel.cpmUsd },
    contexto: wiki
  };
}

module.exports = { analizarJurisdiccion };
