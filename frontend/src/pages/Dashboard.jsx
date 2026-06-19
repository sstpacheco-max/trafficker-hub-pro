// pages/Dashboard.jsx — KPIs en vivo, tendencia histórica con proyección y alertas
import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend, ReferenceLine
} from 'recharts';
import { api } from '../api';

const COLORES_PLATAFORMA = { meta: '#60a5fa', google: '#fbbf24', tiktok: '#f472b6' };

function claseAlerta(texto) {
  if (texto.startsWith('🔴')) return 'roja';
  if (texto.startsWith('🚀') || texto.startsWith('✅')) return 'verde';
  return 'amarilla';
}

export default function Dashboard() {
  const [metricas, setMetricas] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [proyeccion, setProyeccion] = useState(null);
  const previas = useRef(null);

  const cargar = async () => {
    try {
      const m = await api.metricas();
      previas.current = metricas;
      setMetricas(m);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    cargar();
    api.historico().then(setHistorico).catch(() => {});
    api.proyecciones(5).then(setProyeccion).catch(() => {});
    const intervalo = setInterval(cargar, 5000); // refresco en vivo
    return () => clearInterval(intervalo);
  }, []);

  // Une histórico + proyección para dibujar la línea punteada del futuro
  const datosGrafica = [
    ...historico.map((h) => ({ dia: h.dia.slice(5), ingresos: h.ingresos, inversion: h.inversion })),
    ...(proyeccion?.disponible
      ? proyeccion.proyeccion.map((p) => ({ dia: `+${p.dia}d`, estimado: p.ingresosEstimados }))
      : [])
  ];

  const datosPie = metricas?.desglose
    ? Object.entries(metricas.desglose).map(([plataforma, d]) => ({
        name: plataforma.toUpperCase(),
        value: Number(d.inversion.toFixed(2)),
        color: COLORES_PLATAFORMA[plataforma] || '#94a3b8'
      }))
    : [];

  const delta = (campo) => {
    if (!previas.current || !metricas) return null;
    const dif = metricas[campo] - previas.current[campo];
    if (Math.abs(dif) < 0.01) return null;
    return dif > 0 ? (
      <div className="delta sube">▲ +{dif.toFixed(2)}</div>
    ) : (
      <div className="delta baja">▼ {dif.toFixed(2)}</div>
    );
  };

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>📊 Centro de Mando</h1>
          <div className="sub">Visión omnicanal consolidada — Meta · Google · TikTok</div>
        </div>
        <span className="en-vivo"><span className="punto" /> EN VIVO · refresco cada 5s</span>
      </div>

      {metricas ? (
        <>
          <div className="fila-kpis">
            <div className="kpi">
              <p className="etiqueta">Inversión Total</p>
              <p className="valor">${metricas.inversionTotal.toLocaleString()}</p>
              {delta('inversionTotal')}
            </div>
            <div className="kpi">
              <p className="etiqueta">Ingresos Totales</p>
              <p className="valor" style={{ color: 'var(--verde)' }}>${metricas.ingresosTotales.toLocaleString()}</p>
              {delta('ingresosTotales')}
            </div>
            <div className="kpi">
              <p className="etiqueta">ROAS Global</p>
              <p className="valor" style={{ color: metricas.roasGlobal >= 2 ? 'var(--verde)' : 'var(--rojo)' }}>
                {metricas.roasGlobal}x
              </p>
            </div>
            <div className="kpi">
              <p className="etiqueta">CPA Promedio</p>
              <p className="valor" style={{ color: 'var(--cian)' }}>${metricas.cpaPromedio}</p>
            </div>
            <div className="kpi">
              <p className="etiqueta">Conversiones</p>
              <p className="valor">{metricas.conversionesTotales}</p>
              {delta('conversionesTotales')}
            </div>
          </div>

          <div className="grid-2">
            <div className="tarjeta">
              <h2>📈 Ingresos vs. Inversión (14 días + proyección)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={datosGrafica}>
                  <defs>
                    <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gInversion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#233047" strokeDasharray="3 3" />
                  <XAxis dataKey="dia" stroke="#8fa3bf" fontSize={11} />
                  <YAxis stroke="#8fa3bf" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: '#16213a', border: '1px solid #233047', borderRadius: 8, color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#34d399" fill="url(#gIngresos)" strokeWidth={2} />
                  <Area type="monotone" dataKey="inversion" name="Inversión" stroke="#6366f1" fill="url(#gInversion)" strokeWidth={2} />
                  <Area type="monotone" dataKey="estimado" name="Proyección" stroke="#22d3ee" strokeDasharray="6 4" fill="none" strokeWidth={2} />
                  {historico.length > 0 && (
                    <ReferenceLine x={historico[historico.length - 1].dia.slice(5)} stroke="#8fa3bf" strokeDasharray="2 4" label={{ value: 'hoy', fill: '#8fa3bf', fontSize: 11 }} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
              {proyeccion?.disponible && (
                <div style={{ fontSize: '0.82rem', color: 'var(--texto-suave)' }}>
                  Tendencia <strong style={{ color: proyeccion.tendencia === 'alcista' ? 'var(--verde)' : 'var(--rojo)' }}>
                    {proyeccion.tendencia === 'alcista' ? '📈 alcista' : '📉 bajista'}
                  </strong> según regresión sobre el histórico real de la base de datos.
                </div>
              )}
            </div>

            <div className="tarjeta">
              <h2>🪙 Distribución de inversión por plataforma</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={datosPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={4}>
                    {datosPie.map((p) => <Cell key={p.name} fill={p.color} stroke="none" />)}
                  </Pie>
                  <Legend formatter={(v) => <span style={{ color: '#e2e8f0' }}>{v}</span>} />
                  <Tooltip
                    formatter={(v) => `$${v}`}
                    contentStyle={{ background: '#16213a', border: '1px solid #233047', borderRadius: 8, color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="tarjeta">
            <h2>🚨 Alertas del Optimizador de ROAS</h2>
            {metricas.alertas.length > 0 ? (
              metricas.alertas.map((a, i) => (
                <div key={i} className={`alerta ${claseAlerta(a)}`}>{a}</div>
              ))
            ) : (
              <p style={{ color: 'var(--texto-suave)', margin: 0 }}>Sin alertas por ahora. Todo bajo control. ✅</p>
            )}
            <p style={{ fontSize: '0.78rem', color: 'var(--texto-suave)', marginBottom: 0 }}>
              Las alertas se calculan en vivo con las métricas de cada campaña: pausa o escala desde el módulo 🎯 Campañas y mira cómo cambian.
            </p>
          </div>
        </>
      ) : (
        <p>Sincronizando con Meta, Google y TikTok Ads...</p>
      )}
    </div>
  );
}
