const ia = require('./ia');

const iaConfigurada = () => Boolean(ia.proveedorActivo());

// Frameworks de guiones de comerciales probados en redes sociales (2025-2026)
const FRAMEWORKS = {
  'ugc-problema': {
    nombre: 'UGC Problema-Solución',
    icono: '🎯',
    descripcion: 'Persona real hablando a cámara. El formato #1 en conversiones en Meta y TikTok.',
    plataformas: ['TikTok', 'Instagram Reels', 'Facebook'],
    estructura: ['HOOK (3s)', 'PROBLEMA', 'DESCUBRIMIENTO', 'BENEFICIOS', 'PRUEBA SOCIAL', 'CTA']
  },
  'antes-despues': {
    nombre: 'Antes y Después (BAB)',
    icono: '✨',
    descripcion: 'Muestra la transformación. Ideal para servicios, fitness, belleza, educación.',
    plataformas: ['Instagram Reels', 'TikTok', 'Facebook'],
    estructura: ['HOOK VISUAL', 'ANTES (dolor)', 'PUENTE (descubrimiento)', 'DESPUÉS (resultado)', 'CTA']
  },
  'hook-viral': {
    nombre: 'Hook Viral + Storytelling',
    icono: '🔥',
    descripcion: 'Abre con un gancho imposible de ignorar. Para awareness y viralidad.',
    plataformas: ['TikTok', 'Instagram Reels'],
    estructura: ['HOOK DISRUPTIVO (2s)', 'CONTEXTO', 'TENSIÓN', 'REVELACIÓN', 'CTA SUAVE']
  },
  'testimonio': {
    nombre: 'Testimonio / Review',
    icono: '⭐',
    descripcion: 'Cliente real cuenta su experiencia. 28% más efectivo que ads corporativos.',
    plataformas: ['Facebook', 'Instagram', 'TikTok'],
    estructura: ['PRESENTACIÓN', 'PROBLEMA QUE TENÍA', 'CÓMO LO ENCONTRÓ', 'RESULTADO ESPECÍFICO', 'RECOMENDACIÓN']
  },
  'lista-rapida': {
    nombre: '3 Razones / Lista Rápida',
    icono: '📋',
    descripcion: 'Formato educativo rápido. Alto engagement y shares.',
    plataformas: ['TikTok', 'Instagram Reels', 'Facebook'],
    estructura: ['HOOK (pregunta o afirmación)', 'RAZÓN 1', 'RAZÓN 2', 'RAZÓN 3', 'CTA']
  },
  'pas': {
    nombre: 'PAS (Problema-Agitación-Solución)',
    icono: '💥',
    descripcion: 'Amplifica el dolor antes de ofrecer la solución. Alto CTR en leads.',
    plataformas: ['Facebook', 'Instagram', 'Google'],
    estructura: ['PROBLEMA', 'AGITACIÓN (consecuencias)', 'SOLUCIÓN', 'BENEFICIO CLAVE', 'CTA URGENTE']
  },
  'carousel': {
    nombre: 'Carousel Educativo',
    icono: '📱',
    descripcion: 'Secuencia de slides. Para Instagram y Facebook con alto tiempo de visualización.',
    plataformas: ['Instagram', 'Facebook', 'LinkedIn'],
    estructura: ['SLIDE 1: HOOK (título potente)', 'SLIDE 2-3: PROBLEMA', 'SLIDE 4-5: SOLUCIÓN/PASOS', 'SLIDE 6: PRUEBA', 'SLIDE 7: CTA']
  }
};

const HOOKS_VIRALES = [
  'Para de scrollear si {dolor}',
  'Nadie te va a decir esto sobre {producto}...',
  'Esto es lo que pasa cuando {beneficio}',
  'POV: descubriste {producto} y tu vida cambió',
  'El error #1 que cometen los {avatar} con {tema}',
  '¿Sigues haciendo esto? No me sorprende que {dolor}',
  'No compres {producto} hasta ver esto',
  'Si eres {avatar}, NECESITAS saber esto',
  '3 señales de que {dolor_invertido}',
  'Lo que {competencia} no quiere que sepas sobre {tema}',
  'Probé {producto} por 30 días y esto pasó...',
  'El secreto que usan los {referente} para {beneficio}',
  '¿{producto} realmente funciona? Mi experiencia honesta',
  'Deja de perder dinero en {dolor} — haz esto',
  'Tu {avatar_posesivo} te va a agradecer por esto'
];

async function generarGuion({ producto, avatar, dolor, framework, plataforma, tono }) {
  const fw = FRAMEWORKS[framework] || FRAMEWORKS['ugc-problema'];
  const hooksEjemplo = HOOKS_VIRALES.slice(0, 5)
    .map(h => h.replace('{producto}', producto).replace('{avatar}', avatar || 'emprendedores').replace('{dolor}', dolor || 'no ver resultados'))
    .join('\n- ');

  const promptSistema =
    `Eres un director creativo y guionista de comerciales para redes sociales, experto en ads que convierten en ${plataforma || 'TikTok, Instagram y Facebook'}. ` +
    `Escribe en español con tono ${tono || 'directo y cercano'}. ` +
    `Formato de salida: un guion de comercial listo para grabar usando el framework "${fw.nombre}". ` +
    `Estructura obligatoria: ${fw.estructura.join(' → ')}.\n\n` +
    `REGLAS CLAVE:\n` +
    `- El HOOK debe captar atención en los primeros 3 segundos\n` +
    `- Diseñado para scroll-stopping: sin introducciones genéricas\n` +
    `- Duración total: 15-45 segundos hablado\n` +
    `- Incluye INDICACIONES DE CÁMARA entre [corchetes] (ej: [primer plano], [mostrar producto], [texto en pantalla])\n` +
    `- Incluye el TEXTO EN PANTALLA sugerido para cada sección\n` +
    `- Termina con CTA claro y urgente\n` +
    `- NO uses lenguaje corporativo, habla como persona real\n` +
    `- Máximo 250 palabras`;

  const promptUsuario =
    `BRIEF DEL COMERCIAL:\n` +
    `- Producto/Servicio: ${producto}\n` +
    `- Cliente ideal: ${avatar || 'no especificado'}\n` +
    `- Dolor/problema que resuelve: ${dolor || 'no especificado'}\n` +
    `- Plataforma principal: ${plataforma || 'TikTok'}\n` +
    `- Framework: ${fw.nombre} (${fw.estructura.join(' → ')})\n\n` +
    `Ejemplos de hooks virales para inspirarte:\n- ${hooksEjemplo}\n\n` +
    `Genera el guion completo del comercial con indicaciones de cámara y texto en pantalla.`;

  try {
    const { texto, motor } = await ia.generarTexto({ system: promptSistema, usuario: promptUsuario });
    return { guion: texto, motor, framework: fw.nombre, plataforma };
  } catch {
    return {
      guion: generarGuionPlantilla({ producto, avatar, dolor, framework: fw, plataforma }),
      motor: 'plantilla',
      framework: fw.nombre,
      plataforma
    };
  }
}

function generarGuionPlantilla({ producto, avatar, dolor, framework, plataforma }) {
  const av = avatar || 'emprendedor';
  const dol = dolor || 'no ver resultados con tu inversión';
  const prod = producto || 'este servicio';

  if (framework === FRAMEWORKS['antes-despues'] || framework?.nombre?.includes('BAB')) {
    return `🎬 GUION: ANTES Y DESPUÉS (${plataforma || 'Reels/TikTok'})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[HOOK VISUAL — 3 segundos]
[Pantalla dividida: izquierda gris/triste, derecha colorida/exitosa]
TEXTO EN PANTALLA: "Antes vs Después de ${prod}"

[ANTES — 8 segundos]
[Primer plano, cara de frustración]
"Hace 3 meses yo era ese ${av} que ${dol}..."
"Probé de todo y nada funcionaba."
TEXTO: "${dol} 😩"

[PUENTE — 5 segundos]
[Transición dinámica]
"Hasta que descubrí algo que lo cambió todo..."
TEXTO: "Entonces encontré ${prod} 👇"

[DESPUÉS — 10 segundos]
[Sonrisa, mostrar resultados/producto]
"Ahora mis resultados hablan solos."
"Y lo mejor: cualquier ${av} puede lograrlo."
TEXTO: "Resultados reales ✅"

[CTA — 4 segundos]
[Señalar enlace/botón]
"Link en bio. No dejes pasar esta oportunidad."
TEXTO: "🔗 Link en bio — Empieza hoy"`.trim();
  }

  return `🎬 GUION: UGC PROBLEMA-SOLUCIÓN (${plataforma || 'TikTok'})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[HOOK — 3 segundos]
[Mirar directo a cámara, cara seria]
"Para de scrollear si ${dol}."
TEXTO EN PANTALLA: "PARA. Esto te interesa 👇"

[PROBLEMA — 8 segundos]
[Primer plano, tono empático]
"Sé lo que se siente ser ${av} y ${dol}."
"El 90% de la gente comete este error y ni lo sabe."
TEXTO: "El error #1 de los ${av} 🚫"

[DESCUBRIMIENTO — 5 segundos]
[Mostrar producto/servicio, transición]
"Hasta que probé ${prod} y todo cambió."
TEXTO: "${prod} ✨"

[BENEFICIOS — 8 segundos]
[Mostrar resultados, pruebas, pantallazos]
"En menos de lo que piensas vas a notar la diferencia."
"Ya lo están usando cientos de ${av} como tú."
TEXTO: "Resultados desde el día 1 📈"

[PRUEBA SOCIAL — 4 segundos]
[Mostrar testimonios/números]
"No me creas a mí, mira los resultados."
TEXTO: "⭐⭐⭐⭐⭐ +500 clientes felices"

[CTA — 3 segundos]
[Señalar abajo/link, urgencia]
"Link en bio. Pero apúrate, esto no va a durar."
TEXTO: "🔗 Link en bio — Cupos limitados"`.trim();
}

async function generarPromptIA({ producto, avatar, dolor, plataforma, estiloVisual }) {
  const prompt =
    `Genera un PROMPT detallado en español para crear un video comercial con herramientas de IA (como Runway, Pika, Kling, HeyGen, Synthesia). ` +
    `El prompt debe describir cada escena visualmente para que la IA genere el video.\n\n` +
    `BRIEF:\n- Producto: ${producto}\n- Avatar: ${avatar}\n- Dolor: ${dolor}\n- Plataforma: ${plataforma}\n- Estilo visual: ${estiloVisual || 'moderno y dinámico'}\n\n` +
    `Formato de salida:\n` +
    `- ESCENA 1: [descripción visual detallada + texto en pantalla + duración]\n` +
    `- ESCENA 2: ...\n` +
    `- Incluye dirección de arte: colores, iluminación, ángulos de cámara\n` +
    `- Incluye el texto/copy que aparece en pantalla en cada escena\n` +
    `- Total: 5-8 escenas, 15-30 segundos de video final`;

  try {
    const { texto, motor } = await ia.generarTexto({
      system: 'Eres un director de arte y productor de video publicitario experto en generar prompts para herramientas de IA generativa de video. Escribe en español.',
      usuario: prompt
    });
    return { prompt: texto, motor };
  } catch {
    return {
      prompt: `PROMPT PARA IA DE VIDEO — ${producto}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `ESCENA 1 (3s): Plano cercano de una persona (${avatar}) mirando su teléfono con expresión de frustración. ` +
        `Iluminación cálida, fondo desenfocado. TEXTO: "${dolor}"\n\n` +
        `ESCENA 2 (3s): Transición rápida. La misma persona descubre ${producto} en su pantalla. ` +
        `Sus ojos se iluminan. TEXTO: "Descubre ${producto}"\n\n` +
        `ESCENA 3 (5s): Montaje rápido mostrando el producto/servicio en acción. ` +
        `Colores vibrantes, ángulos dinámicos. TEXTO: "La solución que estabas buscando"\n\n` +
        `ESCENA 4 (4s): Resultados: gráficas subiendo, cliente sonriendo, notificaciones de ventas. ` +
        `TEXTO: "Resultados desde el día 1 📈"\n\n` +
        `ESCENA 5 (3s): CTA final con logo y enlace. Fondo de color de marca. ` +
        `TEXTO: "Empieza hoy — Link en bio 🔗"\n\n` +
        `ESTILO: Moderno, vertical (9:16), ritmo rápido, música trendy. Paleta: tonos ${estiloVisual || 'neón sobre fondo oscuro'}.`,
      motor: 'plantilla'
    };
  }
}

async function generarCopy({ producto, avatar, dolor }) {
  return generarGuion({ producto, avatar, dolor, framework: 'ugc-problema', plataforma: 'TikTok', tono: 'directo y cercano' });
}

module.exports = { generarCopy, generarGuion, generarPromptIA, iaConfigurada, FRAMEWORKS, HOOKS_VIRALES };
