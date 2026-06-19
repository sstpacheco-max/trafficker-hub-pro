// pages/Clientes.jsx — Cartera de clientes persistida en SQLite
import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [nombre, setNombre] = useState('');
  const [industria, setIndustria] = useState('');
  const [presupuesto, setPresupuesto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = () => api.clientes().then(setClientes).catch(console.error);

  useEffect(() => { cargar(); }, []);

  const agregar = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    setError('');
    try {
      await api.crearCliente({
        nombre: nombre.trim(),
        industria: industria.trim(),
        presupuesto_mensual: Number(presupuesto) || 0
      });
      setNombre(''); setIndustria(''); setPresupuesto('');
      cargar();
    } catch (e) {
      setError(e.message);
    }
    setGuardando(false);
  };

  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar al cliente "${c.nombre}"?`)) return;
    await api.eliminarCliente(c.id);
    cargar();
  };

  const presupuestoTotal = clientes.reduce((s, c) => s + (c.presupuesto_mensual || 0), 0);

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>👥 Cartera de Clientes</h1>
          <div className="sub">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} · Presupuesto bajo gestión: <strong>${presupuestoTotal.toLocaleString()}/mes</strong>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="tarjeta">
          <h2>➕ Nuevo cliente</h2>

          <label>Nombre del negocio</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Tienda Naturista Vida Sana" />

          <label>Industria</label>
          <input value={industria} onChange={(e) => setIndustria(e.target.value)} placeholder="Ej: E-commerce, Salud, Educación..." />

          <label>Presupuesto mensual (USD)</label>
          <input type="number" min="0" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} placeholder="Ej: 1500" />

          <button className="boton" onClick={agregar} disabled={guardando || !nombre.trim()}>
            {guardando ? 'Guardando...' : 'Guardar cliente'}
          </button>
          {error && <div className="alerta roja" style={{ marginTop: '0.85rem' }}>{error}</div>}
        </div>

        <div className="tarjeta" style={{ padding: '0.5rem 0.75rem' }}>
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Industria</th>
                <th>Presupuesto/mes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                  <td style={{ color: 'var(--texto-suave)' }}>{c.industria || '—'}</td>
                  <td>${(c.presupuesto_mensual || 0).toLocaleString()}</td>
                  <td>
                    <button className="boton suave peligro" onClick={() => eliminar(c)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clientes.length === 0 && (
            <p style={{ padding: '1rem', color: 'var(--texto-suave)' }}>Sin clientes todavía. Agrega el primero.</p>
          )}
        </div>
      </div>
    </div>
  );
}
