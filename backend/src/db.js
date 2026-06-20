// src/db.js
// Base de datos SQLite usando el módulo nativo de Node.js (node:sqlite, Node >= 22.5).
// Cero dependencias externas. Para migrar a PostgreSQL más adelante,
// reemplaza este módulo manteniendo las mismas funciones exportadas.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'trafficker.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    industria TEXT,
    presupuesto_mensual REAL DEFAULT 0,
    creado_en TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS interacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    fecha TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS metricas_historicas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT DEFAULT (datetime('now')),
    plataforma TEXT NOT NULL,          -- 'meta' | 'google' | 'global'
    inversion REAL NOT NULL,
    ingresos REAL NOT NULL,
    conversiones INTEGER DEFAULT 0,
    cpa REAL,
    roas REAL,
    fuente TEXT DEFAULT 'simulado'     -- 'simulado' | 'api'
  );

  CREATE TABLE IF NOT EXISTS copies_generados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT DEFAULT (datetime('now')),
    producto TEXT,
    avatar TEXT,
    dolor TEXT,
    metodo TEXT DEFAULT 'AIDA',
    copy TEXT NOT NULL,
    motor TEXT DEFAULT 'simulado'      -- 'openai' | 'simulado'
  );

  CREATE TABLE IF NOT EXISTS jurisdicciones_cache (
    clave TEXT PRIMARY KEY,            -- "pais|ciudad" en minúsculas
    datos TEXT NOT NULL,               -- JSON del análisis
    consultado_en TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS planes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT DEFAULT (datetime('now')),
    brief TEXT NOT NULL,               -- JSON del cuestionario
    jurisdiccion TEXT,                 -- JSON de la inteligencia de mercado
    plan TEXT NOT NULL                 -- JSON del plan generado
  );

  CREATE TABLE IF NOT EXISTS prospectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT DEFAULT (datetime('now')),
    nombre TEXT NOT NULL,
    categoria TEXT,
    ciudad TEXT,
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    web TEXT,
    redes TEXT,                        -- JSON {facebook, instagram}
    score INTEGER DEFAULT 0,
    nivel TEXT DEFAULT 'media',        -- alta | media | baja
    senales TEXT,                      -- JSON array de señales de oportunidad
    estado TEXT DEFAULT 'nuevo',       -- nuevo | contactado | negociacion | cliente | descartado
    pitch TEXT,
    fuente TEXT
  );

  CREATE TABLE IF NOT EXISTS campanias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    plataforma TEXT NOT NULL,          -- 'meta' | 'google' | 'tiktok'
    objetivo TEXT,                     -- 'conversiones' | 'trafico' | 'leads'
    estado TEXT DEFAULT 'activa',      -- 'activa' | 'pausada'
    presupuesto_diario REAL DEFAULT 20,
    inversion REAL DEFAULT 0,
    ingresos REAL DEFAULT 0,
    conversiones INTEGER DEFAULT 0,
    ctr REAL DEFAULT 1.0,
    frecuencia REAL DEFAULT 1.5,
    creado_en TEXT DEFAULT (datetime('now'))
  );
`);

// ==========================================================
// SEMILLAS (solo la primera vez, para que la app nazca viva)
// ==========================================================
function sembrarCampanias() {
  const total = db.prepare('SELECT COUNT(*) AS n FROM campanias').get().n;
  if (total > 0) return;

  const semilla = [
    ['[META] Conversiones - Lookalike 1%',      'meta',   'conversiones', 'activa',  45, 412.30, 1525.51, 33, 2.1, 2.3],
    ['[META] Retargeting - Carrito Abandonado', 'meta',   'conversiones', 'activa',  25, 230.10,  989.43, 26, 3.4, 4.6],
    ['[META] Prospección - Intereses Amplios',  'meta',   'trafico',      'activa',  30, 248.10,  245.61, 12, 0.9, 1.8],
    ['[GOOGLE] Search - Marca + Competencia',   'google', 'conversiones', 'activa',  35, 310.00, 1364.00, 31, 5.2, 1.0],
    ['[GOOGLE] PMax - Catálogo Completo',       'google', 'conversiones', 'activa',  30, 270.00,  756.00, 18, 1.8, 1.2],
    ['[GOOGLE] Display - Remarketing',          'google', 'trafico',      'pausada', 10,  70.00,   49.05,  3, 0.4, 2.9],
    ['[TIKTOK] Spark Ads - UGC Viral',          'tiktok', 'conversiones', 'activa',  20, 145.00,  478.50, 14, 2.8, 1.4]
  ];

  const stmt = db.prepare(
    `INSERT INTO campanias (nombre, plataforma, objetivo, estado, presupuesto_diario, inversion, ingresos, conversiones, ctr, frecuencia)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const c of semilla) stmt.run(...c);
}

function sembrarHistorico() {
  const total = db.prepare("SELECT COUNT(*) AS n FROM metricas_historicas WHERE plataforma = 'global'").get().n;
  if (total >= 5) return;

  const stmt = db.prepare(
    `INSERT INTO metricas_historicas (fecha, plataforma, inversion, ingresos, conversiones, cpa, roas, fuente)
     VALUES (datetime('now', ?), 'global', ?, ?, ?, ?, ?, 'simulado')`
  );

  // 14 días de histórico acumulado que termina en los totales actuales de
  // las campañas, para que la curva conecte con el snapshot de hoy.
  const totales = db.prepare('SELECT SUM(inversion) AS inv, SUM(ingresos) AS ing FROM campanias').get();
  const invHoy = totales.inv || 1700;
  const ingHoy = totales.ing || 5400;

  for (let d = 14; d >= 1; d--) {
    const progreso = (14 - d) / 14; // 0 → 1 a medida que se acerca a hoy
    const factor = 0.45 + progreso * 0.5 + (Math.random() - 0.5) * 0.04;
    const inversion = Number((invHoy * factor).toFixed(2));
    const roas = (ingHoy / invHoy) * (0.82 + progreso * 0.18 + (Math.random() - 0.5) * 0.06);
    const ingresos = Number((inversion * roas).toFixed(2));
    const conversiones = Math.round(inversion / 11);
    stmt.run(`-${d} days`, inversion, ingresos, conversiones,
      conversiones ? Number((inversion / conversiones).toFixed(2)) : null, Number(roas.toFixed(2)));
  }
}

// Migrar tabla clientes: agregar columnas nuevas si no existen
const columnasClientes = db.prepare("PRAGMA table_info(clientes)").all().map(c => c.name);
const nuevasCols = [
  ['contacto', 'TEXT'],
  ['telefono', 'TEXT'],
  ['email', 'TEXT'],
  ['web', 'TEXT'],
  ['redes_sociales', 'TEXT'],
  ['direccion', 'TEXT'],
  ['plataformas', 'TEXT'],
  ['estado', "TEXT DEFAULT 'activo'"],
  ['notas', 'TEXT'],
  ['fecha_inicio', 'TEXT']
];
for (const [col, tipo] of nuevasCols) {
  if (!columnasClientes.includes(col)) {
    db.exec(`ALTER TABLE clientes ADD COLUMN ${col} ${tipo}`);
  }
}

sembrarCampanias();
sembrarHistorico();

// ---------- Campañas ----------
function listarCampanias() {
  return db.prepare('SELECT * FROM campanias ORDER BY plataforma, nombre').all();
}

function obtenerCampania(id) {
  return db.prepare('SELECT * FROM campanias WHERE id = ?').get(id);
}

function actualizarCampania(id, campos) {
  const permitidos = ['estado', 'presupuesto_diario'];
  const sets = [];
  const valores = [];
  for (const k of permitidos) {
    if (campos[k] !== undefined) {
      sets.push(`${k} = ?`);
      valores.push(campos[k]);
    }
  }
  if (sets.length === 0) return obtenerCampania(id);
  db.prepare(`UPDATE campanias SET ${sets.join(', ')} WHERE id = ?`).run(...valores, id);
  return obtenerCampania(id);
}

// Simula el paso del tiempo: las campañas activas gastan e ingresan.
// Se llama en cada lectura para que el dashboard se sienta "en vivo".
function simularTick() {
  const activas = db.prepare("SELECT * FROM campanias WHERE estado = 'activa'").all();
  const upd = db.prepare(
    `UPDATE campanias SET inversion = ?, ingresos = ?, conversiones = ?, frecuencia = ?, ctr = ? WHERE id = ?`
  );
  for (const c of activas) {
    const gasto = c.presupuesto_diario * (0.002 + Math.random() * 0.004);
    const roasBase = c.inversion > 0 ? c.ingresos / c.inversion : 2.5;
    const retorno = gasto * Math.max(0.3, roasBase + (Math.random() - 0.45) * 1.2);
    const nuevaConv = Math.random() < 0.25 ? c.conversiones + 1 : c.conversiones;
    const nuevaFrec = Math.min(8, c.frecuencia + (Math.random() < 0.3 ? 0.01 : 0));
    const nuevoCtr = Math.max(0.2, c.ctr + (Math.random() - 0.5) * 0.02);
    upd.run(
      Number((c.inversion + gasto).toFixed(2)),
      Number((c.ingresos + retorno).toFixed(2)),
      nuevaConv,
      Number(nuevaFrec.toFixed(2)),
      Number(nuevoCtr.toFixed(2)),
      c.id
    );
  }
}

// ---------- Clientes ----------
function listarClientes() {
  return db.prepare('SELECT * FROM clientes ORDER BY creado_en DESC').all().map(c => ({
    ...c,
    redes_sociales: c.redes_sociales ? JSON.parse(c.redes_sociales) : {},
    plataformas: c.plataformas ? JSON.parse(c.plataformas) : []
  }));
}

function obtenerCliente(id) {
  const c = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  if (!c) return null;
  return {
    ...c,
    redes_sociales: c.redes_sociales ? JSON.parse(c.redes_sociales) : {},
    plataformas: c.plataformas ? JSON.parse(c.plataformas) : []
  };
}

function crearCliente(datos) {
  const stmt = db.prepare(
    `INSERT INTO clientes (nombre, industria, presupuesto_mensual, contacto, telefono, email, web, redes_sociales, direccion, plataformas, estado, notas, fecha_inicio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(
    datos.nombre, datos.industria || null, datos.presupuesto_mensual || 0,
    datos.contacto || null, datos.telefono || null, datos.email || null,
    datos.web || null, JSON.stringify(datos.redes_sociales || {}),
    datos.direccion || null, JSON.stringify(datos.plataformas || []),
    datos.estado || 'activo', datos.notas || null, datos.fecha_inicio || null
  );
  agregarInteraccion(result.lastInsertRowid, 'registro', 'Cliente registrado en el sistema');
  return obtenerCliente(result.lastInsertRowid);
}

function actualizarCliente(id, campos) {
  const permitidos = ['nombre','industria','presupuesto_mensual','contacto','telefono','email','web','redes_sociales','direccion','plataformas','estado','notas','fecha_inicio'];
  const sets = [];
  const valores = [];
  for (const k of permitidos) {
    if (campos[k] !== undefined) {
      const val = (k === 'redes_sociales' || k === 'plataformas') ? JSON.stringify(campos[k]) : campos[k];
      sets.push(`${k} = ?`);
      valores.push(val);
    }
  }
  if (!sets.length) return obtenerCliente(id);
  db.prepare(`UPDATE clientes SET ${sets.join(', ')} WHERE id = ?`).run(...valores, id);
  return obtenerCliente(id);
}

function eliminarCliente(id) {
  db.prepare('DELETE FROM interacciones WHERE cliente_id = ?').run(id);
  db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
}

function promoverProspecto(prospectoId) {
  const p = db.prepare('SELECT * FROM prospectos WHERE id = ?').get(prospectoId);
  if (!p) throw new Error('Prospecto no encontrado');
  const redes = p.redes ? JSON.parse(p.redes) : {};
  const cliente = crearCliente({
    nombre: p.nombre,
    industria: p.categoria,
    contacto: null,
    telefono: p.telefono,
    email: p.email,
    web: p.web,
    redes_sociales: redes,
    direccion: p.direccion || p.ciudad,
    plataformas: [],
    estado: 'activo',
    notas: p.pitch ? `Pitch original: ${p.pitch}` : null,
    presupuesto_mensual: 0
  });
  db.prepare("UPDATE prospectos SET estado = 'cliente' WHERE id = ?").run(prospectoId);
  return cliente;
}

// ---------- Interacciones ----------
function agregarInteraccion(clienteId, tipo, descripcion) {
  db.prepare('INSERT INTO interacciones (cliente_id, tipo, descripcion) VALUES (?, ?, ?)').run(clienteId, tipo, descripcion);
}

function listarInteracciones(clienteId, limite = 50) {
  return db.prepare('SELECT * FROM interacciones WHERE cliente_id = ? ORDER BY fecha DESC LIMIT ?').all(clienteId, limite);
}

// ---------- Métricas ----------
function guardarMetrica({ plataforma, inversion, ingresos, conversiones, fuente }) {
  const cpa = conversiones > 0 ? inversion / conversiones : null;
  const roas = inversion > 0 ? ingresos / inversion : null;
  db.prepare(
    `INSERT INTO metricas_historicas (plataforma, inversion, ingresos, conversiones, cpa, roas, fuente)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(plataforma, inversion, ingresos, conversiones || 0, cpa, roas, fuente || 'simulado');
}

function obtenerHistorico(limite = 30) {
  return db
    .prepare(
      `SELECT date(fecha) AS dia,
              ROUND(AVG(inversion), 2) AS inversion,
              ROUND(AVG(ingresos), 2) AS ingresos,
              ROUND(AVG(roas), 2) AS roas
       FROM metricas_historicas
       WHERE plataforma = 'global'
       GROUP BY date(fecha)
       ORDER BY dia DESC
       LIMIT ?`
    )
    .all(limite)
    .reverse();
}

// Proyección lineal simple de ingresos basada en el histórico global
function proyectarIngresos(diasFuturos = 7) {
  const historico = obtenerHistorico(30);
  if (historico.length < 2) {
    return { disponible: false, mensaje: 'Se necesitan al menos 2 días de histórico para proyectar.' };
  }
  const n = historico.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  historico.forEach((m, i) => {
    sumX += i;
    sumY += m.ingresos;
    sumXY += i * m.ingresos;
    sumX2 += i * i;
  });
  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const intercepto = (sumY - pendiente * sumX) / n;

  const proyeccion = [];
  for (let d = 1; d <= diasFuturos; d++) {
    const x = n - 1 + d;
    proyeccion.push({
      dia: d,
      ingresosEstimados: Math.max(0, Number((intercepto + pendiente * x).toFixed(2)))
    });
  }
  return { disponible: true, tendencia: pendiente >= 0 ? 'alcista' : 'bajista', proyeccion };
}

// ---------- Copies ----------
function guardarCopy({ producto, avatar, dolor, metodo, copy, motor }) {
  db.prepare(
    `INSERT INTO copies_generados (producto, avatar, dolor, metodo, copy, motor)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(producto || null, avatar || null, dolor || null, metodo || 'AIDA', copy, motor || 'simulado');
}

function listarCopies(limite = 10) {
  return db.prepare('SELECT * FROM copies_generados ORDER BY fecha DESC LIMIT ?').all(limite);
}

// ---------- Inteligencia de jurisdicción (caché 7 días) ----------
function obtenerJurisdiccionCache(clave) {
  const fila = db.prepare(
    `SELECT datos FROM jurisdicciones_cache
     WHERE clave = ? AND consultado_en > datetime('now', '-7 days')`
  ).get(clave.toLowerCase());
  return fila ? JSON.parse(fila.datos) : null;
}

function guardarJurisdiccionCache(clave, datos) {
  db.prepare(
    `INSERT OR REPLACE INTO jurisdicciones_cache (clave, datos, consultado_en)
     VALUES (?, ?, datetime('now'))`
  ).run(clave.toLowerCase(), JSON.stringify(datos));
}

// ---------- Planes de campaña ----------
function guardarPlan({ brief, jurisdiccion, plan }) {
  const r = db.prepare(
    'INSERT INTO planes (brief, jurisdiccion, plan) VALUES (?, ?, ?)'
  ).run(JSON.stringify(brief), JSON.stringify(jurisdiccion || null), JSON.stringify(plan));
  return r.lastInsertRowid;
}

function listarPlanes(limite = 10) {
  return db.prepare('SELECT * FROM planes ORDER BY fecha DESC LIMIT ?').all(limite)
    .map((p) => ({
      id: p.id,
      fecha: p.fecha,
      brief: JSON.parse(p.brief),
      jurisdiccion: p.jurisdiccion ? JSON.parse(p.jurisdiccion) : null,
      plan: JSON.parse(p.plan)
    }));
}

// ---------- Prospectos (mini-CRM) ----------
function guardarProspecto(p) {
  const existente = db.prepare(
    'SELECT id FROM prospectos WHERE nombre = ? AND ciudad = ?'
  ).get(p.nombre, p.ciudad || null);
  if (existente) return { id: existente.id, duplicado: true };

  const r = db.prepare(
    `INSERT INTO prospectos (nombre, categoria, ciudad, direccion, telefono, email, web, redes, score, nivel, senales, pitch, fuente)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    p.nombre, p.categoria || null, p.ciudad || null, p.direccion || null,
    p.telefono || null, p.email || null, p.web || null,
    JSON.stringify(p.redes || {}), p.score || 0, p.nivel || 'media',
    JSON.stringify(p.senales || []), p.pitch || null, p.fuente || null
  );
  return { id: r.lastInsertRowid, duplicado: false };
}

function listarProspectos(limite = 100) {
  return db.prepare('SELECT * FROM prospectos ORDER BY fecha DESC LIMIT ?').all(limite)
    .map((p) => ({
      ...p,
      redes: p.redes ? JSON.parse(p.redes) : {},
      senales: p.senales ? JSON.parse(p.senales) : []
    }));
}

function actualizarProspecto(id, campos) {
  const permitidos = ['estado', 'pitch'];
  const sets = [];
  const valores = [];
  for (const k of permitidos) {
    if (campos[k] !== undefined) { sets.push(`${k} = ?`); valores.push(campos[k]); }
  }
  if (sets.length) {
    db.prepare(`UPDATE prospectos SET ${sets.join(', ')} WHERE id = ?`).run(...valores, id);
  }
  return db.prepare('SELECT * FROM prospectos WHERE id = ?').get(id);
}

function eliminarProspecto(id) {
  db.prepare('DELETE FROM prospectos WHERE id = ?').run(id);
}

module.exports = {
  guardarProspecto,
  listarProspectos,
  actualizarProspecto,
  eliminarProspecto,
  obtenerJurisdiccionCache,
  guardarJurisdiccionCache,
  guardarPlan,
  listarPlanes,
  listarCampanias,
  obtenerCampania,
  actualizarCampania,
  simularTick,
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  promoverProspecto,
  agregarInteraccion,
  listarInteracciones,
  guardarMetrica,
  obtenerHistorico,
  proyectarIngresos,
  guardarCopy,
  listarCopies
};
