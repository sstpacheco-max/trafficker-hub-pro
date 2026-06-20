import React, { useState, useEffect } from 'react';
import { api } from '../api';

const ESTADOS = ['activo', 'en_pausa', 'cancelado'];
const PLATAFORMAS_OPCIONES = ['Meta Ads', 'Google Ads', 'TikTok Ads', 'LinkedIn Ads', 'SEO', 'Email Marketing', 'Community Manager'];
const TIPOS_INTERACCION = ['llamada', 'reunion', 'email', 'propuesta', 'seguimiento', 'pago', 'nota'];

const colorEstado = (e) =>
  e === 'activo' ? 'var(--verde)' : e === 'en_pausa' ? 'var(--ambar)' : '#e74c3c';

const iconoTipo = (t) => ({
  llamada: '📞', reunion: '🤝', email: '✉️', propuesta: '📄',
  seguimiento: '🔔', pago: '💰', nota: '📝', registro: '✅'
}[t] || '📌');

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [formAbierto, setFormAbierto] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [interacciones, setInteracciones] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState(null);

  const [form, setForm] = useState({
    nombre: '', contacto: '', industria: '', telefono: '', email: '',
    web: '', direccion: '', presupuesto_mensual: '', plataformas: [],
    notas: '', fecha_inicio: ''
  });

  const [nuevoTipo, setNuevoTipo] = useState('llamada');
  const [nuevoDesc, setNuevoDesc] = useState('');

  const cargar = () => api.clientes().then(setClientes).catch(console.error);
  useEffect(() => { cargar(); }, []);

  const mostrarAviso = (t) => { setAviso(t); setTimeout(() => setAviso(''), 3000); };

  const limpiarForm = () => {
    setForm({ nombre: '', contacto: '', industria: '', telefono: '', email: '', web: '', direccion: '', presupuesto_mensual: '', plataformas: [], notas: '', fecha_inicio: '' });
    setEditando(null);
  };

  const abrirForm = (c) => {
    if (c) {
      setForm({
        nombre: c.nombre || '', contacto: c.contacto || '', industria: c.industria || '',
        telefono: c.telefono || '', email: c.email || '', web: c.web || '',
        direccion: c.direccion || '', presupuesto_mensual: c.presupuesto_mensual || '',
        plataformas: c.plataformas || [], notas: c.notas || '', fecha_inicio: c.fecha_inicio || ''
      });
      setEditando(c.id);
    } else {
      limpiarForm();
    }
    setFormAbierto(true);
    setDetalle(null);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return;
    setGuardando(true);
    try {
      const datos = { ...form, presupuesto_mensual: Number(form.presupuesto_mensual) || 0 };
      if (editando) {
        await api.actualizarCliente(editando, datos);
        mostrarAviso('Cliente actualizado');
      } else {
        await api.crearCliente(datos);
        mostrarAviso('Cliente registrado');
      }
      limpiarForm();
      setFormAbierto(false);
      cargar();
    } catch (e) {
      mostrarAviso(`Error: ${e.message}`);
    }
    setGuardando(false);
  };

  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar "${c.nombre}" y todo su historial?`)) return;
    await api.eliminarCliente(c.id);
    if (detalle?.id === c.id) setDetalle(null);
    cargar();
    mostrarAviso('Cliente eliminado');
  };

  const cambiarEstado = async (c, estado) => {
    await api.actualizarCliente(c.id, { estado });
    cargar();
    if (detalle?.id === c.id) verDetalle(c.id);
  };

  const verDetalle = async (id) => {
    setFormAbierto(false);
    const c = await api.obtenerCliente(id);
    setDetalle(c);
    const inter = await api.interacciones(id);
    setInteracciones(inter);
  };

  const agregarInteraccion = async () => {
    if (!nuevoDesc.trim() || !detalle) return;
    await api.agregarInteraccion(detalle.id, { tipo: nuevoTipo, descripcion: nuevoDesc.trim() });
    setNuevoDesc('');
    const inter = await api.interacciones(detalle.id);
    setInteracciones(inter);
    mostrarAviso('Interacción registrada');
  };

  const togglePlataforma = (p) => {
    setForm(f => ({
      ...f,
      plataformas: f.plataformas.includes(p) ? f.plataformas.filter(x => x !== p) : [...f.plataformas, p]
    }));
  };

  const filtrados = clientes.filter(c => {
    if (filtro !== 'todos' && c.estado !== filtro) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      return (c.nombre || '').toLowerCase().includes(q) ||
        (c.contacto || '').toLowerCase().includes(q) ||
        (c.industria || '').toLowerCase().includes(q);
    }
    return true;
  });

  const activos = clientes.filter(c => c.estado === 'activo');
  const presupuestoTotal = activos.reduce((s, c) => s + (c.presupuesto_mensual || 0), 0);

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>👥 CRM — Cartera de Clientes</h1>
          <div className="sub">Gestiona tus clientes, registra interacciones y haz seguimiento de cada cuenta.</div>
        </div>
        <button className="boton" onClick={() => abrirForm(null)}>➕ Nuevo cliente</button>
      </div>

      {aviso && <div className="alerta verde">{aviso}</div>}

      {/* KPIs */}
      <div className="fila-kpis" style={{ marginBottom: '1.25rem' }}>
        <div className="kpi"><p className="etiqueta">Total clientes</p><p className="valor">{clientes.length}</p></div>
        <div className="kpi"><p className="etiqueta">Activos</p><p className="valor" style={{ color: 'var(--verde)' }}>{activos.length}</p></div>
        <div className="kpi"><p className="etiqueta">En pausa</p><p className="valor" style={{ color: 'var(--ambar)' }}>{clientes.filter(c => c.estado === 'en_pausa').length}</p></div>
        <div className="kpi"><p className="etiqueta">Presupuesto mensual</p><p className="valor" style={{ color: 'var(--cian)' }}>${presupuestoTotal.toLocaleString()}</p></div>
        <div className="kpi"><p className="etiqueta">Ticket promedio</p><p className="valor">${activos.length ? Math.round(presupuestoTotal / activos.length).toLocaleString() : 0}</p></div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {['todos', 'activo', 'en_pausa', 'cancelado'].map(e => (
          <button key={e} className={`boton suave ${filtro === e ? '' : ''}`}
            style={{ background: filtro === e ? 'var(--primario)' : undefined, color: filtro === e ? '#fff' : undefined }}
            onClick={() => setFiltro(e)}>
            {e === 'todos' ? `Todos (${clientes.length})` : `${e.replace('_', ' ')} (${clientes.filter(c => c.estado === e).length})`}
          </button>
        ))}
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar cliente..."
          style={{ marginLeft: 'auto', maxWidth: 250, marginBottom: 0 }} />
      </div>

      <div className="grid-2">
        {/* Lista de clientes */}
        <div className="tarjeta" style={{ padding: '0.5rem 0.75rem' }}>
          {filtrados.length === 0 ? (
            <p style={{ padding: '1.5rem', color: 'var(--texto-suave)', textAlign: 'center' }}>
              {clientes.length === 0 ? 'Sin clientes todavía. Agrega el primero o promove un prospecto.' : 'No hay clientes con ese filtro.'}
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Presupuesto</th>
                  <th>Plataformas</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => verDetalle(c.id)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--texto-suave)' }}>{c.industria || '—'}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {c.contacto && <div>{c.contacto}</div>}
                      {c.telefono && <div>📞 {c.telefono}</div>}
                      {c.email && <div>✉️ {c.email}</div>}
                      {!c.contacto && !c.telefono && !c.email && <span style={{ color: 'var(--texto-suave)' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>${(c.presupuesto_mensual || 0).toLocaleString()}/mes</td>
                    <td style={{ fontSize: '0.72rem' }}>
                      {(c.plataformas || []).length ? c.plataformas.join(', ') : <span style={{ color: 'var(--texto-suave)' }}>—</span>}
                    </td>
                    <td>
                      <select value={c.estado || 'activo'} onChange={e => { e.stopPropagation(); cambiarEstado(c, e.target.value); }}
                        onClick={e => e.stopPropagation()} style={{ marginBottom: 0, width: 'auto', color: colorEstado(c.estado) }}>
                        {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button className="boton suave" onClick={() => abrirForm(c)}>✏️</button>
                        <button className="boton suave peligro" onClick={() => eliminar(c)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Panel derecho: formulario o detalle */}
        <div>
          {formAbierto && (
            <div className="tarjeta">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{editando ? '✏️ Editar cliente' : '➕ Nuevo cliente'}</h2>
                <button className="boton suave" onClick={() => { setFormAbierto(false); limpiarForm(); }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Nombre del negocio *</label>
                  <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Tienda Naturista Vida Sana" />
                </div>
                <div>
                  <label>Persona de contacto</label>
                  <input value={form.contacto} onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} placeholder="Ej: Juan Pérez" />
                </div>
                <div>
                  <label>Industria</label>
                  <input value={form.industria} onChange={e => setForm(f => ({ ...f, industria: e.target.value }))} placeholder="Ej: E-commerce, Salud..." />
                </div>
                <div>
                  <label>Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+57 300 123 4567" />
                </div>
                <div>
                  <label>Email</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="cliente@email.com" />
                </div>
                <div>
                  <label>Sitio web</label>
                  <input value={form.web} onChange={e => setForm(f => ({ ...f, web: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <label>Dirección / Ciudad</label>
                  <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} placeholder="Medellín, Colombia" />
                </div>
                <div>
                  <label>Presupuesto mensual (USD)</label>
                  <input type="number" min="0" value={form.presupuesto_mensual} onChange={e => setForm(f => ({ ...f, presupuesto_mensual: e.target.value }))} placeholder="1500" />
                </div>
                <div>
                  <label>Fecha de inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
                </div>
              </div>

              <label style={{ marginTop: '0.5rem' }}>Plataformas gestionadas</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                {PLATAFORMAS_OPCIONES.map(p => (
                  <button key={p} className={`boton suave`}
                    style={{ background: form.plataformas.includes(p) ? 'var(--primario)' : undefined, color: form.plataformas.includes(p) ? '#fff' : undefined, fontSize: '0.75rem' }}
                    onClick={() => togglePlataforma(p)}>{p}</button>
                ))}
              </div>

              <label>Notas</label>
              <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={3}
                placeholder="Observaciones, acuerdos, detalles del contrato..." style={{ width: '100%', resize: 'vertical' }} />

              <button className="boton" onClick={guardar} disabled={guardando || !form.nombre.trim()} style={{ marginTop: '0.5rem' }}>
                {guardando ? 'Guardando...' : editando ? 'Actualizar cliente' : 'Registrar cliente'}
              </button>
            </div>
          )}

          {detalle && !formAbierto && (
            <div className="tarjeta">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ marginBottom: '0.2rem' }}>{detalle.nombre}</h2>
                  <span className="insignia" style={{ background: colorEstado(detalle.estado), color: '#fff' }}>
                    {(detalle.estado || 'activo').replace('_', ' ')}
                  </span>
                  {detalle.industria && <span style={{ fontSize: '0.8rem', color: 'var(--texto-suave)', marginLeft: '0.5rem' }}>{detalle.industria}</span>}
                </div>
                <button className="boton suave" onClick={() => setDetalle(null)}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: '1rem', fontSize: '0.85rem' }}>
                {detalle.contacto && <div><strong>👤 Contacto:</strong> {detalle.contacto}</div>}
                {detalle.telefono && <div><strong>📞 Teléfono:</strong> {detalle.telefono}</div>}
                {detalle.email && <div><strong>✉️ Email:</strong> {detalle.email}</div>}
                {detalle.web && <div><strong>🌐 Web:</strong> <a href={detalle.web} target="_blank" rel="noreferrer" style={{ color: 'var(--cian)' }}>{detalle.web}</a></div>}
                {detalle.direccion && <div><strong>📍 Dirección:</strong> {detalle.direccion}</div>}
                {detalle.fecha_inicio && <div><strong>📅 Inicio:</strong> {detalle.fecha_inicio}</div>}
                <div><strong>💰 Presupuesto:</strong> ${(detalle.presupuesto_mensual || 0).toLocaleString()}/mes</div>
              </div>

              {(detalle.plataformas || []).length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <strong style={{ fontSize: '0.8rem' }}>Plataformas:</strong>{' '}
                  {detalle.plataformas.map(p => <span key={p} className="insignia activa" style={{ marginRight: 4, fontSize: '0.72rem' }}>{p}</span>)}
                </div>
              )}

              {detalle.notas && (
                <div style={{ marginTop: '0.75rem', padding: '0.6rem', background: 'var(--panel-2)', borderRadius: 6, fontSize: '0.83rem' }}>
                  📝 {detalle.notas}
                </div>
              )}

              {/* Historial de interacciones */}
              <h3 style={{ marginTop: '1.25rem', fontSize: '0.95rem' }}>📋 Historial de interacciones</h3>

              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <select value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value)} style={{ marginBottom: 0, width: 'auto' }}>
                  {TIPOS_INTERACCION.map(t => <option key={t} value={t}>{iconoTipo(t)} {t}</option>)}
                </select>
                <input value={nuevoDesc} onChange={e => setNuevoDesc(e.target.value)} placeholder="Descripción de la interacción..."
                  style={{ flex: 1, marginBottom: 0, minWidth: 180 }}
                  onKeyDown={e => e.key === 'Enter' && agregarInteraccion()} />
                <button className="boton suave" onClick={agregarInteraccion} disabled={!nuevoDesc.trim()}>Agregar</button>
              </div>

              {interacciones.length === 0 ? (
                <p style={{ color: 'var(--texto-suave)', fontSize: '0.83rem' }}>Sin interacciones registradas.</p>
              ) : (
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {interacciones.map(i => (
                    <div key={i.id} style={{ display: 'flex', gap: '0.6rem', padding: '0.5rem 0', borderBottom: '1px solid var(--borde)', fontSize: '0.83rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{iconoTipo(i.tipo)}</span>
                      <div style={{ flex: 1 }}>
                        <div>{i.descripcion}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--texto-suave)' }}>
                          {i.tipo} · {new Date(i.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!formAbierto && !detalle && (
            <div className="tarjeta" style={{ textAlign: 'center', padding: '2rem', color: 'var(--texto-suave)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👈</p>
              <p>Selecciona un cliente para ver su ficha y registrar interacciones.</p>
              <p style={{ fontSize: '0.8rem' }}>También puedes promover prospectos desde el módulo <strong>Prospector</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
