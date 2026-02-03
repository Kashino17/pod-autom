# POD AutoM - Vollautomatisierung WebApp Plan

## Entscheidungen
- **Datenbank**: Gleiche Supabase-Instanz wie ReBoss (separate `pod_autom_*` Tabellen)
- **Billing**: Stripe für Subscriptions
- **Fulfillment**: Eigener Dienstleister - Katalog-Seite als digitale Broschüre (keine Bestellfunktion)

---

## Zusammenfassung

Erstellung einer neuen, eigenständigen Print-on-Demand Automatisierungs-WebApp namens **"POD AutoM"** im Ordner `/POD AutoM/`. Die App nutzt die bestehenden Backend-Cron-Jobs, hat aber ein eigenes Frontend, Landing Page, Design und Benutzererfahrung.

## Zielgruppe
- Nebenberufliche Unternehmer
- Kleinunternehmer (<75.000€ Umsatz)
- Hobby-Seller
- Passive Income Suchende

## Preismodelle
| Plan | Preis | Features |
|------|-------|----------|
| **Basis** | 200€/Monat | Pinterest ODER Meta, 5 Nischen, 100 Produkte/Monat |
| **Premium** | 500€/Monat | Pinterest + Meta, 15 Nischen, 500 Produkte/Monat, Winner Scaling |
| **VIP** | 835€/Monat | Alle Plattformen, Unbegrenzt, Advanced Analytics, 1:1 Support |

---

## Tech Stack

| Technologie | Version | Zweck |
|-------------|---------|-------|
| React | 18.2.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 6.x | Build Tool |
| Tailwind CSS | 3.4.x | Styling (Dark Theme) |
| React Router | 6.x | Routing |
| TanStack React Query | 5.x | Server State |
| Zustand | 4.5.x | Client State |
| Supabase JS | 2.39.x | Database & Auth |
| Lucide React | 0.555.x | Icons |
| Recharts | 3.5.x | Charts |
| Stripe | - | Subscription Billing |

---

## Ordnerstruktur

```
POD AutoM/
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   │
│   ├── pages/
│   │   ├── Landing.tsx          # Marketing Landing Page
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── Dashboard.tsx
│   │   └── Onboarding.tsx       # 4-Step Setup Wizard
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MobileNav.tsx
│   │   │
│   │   ├── landing/
│   │   │   ├── Hero.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── Pricing.tsx
│   │   │   └── FAQ.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Overview.tsx
│   │   │   ├── NicheSelector.tsx
│   │   │   ├── PromptManager.tsx
│   │   │   ├── ProductQueue.tsx
│   │   │   ├── CampaignManager.tsx
│   │   │   └── Analytics.tsx
│   │   │
│   │   ├── catalog/
│   │   │   ├── CatalogGrid.tsx      # Produkt-Übersicht Grid
│   │   │   ├── ProductCard.tsx      # Einzelne Produkt-Karte
│   │   │   ├── ProductDetailDialog.tsx  # Detail-Dialog
│   │   │   └── CountrySelector.tsx  # Lieferland-Dropdown
│   │   │
│   │   ├── onboarding/
│   │   │   ├── ShopConnection.tsx
│   │   │   ├── NicheSelection.tsx
│   │   │   ├── PromptConfig.tsx
│   │   │   └── AdPlatformSetup.tsx
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       └── Badge.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSubscription.ts
│   │   ├── usePodSettings.ts
│   │   └── useProducts.ts
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── SubscriptionContext.tsx
│   │
│   └── lib/
│       ├── supabase.ts
│       ├── store.ts
│       └── constants.ts
│
├── Masterplan.md               # Vollständige Dokumentation
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Seiten & Routes

### Public Routes
| Route | Komponente | Beschreibung |
|-------|------------|--------------|
| `/` | Landing.tsx | Marketing Page mit Pricing |
| `/login` | Login.tsx | Anmeldung |
| `/register` | Register.tsx | Registrierung |
| `/katalog` | Catalog.tsx | Fulfillment-Katalog (Digitale Broschüre) |

### Protected Routes
| Route | Komponente | Beschreibung |
|-------|------------|--------------|
| `/onboarding` | Onboarding.tsx | 4-Step Setup Wizard |
| `/dashboard` | Dashboard.tsx | Haupt-Dashboard |
| `/settings` | Settings.tsx | Einstellungen |

---

## Design System (Dark Theme - Violet Akzent)

```css
/* Hintergrund */
--background: #000000
--surface: #18181b (zinc-900)
--surface-highlight: #27272a (zinc-800)

/* Primärfarbe (POD AutoM Branding) */
--primary: #8b5cf6 (violet-500)
--primary-hover: #7c3aed (violet-600)

/* Status */
--success: #10b981 (emerald-500)
--warning: #f59e0b (amber-500)
--error: #ef4444 (red-500)
```

---

## Datenbank-Schema (Neue Tabellen)

### pod_autom_subscriptions
```sql
CREATE TABLE pod_autom_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tier VARCHAR(20) CHECK (tier IN ('basis', 'premium', 'vip')),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### pod_autom_shops
```sql
CREATE TABLE pod_autom_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  shop_domain VARCHAR(255) NOT NULL,
  access_token TEXT,
  internal_name VARCHAR(255),
  connection_status VARCHAR(20) DEFAULT 'disconnected',
  printful_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### pod_autom_settings
```sql
CREATE TABLE pod_autom_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES pod_autom_shops(id),
  enabled BOOLEAN DEFAULT TRUE,
  gpt_image_quality VARCHAR(10) DEFAULT 'HIGH',
  creation_limit INTEGER DEFAULT 20,
  auto_publish BOOLEAN DEFAULT TRUE,
  default_price DECIMAL(10,2) DEFAULT 29.99,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### pod_autom_niches
```sql
CREATE TABLE pod_autom_niches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id UUID REFERENCES pod_autom_settings(id),
  niche_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### pod_autom_prompts
```sql
CREATE TABLE pod_autom_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id UUID REFERENCES pod_autom_settings(id),
  prompt_type VARCHAR(50), -- 'image', 'title', 'description'
  prompt_text TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### pod_autom_catalog
```sql
CREATE TABLE pod_autom_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type VARCHAR(100),
  image_url TEXT,
  sizes TEXT[], -- ['S', 'M', 'L', 'XL', 'XXL']
  colors JSONB, -- [{"name": "Schwarz", "hex": "#000000"}, ...]
  base_price DECIMAL(10,2),
  shipping_prices JSONB, -- {"DE": 4.90, "AT": 5.90, "CH": 8.90, ...}
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);
```

---

## Backend-Integration

### Bestehende Jobs anpassen:
1. **product_creation_job** - Zusätzliche Abfrage für `pod_autom_shops`
2. **product_optimize_job** - GPT-Optimierung für POD AutoM Produkte
3. **winner_scaling_job** - Winner-Erkennung für POD AutoM
4. **pinterest_sync_job** - Sync für POD AutoM Shops

### Neue API-Endpoints (Flask):
```python
# backend/api/routes/pod_autom.py
@bp.route('/pod-autom/shops', methods=['GET', 'POST'])
@bp.route('/pod-autom/settings/<shop_id>', methods=['GET', 'PUT'])
@bp.route('/pod-autom/niches/<settings_id>', methods=['GET', 'POST', 'DELETE'])
@bp.route('/pod-autom/products/<shop_id>', methods=['GET'])

# backend/api/routes/stripe_webhook.py
@bp.route('/stripe/webhook', methods=['POST'])
```

---

## User Flow

```
Landing Page → Register → Email Verify → Login
                                            ↓
                                    Onboarding Wizard
                                    ├── Step 1: Shopify verbinden
                                    ├── Step 2: Nischen wählen
                                    ├── Step 3: Prompts konfigurieren
                                    └── Step 4: Ad-Plattformen verbinden
                                            ↓
                                        Dashboard
```

---

## Implementierungs-Phasen

### Phase 1: Foundation (Woche 1-2)
- [ ] Vite + React + TypeScript Projekt initialisieren
- [ ] Tailwind Dark Theme konfigurieren
- [ ] Supabase Client einrichten
- [ ] Datenbank-Tabellen erstellen
- [ ] AuthContext implementieren
- [ ] Landing Page mit Pricing

### Phase 2: Auth & Onboarding (Woche 2-3)
- [ ] Login/Register Pages
- [ ] Shopify OAuth Integration
- [ ] 4-Step Onboarding Wizard
- [ ] Basis Settings Page

### Phase 3: Dashboard (Woche 3-4)
- [ ] Dashboard Layout (Sidebar + Header)
- [ ] Overview Tab mit Metriken
- [ ] NicheSelector Komponente
- [ ] PromptManager Komponente
- [ ] ProductQueue Anzeige

### Phase 4: Backend-Integration (Woche 4-5)
- [ ] Bestehende Cron-Jobs anpassen
- [ ] POD AutoM API-Routes hinzufügen
- [ ] Produkt-Erstellung testen
- [ ] Fulfillment-Katalog Seite (Digitale Broschüre)

### Phase 5: Premium Features (Woche 5-6)
- [ ] Pinterest Integration
- [ ] Winner Scaling Dashboard
- [ ] Campaign Management
- [ ] Advanced Analytics

### Phase 6: Billing & Polish (Woche 6-7)
- [ ] Stripe Integration
- [ ] Subscription Management
- [ ] Feature Gating nach Tier
- [ ] Mobile Optimierung
- [ ] Performance Optimierung

---

## Fulfillment-Katalog (Digitale Broschüre)

Eigener Fulfillment-Dienstleister - einfache Katalog-Seite ohne Bestellfunktion.

### Katalog-Übersicht (Grid)
```
┌─────────────────────────────────────────────────────┐
│  [Produktbild]   [Produktbild]   [Produktbild]      │
│   T-Shirt         Hoodie          Kappe             │
│                                                      │
│  [Produktbild]   [Produktbild]   [Produktbild]      │
│   Pullover        Tasche          Poster            │
└─────────────────────────────────────────────────────┘
```

### Produkt-Detail Dialog (bei Klick)
```
┌─────────────────────────────────────────────────────┐
│  [X]                                                 │
│  ┌──────────┐                                        │
│  │          │   T-Shirt Premium                      │
│  │  BILD    │                                        │
│  │          │   Größen: S, M, L, XL, XXL            │
│  └──────────┘                                        │
│                                                      │
│  Farben: ● Schwarz ● Weiß ● Navy ● Grau            │
│                                                      │
│  Lieferland: [Deutschland ▼]                        │
│                                                      │
│  ┌─────────────────────────────────────────┐        │
│  │ Produktpreis:     12,50 €                │        │
│  │ Versand (DE):      4,90 €                │        │
│  │ ─────────────────────────                │        │
│  │ Gesamt:           17,40 €                │        │
│  └─────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

---

## Kritische Dateien als Referenz

Diese bestehenden Dateien dienen als Muster:
- `src/contexts/AuthContext.tsx` - Auth-Pattern
- `src/pages/Login.tsx` - Form-Design
- `components/tabs/ProductCreation.tsx` - Settings-UI
- `tailwind.config.js` - Design-System
- `backend/jobs/product_creation_job/main.py` - Job-Pattern

---

## Verifizierung

Nach Implementierung:
1. `npm run dev` - Frontend starten
2. Landing Page auf `/` prüfen
3. Registrierung + Login testen
4. Onboarding Wizard durchlaufen
5. Dashboard Funktionalität prüfen
6. Backend-Jobs mit neuen Tabellen testen
