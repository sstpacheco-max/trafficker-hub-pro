# ⚡ Trafficker Hub Pro

Centro de mando para traffickers: analítica omnicanal (Meta + Google Ads), copywriter neuronal con IA (método AIDA) y base de datos con histórico y proyecciones de ventas.

## Estructura

```
trafficker-hub-pro/
├── backend/                  # MCP Server (Express + SQLite)
│   ├── server.js             # Rutas de la API
│   ├── .env.example          # Plantilla de credenciales
│   └── src/
│       ├── db.js             # Base de datos (node:sqlite) + proyecciones
│       └── services/
│           ├── metaAds.js    # Conector Meta Graph API (real o demo)
│           ├── googleAds.js  # Conector Google Ads API (real o demo)
│           └── copywriter.js # IA OpenAI (real o demo)
└── frontend/                 # Dashboard React + Vite
```

## Cómo correr

**Backend** (puerto 5000):
```powershell
cd backend
npm install
npm run dev
```

**Frontend** (puerto 5173):
```powershell
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173 — el frontend tiene proxy a `/api`, no hay problemas de CORS.

## Modo demo vs. modo real

Sin configuración, todo funciona con **datos simulados** (verás insignias "demo" en el dashboard).
Para conectar las APIs reales:

1. Copia `backend/.env.example` como `backend/.env`.
2. Completa las credenciales que tengas (puedes conectar solo una plataforma):
   - **Meta Ads**: `META_ACCESS_TOKEN` (permiso `ads_read`) y `META_AD_ACCOUNT_ID`.
   - **Google Ads**: client id/secret, developer token, refresh token y customer id.
3. Reinicia el backend. Si una API falla, el sistema cae automáticamente a modo demo sin romperse.

## IA gratuita (copywriter + análisis estratégico)

El motor de IA (`src/services/ia.js`) prueba proveedores en cascada y usa el primero que responda:

1. **Google Gemini** — GRATIS, key en 2 min: https://aistudio.google.com/apikey
2. **Groq** (Llama 3.3 70B) — GRATIS: https://console.groq.com/keys
3. **OpenRouter** (modelos `:free`) — GRATIS: https://openrouter.ai/keys
4. **OpenAI** — de pago, opcional
5. **Ollama** — gratis y 100% local (`ollama pull llama3.2` + descomentar en `.env`)
6. **Pollinations.ai** — sin registro, último recurso automático

Pega una sola key en `backend/.env`, reinicia, y tanto el **Copywriter** como el
**Análisis del Estratega IA** (lectura de mercado, riesgos, oportunidades y ganchos
creativos por jurisdicción) pasan de plantillas a IA real.

## Base de datos

SQLite (archivo en `backend/data/trafficker.db`, se crea solo). Tablas:

- `clientes` — cartera de clientes y presupuestos (`GET/POST /api/clientes`)
- `metricas_historicas` — snapshot de cada consulta de métricas (`GET /api/historico`)
- `copies_generados` — histórico de anuncios generados (`GET /api/mcp/copies`)

Las **proyecciones de ventas** (`GET /api/proyecciones?dias=7`) usan regresión lineal sobre el histórico global. Para migrar a PostgreSQL solo hay que reescribir `src/db.js` manteniendo las mismas funciones exportadas.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/metricas-globales` | KPIs consolidados Meta + Google y alertas |
| POST | `/api/mcp/generar-copy` | Genera copy AIDA (`{producto, avatar, dolor}`) |
| GET | `/api/mcp/copies` | Últimos copies generados |
| GET | `/api/clientes` / POST | Cartera de clientes |
| GET | `/api/historico` | Métricas históricas |
| GET | `/api/proyecciones?dias=7` | Proyección de ingresos |
| GET | `/api/estado` | Qué integraciones están en modo real o demo |
