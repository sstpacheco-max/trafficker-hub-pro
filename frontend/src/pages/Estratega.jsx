// pages/Estratega.jsx — Cuestionario guiado + inteligencia de jurisdicción.
// Hace las preguntas clave ANTES de lanzar (objetivo, modelo, fortalezas,
// público, mercado) y devuelve un plan con datos reales del país consultados
// en vivo (REST Countries, Banco Mundial, Wikipedia).
import React, { useState, useEffect } from 'react';
import { api } from '../api';

const PASOS = ['Objetivo', 'Producto', 'Público', 'Mercado', 'Plan'];

const OBJETIVOS = [
  { id: 'conversiones', icono: '💰', nombre: 'Conversiones / Ventas', desc: 'Vender directo desde el anuncio' },
  { id: 'leads', icono: '📋', nombre: 'Generación de Leads', desc: 'Capturar contactos calificados' },
  { id: 'trafico', icono: '🚦', nombre: 'Tráfico', desc: 'Llevar visitas al sitio o tienda' },
  { id: 'branding', icono: '📣', nombre: 'Reconocimiento de marca', desc: 'Que te conozcan en el mercado' }
];

function Selector({ opciones, valor, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
      {opciones.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            textAlign: 'left', padding: '0.9rem', borderRadius: 10, cursor: 'pointer',
            background: valor === o.id ? 'rgba(99,102,241,0.2)' : 'var(--panel-2)',
            border: valor === o.id ? '1px solid var(--primario)' : '1px solid var(--borde)',
            color: 'var(--texto)'
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{o.icono} {o.nombre}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--texto-suave)' }}>{o.desc}</div>
        </button>
      ))}
    </div>
  );
}

export default function Estratega() {
  const [paso, setPaso] = useState(0);
  const [brief, setBrief] = useState({
    objetivo: '', modelo: '', producto: '', fortalezas: '', ticket: '',
    edadMin: 25, edadMax: 45, genero: 'todos', intereses: '',
    pais: '', ciudad: '', presupuesto: ''
  });
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [historial, setHistorial] = useState([]);

  useEffect(() => { api.planes().then(setHistorial).catch(() => {}); }, []);

  const set = (campo) => (e) => setBrief({ ...brief, [campo]: e.target?.value ?? e });

  const puedeAvanzar = () => {
    if (paso === 0) return brief.objetivo && brief.modelo;
    if (paso === 1) return brief.producto.trim();
    if (paso === 2) return true;
    if (paso === 3) return brief.pais.trim() && brief.presupuesto;
    return false;
  };

  const generarPlan = async () => {
    setCargando(true);
    setError('');
    try {
      const data = await api.generarPlan({
        ...brief,
        publico: { edadMin: brief.edadMin, edadMax: brief.edadMax, genero: brief.genero, intereses: brief.intereses }
      });
      setResultado(data);
      setPaso(4);
      api.planes().then(setHistorial).catch(() => {});
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
  };

  const j = resultado?.jurisdiccion;
  const p = resultado?.plan;

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>🧭 Estratega de Campañas</h1>
          <div className="sub">Responde las preguntas clave y obtén un plan con inteligencia real del mercado donde vas a pautar.</div>
        </div>
      </div>

      {/* Barra de pasos */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {PASOS.map((nombre, i) => (
          <div key={nombre} style={{
            padding: '0.35rem 0.9rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700,
            background: i === paso ? 'linear-gradient(90deg, var(--primario), var(--cian))' : i < paso ? 'rgba(52,211,153,0.15)' : 'var(--panel-2)',
            color: i === paso ? '#fff' : i < paso ? 'var(--verde)' : 'var(--texto-suave)',
            border: '1px solid var(--borde)'
          }}>
            {i < paso ? '✓ ' : `${i + 1}. `}{nombre}
          </div>
        ))}
      </div>

      {paso === 0 && (
        <div className="tarjeta">
          <h2>🎯 ¿Cuál es el objetivo de la campaña?</h2>
          <Selector opciones={OBJETIVOS} valor={brief.objetivo} onChange={(v) => setBrief({ ...brief, objetivo: v })} />

          <h2 style={{ marginTop: '1.25rem' }}>🏢 ¿A quién le vendes?</h2>
          <Selector
            opciones={[
              { id: 'b2c', icono: '🛍️', nombre: 'B2C — Consumidor final', desc: 'Personas que compran para sí mismas' },
              { id: 'b2b', icono: '🤝', nombre: 'B2B — Empresas', desc: 'Negocios, decisores, compras corporativas' }
            ]}
            valor={brief.modelo}
            onChange={(v) => setBrief({ ...brief, modelo: v })}
          />
        </div>
      )}

      {paso === 1 && (
        <div className="tarjeta">
          <h2>📦 Sobre tu producto</h2>
          <label>¿Qué vendes? (producto o servicio)</label>
          <input value={brief.producto} onChange={set('producto')} placeholder="Ej: Programa de asesoría nutricional de 12 semanas" />

          <label>¿Cuál es tu fortaleza o diferencial frente a la competencia?</label>
          <textarea rows={3} value={brief.fortalezas} onChange={set('fortalezas')} placeholder="Ej: Único con seguimiento diario por WhatsApp y garantía de resultados" />

          <label>Ticket promedio (USD) — lo que paga un cliente</label>
          <input type="number" min="1" value={brief.ticket} onChange={set('ticket')} placeholder="Ej: 120" />
        </div>
      )}

      {paso === 2 && (
        <div className="tarjeta">
          <h2>👤 ¿Quién es tu público objetivo?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label>Edad mínima</label>
              <input type="number" min="13" max="65" value={brief.edadMin} onChange={set('edadMin')} />
            </div>
            <div>
              <label>Edad máxima</label>
              <input type="number" min="13" max="65" value={brief.edadMax} onChange={set('edadMax')} />
            </div>
            <div>
              <label>Género</label>
              <select value={brief.genero} onChange={set('genero')}>
                <option value="todos">Todos</option>
                <option value="mujeres">Mujeres</option>
                <option value="hombres">Hombres</option>
              </select>
            </div>
          </div>
          <label>Intereses y comportamientos (separados por coma)</label>
          <textarea rows={2} value={brief.intereses} onChange={set('intereses')} placeholder="Ej: fitness, vida saludable, compradores online, emprendimiento" />
        </div>
      )}

      {paso === 3 && (
        <div className="tarjeta">
          <h2>🌎 ¿Dónde vas a pautar? (jurisdicción)</h2>
          <p style={{ fontSize: '0.83rem', color: 'var(--texto-suave)', marginTop: 0 }}>
            Consultaremos en vivo datos reales del mercado: población, penetración de internet, poder adquisitivo y costo publicitario estimado.
          </p>
          <div className="grid-2">
            <div>
              <label>País</label>
              <input value={brief.pais} onChange={set('pais')} placeholder="Ej: Colombia" />
            </div>
            <div>
              <label>Ciudad (opcional)</label>
              <input value={brief.ciudad} onChange={set('ciudad')} placeholder="Ej: Medellín" />
            </div>
          </div>
          <label>Presupuesto mensual de pauta (USD)</label>
          <input type="number" min="50" value={brief.presupuesto} onChange={set('presupuesto')} placeholder="Ej: 800" />
        </div>
      )}

      {paso < 4 && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {paso > 0 && <button className="boton suave" onClick={() => setPaso(paso - 1)}>← Atrás</button>}
          {paso < 3 && <button className="boton" disabled={!puedeAvanzar()} onClick={() => setPaso(paso + 1)}>Siguiente →</button>}
          {paso === 3 && (
            <button className="boton" disabled={!puedeAvanzar() || cargando} onClick={generarPlan}>
              {cargando ? '🌐 Analizando jurisdicción en vivo...' : '⚡ Analizar mercado y generar plan'}
            </button>
          )}
        </div>
      )}
      {error && <div className="alerta roja" style={{ marginTop: '1rem' }}>{error}</div>}

      {/* ============ RESULTADO ============ */}
      {paso === 4 && resultado && (
        <>
          <div className="tarjeta" style={{ borderLeft: '3px solid var(--cian)' }}>
            <h2>🌐 Inteligencia de mercado: {j.ciudad ? `${j.ciudad}, ` : ''}{j.pais.nombreOficial}</h2>
            <div className="fila-kpis">
              <div className="kpi"><p className="etiqueta">Población</p><p className="valor">{(j.pais.poblacion / 1e6).toFixed(1)}M</p></div>
              <div className="kpi"><p className="etiqueta">Audiencia digital</p><p className="valor" style={{ color: 'var(--cian)' }}>{(j.audienciaDigital / 1e6).toFixed(1)}M</p>
                <div className="delta" style={{ color: 'var(--texto-suave)' }}>{j.indicadores.internetPct.valor}% con internet ({j.indicadores.internetPct.anio})</div></div>
              <div className="kpi"><p className="etiqueta">PIB per cápita</p><p className="valor">${j.indicadores.pibPerCapitaUsd.valor.toLocaleString()}</p>
                <div className="delta" style={{ color: 'var(--texto-suave)' }}>{j.indicadores.pibPerCapitaUsd.anio}</div></div>
              <div className="kpi"><p className="etiqueta">Mercado publicitario</p><p className="valor" style={{ color: 'var(--ambar)' }}>{j.mercadoPublicitario.tier}</p>
                <div className="delta" style={{ color: 'var(--texto-suave)' }}>CPM ${j.mercadoPublicitario.cpmEstimadoUsd[0]}–${j.mercadoPublicitario.cpmEstimadoUsd[1]}</div></div>
            </div>
            {j.contexto && (
              <p style={{ fontSize: '0.85rem', color: 'var(--texto-suave)', lineHeight: 1.6 }}>{j.contexto}</p>
            )}
            <p style={{ fontSize: '0.72rem', color: 'var(--texto-suave)', marginBottom: 0 }}>
              Fuentes consultadas en vivo: {j.fuentes.join(' · ')} {resultado.jurisdiccion.desdeCache ? '(caché < 7 días)' : ''} · Idiomas: {j.pais.idiomas.join(', ')} · Moneda: {j.pais.monedas.join(', ')}
            </p>
          </div>

          {p.analisisIA?.texto && (
            <div className="tarjeta" style={{ borderLeft: '3px solid var(--primario)' }}>
              <h2>🤖 Análisis del Estratega IA</h2>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem', lineHeight: 1.65 }}>
                {p.analisisIA.texto}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--texto-suave)', marginBottom: 0, marginTop: '0.75rem' }}>
                Generado por: {p.analisisIA.motor} · con los datos reales de la jurisdicción y tu brief
              </p>
            </div>
          )}

          <div className="grid-2">
            <div className="tarjeta" style={{ borderLeft: '3px solid var(--verde)' }}>
              <h2>⭐ Formato estrella recomendado</h2>
              <p style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.3rem' }}>{p.formatoEstrella.nombre}</p>
              <p style={{ fontSize: '0.83rem', color: 'var(--cian)', margin: '0 0 0.6rem' }}>{p.formatoEstrella.specs}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--texto-suave)', lineHeight: 1.6, margin: 0 }}>{p.formatoEstrella.razon}</p>
            </div>

            <div className="tarjeta">
              <h2>📡 Mezcla de plataformas</h2>
              {p.plataformas.map((pl) => (
                <div key={pl.plataforma} style={{ marginBottom: '0.7rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 3 }}>
                    <strong>{pl.plataforma}</strong><span>{pl.pct}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--panel-2)', borderRadius: 4 }}>
                    <div style={{ width: `${pl.pct}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--primario), var(--cian))' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--texto-suave)', marginTop: 2 }}>{pl.rol}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="tarjeta">
            <h2>🏗️ Estructura de anuncios — {p.estructura.campania}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {p.estructura.conjuntos.map((c) => (
                <div key={c.nombre} style={{ background: 'var(--panel-2)', border: '1px solid var(--borde)', borderRadius: 10, padding: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: '0.9rem' }}>{c.nombre}</strong>
                    <span className="insignia activa">{c.presupuestoPct}% presup.</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--cian)', marginBottom: '0.6rem' }}>{c.publico}</div>
                  {c.anuncios.map((a) => (
                    <div key={a.angulo} style={{ fontSize: '0.78rem', marginBottom: '0.4rem', paddingLeft: '0.6rem', borderLeft: '2px solid var(--primario)' }}>
                      <strong>{a.angulo}:</strong> <span style={{ color: 'var(--texto-suave)' }}>{a.gancho}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="tarjeta">
              <h2>♟️ Estrategia {p.estrategia.tipo}</h2>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem', lineHeight: 1.8, color: 'var(--texto-suave)' }}>
                {p.estrategia.principios.map((pr, i) => <li key={i}>{pr}</li>)}
              </ul>
            </div>
            <div className="tarjeta">
              <h2>🎯 KPIs objetivo para esta jurisdicción</h2>
              <table style={{ fontSize: '0.83rem' }}>
                <tbody>
                  <tr><td style={{ color: 'var(--texto-suave)' }}>CPM estimado</td><td><strong>{p.kpis.cpmEstimado}</strong></td></tr>
                  <tr><td style={{ color: 'var(--texto-suave)' }}>Alcance mensual</td><td><strong>{p.kpis.alcanceMensualEstimado}</strong></td></tr>
                  <tr><td style={{ color: 'var(--texto-suave)' }}>CPA objetivo</td><td><strong style={{ color: 'var(--verde)' }}>{p.kpis.cpaObjetivo}</strong></td></tr>
                  <tr><td style={{ color: 'var(--texto-suave)' }}>ROAS objetivo</td><td><strong style={{ color: 'var(--verde)' }}>{p.kpis.roasObjetivo}</strong></td></tr>
                  <tr><td style={{ color: 'var(--texto-suave)' }}>CTR saludable</td><td><strong>{p.kpis.ctrSaludable}</strong></td></tr>
                </tbody>
              </table>
              <p style={{ fontSize: '0.75rem', color: 'var(--texto-suave)', marginBottom: 0 }}>{p.kpis.nota}</p>
            </div>
          </div>

          <div className="tarjeta">
            <h2>✅ Checklist de los primeros 14 días</h2>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem', lineHeight: 1.9, color: 'var(--texto-suave)' }}>
              {p.checklist.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>

          <button className="boton suave" onClick={() => { setPaso(0); setResultado(null); }}>↺ Crear otro plan</button>
        </>
      )}

      {/* Historial de planes */}
      {historial.length > 0 && paso !== 4 && (
        <div className="tarjeta" style={{ marginTop: '1.25rem' }}>
          <h2>🗂️ Planes anteriores</h2>
          {historial.map((h) => (
            <div
              key={h.id}
              onClick={() => { setResultado(h); setPaso(4); }}
              style={{ padding: '0.6rem 0.8rem', background: 'var(--panel-2)', border: '1px solid var(--borde)', borderRadius: 8, marginBottom: '0.5rem', cursor: 'pointer', fontSize: '0.83rem', display: 'flex', justifyContent: 'space-between' }}
              title="Clic para ver el plan completo"
            >
              <span><strong>{h.brief.producto}</strong> · {h.brief.objetivo} · {h.brief.modelo?.toUpperCase()} · {h.jurisdiccion?.pais?.nombreOficial || h.brief.pais}</span>
              <span style={{ color: 'var(--texto-suave)' }}>{h.fecha?.slice(0, 16)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
