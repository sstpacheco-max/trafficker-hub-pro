// src/services/metaAds.js
// Conector a Meta (Facebook/Instagram) Ads.
// Si META_ACCESS_TOKEN y META_AD_ACCOUNT_ID están configurados en .env,
// consulta la Graph API real (insights de la cuenta publicitaria).
// Si no, devuelve datos simulados (modo demo).

const credencialesConfiguradas = () =>
  Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID);

async function obtenerMetricasReales() {
  // SDK oficial: facebook-nodejs-business-sdk (require perezoso para no
  // romper el arranque si el paquete opcional no está instalado)
  const adsSdk = require('facebook-nodejs-business-sdk');
  const { FacebookAdsApi, AdAccount } = adsSdk;

  FacebookAdsApi.init(process.env.META_ACCESS_TOKEN);
  const cuenta = new AdAccount(process.env.META_AD_ACCOUNT_ID);

  const insights = await cuenta.getInsights(
    ['spend', 'purchase_roas', 'actions', 'cpm', 'frequency'],
    { date_preset: 'last_7d', level: 'account' }
  );

  const datos = insights[0] || {};
  const inversion = Number(datos.spend || 0);
  const roas = Number(datos.purchase_roas?.[0]?.value || 0);
  const compras = Number(
    (datos.actions || []).find(a => a.action_type === 'purchase')?.value || 0
  );

  const alertas = [];
  if (Number(datos.frequency || 0) > 4) {
    alertas.push(`⚠️ Meta Ads: Fatiga publicitaria detectada (Frecuencia ${datos.frequency}).`);
  }

  return {
    plataforma: 'meta',
    inversion,
    ingresos: inversion * roas,
    conversiones: compras,
    alertas,
    fuente: 'api'
  };
}

function obtenerMetricasSimuladas() {
  return {
    plataforma: 'meta',
    inversion: 890.50,
    ingresos: 2760.55,
    conversiones: 71,
    alertas: [
      '⚠️ Meta Ads: Fatiga publicitaria detectada en Anuncio A (Frecuencia > 4).'
    ],
    fuente: 'simulado'
  };
}

async function obtenerMetricas() {
  if (!credencialesConfiguradas()) return obtenerMetricasSimuladas();
  try {
    return await obtenerMetricasReales();
  } catch (error) {
    console.error('Meta Ads API falló, usando datos simulados:', error.message);
    return obtenerMetricasSimuladas();
  }
}

module.exports = { obtenerMetricas, credencialesConfiguradas };
