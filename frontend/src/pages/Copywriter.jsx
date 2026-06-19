// pages/Copywriter.jsx — Skill 2: MCP Copywriter Neuronal con historial persistente
import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Copywriter() {
  const [producto, setProducto] = useState('Curso de Marketing Digital');
  const [avatar, setAvatar] = useState('Emprendedor Novato');
  const [dolor, setDolor] = useState('Gasta en publicidad pero no vende');
  const [copy, setCopy] = useState('');
  const [motor, setMotor] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [historial, setHistorial] = useState([]);
  const [copiado, setCopiado] = useState(false);

  const cargarHistorial = () => api.copies().then(setHistorial).catch(() => {});

  useEffect(() => { cargarHistorial(); }, []);

  const generar = async () => {
    setCargando(true);
    setError('');
    try {
      const data = await api.generarCopy({ producto, avatar, dolor });
      setCopy(data.copy);
      setMotor(data.motor);
      cargarHistorial();
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
  };

  const copiarAlPortapapeles = async () => {
    try {
      await navigator.clipboard.writeText(copy);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* portapapeles no disponible */ }
  };

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>🧠 Copywriter Neuronal (AIDA)</h1>
          <div className="sub">Genera anuncios con neuroventas. Cada copy queda guardado en la base de datos.</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="tarjeta">
          <h2>✍️ Brief del anuncio</h2>

          <label>Producto o servicio</label>
          <input value={producto} onChange={(e) => setProducto(e.target.value)} placeholder="Ej: Curso de Marketing Digital" />

          <label>Avatar (cliente ideal)</label>
          <input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="Ej: Emprendedor Novato" />

          <label>Dolor principal</label>
          <textarea rows={3} value={dolor} onChange={(e) => setDolor(e.target.value)} placeholder="Ej: Gasta en publicidad pero no vende" />

          <button className="boton" onClick={generar} disabled={cargando || !producto.trim()}>
            {cargando ? '🧠 Redactando con neuroventas...' : '⚡ Generar Anuncio Disruptivo'}
          </button>

          {error && <div className="alerta roja" style={{ marginTop: '0.85rem' }}>{error}</div>}

          {copy && (
            <div style={{ marginTop: '1.25rem' }}>
              <div className="copy-box">{copy}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--texto-suave)' }}>
                  Motor: {motor && motor !== 'simulado' ? `🤖 IA real (${motor})` : '📋 Plantilla local (demo — agrega una key gratuita en backend/.env)'}
                </span>
                <button className="boton suave" onClick={copiarAlPortapapeles}>
                  {copiado ? '✅ Copiado' : '📋 Copiar'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="tarjeta">
          <h2>🗂️ Historial (base de datos)</h2>
          {historial.length === 0 && (
            <p style={{ color: 'var(--texto-suave)' }}>Aún no hay copies guardados. Genera el primero.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 520, overflowY: 'auto' }}>
            {historial.map((h) => (
              <div
                key={h.id}
                style={{
                  background: 'var(--panel-2)', border: '1px solid var(--borde)',
                  borderRadius: 8, padding: '0.7rem 0.85rem', cursor: 'pointer'
                }}
                onClick={() => { setCopy(h.copy); setMotor(h.motor); }}
                title="Clic para ver el copy completo"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <strong>{h.producto || 'Sin producto'}</strong>
                  <span style={{ color: 'var(--texto-suave)' }}>{h.fecha?.slice(0, 16)}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-suave)', marginTop: 2 }}>
                  {h.avatar} · {h.metodo} · {h.motor === 'openai' ? '🤖 IA' : '📋 demo'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
