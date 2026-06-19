// api.js — cliente HTTP del Hub (proxy de Vite redirige /api al backend)
async function manejar(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const api = {
  metricas: () => fetch('/api/metricas-globales').then(manejar),
  estado: () => fetch('/api/estado').then(manejar),
  historico: () => fetch('/api/historico?limite=30').then(manejar),
  proyecciones: (dias = 7) => fetch(`/api/proyecciones?dias=${dias}`).then(manejar),

  campanias: () => fetch('/api/campanias').then(manejar),
  actualizarCampania: (id, campos) =>
    fetch(`/api/campanias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campos)
    }).then(manejar),

  generarCopy: (datos) =>
    fetch('/api/mcp/generar-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    }).then(manejar),
  copies: () => fetch('/api/mcp/copies?limite=10').then(manejar),

  analizarJurisdiccion: (datos) =>
    fetch('/api/inteligencia/jurisdiccion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    }).then(manejar),
  generarPlan: (brief) =>
    fetch('/api/planes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brief)
    }).then(manejar),
  planes: () => fetch('/api/planes?limite=10').then(manejar),

  categoriasProspector: () => fetch('/api/prospector/categorias').then(manejar),
  buscarNegocios: (datos) =>
    fetch('/api/prospector/buscar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    }).then(manejar),
  generarPitch: (datos) =>
    fetch('/api/prospector/pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    }).then(manejar),
  analisisCompetitivo: (datos) =>
    fetch('/api/prospector/analisis-competitivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    }).then(manejar),
  prospectos: () => fetch('/api/prospectos').then(manejar),
  guardarProspecto: (p) =>
    fetch('/api/prospectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    }).then(manejar),
  actualizarProspecto: (id, campos) =>
    fetch(`/api/prospectos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campos)
    }).then(manejar),
  eliminarProspecto: (id) => fetch(`/api/prospectos/${id}`, { method: 'DELETE' }),

  clientes: () => fetch('/api/clientes').then(manejar),
  crearCliente: (datos) =>
    fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    }).then(manejar),
  eliminarCliente: (id) => fetch(`/api/clientes/${id}`, { method: 'DELETE' })
};
