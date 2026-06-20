import React, { useState, useEffect } from 'react';
import { api } from '../api';

const PLATAFORMAS = ['TikTok', 'Instagram Reels', 'Facebook', 'Instagram', 'Google', 'LinkedIn'];
const TONOS = ['directo y cercano', 'profesional', 'humorístico', 'emocional', 'urgente', 'educativo'];
const ESTILOS_VISUAL = ['moderno y dinámico', 'minimalista y limpio', 'neón sobre fondo oscuro', 'cálido y orgánico', 'corporativo elegante', 'retro/vintage', 'cartoon/animado'];

export default function Copywriter() {
  const [tab, setTab] = useState('guion');
  const [frameworks, setFrameworks] = useState({});
  const [hooks, setHooks] = useState([]);

  const [producto, setProducto] = useState('');
  const [avatar, setAvatar] = useState('');
  const [dolor, setDolor] = useState('');
  const [framework, setFramework] = useState('ugc-problema');
  const [plataforma, setPlataforma] = useState('TikTok');
  const [tono, setTono] = useState('directo y cercano');
  const [estiloVisual, setEstiloVisual] = useState('moderno y dinámico');

  const [resultado, setResultado] = useState('');
  const [motor, setMotor] = useState('');
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    api.frameworks().then(setFrameworks).catch(() => {});
    api.hooks().then(setHooks).catch(() => {});
    api.copies().then(setHistorial).catch(() => {});
  }, []);

  const generar = async () => {
    setCargando(true);
    setResultado('');
    try {
      if (tab === 'guion') {
        const r = await api.generarGuion({ producto, avatar, dolor, framework, plataforma, tono });
        setResultado(r.guion);
        setMotor(r.motor);
      } else {
        const r = await api.generarPromptIA({ producto, avatar, dolor, plataforma, estiloVisual });
        setResultado(r.prompt);
        setMotor(r.motor);
      }
      api.copies().then(setHistorial).catch(() => {});
    } catch (e) {
      setResultado(`Error: ${e.message}`);
    }
    setCargando(false);
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(resultado); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {}
  };

  const fw = frameworks[framework];
  const hooksPersonalizados = hooks.slice(0, 8).map(h =>
    h.replace('{producto}', producto || '___').replace('{avatar}', avatar || '___').replace('{dolor}', dolor || '___')
     .replace('{beneficio}', 'resultados').replace('{tema}', producto || '___').replace('{dolor_invertido}', 'estás listo para crecer')
     .replace('{competencia}', 'tu competencia').replace('{referente}', 'los mejores').replace('{avatar_posesivo}', 'tu futuro yo')
  );

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>🎬 Creador de Comerciales</h1>
          <div className="sub">Diseña guiones de video para redes sociales y genera prompts para crearlos con IA.</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button className="boton" style={{ background: tab === 'guion' ? 'var(--primario)' : 'var(--panel-2)', color: tab === 'guion' ? '#fff' : 'var(--texto)' }}
          onClick={() => setTab('guion')}>🎬 Guion de Comercial</button>
        <button className="boton" style={{ background: tab === 'prompt' ? 'var(--primario)' : 'var(--panel-2)', color: tab === 'prompt' ? '#fff' : 'var(--texto)' }}
          onClick={() => setTab('prompt')}>🤖 Prompt para IA de Video</button>
      </div>

      <div className="grid-2">
        <div>
          {/* Brief */}
          <div className="tarjeta">
            <h2>✍️ Brief del comercial</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Producto o servicio *</label>
                <input value={producto} onChange={e => setProducto(e.target.value)} placeholder="Ej: Curso de marketing, Crema facial, App de fitness..." />
              </div>
              <div>
                <label>Cliente ideal (avatar)</label>
                <input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="Ej: Emprendedora de 25-35 años" />
              </div>
              <div>
                <label>Plataforma</label>
                <select value={plataforma} onChange={e => setPlataforma(e.target.value)}>
                  {PLATAFORMAS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Dolor / problema que resuelve</label>
                <textarea rows={2} value={dolor} onChange={e => setDolor(e.target.value)} placeholder="Ej: Gasta en publicidad pero no ve resultados..." />
              </div>
            </div>

            {tab === 'guion' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', marginTop: '0.5rem' }}>
                  <div>
                    <label>Tono</label>
                    <select value={tono} onChange={e => setTono(e.target.value)}>
                      {TONOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {tab === 'prompt' && (
              <div style={{ marginTop: '0.5rem' }}>
                <label>Estilo visual</label>
                <select value={estiloVisual} onChange={e => setEstiloVisual(e.target.value)}>
                  {ESTILOS_VISUAL.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            )}

            <button className="boton" onClick={generar} disabled={cargando || !producto.trim()} style={{ marginTop: '0.75rem' }}>
              {cargando
                ? (tab === 'guion' ? '🎬 Escribiendo guion...' : '🤖 Generando prompt...')
                : (tab === 'guion' ? '⚡ Generar Guion de Comercial' : '🤖 Generar Prompt para IA de Video')}
            </button>
          </div>

          {/* Selector de framework (solo para guiones) */}
          {tab === 'guion' && Object.keys(frameworks).length > 0 && (
            <div className="tarjeta">
              <h2>🎯 Formato del comercial</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--texto-suave)', marginTop: 0 }}>
                Elige el framework que mejor se adapte a tu objetivo. Todos están probados con alto rendimiento en 2025-2026.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                {Object.entries(frameworks).map(([id, f]) => (
                  <div key={id} onClick={() => setFramework(id)}
                    style={{
                      padding: '0.65rem', borderRadius: 8, cursor: 'pointer',
                      border: framework === id ? '2px solid var(--primario)' : '1px solid var(--borde)',
                      background: framework === id ? 'rgba(99, 102, 241, 0.1)' : 'var(--panel-2)'
                    }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.icono} {f.nombre}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--texto-suave)', marginTop: 2 }}>{f.descripcion}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--cian)', marginTop: 4 }}>
                      {f.plataformas?.join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          {/* Hooks virales */}
          {producto.trim() && tab === 'guion' && (
            <div className="tarjeta" style={{ borderLeft: '3px solid var(--ambar)' }}>
              <h2>🔥 Hooks virales sugeridos</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--texto-suave)', marginTop: 0 }}>
                Usa estos ganchos para los primeros 3 segundos de tu video. Clic para copiar.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {hooksPersonalizados.map((h, i) => (
                  <div key={i} onClick={() => { navigator.clipboard?.writeText(h); }}
                    style={{ padding: '0.45rem 0.65rem', background: 'var(--panel-2)', borderRadius: 6, fontSize: '0.83rem', cursor: 'pointer' }}
                    title="Clic para copiar">
                    "{h}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div className="tarjeta" style={{ borderLeft: '3px solid var(--verde)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{tab === 'guion' ? '🎬 Guion generado' : '🤖 Prompt para IA de video'}</h2>
                <button className="boton suave" onClick={copiar}>{copiado ? '✅ Copiado' : '📋 Copiar'}</button>
              </div>
              <div className="copy-box" style={{ whiteSpace: 'pre-wrap', borderLeftColor: 'var(--verde)', maxHeight: 500, overflowY: 'auto' }}>
                {resultado}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--texto-suave)' }}>
                  Motor: {motor && motor !== 'plantilla' && motor !== 'simulado'
                    ? `🤖 IA (${motor})` : '📋 Plantilla (configura GEMINI_API_KEY para guiones con IA real)'}
                </span>
              </div>
              {tab === 'prompt' && (
                <p style={{ fontSize: '0.75rem', color: 'var(--cian)', marginBottom: 0 }}>
                  💡 Copia este prompt y pégalo en: Runway, Pika, Kling, HeyGen, Synthesia, CapCut AI, o cualquier generador de video con IA.
                </p>
              )}
            </div>
          )}

          {/* Historial */}
          <div className="tarjeta">
            <h2>🗂️ Historial de creativos</h2>
            {historial.length === 0 ? (
              <p style={{ color: 'var(--texto-suave)' }}>Genera tu primer comercial.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 300, overflowY: 'auto' }}>
                {historial.map(h => (
                  <div key={h.id} onClick={() => { setResultado(h.copy); setMotor(h.motor); }}
                    style={{ padding: '0.5rem 0.65rem', background: 'var(--panel-2)', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--borde)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <strong>{h.producto || 'Sin producto'}</strong>
                      <span style={{ color: 'var(--texto-suave)' }}>{h.fecha?.slice(0, 16)}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--texto-suave)', marginTop: 2 }}>
                      {h.metodo} · {h.motor === 'plantilla' || h.motor === 'simulado' ? '📋 demo' : `🤖 ${h.motor}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
