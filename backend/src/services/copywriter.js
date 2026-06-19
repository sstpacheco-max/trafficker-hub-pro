// src/services/copywriter.js
// Skill 2: MCP Copywriter Neuronal.
// Usa el motor de IA multi-proveedor (src/services/ia.js) — prioriza opciones
// gratuitas (Gemini, Groq, OpenRouter, Ollama, Pollinations). Si ninguna
// responde, genera un copy AIDA con plantilla local (modo demo).

const ia = require('./ia');

const iaConfigurada = () => Boolean(ia.proveedorActivo());

async function generarConIA({ producto, avatar, dolor }) {
  const { texto, motor } = await ia.generarTexto({
    system:
      'Eres un copywriter experto en neuroventas y tráfico pago. ' +
      'Escribes anuncios en español usando el método AIDA (Atención, Interés, Deseo, Acción). ' +
      'Formato de salida: cuatro bloques marcados como [ATENCIÓN], [INTERÉS], [DESEO] y [ACCIÓN]. ' +
      'Tono directo, emocional y orientado a conversión. Máximo 180 palabras. ' +
      'No agregues introducciones ni despedidas, solo el anuncio.',
    usuario:
      `Producto: ${producto}\n` +
      `Avatar (cliente ideal): ${avatar || 'no especificado'}\n` +
      `Dolor principal: ${dolor || 'no especificado'}\n\n` +
      'Genera el anuncio AIDA.'
  });
  return { copy: texto, motor };
}

function generarSimulado({ producto, avatar, dolor }) {
  return `
[ATENCIÓN]: ¿${dolor ? `Te identifica esto: "${dolor}"` : 'Sientes que le estás regalando tu dinero a las plataformas sin ver retornos'}?

[INTERÉS]: Entiendo la frustración. El 90% de los ${avatar || 'emprendedores'} pierden su presupuesto en publicidad por no tener una estructura de embudo validada. Pero, ¿y si pudieras bajar tu Costo por Adquisición a la mitad en solo 7 días?

[DESEO]: Imagina despertar, revisar tu administrador de anuncios y ver un ROAS consistente de 3x, sabiendo exactamente qué anuncio te está trayendo clientes calificados para tu ${producto || 'negocio'}.

[ACCIÓN]: Haz clic en el botón de abajo y descarga la plantilla de estructura de campañas que usamos para escalar negocios hoy mismo.
`.trim();
}

async function generarCopy({ producto, avatar, dolor }) {
  try {
    return await generarConIA({ producto, avatar, dolor });
  } catch (error) {
    console.error('Todos los proveedores de IA fallaron, usando plantilla local:', error.message);
    return { copy: generarSimulado({ producto, avatar, dolor }), motor: 'simulado' };
  }
}

module.exports = { generarCopy, iaConfigurada };
