// server.js — Trafficker Hub Pro (MCP Server)
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const db = require('./src/db');
const metaAds = require('./src/services/metaAds');
const googleAds = require('./src/services/googleAds');
const copywriter = require('./src/services/copywriter');
const inteligencia = require('./src/services/inteligencia');
const estratega = require('./src/services/estratega');
const prospector = require('./src/services/prospector');
const iaMotor = require('./src/services/ia');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// MOTOR DE CAMPAÑAS (simulación en vivo)
// ==========================================
// Las campañas activas gastan e ingresan en cada consulta, así el
// dashboard se mueve en tiempo real. Con credenciales reales en .env,
// las métricas globales salen de las APIs en lugar del simulador.

app.get('/api/campanias', (req, res) => {
  db.simularTick();
  const campanias = db.listarCampanias().map((c) => ({
    ...c,
    roas: c.inversion > 0 ? Number((c.ingresos / c.inversion).toFixed(2)) : 0,
    cpa: c.conversiones > 0 ? Number((c.inversion / c.conversiones).toFixed(2)) : null
  }));
  res.json(campanias);
});

app.patch('/api/campanias/:id', (req, res) => {
  const { estado, presupuesto_diario } = req.body || {};
  if (estado && !['activa', 'pausada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Usa "activa" o "pausada".' });
  }
  const actualizada = db.actualizarCampania(Number(req.params.id), { estado, presupuesto_diario });
  if (!actualizada) return res.status(404).json({ error: 'Campaña no encontrada.' });
  res.json(actualizada);
});

// ==========================================
// MÓDULO OMNICANAL Y ANALÍTICA (Skill 1 y 3)
// ==========================================
app.get('/api/metricas-globales', async (req, res) => {
  try {
    const apisReales = metaAds.credencialesConfiguradas() || googleAds.credencialesConfiguradas();

    let inversionTotal, ingresosTotales, conversionesTotales, alertas, desglose;

    if (apisReales) {
      const [meta, google] = await Promise.all([
        metaAds.obtenerMetricas(),
        googleAds.obtenerMetricas()
      ]);
      inversionTotal = meta.inversion + google.inversion;
      ingresosTotales = meta.ingresos + google.ingresos;
      conversionesTotales = meta.conversiones + google.conversiones;
      alertas = [...meta.alertas, ...google.alertas];
      desglose = {
        meta: { inversion: meta.inversion, ingresos: meta.ingresos },
        google: { inversion: google.inversion, ingresos: google.ingresos }
      };
    } else {
      // Modo demo: las métricas globales salen del motor de campañas,
      // así pausar/activar/escalar una campaña SÍ cambia los KPIs.
      db.simularTick();
      const campanias = db.listarCampanias();
      inversionTotal = 0; ingresosTotales = 0; conversionesTotales = 0;
      desglose = {};
      alertas = [];

      for (const c of campanias) {
        inversionTotal += c.inversion;
        ingresosTotales += c.ingresos;
        conversionesTotales += c.conversiones;
        if (!desglose[c.plataforma]) desglose[c.plataforma] = { inversion: 0, ingresos: 0 };
        desglose[c.plataforma].inversion += c.inversion;
        desglose[c.plataforma].ingresos += c.ingresos;

        const roas = c.inversion > 0 ? c.ingresos / c.inversion : 0;
        if (c.estado === 'activa' && c.frecuencia > 4) {
          alertas.push(`⚠️ ${c.nombre}: Fatiga publicitaria (frecuencia ${c.frecuencia}). Renueva los creativos.`);
        }
        if (c.estado === 'activa' && roas >= 4) {
          alertas.push(`🚀 ${c.nombre}: ROAS ${roas.toFixed(1)}x. Sugerencia: escalar presupuesto +20%.`);
        }
        if (c.estado === 'activa' && c.inversion > 100 && roas < 1.3) {
          alertas.push(`🔴 ${c.nombre}: ROAS ${roas.toFixed(1)}x por debajo del punto de equilibrio. Considera pausarla.`);
        }
      }
    }

    const metricas = {
      inversionTotal: Number(inversionTotal.toFixed(2)),
      ingresosTotales: Number(ingresosTotales.toFixed(2)),
      cpaPromedio: conversionesTotales > 0
        ? Number((inversionTotal / conversionesTotales).toFixed(2))
        : null,
      roasGlobal: inversionTotal > 0
        ? Number((ingresosTotales / inversionTotal).toFixed(2))
        : null,
      conversionesTotales,
      alertas,
      desglose,
      modoDemo: !apisReales
    };

    // Persistir snapshot para histórico y proyecciones
    db.guardarMetrica({
      plataforma: 'global',
      inversion: inversionTotal,
      ingresos: ingresosTotales,
      conversiones: conversionesTotales,
      fuente: apisReales ? 'api' : 'simulado'
    });

    res.json(metricas);
  } catch (error) {
    console.error('Error en métricas globales:', error);
    res.status(500).json({ error: 'No se pudieron obtener las métricas.' });
  }
});

// ==========================================
// MÓDULO CREATIVO CON IA (Skill 2: MCP Copywriter)
// ==========================================
app.post('/api/mcp/generar-copy', async (req, res) => {
  const { producto, avatar, dolor } = req.body || {};

  if (!producto) {
    return res.status(400).json({ error: 'El campo "producto" es obligatorio.' });
  }

  try {
    const { copy, motor } = await copywriter.generarCopy({ producto, avatar, dolor });
    db.guardarCopy({ producto, avatar, dolor, metodo: 'AIDA', copy, motor });
    res.json({ metodo: 'AIDA', motor, copy });
  } catch (error) {
    console.error('Error generando copy:', error);
    res.status(500).json({ error: 'No se pudo generar el copy.' });
  }
});

app.get('/api/mcp/copies', (req, res) => {
  res.json(db.listarCopies(Number(req.query.limite) || 10));
});

// ==========================================
// MÓDULO ESTRATEGA: inteligencia de jurisdicción + plan de campaña
// ==========================================
// Consulta fuentes públicas reales (REST Countries, Banco Mundial, Wikipedia)
// y cachea el resultado 7 días para no golpear las APIs en cada uso.
app.post('/api/inteligencia/jurisdiccion', async (req, res) => {
  const { pais, ciudad } = req.body || {};
  if (!pais) return res.status(400).json({ error: 'El campo "pais" es obligatorio.' });

  const clave = `${pais}|${ciudad || ''}`;
  const cacheado = db.obtenerJurisdiccionCache(clave);
  if (cacheado) return res.json({ ...cacheado, desdeCache: true });

  try {
    const analisis = await inteligencia.analizarJurisdiccion({ pais, ciudad });
    if (!analisis.ok) return res.status(404).json({ error: analisis.error });
    db.guardarJurisdiccionCache(clave, analisis);
    res.json(analisis);
  } catch (error) {
    console.error('Error en inteligencia de jurisdicción:', error.message);
    res.status(502).json({
      error: 'No se pudo consultar las fuentes externas. ¿Hay conexión a internet?'
    });
  }
});

// Recibe el brief del cuestionario, enriquece con la jurisdicción y genera el plan
app.post('/api/planes', async (req, res) => {
  const brief = req.body || {};
  const requeridos = ['objetivo', 'modelo', 'producto', 'pais'];
  const faltantes = requeridos.filter((k) => !brief[k]);
  if (faltantes.length) {
    return res.status(400).json({ error: `Faltan campos: ${faltantes.join(', ')}` });
  }

  try {
    const clave = `${brief.pais}|${brief.ciudad || ''}`;
    let jurisdiccion = db.obtenerJurisdiccionCache(clave);
    if (!jurisdiccion) {
      jurisdiccion = await inteligencia.analizarJurisdiccion({ pais: brief.pais, ciudad: brief.ciudad });
      if (jurisdiccion.ok) db.guardarJurisdiccionCache(clave, jurisdiccion);
    }
    if (!jurisdiccion.ok) {
      return res.status(404).json({ error: jurisdiccion.error });
    }

    const plan = estratega.generarPlan(brief, jurisdiccion);

    // Análisis estratégico con IA (cascada de proveedores gratuitos).
    // Si ningún proveedor responde, el plan sale igual sin esta sección.
    try {
      plan.analisisIA = await estratega.analisisIA(brief, jurisdiccion);
    } catch (error) {
      console.warn('Análisis IA no disponible:', error.message.slice(0, 120));
      plan.analisisIA = null;
    }

    const id = db.guardarPlan({ brief, jurisdiccion, plan });
    res.status(201).json({ id, brief, jurisdiccion, plan });
  } catch (error) {
    console.error('Error generando plan:', error);
    res.status(500).json({ error: 'No se pudo generar el plan de campaña.' });
  }
});

app.get('/api/planes', (req, res) => {
  res.json(db.listarPlanes(Number(req.query.limite) || 10));
});

// ==========================================
// MÓDULO PROSPECTOR: escaneo de negocios + pitch de venta con IA
// ==========================================
// Escanea negocios reales de una zona (OpenStreetMap gratis, o Google Places
// si hay GOOGLE_MAPS_API_KEY) y evalúa su presencia digital para detectar
// clientes potenciales del servicio de marketing.

app.get('/api/prospector/categorias', (req, res) => {
  res.json(prospector.CATEGORIAS.map(({ id, nombre }) => ({ id, nombre })));
});

app.post('/api/prospector/buscar', async (req, res) => {
  const { categoria, tipoLibre, ciudad, pais, limite } = req.body || {};
  if ((!categoria && !tipoLibre) || !ciudad || !pais) {
    return res.status(400).json({ error: 'Indica un rubro (categoria o tipoLibre), ciudad y pais.' });
  }
  try {
    const resultado = await prospector.buscar({
      categoria, tipoLibre, ciudad, pais,
      limite: Math.min(Number(limite) || 25, 50)
    });
    res.json(resultado);
  } catch (error) {
    console.error('Error en prospección:', error.message);
    const saturado = /fetch failed|remark|saturad|timed out|ECONN|aborted/i.test(error.message);
    res.status(502).json({
      error: saturado
        ? 'Los servidores de mapas gratuitos (OpenStreetMap) están saturados en este momento. Espera ~30 segundos y reintenta. Tip: con una API key de Google Maps en backend/.env el escaneo es mucho más estable.'
        : `No se pudo escanear la zona: ${error.message}`
    });
  }
});

// Genera un mensaje de venta personalizado para un negocio, usando la
// radiografía digital del prospecto y las estadísticas de su competencia.
app.post('/api/prospector/pitch', async (req, res) => {
  const { negocio, estadisticas, ciudad, miServicio } = req.body || {};
  if (!negocio?.nombre) {
    return res.status(400).json({ error: 'Falta el negocio a prospectar.' });
  }

  const servicio = miServicio || 'gestión de publicidad digital (Meta, Google y TikTok Ads) y presencia online';
  const senales = (negocio.senales || []).join(', ') || 'presencia digital mejorable';
  const competencia = estadisticas
    ? `De ${estadisticas.total} ${negocio.categoria?.toLowerCase() || 'negocios'} escaneados en la zona, el ${estadisticas.pctConWeb}% ya tiene sitio web y el ${estadisticas.pctConRedes}% tiene redes activas.`
    : '';

  try {
    const { texto, motor } = await iaMotor.generarTexto({
      system:
        'Eres un experto en ventas B2B de servicios de marketing digital. ' +
        'Escribes mensajes de primer contacto por WhatsApp: cortos (máx 120 palabras), cálidos, ' +
        'personalizados con datos reales del negocio, sin sonar a spam ni usar mayúsculas excesivas. ' +
        'Estructura: saludo con nombre del negocio → observación específica y honesta sobre su presencia digital → ' +
        'dato de su competencia local → propuesta de valor concreta → pregunta de cierre suave. ' +
        'En español neutro. Solo el mensaje, sin explicaciones.',
      usuario:
        `Negocio: ${negocio.nombre} (${negocio.categoria || 'comercio'}) en ${ciudad || 'la ciudad'}\n` +
        `Lo que detectamos: ${senales}\n` +
        `Contexto competitivo: ${competencia}\n` +
        `Mi servicio: ${servicio}\n\n` +
        'Escribe el mensaje de primer contacto.'
    });
    res.json({ pitch: texto, motor });
  } catch {
    // Plantilla local si ningún proveedor de IA responde
    const pitch =
      `Hola, equipo de ${negocio.nombre} 👋\n\n` +
      `Estuve revisando la presencia digital de ${negocio.categoria?.toLowerCase() || 'negocios'} en ${ciudad || 'su zona'} ` +
      `y noté algo sobre ustedes: ${senales.toLowerCase()}. ${competencia}\n\n` +
      `Me dedico a ${servicio}: ayudo a negocios como el suyo a convertir esa brecha en clientes nuevos cada semana, ` +
      `con inversión medible y reportes claros.\n\n` +
      `¿Les interesaría que les muestre, sin compromiso, 2 o 3 oportunidades concretas que vi para ${negocio.nombre}?`;
    res.json({ pitch, motor: 'plantilla' });
  }
});

// Mini-CRM de prospectos
app.get('/api/prospectos', (req, res) => {
  res.json(db.listarProspectos());
});

app.post('/api/prospectos', (req, res) => {
  const p = req.body || {};
  if (!p.nombre) return res.status(400).json({ error: 'Falta el nombre del prospecto.' });
  const r = db.guardarProspecto(p);
  res.status(r.duplicado ? 200 : 201).json(r);
});

app.patch('/api/prospectos/:id', (req, res) => {
  const { estado, pitch } = req.body || {};
  const validos = ['nuevo', 'contactado', 'negociacion', 'cliente', 'descartado'];
  if (estado && !validos.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usa: ${validos.join(', ')}` });
  }
  res.json(db.actualizarProspecto(Number(req.params.id), { estado, pitch }));
});

app.delete('/api/prospectos/:id', (req, res) => {
  db.eliminarProspecto(Number(req.params.id));
  res.status(204).end();
});

// ==========================================
// MÓDULO DE DATOS: clientes, histórico y proyecciones
// ==========================================
app.get('/api/clientes', (req, res) => {
  res.json(db.listarClientes());
});

app.post('/api/clientes', (req, res) => {
  const { nombre, industria, presupuesto_mensual } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: 'El campo "nombre" es obligatorio.' });
  }
  res.status(201).json(db.crearCliente({ nombre, industria, presupuesto_mensual }));
});

app.delete('/api/clientes/:id', (req, res) => {
  db.eliminarCliente(Number(req.params.id));
  res.status(204).end();
});

app.get('/api/historico', (req, res) => {
  res.json(db.obtenerHistorico(Number(req.query.limite) || 30));
});

app.get('/api/proyecciones', (req, res) => {
  res.json(db.proyectarIngresos(Number(req.query.dias) || 7));
});

// Estado de las integraciones (para mostrar en el dashboard qué es real y qué es demo)
const ia = require('./src/services/ia');
app.get('/api/estado', (req, res) => {
  const proveedor = ia.proveedorActivo();
  res.json({
    metaAds: metaAds.credencialesConfiguradas() ? 'conectado' : 'demo',
    googleAds: googleAds.credencialesConfiguradas() ? 'conectado' : 'demo',
    ia: proveedor ? 'conectado' : 'demo',
    iaProveedor: proveedor ? proveedor.nombre : 'Plantillas locales (configura una key gratuita en .env)',
    prospectorMotor: process.env.GOOGLE_MAPS_API_KEY ? 'google-places' : 'openstreetmap'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Trafficker Hub Backend (MCP Server) corriendo en el puerto ${PORT}`);
});
