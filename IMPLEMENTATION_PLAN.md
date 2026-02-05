# POD AutoM - Implementierungsplan

> Erstellt: 2026-02-03  
> Status: Frontend fertig, Backend fehlt

---

## 📊 Übersicht

| Bereich | Status | Aufwand |
|---------|--------|---------|
| Frontend UI | ✅ 100% | - |
| Supabase Schema | ✅ 100% | - |
| Auth (Email/OAuth) | ✅ 90% | 2h |
| Shopify Integration | ❌ 0% | 1-2 Tage |
| Pinterest Integration | ❌ 0% | 1-2 Tage |
| GPT/Design Generation | ❌ 0% | 1 Tag |
| Cron Jobs | ❌ 0% | 2-3 Tage |
| Onboarding Flow | 🔶 50% | 1 Tag |
| Testing & Polish | ❌ 0% | 1-2 Tage |

**Geschätzter Gesamtaufwand: 8-12 Tage**

---

## 🎯 Phase 1: OAuth & Verbindungen (Priorität: HOCH)

### 1.1 Shopify App erstellen
**Aufwand: 4-6 Stunden**

- [ ] Shopify Partner Account (falls nicht vorhanden)
- [ ] Custom App erstellen in Shopify Partner Dashboard
- [ ] Scopes definieren:
  - `read_products`, `write_products`
  - `read_orders`
  - `read_inventory`, `write_inventory`
- [ ] OAuth Callback URL: `https://pod-autom.de/auth/shopify/callback`
- [ ] Credentials in `.env` speichern:
  ```
  SHOPIFY_CLIENT_ID=xxx
  SHOPIFY_CLIENT_SECRET=xxx
  ```

### 1.2 Shopify OAuth Flow implementieren
**Aufwand: 4-6 Stunden**

```
Frontend                    Backend                     Shopify
   |                           |                           |
   |-- "Shop verbinden" ------>|                           |
   |                           |-- OAuth URL generieren -->|
   |<-- Redirect zu Shopify ---|                           |
   |                           |                           |
   |---------------------------|-- User autorisiert ----->|
   |                           |                           |
   |                           |<-- Callback + Code -------|
   |                           |-- Token Exchange -------->|
   |                           |<-- Access Token ----------|
   |                           |-- Token in Supabase ----->|
   |<-- Erfolg! Shop verbunden-|                           |
```

**Dateien:**
- `backend/api/shopify/oauth.py` - OAuth Endpoints
- `src/pages/ShopifyCallback.tsx` - Frontend Callback Handler
- Supabase: `pod_autom_shops.access_token` speichern

### 1.3 Pinterest OAuth Flow
**Aufwand: 4-6 Stunden**

- [ ] Pinterest Developer App erstellen
- [ ] OAuth 2.0 Flow implementieren
- [ ] Scopes: `boards:read`, `pins:read`, `pins:write`, `ads:read`, `ads:write`
- [ ] Token Refresh Logic (Pinterest Tokens laufen ab!)

**Dateien:**
- `backend/api/pinterest/oauth.py`
- `src/pages/PinterestCallback.tsx`
- Supabase: `pod_autom_ad_platforms` Tabelle nutzen

---

## 🎯 Phase 2: Backend API (Priorität: HOCH)

### 2.1 API Struktur
**Aufwand: 1 Tag**

```
backend/
├── api/
│   ├── __init__.py
│   ├── main.py                 # FastAPI App
│   ├── auth/
│   │   └── middleware.py       # Supabase JWT Verification
│   ├── shopify/
│   │   ├── oauth.py
│   │   ├── products.py
│   │   └── collections.py
│   ├── pinterest/
│   │   ├── oauth.py
│   │   ├── pins.py
│   │   └── campaigns.py
│   ├── niches/
│   │   └── routes.py
│   ├── products/
│   │   └── routes.py
│   └── generation/
│       └── routes.py           # GPT Design Generation
```

### 2.2 Wichtigste Endpoints

```python
# Auth
POST   /api/auth/verify          # Supabase JWT prüfen

# Shopify
GET    /api/shopify/oauth/start  # OAuth starten
GET    /api/shopify/oauth/callback
GET    /api/shopify/shops        # Verbundene Shops
DELETE /api/shopify/shops/{id}   # Shop trennen

# Pinterest  
GET    /api/pinterest/oauth/start
GET    /api/pinterest/oauth/callback
GET    /api/pinterest/accounts

# Niches (bereits in Supabase, aber API für Logik)
POST   /api/niches/{settings_id}
PUT    /api/niches/{id}/generate # Produkte für Nische generieren

# Products
GET    /api/products             # Queue abrufen
POST   /api/products/generate    # Neues Produkt generieren
POST   /api/products/{id}/publish # In Shopify pushen

# Generation
POST   /api/generate/design      # GPT-4 Vision Design
POST   /api/generate/title       # GPT Titel
POST   /api/generate/description # GPT Beschreibung
```

---

## 🎯 Phase 3: Cron Jobs (Priorität: MITTEL)

### 3.1 Job-Übersicht

| Job | Intervall | Funktion |
|-----|-----------|----------|
| `product_creation_job` | Alle 6h | GPT-Designs generieren, in Queue |
| `product_publish_job` | Alle 2h | Queue → Shopify pushen |
| `pinterest_pin_job` | Alle 4h | Neue Produkte → Pinterest Pins |
| `sales_tracker_job` | Alle 1h | Shopify Orders → Analytics |
| `winner_detection_job` | Täglich | Top-Performer identifizieren |
| `winner_scaling_job` | Täglich | Winner-Kampagnen skalieren |

### 3.2 Adaption von ReBoss Jobs
**Aufwand: 2-3 Tage**

Die bestehenden ReBoss Jobs können größtenteils wiederverwendet werden:

```python
# Änderungen nötig:
# 1. Tabellennamen: shops → pod_autom_shops
# 2. Neue Felder in pod_autom_products
# 3. Subscription-Limits beachten (Basis/Premium/VIP)
```

**Von ReBoss übernehmen:**
- `product_creation_job/services/` → GPT & Shopify Services
- `pinterest_sync_job/services/` → Pinterest API Wrapper
- `sales_tracker_job/` → Analytics Logik

---

## 🎯 Phase 4: GPT Design Generation (Priorität: HOCH)

### 4.1 Flow

```
Nische + Prompt → GPT-4 → Design-Bild → Mockup → Shopify Product
```

### 4.2 Implementierung
**Aufwand: 1 Tag**

```python
# backend/services/generation_service.py

async def generate_design(niche: str, prompt: str, style: str) -> str:
    """
    Generiert ein Design mit DALL-E 3 oder Midjourney API
    Returns: URL zum generierten Bild
    """
    
async def generate_mockup(design_url: str, product_type: str) -> str:
    """
    Setzt Design auf Produkt-Mockup (T-Shirt, Hoodie, etc.)
    Optionen: Printful API, Placeit API, oder eigene Lösung
    """

async def generate_product_content(niche: str, design_url: str) -> dict:
    """
    GPT-4 generiert:
    - Titel (SEO-optimiert)
    - Beschreibung (Conversion-optimiert)
    - Tags
    """
```

### 4.3 Prompt-System

Die `pod_autom_prompts` Tabelle ist bereits da. Frontend für Prompt-Verwaltung existiert.

**Default Prompts erstellen:**
```sql
INSERT INTO pod_autom_prompts (settings_id, prompt_type, prompt_name, prompt_text, is_default)
VALUES 
  (?, 'image', 'Standard Design', 'Create a minimalist t-shirt design for {niche}. Style: modern, clean lines...', true),
  (?, 'title', 'SEO Titel', 'Erstelle einen deutschen Produkttitel für: {niche}. Max 70 Zeichen...', true),
  (?, 'description', 'Conversion Text', 'Schreibe eine Produktbeschreibung für: {niche}...', true);
```

---

## 🎯 Phase 5: Onboarding Flow verbessern (Priorität: MITTEL)

### 5.1 Aktueller Stand
- UI existiert (`src/pages/Onboarding.tsx`)
- 4 Steps: Shop → Nischen → Prompts → Ads
- Aber: Nur UI, keine echte Verbindung

### 5.2 Echtes Onboarding
**Aufwand: 1 Tag**

```
Step 1: Shopify verbinden
├── OAuth Flow starten
├── Shop auswählen
├── Verbindung testen (API Call)
└── ✅ Shop in Supabase speichern

Step 2: Nischen auswählen
├── Vorschläge anzeigen
├── Custom Nischen erlauben
├── Limit prüfen (Basis: 5, Premium: 15, VIP: ∞)
└── ✅ In Supabase speichern

Step 3: Prompts konfigurieren
├── Default Prompts laden
├── Anpassen erlauben
├── Preview generieren (1 Test-Design)
└── ✅ Speichern

Step 4: Pinterest verbinden (optional)
├── OAuth Flow
├── Ad Account auswählen
├── Budget setzen
└── ✅ Fertig!
```

---

## 🎯 Phase 6: Deployment & Hosting

### 6.1 Optionen

| Option | Frontend | Backend | Cron Jobs | Kosten |
|--------|----------|---------|-----------|--------|
| **Render** | Static Site | Web Service | Cron Jobs | ~$15-30/Mo |
| **Vercel + Railway** | Vercel | Railway | Railway | ~$20-40/Mo |
| **Eigener Server** | Nginx | Python | Systemd | VPS ~$10-20/Mo |

### 6.2 Empfehlung: Render
- Bereits `render.yaml` im Projekt
- Einfaches Deployment
- Cron Jobs integriert
- Auto-Scaling

```yaml
# render.yaml (anpassen)
services:
  - type: web
    name: pod-autom-api
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn api.main:app --host 0.0.0.0 --port $PORT
    
  - type: cron
    name: product-creation
    schedule: "0 */6 * * *"  # Alle 6 Stunden
    command: python -m jobs.product_creation_job.main
```

---

## 📋 Empfohlene Reihenfolge

### Woche 1: Fundament
1. ✅ Supabase Schema (DONE)
2. Backend API Grundstruktur aufsetzen
3. Shopify OAuth implementieren
4. Shop-Verbindung im Frontend testen

### Woche 2: Kernfunktionen
5. Pinterest OAuth
6. GPT Design Generation Service
7. Product Creation Job adaptieren
8. Onboarding Flow verbinden

### Woche 3: Automation & Polish
9. Cron Jobs deployen
10. Pinterest Sync Job
11. Sales Tracker
12. Testing & Bugfixes

---

## 🔧 Quick Wins (kann ich sofort machen)

1. **Shopify OAuth vorbereiten** - Endpoints + Frontend Callback
2. **Default Prompts in DB** - SQL Script
3. **API Grundstruktur** - FastAPI Boilerplate
4. **Onboarding echte Validierung** - Step-by-Step mit API Calls

---

## 💡 Entscheidungen die DU treffen musst

1. **Hosting**: Render, Vercel+Railway, oder eigener Server?
2. **Design Generation**: DALL-E 3, Midjourney API, oder Stable Diffusion?
3. **Mockup Service**: Printful API, Placeit, oder eigene Lösung?
4. **Domain**: pod-autom.de oder andere?
5. **Stripe Live Mode**: Wann aktivieren?

---

*Sag mir womit ich anfangen soll, Schatz! 💜*
