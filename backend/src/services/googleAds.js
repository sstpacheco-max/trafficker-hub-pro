// src/services/googleAds.js
// Conector a Google Ads. Usa el paquete google-ads-api cuando hay
// credenciales completas en .env; de lo contrario, datos simulados.

const credencialesConfiguradas = () =>
  Boolean(
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN &&
    process.env.GOOGLE_ADS_CUSTOMER_ID
  );

async function obtenerMetricasReales() {
  const { GoogleAdsApi } = require('google-ads-api');

  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  });

  const customer = client.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN
  });

  const filas = await customer.query(`
    SELECT
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM customer
    WHERE segments.date DURING LAST_7_DAYS
  `);

  let inversion = 0, conversiones = 0, ingresos = 0;
  for (const fila of filas) {
    inversion += Number(fila.metrics.cost_micros || 0) / 1_000_000;
    conversiones += Number(fila.metrics.conversions || 0);
    ingresos += Number(fila.metrics.conversions_value || 0);
  }

  return {
    plataforma: 'google',
    inversion,
    ingresos,
    conversiones: Math.round(conversiones),
    alertas: [],
    fuente: 'api'
  };
}

function obtenerMetricasSimuladas() {
  return {
    plataforma: 'google',
    inversion: 650.00,
    ingresos: 2169.05,
    conversiones: 52,
    alertas: [
      '✅ Google Ads: CPA de Búsqueda bajó un 15% hoy. Sugerencia: Escalar presupuesto.'
    ],
    fuente: 'simulado'
  };
}

async function obtenerMetricas() {
  if (!credencialesConfiguradas()) return obtenerMetricasSimuladas();
  try {
    return await obtenerMetricasReales();
  } catch (error) {
    console.error('Google Ads API falló, usando datos simulados:', error.message);
    return obtenerMetricasSimuladas();
  }
}

module.exports = { obtenerMetricas, credencialesConfiguradas };
