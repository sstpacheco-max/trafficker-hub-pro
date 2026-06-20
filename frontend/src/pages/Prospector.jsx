// pages/Prospector.jsx — Escaneo de negocios por zona (mapa) + radiografía
// digital + pitch de venta con IA + mini-CRM de prospectos.
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api';

const ESTADOS_CRM = ['nuevo', 'contactado', 'negociacion', 'cliente', 'descartado'];

const colorNivel = (nivel) =>
  nivel === 'alta' ? 'var(--verde)' : nivel === 'media' ? 'var(--ambar)' : 'var(--texto-suave)';

const COLOR_MARCADOR = { alta: '#e74c3c', media: '#f39c12', baja: '#95a5a6' };

function crearIcono(nivel) {
  const color = COLOR_MARCADOR[nivel] || COLOR_MARCADOR.baja;
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
    html: `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2C8.5 2 4 6.5 4 12c0 7.4 10 14 10 14s10-6.6 10-14c0-5.5-4.5-10-10-10z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="14" cy="11" r="4" fill="#fff"/>
    </svg>`
  });
}

export default function Prospector() {
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('restaurantes');
  const [tipoLibre, setTipoLibre] = useState(''); // texto libre: cualquier tipo de negocio
  const [ciudad, setCiudad] = useState('');
  const [pais, setPais] = useState('Colombia');
  const [miServicio, setMiServicio] = useState('Gestión de Meta/Google/TikTok Ads y presencia digital');
  const [motorProspector, setMotorProspector] = useState('openstreetmap');

  const [resultado, setResultado] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [error, setError] = useState('');

  const [pitchAbierto, setPitchAbierto] = useState(null); // nombre del negocio
  const [pitchTexto, setPitchTexto] = useState('');
  const [pitchMotor, setPitchMotor] = useState('');
  const [pitchCargando, setPitchCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const [crm, setCrm] = useState([]);
  const [aviso, setAviso] = useState('');

  // Análisis competitivo en redes
  const [tiendaObjetivo, setTiendaObjetivo] = useState('');
  const [analisis, setAnalisis] = useState(null);
  const [analizando, setAnalizando] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState('');

  const mapaRef = useRef(null);
  const mapaInstancia = useRef(null);

  const cargarCrm = () => api.prospectos().then(setCrm).catch(() => {});

  useEffect(() => {
    api.categoriasProspector().then((c) => {
      setCategorias(c);
      if (c.length && !c.find((x) => x.id === categoria)) setCategoria(c[0].id);
    }).catch(() => {});
    api.estado().then((e) => setMotorProspector(e.prospectorMotor || 'openstreetmap')).catch(() => {});
    cargarCrm();
  }, []);

  useEffect(() => {
    if (!resultado?.negocios?.length || !mapaRef.current) return;
    const conCoords = resultado.negocios.filter((n) => n.lat && n.lon);
    if (!conCoords.length) return;

    if (mapaInstancia.current) {
      mapaInstancia.current.remove();
      mapaInstancia.current = null;
    }

    const mapa = L.map(mapaRef.current, { scrollWheelZoom: true, zoomControl: true });
    mapaInstancia.current = mapa;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);

    const grupo = L.featureGroup();
    for (const n of conCoords) {
      const marcador = L.marker([n.lat, n.lon], { icon: crearIcono(n.nivel) });
      const presencia = [
        n.web ? '🌐 Web ✓' : '❌ Sin web',
        (n.redes?.facebook || n.redes?.instagram) ? '📱 Redes ✓' : '❌ Sin redes'
      ].join(' · ');
      marcador.bindPopup(`
        <div style="min-width:180px;font-family:system-ui;font-size:13px">
          <strong style="font-size:14px">${n.nombre}</strong><br/>
          <span style="color:#888">${n.direccion || n.categoria}</span><br/>
          <span>${presencia}</span><br/>
          ${n.telefono ? `📞 ${n.telefono}<br/>` : ''}
          <span style="font-weight:700;color:${COLOR_MARCADOR[n.nivel]}">Oportunidad: ${n.nivel.toUpperCase()} (${n.score})</span>
        </div>
      `);
      marcador.addTo(grupo);
    }
    grupo.addTo(mapa);
    mapa.fitBounds(grupo.getBounds().pad(0.1));

    return () => {
      if (mapaInstancia.current) {
        mapaInstancia.current.remove();
        mapaInstancia.current = null;
      }
    };
  }, [resultado]);

  const mostrarAviso = (t) => { setAviso(t); setTimeout(() => setAviso(''), 3000); };

  const escanear = async () => {
    setEscaneando(true);
    setError('');
    setResultado(null);
    setPitchAbierto(null);
    try {
      const r = await api.buscarNegocios({
        categoria: tipoLibre.trim() ? undefined : categoria,
        tipoLibre: tipoLibre.trim() || undefined,
        ciudad, pais, limite: 30
      });
      setResultado(r);
      if (!r.negocios.length) setError('El mapa no tiene negocios de ese rubro registrados en esa zona. Prueba otra palabra (ej: "barbería", "spa", "ferretería") o una ciudad más grande.');
    } catch (e) {
      setError(e.message);
    }
    setEscaneando(false);
  };

  const generarPitch = async (negocio) => {
    setPitchAbierto(negocio.nombre);
    setPitchCargando(true);
    setPitchTexto('');
    try {
      const r = await api.generarPitch({
        negocio,
        estadisticas: resultado?.estadisticas,
        ciudad,
        miServicio
      });
      setPitchTexto(r.pitch);
      setPitchMotor(r.motor);
    } catch (e) {
      setPitchTexto(`Error generando pitch: ${e.message}`);
      setPitchMotor('');
    }
    setPitchCargando(false);
  };

  const guardar = async (negocio, pitch) => {
    const r = await api.guardarProspecto({ ...negocio, ciudad, pitch: pitch || null });
    mostrarAviso(r.duplicado ? `"${negocio.nombre}" ya estaba en tu CRM.` : `💾 "${negocio.nombre}" guardado en el CRM.`);
    cargarCrm();
  };

  const copiarPitch = async () => {
    try {
      await navigator.clipboard.writeText(pitchTexto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* sin portapapeles */ }
  };

  const cambiarEstado = async (p, estado) => {
    await api.actualizarProspecto(p.id, { estado });
    cargarCrm();
  };

  const analizarCompetencia = async (nombreParam) => {
    const nombre = (nombreParam ?? tiendaObjetivo).trim();
    if (!nombre) return;
    if (nombreParam) setTiendaObjetivo(nombreParam);
    setAnalizando(true);
    setErrorAnalisis('');
    setAnalisis(null);
    try {
      const data = await api.analisisCompetitivo({
        negocio: nombre,
        competidores: (resultado?.negocios || []).filter((n) => n.nombre !== nombre),
        rubro: resultado?.termino || tipoLibre || categoria,
        ciudad,
        miServicio
      });
      setAnalisis(data);
    } catch (e) {
      setErrorAnalisis(e.message);
    }
    setAnalizando(false);
  };

  const st = resultado?.estadisticas;

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>🔍 Prospector de Clientes</h1>
          <div className="sub">Escanea negocios reales de una zona, detecta quién necesita marketing y genera el mensaje de venta con IA.</div>
        </div>
      </div>

      {/* Formulario de escaneo */}
      <div className="tarjeta">
        <h2>📡 Escanear zona</h2>

        {/* Opción A: escribir cualquier tipo de negocio */}
        <label>✍️ Escribe el tipo de negocio (cualquiera)</label>
        <input
          value={tipoLibre}
          onChange={(e) => setTipoLibre(e.target.value)}
          placeholder="Ej: barbería, spa, ferretería, lavadero de autos, jardín infantil..."
        />
        <div style={{ fontSize: '0.75rem', color: 'var(--texto-suave)', marginTop: '-0.4rem', marginBottom: '0.85rem' }}>
          {tipoLibre.trim()
            ? `🔎 Buscaré "${tipoLibre.trim()}" en el mapa (ignora el menú de abajo).`
            : 'Déjalo vacío para usar el menú de rubros frecuentes 👇'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label>O elige un rubro frecuente</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} disabled={!!tipoLibre.trim()}>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label>Ciudad</label>
            <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ej: Medellín" />
          </div>
          <div>
            <label>País</label>
            <input value={pais} onChange={(e) => setPais(e.target.value)} placeholder="Ej: Colombia" />
          </div>
        </div>
        <label>Tu servicio (para personalizar el pitch)</label>
        <input value={miServicio} onChange={(e) => setMiServicio(e.target.value)} />

        <div style={{ fontSize: '0.75rem', color: 'var(--texto-suave)', margin: '0 0 0.85rem' }}>
          🗺️ Motor de mapas: <strong>{motorProspector === 'google-places' ? 'Google Places (tu API key activa)' : 'OpenStreetMap (gratis, sin key)'}</strong>
          {motorProspector !== 'google-places' && ' — para usar Google Maps, agrega GOOGLE_MAPS_API_KEY en backend/.env (requiere cuenta de Google Cloud con facturación).'}
        </div>

        <button className="boton" disabled={escaneando || !ciudad.trim()} onClick={escanear}>
          {escaneando ? '🛰️ Escaneando el mapa de la zona...' : '🔍 Escanear negocios'}
        </button>
        {error && <div className="alerta roja" style={{ marginTop: '0.85rem' }}>{error}</div>}
      </div>

      {aviso && <div className="alerta verde">{aviso}</div>}

      {/* Radiografía de la competencia */}
      {st && (
        <div className="tarjeta" style={{ borderLeft: '3px solid var(--cian)' }}>
          <h2>📊 Radiografía digital del rubro en la zona</h2>
          <div className="fila-kpis">
            <div className="kpi"><p className="etiqueta">Negocios escaneados</p><p className="valor">{st.total}</p></div>
            <div className="kpi"><p className="etiqueta">Con sitio web</p><p className="valor" style={{ color: 'var(--ambar)' }}>{st.pctConWeb}%</p></div>
            <div className="kpi"><p className="etiqueta">Con redes visibles</p><p className="valor" style={{ color: 'var(--ambar)' }}>{st.pctConRedes}%</p></div>
            <div className="kpi"><p className="etiqueta">Oportunidad alta</p><p className="valor" style={{ color: 'var(--verde)' }}>{st.altaOportunidad}</p></div>
            <div className="kpi"><p className="etiqueta">Contactables ya</p><p className="valor" style={{ color: 'var(--cian)' }}>{st.contactables}</p></div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--texto-suave)', margin: 0 }}>💡 {st.lectura}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--texto-suave)', marginBottom: 0 }}>
            Fuente: {resultado.motor === 'openstreetmap' ? 'OpenStreetMap (Nominatim + Overpass, gratis)' : 'Google Places API'} · Zona: {resultado.zona}
          </p>
        </div>
      )}

      {/* Mapa interactivo */}
      {resultado?.negocios?.length > 0 && (
        <div className="tarjeta" style={{ padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ margin: 0 }}>🗺️ Mapa de negocios escaneados</h2>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
              <span><span style={{ color: '#e74c3c' }}>●</span> Oportunidad alta</span>
              <span><span style={{ color: '#f39c12' }}>●</span> Media</span>
              <span><span style={{ color: '#95a5a6' }}>●</span> Baja</span>
            </div>
          </div>
          <div ref={mapaRef} style={{ height: 400, borderRadius: 8, overflow: 'hidden' }} />
          <p style={{ fontSize: '0.72rem', color: 'var(--texto-suave)', margin: '0.4rem 0 0' }}>
            📍 {resultado.negocios.filter((n) => n.lat && n.lon).length} de {resultado.negocios.length} negocios con coordenadas · Clic en un marcador para ver detalles
          </p>
        </div>
      )}

      {/* Resultados del escaneo */}
      {resultado?.negocios?.length > 0 && (
        <div className="tarjeta" style={{ padding: '0.5rem 0.75rem' }}>
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Contacto</th>
                <th>Presencia digital</th>
                <th>Oportunidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {resultado.negocios.map((n) => (
                <React.Fragment key={n.nombre}>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>{n.nombre}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--texto-suave)' }}>{n.direccion || n.categoria}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {n.telefono ? <div>📞 {n.telefono}</div> : null}
                      {n.email ? <div>✉️ {n.email}</div> : null}
                      {!n.telefono && !n.email && <span style={{ color: 'var(--texto-suave)' }}>— buscar manualmente</span>}
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>
                      <span className={`insignia ${n.web ? 'activa' : 'pausada'}`}>{n.web ? 'web ✓' : 'sin web'}</span>{' '}
                      <span className={`insignia ${(n.redes?.facebook || n.redes?.instagram) ? 'activa' : 'pausada'}`}>
                        {(n.redes?.facebook || n.redes?.instagram) ? 'redes ✓' : 'sin redes'}
                      </span>
                      {n.resenas !== undefined && <span style={{ marginLeft: 4, color: 'var(--texto-suave)' }}>{n.rating ? `⭐ ${n.rating} (${n.resenas})` : ''}</span>}
                    </td>
                    <td>
                      <strong style={{ color: colorNivel(n.nivel) }}>{n.nivel.toUpperCase()}</strong>
                      <span style={{ color: 'var(--texto-suave)', fontSize: '0.75rem' }}> ({n.score})</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button className="boton suave" onClick={() => generarPitch(n)}>💬 Pitch IA</button>
                        <button className="boton suave" onClick={() => { analizarCompetencia(n.nombre); document.getElementById('analisis-competitivo')?.scrollIntoView({ behavior: 'smooth' }); }}>📊 vs competencia</button>
                        <button className="boton suave" onClick={() => guardar(n, pitchAbierto === n.nombre ? pitchTexto : null)}>💾</button>
                      </div>
                    </td>
                  </tr>
                  {pitchAbierto === n.nombre && (
                    <tr>
                      <td colSpan={5} style={{ background: 'var(--panel-2)' }}>
                        {pitchCargando ? (
                          <span style={{ color: 'var(--texto-suave)' }}>🧠 Redactando mensaje personalizado con los datos del negocio y su competencia...</span>
                        ) : (
                          <div>
                            <div className="copy-box" style={{ borderLeftColor: 'var(--verde)' }}>{pitchTexto}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--texto-suave)' }}>
                                Motor: {pitchMotor === 'plantilla' ? '📋 Plantilla local (agrega una key de IA gratuita en .env)' : `🤖 IA (${pitchMotor})`}
                              </span>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button className="boton suave" onClick={copiarPitch}>{copiado ? '✅ Copiado' : '📋 Copiar para WhatsApp'}</button>
                                <button className="boton suave" onClick={() => guardar(n, pitchTexto)}>💾 Guardar con pitch</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Análisis competitivo en redes */}
      <div className="tarjeta" id="analisis-competitivo" style={{ borderLeft: '3px solid var(--primario)' }}>
        <h2>🔬 Análisis competitivo en redes</h2>
        <p style={{ fontSize: '0.83rem', color: 'var(--texto-suave)', marginTop: 0 }}>
          Escribe el nombre de una tienda y compárala con su competencia para diseñar estrategias.
          {resultado?.negocios?.length ? ` Se compara contra los ${resultado.negocios.length} negocios escaneados arriba.` : ' Primero escanea una zona para tener competidores.'}
        </p>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label>Nombre de la tienda a analizar</label>
            <input
              value={tiendaObjetivo}
              onChange={(e) => setTiendaObjetivo(e.target.value)}
              placeholder="Ej: Multibelleza, Cosmeticos LM, Pink Belleza..."
              style={{ marginBottom: 0 }}
            />
          </div>
          <button className="boton" disabled={analizando || !tiendaObjetivo.trim()} onClick={() => analizarCompetencia()}>
            {analizando ? '🧠 Analizando...' : '🔬 Analizar y crear estrategias'}
          </button>
        </div>

        {errorAnalisis && <div className="alerta roja" style={{ marginTop: '0.85rem' }}>{errorAnalisis}</div>}

        {analisis && (
          <div style={{ marginTop: '1.25rem' }}>
            {/* Núcleo de audiencia por red */}
            {analisis.nucleos?.length > 0 && (
              <>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>👥 Núcleo de clientes por red social</h3>
                <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
                  <table>
                    <thead>
                      <tr><th>Red</th><th>Núcleo (edad)</th><th>Perfil</th><th>Mejor para</th></tr>
                    </thead>
                    <tbody>
                      {analisis.nucleos.map((n) => (
                        <tr key={n.red}>
                          <td style={{ fontWeight: 600 }}>{n.red}</td>
                          <td style={{ color: 'var(--cian)', fontWeight: 700, whiteSpace: 'nowrap' }}>{n.nucleo}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--texto-suave)' }}>{n.perfil}</td>
                          <td style={{ fontSize: '0.8rem' }}>{n.mejorPara}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Enlaces de investigación en redes */}
            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>🔗 Investiga "{analisis.enlaces.objetivo.nombre}" y su competencia en redes</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--texto-suave)', marginTop: 0 }}>
              Clic para abrir cada red en una pestaña nueva (los datos de seguidores los verifica cada plataforma; aquí te llevamos directo al perfil).
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Negocio</th><th>Google</th><th>Facebook</th><th>Instagram</th><th>TikTok</th></tr>
                </thead>
                <tbody>
                  {[analisis.enlaces.objetivo, ...analisis.enlaces.competidores].map((e, i) => (
                    <tr key={e.nombre + i}>
                      <td style={{ fontWeight: i === 0 ? 700 : 400 }}>
                        {i === 0 ? '⭐ ' : ''}{e.nombre}
                      </td>
                      <td><a href={e.google} target="_blank" rel="noreferrer" style={{ color: 'var(--cian)' }}>🔎</a></td>
                      <td><a href={e.facebook} target="_blank" rel="noreferrer" style={{ color: 'var(--cian)' }}>📘</a></td>
                      <td><a href={e.instagram} target="_blank" rel="noreferrer" style={{ color: 'var(--cian)' }}>📸</a></td>
                      <td><a href={e.tiktok} target="_blank" rel="noreferrer" style={{ color: 'var(--cian)' }}>🎵</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Análisis estratégico con IA */}
            <h3 style={{ fontSize: '0.95rem', margin: '1.25rem 0 0.5rem' }}>🤖 Estrategias generadas</h3>
            <div className="copy-box" style={{ borderLeftColor: 'var(--primario)' }}>{analisis.analisis}</div>
            <p style={{ fontSize: '0.72rem', color: 'var(--texto-suave)', marginBottom: 0 }}>
              Motor: {analisis.motor === 'no-disponible' ? '📋 IA no disponible (configura una key gratuita en backend/.env)' : `🤖 IA (${analisis.motor})`}
            </p>
          </div>
        )}
      </div>

      {/* Mini-CRM */}
      <div className="tarjeta">
        <h2>📇 Mis prospectos ({crm.length})</h2>
        {crm.length === 0 ? (
          <p style={{ color: 'var(--texto-suave)', margin: 0 }}>Aún no has guardado prospectos. Escanea una zona y guarda los de oportunidad alta.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Ciudad</th>
                <th>Contacto</th>
                <th>Oportunidad</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {crm.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.nombre}
                    <div style={{ fontSize: '0.7rem', color: 'var(--texto-suave)' }}>{p.categoria}</div>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{p.ciudad || '—'}</td>
                  <td style={{ fontSize: '0.8rem' }}>{p.telefono || p.email || '—'}</td>
                  <td><strong style={{ color: colorNivel(p.nivel) }}>{p.nivel?.toUpperCase()}</strong></td>
                  <td>
                    <select value={p.estado} onChange={(e) => cambiarEstado(p, e.target.value)} style={{ marginBottom: 0, width: 'auto' }}>
                      {ESTADOS_CRM.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {p.estado !== 'cliente' && (
                        <button className="boton suave" title="Promover a cliente" onClick={async () => {
                          try {
                            await api.promoverProspecto(p.id);
                            mostrarAviso(`🎉 "${p.nombre}" promovido a cliente`);
                            cargarCrm();
                          } catch (e) { mostrarAviso(`Error: ${e.message}`); }
                        }}>🏆</button>
                      )}
                      <button className="boton suave peligro" onClick={async () => { await api.eliminarProspecto(p.id); cargarCrm(); }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
