// Dashboard.jsx — Trafficker Hub Pro: Centro de Mando
import React, { useState, useEffect } from 'react';

const estilos = {
  tarjeta: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  kpi: (bg, color) => ({
    flex: 1,
    padding: '1rem',
    backgroundColor: bg,
    borderRadius: '8px',
    minWidth: '140px'
  }),
  etiquetaKpi: { margin: 0, color: '#6b7280', fontSize: '0.875rem' },
  valorKpi: (color) => ({ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color }),
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    marginBottom: '0.75rem',
    boxSizing: 'border-box',
    fontSize: '0.95rem'
  },
  boton: (deshabilitado) => ({
    backgroundColor: deshabilitado ? '#93c5fd' : '#2563eb',
    color: 'white',
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '4px',
    cursor: deshabilitado ? 'wait' : 'pointer',
    fontWeight: 'bold'
  }),
  insignia: (estado) => ({
    display: 'inline-block',
    padding: '0.15rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    marginLeft: '0.5rem',
    backgroundColor: estado === 'conectado' ? '#dcfce7' : '#fef3c7',
    color: estado === 'conectado' ? '#166534' : '#92400e'
  })
};

export default function TraffickerDashboard() {
  const [metricas, setMetricas] = useState(null);
  const [estado, setEstado] = useState(null);
  const [proyeccion, setProyeccion] = useState(null);

  // Formulario del Copywriter Neuronal
  const [producto, setProducto] = useState('Curso de Marketing Digital');
  const [avatar, setAvatar] = useState('Emprendedor Novato');
  const [dolor, setDolor] = useState('Gasta en publicidad pero no vende');
  const [copy, setCopy] = useState('');
  const [motorCopy, setMotorCopy] = useState('');
  const [cargandoCopy, setCargandoCopy] = useState(false);
  const [errorCopy, setErrorCopy] = useState('');

  // Al cargar: métricas, estado de integraciones y proyecciones
  useEffect(() => {
    fetch('/api/metricas-globales')
      .then((res) => res.json())
      .then(setMetricas)
      .catch((err) => console.error('Error al cargar métricas:', err));

    fetch('/api/estado')
      .then((res) => res.json())
      .then(setEstado)
      .catch(() => {});

    fetch('/api/proyecciones?dias=7')
      .then((res) => res.json())
      .then(setProyeccion)
      .catch(() => {});
  }, []);

  const ejecutarCopywriterNeuronal = async () => {
    setCargandoCopy(true);
    setErrorCopy('');
    try {
      const res = await fetch('/api/mcp/generar-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto, avatar, dolor })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error del servidor');
      setCopy(data.copy);
      setMotorCopy(data.motor);
    } catch (error) {
      console.error('Error al generar copy:', error);
      setErrorCopy('No se pudo generar el copy. ¿Está corriendo el backend?');
    }
    setCargandoCopy(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <h1 style={{ color: '#1e3a8a', fontSize: '2rem', marginBottom: '0.5rem' }}>
        ⚡ Trafficker Hub Pro - Centro de Mando
      </h1>

      {/* Estado de integraciones */}
      {estado && (
        <p style={{ marginTop: 0, marginBottom: '1.5rem', color: '#374151' }}>
          Meta Ads<span style={estilos.insignia(estado.metaAds)}>{estado.metaAds}</span>
          {'  '}Google Ads<span style={estilos.insignia(estado.googleAds)}>{estado.googleAds}</span>
          {'  '}IA Copywriter<span style={estilos.insignia(estado.ia)}>{estado.ia}</span>
        </p>
      )}

      {/* SECCIÓN 1: ANALÍTICA Y ROAS */}
      <div style={estilos.tarjeta}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>📊 Métricas Globales (Cross-Platform)</h2>

        {metricas ? (
          <div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={estilos.kpi('#eff6ff')}>
                <p style={estilos.etiquetaKpi}>Inversión Total</p>
                <p style={estilos.valorKpi('#111827')}>${metricas.inversionTotal}</p>
              </div>
              <div style={estilos.kpi('#f0fdf4')}>
                <p style={estilos.etiquetaKpi}>Ingresos Totales</p>
                <p style={estilos.valorKpi('#166534')}>${metricas.ingresosTotales}</p>
              </div>
              <div style={estilos.kpi('#f0fdf4')}>
                <p style={estilos.etiquetaKpi}>ROAS Global</p>
                <p style={estilos.valorKpi('#166534')}>{metricas.roasGlobal}x</p>
              </div>
              <div style={estilos.kpi('#fef2f2')}>
                <p style={estilos.etiquetaKpi}>CPA Promedio</p>
                <p style={estilos.valorKpi('#991b1b')}>${metricas.cpaPromedio}</p>
              </div>
            </div>

            {metricas.alertas?.length > 0 && (
              <div style={{ padding: '1rem', backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
                <strong>🚨 Alertas del Optimizador:</strong>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
                  {metricas.alertas.map((alerta, index) => (
                    <li key={index} style={{ marginBottom: '0.25rem' }}>{alerta}</li>
                  ))}
                </ul>
              </div>
            )}

            {metricas.modoDemo && (
              <p style={{ marginBottom: 0, marginTop: '0.75rem', fontSize: '0.85rem', color: '#92400e' }}>
                ℹ️ Mostrando datos simulados. Configura tus credenciales en <code>backend/.env</code> para conectar las APIs reales.
              </p>
            )}
          </div>
        ) : (
          <p>Sincronizando con Meta, Google y TikTok Ads...</p>
        )}
      </div>

      {/* SECCIÓN 2: HERRAMIENTAS IA (MCP) */}
      <div style={estilos.tarjeta}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>🧠 Skill: Copywriter Neuronal (AIDA)</h2>

        <label style={{ fontSize: '0.875rem', color: '#374151' }}>Producto o servicio</label>
        <input style={estilos.input} value={producto} onChange={(e) => setProducto(e.target.value)} />

        <label style={{ fontSize: '0.875rem', color: '#374151' }}>Avatar (cliente ideal)</label>
        <input style={estilos.input} value={avatar} onChange={(e) => setAvatar(e.target.value)} />

        <label style={{ fontSize: '0.875rem', color: '#374151' }}>Dolor principal</label>
        <input style={estilos.input} value={dolor} onChange={(e) => setDolor(e.target.value)} />

        <button onClick={ejecutarCopywriterNeuronal} disabled={cargandoCopy} style={estilos.boton(cargandoCopy)}>
          {cargandoCopy ? 'Redactando...' : 'Generar Anuncio Disruptivo'}
        </button>

        {errorCopy && <p style={{ color: '#991b1b' }}>{errorCopy}</p>}

        {copy && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderLeft: '4px solid #2563eb', whiteSpace: 'pre-wrap' }}>
            {copy}
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 0 }}>
              Motor: {motorCopy === 'openai' ? '🤖 OpenAI (IA real)' : '📋 Plantilla local (demo)'}
            </p>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: PROYECCIONES DE VENTAS */}
      <div style={estilos.tarjeta}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>📈 Proyección de Ingresos (7 días)</h2>
        {proyeccion?.disponible ? (
          <div>
            <p>
              Tendencia: <strong>{proyeccion.tendencia === 'alcista' ? '📈 Alcista' : '📉 Bajista'}</strong>
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {proyeccion.proyeccion.map((p) => (
                <div key={p.dia} style={{ padding: '0.5rem 0.75rem', backgroundColor: '#eef2ff', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Día +{p.dia}</div>
                  <div style={{ fontWeight: 'bold' }}>${p.ingresosEstimados}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ color: '#6b7280' }}>
            {proyeccion?.mensaje || 'Cargando proyecciones...'} Cada vez que abres el dashboard se guarda un
            registro histórico; con 2 o más registros verás la proyección.
          </p>
        )}
      </div>
    </div>
  );
}
