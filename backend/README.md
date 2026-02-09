# POD AutoM Backend

FastAPI Backend für die POD AutoM Automatisierungs-Plattform.

## Struktur

```
backend/
├── api/
│   ├── main.py              # FastAPI App
│   ├── auth.py              # Auth Middleware (Supabase JWT)
│   └── routes/
│       ├── health.py        # Health Checks
│       ├── shopify.py       # Shopify OAuth & API
│       ├── pinterest.py     # Pinterest OAuth & API
│       ├── niches.py        # Nischen CRUD
│       ├── products.py      # Produkt-Queue
│       └── generation.py    # GPT Design Generation
├── services/
│   ├── supabase_service.py  # Database Operations
│   ├── openai_service.py    # GPT Image & Text
│   └── mockup_service.py    # Design auf Produkt
├── jobs/                    # Cron Jobs (TODO)
├── assets/                  # Mockup Templates (TODO)
├── config.py                # Settings & Environment
├── requirements.txt         # Dependencies
└── .env.example             # Environment Template
```

## Setup

### 1. Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
```

### 2. Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

### 3. Run Development Server

```bash
uvicorn api.main:app --reload --port 8000
```

API Docs: http://localhost:8000/docs

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase Project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ | For server-side operations |
| `SHOPIFY_CLIENT_ID` | ✅ | Shopify App Client ID |
| `SHOPIFY_CLIENT_SECRET` | ✅ | Shopify App Secret |
| `OPENAI_API_KEY` | ✅ | OpenAI API Key |
| `PINTEREST_CLIENT_ID` | ❌ | Pinterest App ID |
| `PINTEREST_CLIENT_SECRET` | ❌ | Pinterest Secret |

## API Endpoints

### Health
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check

### Shopify
- `POST /api/shopify/oauth/start` - Start OAuth flow
- `GET /api/shopify/oauth/callback` - OAuth callback
- `GET /api/shopify/shops` - List connected shops
- `DELETE /api/shopify/shops/{id}` - Disconnect shop

### Niches
- `GET /api/niches/{settings_id}` - List niches
- `POST /api/niches/{settings_id}` - Create niche
- `PUT /api/niches/{settings_id}/{id}` - Update niche
- `DELETE /api/niches/{settings_id}/{id}` - Delete niche

### Generation
- `POST /api/generate/design` - Generate design with GPT Image
- `POST /api/generate/title` - Generate product title
- `POST /api/generate/description` - Generate description
- `POST /api/generate/mockup` - Create product mockup

## Deployment

See `render.yaml` in project root for Render deployment configuration.

```bash
# Manual deployment
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port $PORT
```
