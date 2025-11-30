# ReBoss NextGen Backend - MASTERPLAN

## Ziel
- **Schrittweise Implementierung** mit Tests nach jedem Schritt
- **KEIN Timeout-Limit** - Jobs können beliebig lange laufen (auch 24h+)
- **Parallele Shop-Verarbeitung** - 20+ Shops gleichzeitig via AsyncIO
- **Einmal aufsetzen** - neue Shops werden automatisch verarbeitet

---

## Bereits erstellte Frontend-Komponenten

### Pages (`/src/pages/`)
| Datei | Status | Beschreibung |
|-------|--------|--------------|
| `Login.tsx` | ✅ Fertig | Anmeldung mit Supabase Auth |
| `Register.tsx` | ✅ Fertig | Registrierung mit Passwort-Validierung |
| `ForgotPassword.tsx` | ✅ Fertig | Passwort zurücksetzen |
| `Dashboard.tsx` | ✅ Fertig | Haupt-Dashboard mit Sidebar + Shop-Ansicht |

### Components (`/src/components/`)
| Datei | Status | Beschreibung |
|-------|--------|--------------|
| `AddShopDialog.tsx` | ✅ Fertig | Shop hinzufügen mit Shopify Scopes |
| `ProtectedRoute.tsx` | ✅ Fertig | Auth-Guard für Routes |

### Components (`/components/`)
| Datei | Status | Beschreibung |
|-------|--------|--------------|
| `Sidebar.tsx` | ✅ Fertig | Navigation + Shop-Liste |
| `ShopDashboard.tsx` | ✅ Fertig | Shop-Detail-Ansicht mit Tabs |
| `WelcomeView.tsx` | ✅ Fertig | Willkommens-Ansicht ohne Shop |

### Tabs (`/components/tabs/`)
| Datei | Status | Beschreibung |
|-------|--------|--------------|
| `AnalyticsDashboard.tsx` | ✅ UI Fertig | Verkaufs-Analytics |
| `StartPhase.tsx` | ✅ UI Fertig | Start-Phase Regeln (7 Tage) |
| `PostPhase.tsx` | ✅ UI Fertig | Nach-Phase Regeln (14 Tage) |
| `ProductCreation.tsx` | ✅ UI Fertig | Produkterstellung-Einstellungen |
| `PodIntelligence.tsx` | ✅ UI Fertig | POD AI Konfiguration |
| `PinterestSync.tsx` | ⚠️ UI Fertig | Pinterest Integration (braucht OAuth!) |
| `MetaAdsSync.tsx` | ⚠️ UI Fertig | Meta Ads (braucht OAuth!) |
| `GoogleAdsManager.tsx` | ⚠️ UI Fertig | Google Ads (braucht OAuth!) |
| `GeneralSettings.tsx` | ✅ UI Fertig | Allgemeine Einstellungen |
| `RateLimits.tsx` | ✅ UI Fertig | Rate Limit Konfiguration |
| `AutomationRoi.tsx` | ✅ UI Fertig | ROI Tracking |
| `MarketingAnalytics.tsx` | ✅ UI Fertig | Marketing Analytics |

### UI Components (`/components/ui/`)
| Datei | Status |
|-------|--------|
| `Card.tsx` | ✅ Fertig |
| `Badge.tsx` | ✅ Fertig |
| `ThresholdCalculator.tsx` | ✅ Fertig |

### Hooks & Libs (`/src/`)
| Datei | Status | Beschreibung |
|-------|--------|--------------|
| `hooks/useShops.ts` | ⚠️ Braucht API | Shopify-Calls brauchen Proxy |
| `lib/supabase.ts` | ✅ Fertig | Supabase Client |
| `lib/store.ts` | ✅ Fertig | Zustand Store |
| `lib/database.types.ts` | ✅ Fertig | TypeScript Types |
| `contexts/AuthContext.tsx` | ✅ Fertig | Auth Context |

---

## Was fehlt noch?

### Backend (Phase 1)
- [ ] **Render API Service** - Shopify Proxy (CORS lösen)
- [ ] **Pinterest OAuth** - Token-Austausch
- [ ] **Meta OAuth** - Token-Austausch
- [ ] **Google OAuth** - Token-Austausch

### Cron Jobs (Phase 2)
- [ ] **sales_tracker** - Verkaufsdaten sammeln
- [ ] **replace_job** - Produkte ersetzen
- [ ] **product_optimize** - GPT-4 Optimierung
- [ ] **product_creation** - Produkte erstellen
- [ ] **pinterest_sync** - Pinterest Kampagnen

---

## Übersicht

| Phase | Inhalt | Kosten |
|-------|--------|--------|
| **Phase 1** | Render API Service + Frontend-Grundfunktionen | $7/Mo |
| **Phase 2** | 5 Cron Jobs migrieren (parallel, async) | $5/Mo |
| **Gesamt** | | **$12/Mo** |

**Nur diese 5 Jobs werden migriert:**
1. sales_tracker
2. replace_job
3. product_optimize_job
4. Product Creation Job
5. Pinterest_kollektion_sync_job

---

## Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Frontend (Vercel)                       │
│                 + Supabase (Auth, Database)                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
     ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
     │ Render       │   │ Supabase     │   │ Supabase     │
     │ Web Service  │   │ PostgreSQL   │   │ Auth         │
     │ (API Proxy)  │   │ (Daten)      │   │              │
     │ $7/Mo        │   │ $0-25/Mo     │   │              │
     └──────────────┘   └──────────────┘   └──────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Render Cron Jobs ($1/Mo je)                    │
│                   KEIN TIMEOUT - läuft bis fertig!               │
│                                                                  │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│   │sales_track │ │replace_job │ │prod_optim  │ │pinterest   │   │
│   │  02:00 UTC │ │  04:00 UTC │ │  08:00 UTC │ │  alle 4h   │   │
│   └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                  │
│   ┌────────────┐                                                │
│   │prod_create │                                                │
│   │  06:00 UTC │                                                │
│   └────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Warum Render statt Cloud Run?

| Aspekt | Cloud Run Jobs | Render |
|--------|---------------|--------|
| **Timeout** | Max 24 Stunden | **KEIN LIMIT** |
| **Setup pro Shop** | Manuell | Automatisch |
| **Cron Jobs** | Cloud Scheduler extra | Eingebaut |
| **Kosten** | Variabel | Fix $12/Mo |

---

# PHASE 1: API Service + Frontend

## Schritt 1.1: Render API Service erstellen

**Erstelle:** `/backend/api/`

```
/backend/
└── api/
    ├── main.py
    ├── requirements.txt
    └── routes/
        ├── __init__.py
        ├── shopify.py
        └── pinterest_oauth.py
```

**main.py:**
```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

**requirements.txt:**
```
flask==3.0.0
flask-cors==4.0.0
gunicorn==21.2.0
requests==2.31.0
supabase==2.0.0
```

### ✅ Test:
- [ ] `curl https://reboss-api.onrender.com/health` → `{"status": "ok"}`

---

## Schritt 1.2: Shopify Verbindungstest

**routes/shopify.py:**
```python
from flask import Blueprint, request, jsonify
import requests

shopify_bp = Blueprint('shopify', __name__)

@shopify_bp.route('/api/shopify/test-connection', methods=['POST'])
def test_connection():
    data = request.json
    shop_domain = data['shop_domain']
    access_token = data['access_token']

    # Domain bereinigen
    shop_domain = shop_domain.replace('https://', '').replace('http://', '').rstrip('/')
    if not shop_domain.endswith('.myshopify.com'):
        shop_domain = f"{shop_domain}.myshopify.com"

    response = requests.get(
        f'https://{shop_domain}/admin/api/2023-10/shop.json',
        headers={'X-Shopify-Access-Token': access_token}
    )

    if response.ok:
        return jsonify({'success': True, 'shop': response.json()['shop']})
    else:
        return jsonify({'success': False, 'error': response.text}), 400
```

**Frontend anpassen** (`src/hooks/useShops.ts`):
```typescript
// Ändere testShopifyConnection zu:
const API_URL = import.meta.env.VITE_API_URL || 'https://reboss-api.onrender.com'

async function testShopifyConnection(shopDomain: string, accessToken: string) {
  const response = await fetch(`${API_URL}/api/shopify/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shop_domain: shopDomain, access_token: accessToken })
  })
  return response.json()
}
```

### ✅ Test:
- [ ] Shop hinzufügen Dialog öffnen
- [ ] Shopify Credentials eingeben
- [ ] "Verbindung testen" → Erfolg (kein CORS Fehler!)
- [ ] Shop wird in Supabase gespeichert

---

## Schritt 1.3: Pinterest OAuth

**routes/pinterest_oauth.py:**
```python
from flask import Blueprint, request, redirect, jsonify
import requests
import os
import secrets

pinterest_bp = Blueprint('pinterest', __name__)

PINTEREST_APP_ID = os.environ['PINTEREST_APP_ID']
PINTEREST_APP_SECRET = os.environ['PINTEREST_APP_SECRET']
API_URL = os.environ['API_URL']  # https://reboss-api.onrender.com
FRONTEND_URL = os.environ['FRONTEND_URL']  # https://reboss.app

# Temporärer State-Speicher (in Produktion: Redis)
oauth_states = {}

@pinterest_bp.route('/api/oauth/pinterest/authorize')
def authorize():
    shop_id = request.args.get('shop_id')
    state = f"{shop_id}:{secrets.token_urlsafe(16)}"
    oauth_states[state] = shop_id

    auth_url = (
        f"https://www.pinterest.com/oauth/?"
        f"response_type=code&"
        f"client_id={PINTEREST_APP_ID}&"
        f"redirect_uri={API_URL}/api/oauth/pinterest/callback&"
        f"scope=ads:read,ads:write,boards:read,pins:read&"
        f"state={state}"
    )
    return redirect(auth_url)

@pinterest_bp.route('/api/oauth/pinterest/callback')
def callback():
    code = request.args.get('code')
    state = request.args.get('state')

    if state not in oauth_states:
        return redirect(f"{FRONTEND_URL}?error=invalid_state")

    shop_id = oauth_states.pop(state)

    # Code gegen Tokens tauschen
    token_response = requests.post(
        'https://api.pinterest.com/v5/oauth/token',
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': f"{API_URL}/api/oauth/pinterest/callback"
        },
        auth=(PINTEREST_APP_ID, PINTEREST_APP_SECRET)
    )

    tokens = token_response.json()

    # Tokens in Supabase speichern
    from supabase import create_client
    supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

    supabase.table('pinterest_auth').upsert({
        'shop_id': shop_id,
        'access_token': tokens['access_token'],
        'refresh_token': tokens['refresh_token']
    }).execute()

    return redirect(f"{FRONTEND_URL}/shops/{shop_id}?pinterest=connected")
```

### ✅ Test:
- [ ] "Pinterest verbinden" Button klicken
- [ ] Redirect zu Pinterest
- [ ] Bei Pinterest einloggen
- [ ] Redirect zurück zum Frontend
- [ ] Pinterest Status zeigt "Verbunden"

---

## Schritt 1.4: Collections laden

**routes/shopify.py (erweitern):**
```python
@shopify_bp.route('/api/shopify/get-collections', methods=['POST'])
def get_collections():
    data = request.json
    shop_domain = data['shop_domain']
    access_token = data['access_token']

    # Custom Collections
    custom = requests.get(
        f'https://{shop_domain}/admin/api/2023-10/custom_collections.json',
        headers={'X-Shopify-Access-Token': access_token}
    ).json()

    # Smart Collections
    smart = requests.get(
        f'https://{shop_domain}/admin/api/2023-10/smart_collections.json',
        headers={'X-Shopify-Access-Token': access_token}
    ).json()

    collections = custom.get('custom_collections', []) + smart.get('smart_collections', [])
    return jsonify({'collections': collections})
```

### ✅ Test:
- [ ] Shop-Dashboard öffnen
- [ ] Collections Tab zeigt Shopify-Kollektionen
- [ ] Collections können ausgewählt werden

---

# PHASE 2: Cron Jobs migrieren

## Schritt 2.0: Supabase Tabellen erstellen

```sql
-- Job-Ausführungslog
CREATE TABLE public.job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  shops_processed INTEGER DEFAULT 0,
  shops_failed INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '[]'
);

-- Shop-spezifischer Job-Status
CREATE TABLE public.shop_job_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_status TEXT,
  last_error TEXT,
  UNIQUE(shop_id, job_type)
);

-- Indices
CREATE INDEX idx_job_runs_type ON job_runs(job_type);
CREATE INDEX idx_shop_job_status_shop ON shop_job_status(shop_id);
```

### ✅ Test:
- [ ] Tabellen in Supabase erstellt
- [ ] RLS Policies aktiv

---

## Schritt 2.1: sales_tracker migrieren

**Erstelle:** `/backend/jobs/sales_tracker/`

```
/backend/jobs/sales_tracker/
├── main.py
├── requirements.txt
└── Dockerfile
```

**main.py (Orchestrator mit AsyncIO):**
```python
import asyncio
import os
from datetime import datetime
from supabase import create_client

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']
PARALLEL_SHOPS = 20

async def process_shop(shop: dict, supabase) -> dict:
    """Verarbeitet einen einzelnen Shop"""
    try:
        # === BESTEHENDE SALES_TRACKER LOGIK HIER ===
        # Kopiere aus: /Google Cloud Run Jobs/sales_tracker/main.py
        # Ersetze Firestore mit Supabase
        # ============================================

        # Status updaten
        supabase.table('shop_job_status').upsert({
            'shop_id': shop['id'],
            'job_type': 'sales_tracker',
            'last_run_at': datetime.utcnow().isoformat(),
            'last_status': 'success'
        }).execute()

        return {'shop_id': shop['id'], 'status': 'success'}

    except Exception as e:
        supabase.table('shop_job_status').upsert({
            'shop_id': shop['id'],
            'job_type': 'sales_tracker',
            'last_run_at': datetime.utcnow().isoformat(),
            'last_status': 'failed',
            'last_error': str(e)
        }).execute()

        return {'shop_id': shop['id'], 'status': 'failed', 'error': str(e)}

async def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Job-Run starten
    job_run = supabase.table('job_runs').insert({
        'job_type': 'sales_tracker',
        'status': 'running'
    }).execute()
    job_run_id = job_run.data[0]['id']

    print(f"Job gestartet: {job_run_id}")

    # Alle aktiven Shops laden
    shops = supabase.table('shops') \
        .select('*') \
        .eq('connection_status', 'connected') \
        .execute()

    print(f"Verarbeite {len(shops.data)} Shops in Batches von {PARALLEL_SHOPS}")

    results = []

    # In Batches von 20 parallel verarbeiten
    for i in range(0, len(shops.data), PARALLEL_SHOPS):
        batch = shops.data[i:i + PARALLEL_SHOPS]
        batch_results = await asyncio.gather(
            *[process_shop(shop, supabase) for shop in batch],
            return_exceptions=True
        )
        results.extend(batch_results)
        print(f"Batch {i//PARALLEL_SHOPS + 1} fertig: {len(batch)} Shops")

    # Job-Run abschließen
    success = sum(1 for r in results if isinstance(r, dict) and r.get('status') == 'success')
    failed = sum(1 for r in results if isinstance(r, dict) and r.get('status') == 'failed')

    supabase.table('job_runs').update({
        'status': 'completed',
        'completed_at': datetime.utcnow().isoformat(),
        'shops_processed': success,
        'shops_failed': failed
    }).eq('id', job_run_id).execute()

    print(f"Job abgeschlossen: {success} erfolgreich, {failed} fehlgeschlagen")

if __name__ == '__main__':
    asyncio.run(main())
```

**render.yaml (für diesen Job):**
```yaml
- type: cron
  name: sales-tracker
  runtime: python
  schedule: "0 2 * * *"
  buildCommand: pip install -r requirements.txt
  startCommand: python main.py
  envVars:
    - key: SUPABASE_URL
      sync: false
    - key: SUPABASE_SERVICE_KEY
      sync: false
```

### ✅ Test:
- [ ] Cron Job manuell in Render triggern
- [ ] Logs zeigen "Verarbeite X Shops in Batches von 20"
- [ ] `job_runs` Tabelle zeigt Erfolg
- [ ] `shop_job_status` zeigt pro-Shop Status

---

## Schritt 2.2-2.5: Weitere Jobs

**Gleiche Struktur für jeden Job:**

| Job | Schedule | Parallelität | Besonderheit |
|-----|----------|--------------|--------------|
| replace_job | `0 4 * * *` | 20 | - |
| product_optimize | `0 8 * * *` | 5 | GPT-4 Rate Limits! |
| product_creation | `0 6 * * *` | 10 | - |
| pinterest_sync | `0 */4 * * *` | 10 | OAuth Tokens nötig |

---

## Deployment-Struktur (Final)

```
/backend/
├── api/                          # Render Web Service ($7/Mo)
│   ├── main.py
│   ├── requirements.txt
│   └── routes/
│       ├── shopify.py
│       └── pinterest_oauth.py
│
├── jobs/                         # Render Cron Jobs ($1/Mo je)
│   ├── sales_tracker/
│   │   ├── main.py
│   │   └── requirements.txt
│   ├── replace_job/
│   ├── product_optimize/
│   ├── product_creation/
│   └── pinterest_sync/
│
└── render.yaml                   # Infrastructure as Code
```

---

## Render Blueprint (render.yaml)

```yaml
services:
  # API Service
  - type: web
    name: reboss-api
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn main:app
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: PINTEREST_APP_ID
        sync: false
      - key: PINTEREST_APP_SECRET
        sync: false
      - key: FRONTEND_URL
        sync: false
    plan: starter

  # Cron Jobs
  - type: cron
    name: sales-tracker
    runtime: python
    schedule: "0 2 * * *"
    buildCommand: cd jobs/sales_tracker && pip install -r requirements.txt
    startCommand: python jobs/sales_tracker/main.py
    plan: starter

  - type: cron
    name: replace-job
    runtime: python
    schedule: "0 4 * * *"
    buildCommand: cd jobs/replace_job && pip install -r requirements.txt
    startCommand: python jobs/replace_job/main.py
    plan: starter

  - type: cron
    name: product-optimize
    runtime: python
    schedule: "0 8 * * *"
    buildCommand: cd jobs/product_optimize && pip install -r requirements.txt
    startCommand: python jobs/product_optimize/main.py
    plan: starter

  - type: cron
    name: product-creation
    runtime: python
    schedule: "0 6 * * *"
    buildCommand: cd jobs/product_creation && pip install -r requirements.txt
    startCommand: python jobs/product_creation/main.py
    plan: starter

  - type: cron
    name: pinterest-sync
    runtime: python
    schedule: "0 */4 * * *"
    buildCommand: cd jobs/pinterest_sync && pip install -r requirements.txt
    startCommand: python jobs/pinterest_sync/main.py
    plan: starter
```

---

## Kosten-Zusammenfassung

| Komponente | Monatlich |
|------------|-----------|
| Render Web Service (API) | $7 |
| Render Cron Jobs (5 × $1) | $5 |
| **Render Gesamt** | **$12/Mo** |
| Supabase (Free bis 500MB) | $0 |
| Supabase (Pro ab 100 Shops) | $25 |
| **Total** | **$12-37/Mo** |

**Egal ob 10 oder 1000 Shops - Render kostet immer $12/Mo!**

---

## Checkliste

### Phase 1
- [ ] 1.1: Render API Service mit `/health`
- [ ] 1.2: Shopify Verbindungstest funktioniert
- [ ] 1.3: Pinterest OAuth funktioniert
- [ ] 1.4: Collections laden funktioniert

### Phase 2
- [ ] 2.0: Supabase Tabellen erstellt
- [ ] 2.1: sales_tracker migriert
- [ ] 2.2: replace_job migriert
- [ ] 2.3: product_optimize migriert
- [ ] 2.4: product_creation migriert
- [ ] 2.5: pinterest_sync migriert

### Abschluss
- [ ] Alle Tests bestanden
- [ ] Alte Cloud Run Jobs gelöscht
- [ ] Monitoring eingerichtet
