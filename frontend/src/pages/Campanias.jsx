// pages/Campanias.jsx — Gestión accionable: pausar, activar y escalar presupuesto
import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Campanias() {
  const [campanias, setCampanias] = useState([]);
  const [ocupada, setOcupada] = useState(null); // id de la campaña en proceso
  const [aviso, setAviso] = useState('');

  const cargar = () => api.campanias().then(setCampanias).catch(console.error);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(''), 3500);
  };

  const alternarEstado = async (c) => {
    setOcupada(c.id);
    const nuevoEstado = c.estado === 'activa' ? 'pausada' : 'activa';
    try {
      await api.actualizarCampania(c.id, { estado: nuevoEstado });
      await cargar();
      mostrarAviso(nuevoEstado === 'pausada'
        ? `⏸️ "${c.nombre}" pausada. Dejará de gastar presupuesto.`
        : `▶️ "${c.nombre}" reactivada. Vuelve a entregar anuncios.`);
    } catch (e) {
      mostrarAviso(`Error: ${e.message}`);
    }
    setOcupada(null);
  };

  const escalar = async (c) => {
    setOcupada(c.id);
    const nuevo = Number((c.presupuesto_diario * 1.2).toFixed(2));
    try {
      await api.actualizarCampania(c.id, { presupuesto_diario: nuevo });
      await cargar();
      mostrarAviso(`🚀 "${c.nombre}" escalada: presupuesto diario $${c.presupuesto_diario} → $${nuevo} (+20%).`);
    } catch (e) {
      mostrarAviso(`Error: ${e.message}`);
    }
    setOcupada(null);
  };

  const colorRoas = (roas) => (roas >= 3 ? 'var(--verde)' : roas >= 1.5 ? 'var(--ambar)' : 'var(--rojo)');

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>🎯 Gestión de Campañas</h1>
          <div className="sub">Pausa las que queman dinero, escala las ganadoras. Los KPIs del Centro de Mando reaccionan al instante.</div>
        </div>
        <span className="en-vivo"><span className="punto" /> EN VIVO</span>
      </div>

      {aviso && <div className="alerta verde" style={{ animation: 'aparecer 0.3s ease' }}>{aviso}</div>}

      <div className="tarjeta" style={{ padding: '0.5rem 0.75rem' }}>
        <table>
          <thead>
            <tr>
              <th>Campaña</th>
              <th>Plataforma</th>
              <th>Estado</th>
              <th>Presup./día</th>
              <th>Inversión</th>
              <th>Ingresos</th>
              <th>ROAS</th>
              <th>CPA</th>
              <th>Frec.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {campanias.map((c) => (
              <tr key={c.id} style={{ opacity: c.estado === 'pausada' ? 0.55 : 1 }}>
                <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                <td><span className={`insignia ${c.plataforma}`}>{c.plataforma.toUpperCase()}</span></td>
                <td><span className={`insignia ${c.estado}`}>{c.estado}</span></td>
                <td>${c.presupuesto_diario}</td>
                <td>${c.inversion.toFixed(2)}</td>
                <td>${c.ingresos.toFixed(2)}</td>
                <td style={{ fontWeight: 800, color: colorRoas(c.roas) }}>{c.roas}x</td>
                <td>{c.cpa ? `$${c.cpa}` : '—'}</td>
                <td style={{ color: c.frecuencia > 4 ? 'var(--rojo)' : 'inherit' }}>{c.frecuencia}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="boton suave"
                      disabled={ocupada === c.id}
                      onClick={() => alternarEstado(c)}
                    >
                      {c.estado === 'activa' ? '⏸️ Pausar' : '▶️ Activar'}
                    </button>
                    <button
                      className="boton suave"
                      disabled={ocupada === c.id || c.estado === 'pausada'}
                      onClick={() => escalar(c)}
                      title="Subir presupuesto diario un 20%"
                    >
                      🚀 Escalar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {campanias.length === 0 && <p style={{ padding: '1rem', color: 'var(--texto-suave)' }}>Cargando campañas...</p>}
      </div>

      <div className="tarjeta">
        <h2>📚 Guía rápida del trafficker</h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--texto-suave)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--verde)' }}>ROAS ≥ 3x</strong> → escala +20% cada 48h sin tocar nada más. ·{' '}
          <strong style={{ color: 'var(--ambar)' }}>ROAS 1.5–3x</strong> → optimiza creativos y públicos antes de escalar. ·{' '}
          <strong style={{ color: 'var(--rojo)' }}>ROAS &lt; 1.5x</strong> → pausa si lleva más de $100 invertidos. ·{' '}
          <strong style={{ color: 'var(--rojo)' }}>Frecuencia &gt; 4</strong> → fatiga: renueva el creativo o amplía el público.
        </div>
      </div>
    </div>
  );
}
