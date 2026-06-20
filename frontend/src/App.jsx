// App.jsx — Shell de la aplicación: sidebar + navegación entre módulos
import React, { useState, useEffect } from 'react';
import { api } from './api';
import Dashboard from './pages/Dashboard.jsx';
import Estratega from './pages/Estratega.jsx';
import Prospector from './pages/Prospector.jsx';
import Campanias from './pages/Campanias.jsx';
import Copywriter from './pages/Copywriter.jsx';
import Clientes from './pages/Clientes.jsx';

class LimiteErrores extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="alerta roja" style={{ margin: '2rem' }}>
          <strong>Error en la interfaz:</strong> {String(this.state.error?.message || this.state.error)}
          <pre style={{ fontSize: '0.7rem', whiteSpace: 'pre-wrap' }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const MODULOS = [
  { id: 'dashboard', icono: '📊', nombre: 'Centro de Mando' },
  { id: 'estratega', icono: '🧭', nombre: 'Estratega' },
  { id: 'prospector', icono: '🔍', nombre: 'Prospector' },
  { id: 'campanias', icono: '🎯', nombre: 'Campañas' },
  { id: 'copywriter', icono: '🎬', nombre: 'Creador Comerciales' },
  { id: 'clientes', icono: '👥', nombre: 'Clientes' }
];

export default function App() {
  const [modulo, setModulo] = useState('dashboard');
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    api.estado().then(setEstado).catch(() => {});
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">⚡ TRAFFICKER HUB PRO</div>
        {MODULOS.map((m) => (
          <button
            key={m.id}
            className={`nav-item ${modulo === m.id ? 'activo' : ''}`}
            onClick={() => setModulo(m.id)}
          >
            <span>{m.icono}</span> {m.nombre}
          </button>
        ))}

        <div className="sidebar-footer">
          {estado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div>Meta Ads <span className={`insignia ${estado.metaAds}`}>{estado.metaAds}</span></div>
              <div>Google Ads <span className={`insignia ${estado.googleAds}`}>{estado.googleAds}</span></div>
              <div title={estado.iaProveedor}>IA <span className={`insignia ${estado.ia}`}>{estado.ia}</span></div>
              {estado.iaProveedor && (
                <div style={{ fontSize: '0.68rem', lineHeight: 1.4 }}>{estado.iaProveedor}</div>
              )}
            </div>
          )}
        </div>
      </aside>

      <main className="contenido">
        <LimiteErrores key={modulo}>
          {modulo === 'dashboard' && <Dashboard />}
          {modulo === 'estratega' && <Estratega />}
          {modulo === 'prospector' && <Prospector />}
          {modulo === 'campanias' && <Campanias />}
          {modulo === 'copywriter' && <Copywriter />}
          {modulo === 'clientes' && <Clientes />}
        </LimiteErrores>
      </main>
    </div>
  );
}
