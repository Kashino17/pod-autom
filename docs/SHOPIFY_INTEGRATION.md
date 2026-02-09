# Shopify Integration - POD AutoM

## App Details

| Feld | Wert |
|------|------|
| **App Name** | POD AutoM |
| **App ID** | 319209799681 |
| **App Type** | Unlisted App (Shopify Partner Dashboard) |
| **Client ID** | `2674cec6967e823550872a16c219b6ac` |
| **API Version** | 2026-01 |

## Scopes (Berechtigungen)

Die App benötigt folgende Berechtigungen:

- `read_products` - Produkte lesen
- `write_products` - Produkte erstellen/bearbeiten
- `read_orders` - Bestellungen lesen
- `read_inventory` - Lagerbestände lesen
- `write_inventory` - Lagerbestände verwalten
- `read_files` - Dateien lesen
- `write_files` - Dateien hochladen (für Produktbilder)

## OAuth Flow

### 1. Quick Install (Empfohlen)

```
GET /api/shopify/install?user_id={user_id}
```

Der Benutzer wird zu Shopify weitergeleitet und kann dort seinen Shop auswählen.

### 2. Domain-basierter Install

```
GET /api/shopify/install?user_id={user_id}&shop={shop.myshopify.com}
```

Der Benutzer wird direkt zu seinem Shop weitergeleitet.

### 3. OAuth Callback

```
GET /api/shopify/callback?code={code}&shop={shop}&state={state}
```

Nach erfolgreicher Autorisierung erhält die App:
- Access Token (offline, dauerhaft gültig)
- Shop-Informationen

## Redirect URIs

Konfiguriert in der Shopify App:

- **Development:** `http://localhost:8000/api/shopify/callback`
- **Production:** `https://podautom.tosun-media.de/api/shopify/callback`

## Umgebungsvariablen

### Backend (.env)

```bash
SHOPIFY_CLIENT_ID=2674cec6967e823550872a16c219b6ac
SHOPIFY_CLIENT_SECRET=shpss_xxxxx  # Nicht im Code commiten!
SHOPIFY_REDIRECT_URI=http://localhost:8000/api/shopify/callback
```

### Frontend (.env.local)

```bash
VITE_API_URL=http://localhost:5001  # Backend API URL
```

## Datenbank-Tabellen

### pod_autom_shops

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primary Key |
| user_id | UUID | User Reference |
| shop_domain | VARCHAR | z.B. "myshop.myshopify.com" |
| access_token | TEXT | OAuth Token (verschlüsselt) |
| scopes | TEXT | Gewährte Berechtigungen |
| connection_status | ENUM | connected/disconnected/error |

### pod_autom_oauth_states

Temporäre Tabelle für OAuth State Verification (auto-expire nach 10 Min).

## API Endpoints

### Shops

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/shopify/shops` | Alle verbundenen Shops |
| GET | `/api/shopify/shops/{id}` | Einzelner Shop |
| DELETE | `/api/shopify/shops/{id}` | Shop trennen |
| POST | `/api/shopify/shops/{id}/sync` | Manueller Sync |

### OAuth

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/shopify/install` | Start OAuth (Quick/Domain) |
| POST | `/api/shopify/oauth/start` | Legacy OAuth Start |
| GET | `/api/shopify/oauth/callback` | OAuth Callback |

## Verwendung im Frontend

```tsx
import { useShops } from '@src/hooks/useShopify'

function MyComponent() {
  const { 
    shops,
    startQuickInstall,  // Ein-Klick Installation
    startOAuthFlow,     // Mit Shop-Domain
  } = useShops()

  // Quick Install (empfohlen)
  const handleQuickConnect = () => {
    startQuickInstall(user.id)
  }

  // Domain-basiert
  const handleDomainConnect = () => {
    startOAuthFlow('myshop.myshopify.com', user.id)
  }
}
```

## Automatisierung (Cronjobs)

Nach erfolgreicher Shop-Verbindung können Cronjobs eingerichtet werden für:

- **Produkterstellung:** Automatische Generierung von POD-Produkten
- **Inventory-Sync:** Lagerbestände aktualisieren
- **Order-Monitoring:** Neue Bestellungen verarbeiten

## Shopify Partner Dashboard

- **URL:** https://dev.shopify.com/dashboard/186470686/apps/319209799681
- **Account:** tosun.media.services@gmail.com

## Troubleshooting

### "Invalid OAuth state"
→ Der State ist abgelaufen (>10 Min). Neuen Install starten.

### "Access denied"
→ Der Benutzer hat die Berechtigungen nicht gewährt.

### "Rate limit exceeded"
→ Shopify API Limit erreicht. 2 Requests/Sekunde erlaubt.

---

*Erstellt: 2026-02-04*
*App Version: pod-autom-2*
