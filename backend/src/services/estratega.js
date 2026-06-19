// src/services/estratega.js
// Motor de reglas del Estratega: combina el brief del cuestionario con la
// inteligencia de jurisdicción y produce un plan de campaña accionable:
// formato estrella, mezcla de plataformas, estructura de anuncios,
// estrategia B2B/B2C, KPIs objetivo y checklist de arranque.

function edadMedia(publico) {
  const min = Number(publico?.edadMin) || 25;
  const max = Number(publico?.edadMax) || 45;
  return (min + max) / 2;
}

function formatoEstrella({ modelo, objetivo, publico }) {
  const edad = edadMedia(publico);

  if (modelo === 'b2b') {
    return {
      nombre: 'Video testimonial corto + Lead Form nativo',
      specs: '30-60s, horizontal 16:9 o cuadrado 1:1, subtítulos siempre',
      canalPrincipal: 'Google Search + Meta Lead Ads',
      razon: 'En B2B la confianza pesa más que el impacto: el testimonio de un cliente similar al prospecto es el formato con mejor tasa de conversión a reunión, y el formulario nativo elimina la fricción del sitio web.'
    };
  }
  if (edad < 28) {
    return {
      nombre: 'Video vertical estilo UGC (9:16)',
      specs: '9-15s, gancho en los primeros 2s, grabado "a mano", sin look corporativo',
      canalPrincipal: 'TikTok + Instagram Reels',
      razon: 'Para público menor de 28 años el contenido nativo tipo creador (UGC) supera consistentemente al contenido pulido en CTR y costo por resultado. El algoritmo premia retención temprana.'
    };
  }
  if (edad < 45) {
    return {
      nombre: 'Reels con prueba social + Carrusel de oferta',
      specs: 'Reel 15-30s con resultados reales; carrusel 4-6 tarjetas para remarketing',
      canalPrincipal: 'Instagram/Facebook Reels + Feed',
      razon: 'Entre 28 y 45 años el video corto sigue ganando alcance barato, pero el carrusel convierte mejor en remarketing porque permite mostrar beneficios, precio y objeciones resueltas en una sola pieza.'
    };
  }
  return {
    nombre: 'Video explicativo claro + Imagen estática con oferta directa',
    specs: '30-45s ritmo pausado, texto grande y legible; estática con precio/beneficio explícito',
    canalPrincipal: 'Facebook Feed + Google Search',
    razon: 'El público 45+ responde mejor a mensajes directos y legibles que a tendencias: claridad sobre creatividad. Facebook Feed y Búsqueda concentran su atención e intención.'
  };
}

function mezclaPlataformas({ modelo, objetivo, publico }) {
  const edad = edadMedia(publico);
  if (modelo === 'b2b') {
    return [
      { plataforma: 'Google Search', pct: 45, rol: 'Capturar demanda activa (palabras clave de solución)' },
      { plataforma: 'Meta (FB/IG)', pct: 35, rol: 'Lead Ads + remarketing a visitantes y lista de clientes' },
      { plataforma: 'TikTok', pct: 20, rol: 'Awareness de marca con contenido educativo del fundador' }
    ];
  }
  if (objetivo === 'branding') {
    return [
      { plataforma: 'TikTok', pct: 40, rol: 'Alcance masivo de bajo costo' },
      { plataforma: 'Meta (FB/IG)', pct: 40, rol: 'Frecuencia y reconocimiento en Reels/Stories' },
      { plataforma: 'Google Display/YouTube', pct: 20, rol: 'Cobertura de video y recordación' }
    ];
  }
  if (edad < 28) {
    return [
      { plataforma: 'TikTok', pct: 45, rol: 'Canal principal de adquisición' },
      { plataforma: 'Meta (FB/IG)', pct: 35, rol: 'Reels espejo + remarketing' },
      { plataforma: 'Google Search', pct: 20, rol: 'Capturar búsquedas de marca generadas por el video' }
    ];
  }
  return [
    { plataforma: 'Meta (FB/IG)', pct: 50, rol: 'Canal principal: prospección + remarketing' },
    { plataforma: 'Google Search', pct: 30, rol: 'Demanda activa con intención de compra' },
    { plataforma: 'TikTok', pct: 20, rol: 'Pruebas de creativos y alcance incremental' }
  ];
}

function estructuraAnuncios({ objetivo, producto, fortalezas, publico }) {
  const interes = publico?.intereses || 'intereses afines al producto';
  return {
    campania: `Campaña ${objetivo.toUpperCase()} — ${producto}`,
    conjuntos: [
      {
        nombre: 'C1 · Prospección fría',
        presupuestoPct: 50,
        publico: `Lookalike 1-3% de compradores + intereses: ${interes}`,
        anuncios: [
          { angulo: 'Dolor → Solución', gancho: 'Abrir con el problema exacto del avatar en sus palabras' },
          { angulo: 'Prueba social', gancho: 'Resultado real de un cliente con cifras concretas' },
          { angulo: 'Diferencial', gancho: `Atacar con la fortaleza: "${(fortalezas || 'tu diferencial principal').slice(0, 80)}"` }
        ]
      },
      {
        nombre: 'C2 · Remarketing tibio',
        presupuestoPct: 30,
        publico: 'Visitantes del sitio 30 días + interacción con perfil/anuncios 60 días',
        anuncios: [
          { angulo: 'Objeciones', gancho: 'Responder la objeción #1 que frena la compra' },
          { angulo: 'Urgencia honesta', gancho: 'Cupos/tiempo/bonos limitados reales' }
        ]
      },
      {
        nombre: 'C3 · Remarketing caliente',
        presupuestoPct: 20,
        publico: 'Carrito abandonado / iniciaron checkout / lead sin cierre 7 días',
        anuncios: [
          { angulo: 'Oferta directa', gancho: 'Recordatorio + incentivo de cierre (descuento o bono)' }
        ]
      }
    ]
  };
}

function estrategia({ modelo }) {
  if (modelo === 'b2b') {
    return {
      tipo: 'B2B',
      principios: [
        'Ciclo largo: mide costo por reunión calificada, no por venta inmediata.',
        'El contenido educativo del fundador/experto construye autoridad antes del pitch.',
        'Lead magnet de alto valor (diagnóstico, plantilla, auditoría) en vez de venta directa.',
        'Remarketing por cargo e industria; el mensaje cambia según quién decide y quién usa.',
        'Seguimiento comercial en menos de 5 minutos tras el lead multiplica el cierre.'
      ]
    };
  }
  return {
    tipo: 'B2C',
    principios: [
      'Velocidad creativa: 3-5 creativos nuevos por semana, mata los perdedores en 72h.',
      'El gancho de los primeros 2 segundos define el 80% del resultado del anuncio.',
      'Embudo corto: del anuncio a la compra en el menor número de clics posible.',
      'Prueba social visible (reseñas, UGC, antes/después) en cada pieza.',
      'Escala horizontal (duplicar conjuntos ganadores) antes que vertical (+20% presupuesto cada 48h).'
    ]
  };
}

function kpisObjetivo({ objetivo, ticket, presupuesto, jurisdiccion }) {
  const t = Number(ticket) || 50;
  const [cpmMin, cpmMax] = jurisdiccion?.mercadoPublicitario?.cpmEstimadoUsd || [2.5, 6];
  const cpmMedio = (cpmMin + cpmMax) / 2;
  const presup = Number(presupuesto) || 500;

  const alcanceMin = Math.round((presup / cpmMax) * 1000);
  const alcanceMax = Math.round((presup / cpmMin) * 1000);

  const cpaObjetivo = objetivo === 'leads' ? Number((t * 0.1).toFixed(2)) : Number((t * 0.3).toFixed(2));
  return {
    cpmEstimado: `$${cpmMin} – $${cpmMax} USD (tier ${jurisdiccion?.mercadoPublicitario?.tier || 'Medio'})`,
    alcanceMensualEstimado: `${alcanceMin.toLocaleString()} – ${alcanceMax.toLocaleString()} impresiones`,
    cpaObjetivo: `≤ $${cpaObjetivo} USD`,
    roasObjetivo: objetivo === 'branding' ? 'N/A (medir alcance y recordación)' : '≥ 2.5x al día 30, ≥ 3x al día 60',
    ctrSaludable: '≥ 1% en prospección fría, ≥ 2% en remarketing',
    nota: `Con $${presup}/mes y CPM medio de $${cpmMedio.toFixed(1)} en esta jurisdicción.`
  };
}

function checklist({ modelo }) {
  const base = [
    'Día 1-2: Instalar píxel/API de conversiones y verificar eventos.',
    'Día 3-5: Lanzar C1 con 3 ángulos; no tocar nada por 72h (fase de aprendizaje).',
    'Día 6-7: Matar anuncios con CTR < 0.8%; duplicar el ganador con nuevo gancho.',
    'Día 8-10: Activar C2 remarketing cuando haya ≥ 500 visitantes acumulados.',
    'Día 11-14: Primera lectura seria de CPA; escalar +20% solo si ROAS ≥ objetivo.'
  ];
  if (modelo === 'b2b') base.push('Paralelo: secuencia de nutrición por email/WhatsApp para leads que no agendan.');
  return base;
}

// Análisis estratégico con IA: lee el brief + los datos reales de la
// jurisdicción y devuelve una lectura de mercado accionable.
const ia = require('./ia');

async function analisisIA(brief, jurisdiccion) {
  const j = jurisdiccion;
  const datos = [
    `Mercado: ${j.ciudad ? j.ciudad + ', ' : ''}${j.pais.nombreOficial} (${j.pais.region})`,
    `Población: ${j.pais.poblacion?.toLocaleString()} | Audiencia digital: ${j.audienciaDigital?.toLocaleString()} (${j.indicadores.internetPct.valor}% con internet, ${j.indicadores.internetPct.anio})`,
    `PIB per cápita: $${j.indicadores.pibPerCapitaUsd.valor} USD (${j.indicadores.pibPerCapitaUsd.anio}) | Nivel de ingreso: ${j.pais.nivelIngreso}`,
    `CPM estimado: $${j.mercadoPublicitario.cpmEstimadoUsd[0]}-$${j.mercadoPublicitario.cpmEstimadoUsd[1]} USD (tier ${j.mercadoPublicitario.tier})`,
    j.contexto ? `Contexto local: ${j.contexto.slice(0, 500)}` : null
  ].filter(Boolean).join('\n');

  const { texto, motor } = await ia.generarTexto({
    system:
      'Eres un estratega senior de medios pagos (trafficker) con 10 años pautando en Latinoamérica y España. ' +
      'Analizas mercados con datos reales y das recomendaciones concretas, sin relleno ni obviedades. ' +
      'Respondes en español, en 4 secciones con estos títulos exactos:\n' +
      '📍 LECTURA DEL MERCADO (2-3 frases sobre qué significa este mercado para esta campaña)\n' +
      '⚠️ RIESGOS (2-3 riesgos específicos de pautar este producto en esta jurisdicción)\n' +
      '💡 OPORTUNIDADES (2-3 oportunidades concretas, incluyendo ángulos culturales locales)\n' +
      '🎬 GANCHOS CREATIVOS (3 ganchos de anuncio listos para usar, adaptados al mercado local)\n' +
      'Máximo 250 palabras en total.',
    usuario:
      `DATOS REALES DEL MERCADO (Banco Mundial / Wikipedia):\n${datos}\n\n` +
      `BRIEF DE CAMPAÑA:\n` +
      `Producto: ${brief.producto}\n` +
      `Objetivo: ${brief.objetivo} | Modelo: ${brief.modelo.toUpperCase()}\n` +
      `Fortaleza/diferencial: ${brief.fortalezas || 'no especificada'}\n` +
      `Ticket promedio: $${brief.ticket || 'N/D'} USD | Presupuesto mensual: $${brief.presupuesto || 'N/D'} USD\n` +
      `Público: ${brief.publico?.edadMin || 25}-${brief.publico?.edadMax || 45} años, ${brief.publico?.genero || 'todos'}, intereses: ${brief.publico?.intereses || 'N/D'}\n\n` +
      'Genera el análisis estratégico.'
  });
  return { texto, motor };
}

function generarPlan(brief, jurisdiccion) {
  return {
    resumen: {
      producto: brief.producto,
      objetivo: brief.objetivo,
      modelo: brief.modelo.toUpperCase(),
      mercado: `${jurisdiccion?.ciudad ? jurisdiccion.ciudad + ', ' : ''}${jurisdiccion?.pais?.nombreOficial || brief.pais}`,
      presupuestoMensual: Number(brief.presupuesto) || 500
    },
    formatoEstrella: formatoEstrella(brief),
    plataformas: mezclaPlataformas(brief),
    estructura: estructuraAnuncios(brief),
    estrategia: estrategia(brief),
    kpis: kpisObjetivo({ ...brief, jurisdiccion }),
    checklist: checklist(brief)
  };
}

module.exports = { generarPlan, analisisIA };
