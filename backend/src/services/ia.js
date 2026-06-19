// src/services/ia.js
// Motor de IA multi-proveedor con cascada de respaldo. Prioriza opciones
// GRATUITAS; usa la primera disponible y si falla pasa a la siguiente.
//
//   1. Google Gemini  — GRATIS con key (https://aistudio.google.com/apikey, sin tarjeta)
//   2. Groq           — GRATIS con key (https://console.groq.com/keys, sin tarjeta)
//   3. OpenRouter     — modelos :free con key (https://openrouter.ai/keys)
//   4. OpenAI         — de pago (si ya tienes key)
//   5. Ollama local   — GRATIS sin internet (https://ollama.com, modelo local)
//   6. Pollinations   — GRATIS sin registro (suele estar saturado; último recurso)
//
// Todos se llaman con fetch nativo: cero SDKs.

const TIMEOUT_MS = 60000;

async function postJson(url, body, headers = {}, timeout = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${detalle.slice(0, 200)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const PROVEEDORES = [
  {
    id: 'gemini',
    nombre: 'Google Gemini (gratis)',
    disponible: () => Boolean(process.env.GEMINI_API_KEY),
    async llamar({ system, usuario }) {
      const modelo = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
      const data = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: usuario }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
        }
      );
      const texto = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      if (!texto) throw new Error('Gemini devolvió respuesta vacía');
      return texto;
    }
  },
  {
    id: 'groq',
    nombre: 'Groq Llama (gratis)',
    disponible: () => Boolean(process.env.GROQ_API_KEY),
    async llamar({ system, usuario }) {
      const data = await postJson(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          temperature: 0.8,
          max_tokens: 1024,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: usuario }
          ]
        },
        { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
      );
      return data.choices[0].message.content;
    }
  },
  {
    id: 'openrouter',
    nombre: 'OpenRouter (modelos gratis)',
    disponible: () => Boolean(process.env.OPENROUTER_API_KEY),
    async llamar({ system, usuario }) {
      const data = await postJson(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
          temperature: 0.8,
          max_tokens: 1024,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: usuario }
          ]
        },
        { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }
      );
      return data.choices[0].message.content;
    }
  },
  {
    id: 'openai',
    nombre: 'OpenAI',
    disponible: () => Boolean(process.env.OPENAI_API_KEY),
    async llamar({ system, usuario }) {
      const data = await postJson(
        'https://api.openai.com/v1/chat/completions',
        {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.8,
          max_tokens: 1024,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: usuario }
          ]
        },
        { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      );
      return data.choices[0].message.content;
    }
  },
  {
    id: 'ollama',
    nombre: 'Ollama (local, gratis)',
    // Solo se intenta si el usuario lo declaró en .env (evita esperas si no está instalado)
    disponible: () => Boolean(process.env.OLLAMA_MODEL),
    async llamar({ system, usuario }) {
      const base = process.env.OLLAMA_URL || 'http://localhost:11434';
      const data = await postJson(`${base}/api/chat`, {
        model: process.env.OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: usuario }
        ]
      }, {}, 120000);
      return data.message.content;
    }
  },
  {
    id: 'pollinations',
    nombre: 'Pollinations (gratis, sin registro)',
    disponible: () => process.env.DESACTIVAR_POLLINATIONS !== 'true',
    async llamar({ system, usuario }) {
      const data = await postJson(
        'https://text.pollinations.ai/openai',
        {
          model: 'openai',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: usuario }
          ]
        },
        {},
        30000
      );
      return data.choices[0].message.content;
    }
  }
];

// Devuelve el primer proveedor configurado (para mostrar estado en el dashboard)
function proveedorActivo() {
  const p = PROVEEDORES.find((x) => x.id !== 'pollinations' && x.disponible());
  return p ? { id: p.id, nombre: p.nombre } : null;
}

// Recorre la cascada: primer proveedor disponible que responda gana.
// Si todos fallan, lanza el último error (el llamador decide el fallback local).
async function generarTexto({ system, usuario }) {
  let ultimoError = null;
  for (const p of PROVEEDORES) {
    if (!p.disponible()) continue;
    try {
      const texto = await p.llamar({ system, usuario });
      return { texto: texto.trim(), motor: p.id };
    } catch (error) {
      console.warn(`IA: ${p.nombre} falló (${error.message.slice(0, 120)}), probando siguiente...`);
      ultimoError = error;
    }
  }
  throw ultimoError || new Error('Ningún proveedor de IA está configurado.');
}

module.exports = { generarTexto, proveedorActivo };
