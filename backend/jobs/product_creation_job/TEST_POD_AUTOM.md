# POD AutoM Produkt-Erstellung Test Anleitung

## Voraussetzungen

### 1. Datenbank-Migration ausführen

Führe zuerst die SQL-Migration in Supabase aus:

```sql
-- POD AutoM Schema (wenn noch nicht vorhanden)
-- Datei: /POD AutoM/supabase/migrations/20260131_pod_autom_schema.sql

-- Product Queue Table (wichtig für den Job)
-- Datei: /POD AutoM/supabase/migrations/20260131_pod_autom_product_queue.sql
```

Gehe zu deinem Supabase Dashboard → SQL Editor und führe die Migrations aus.

### 2. Environment Variables

Erstelle eine `.env` Datei im `product_creation_job` Ordner (falls nicht vorhanden):

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Test Settings (optional - für Test-Script)
TEST_USER_ID=your-auth-user-uuid
TEST_SHOP_DOMAIN=dein-shop.myshopify.com
TEST_SHOP_TOKEN=shpat_xxxxx

# Job Settings
PROCESS_REBOSS_SHOPS=false
PROCESS_POD_AUTOM_SHOPS=true
```

### 3. Dependencies installieren

```bash
cd backend/jobs/product_creation_job
pip install -r requirements.txt
```

---

## Test-Schritte

### Schritt 1: Datenbank-Tabellen prüfen

```bash
python test_pod_autom.py --check-tables
```

Erwartete Ausgabe:
```
CHECKING DATABASE TABLES
==================================================
  [OK] pod_autom_shops
  [OK] pod_autom_settings
  [OK] pod_autom_niches
  [OK] pod_autom_prompts
  [OK] pod_autom_product_queue
  [OK] pod_autom_products
  [OK] pod_autom_subscriptions

✓ All required tables exist
```

Falls Tabellen fehlen, führe die Migrations aus (siehe oben).

### Schritt 2: Test-Daten einfügen

```bash
python test_pod_autom.py --insert-only
```

Dies erstellt:
- Einen Test-Shop (`POD Test Shop`)
- Default Settings (enabled, limit=10)
- Eine Test-Nische (`Test Niche - Motivational`)
- 3 Test-Produkte in der Queue

### Schritt 3: Dry-Run Test

```bash
python test_pod_autom.py
```

Prüft ob:
- Shops korrekt geladen werden
- Settings gefunden werden
- Produkte in der Queue sind

**Keine Shopify API-Calls!**

### Schritt 4: Live Test (optional)

⚠️ **Achtung:** Dies erstellt echte Produkte in Shopify!

Stelle sicher:
1. `TEST_SHOP_TOKEN` ist ein gültiger Shopify Access Token
2. Der Shop ist ein Test-Shop oder du willst wirklich Produkte erstellen

```bash
python test_pod_autom.py --live
```

### Schritt 5: Cleanup

Nach dem Testen, Test-Daten aufräumen:

```bash
python test_pod_autom.py --cleanup
```

---

## Direkter Job-Start

Um den Job direkt zu starten (ohne Test-Script):

```bash
# Nur POD AutoM Shops verarbeiten
PROCESS_REBOSS_SHOPS=false PROCESS_POD_AUTOM_SHOPS=true python main.py

# Beide Shop-Typen verarbeiten
python main.py
```

---

## Debugging

### Logs prüfen

Der Job loggt in `job_runs` Tabelle:

```sql
SELECT * FROM job_runs
WHERE job_type = 'product_creation_job'
ORDER BY created_at DESC
LIMIT 5;
```

### Queue Status prüfen

```sql
SELECT status, COUNT(*)
FROM pod_autom_product_queue
WHERE shop_id = 'your-shop-id'
GROUP BY status;
```

### Fehler bei einzelnem Produkt prüfen

```sql
SELECT id, title, status, error, updated_at
FROM pod_autom_product_queue
WHERE status = 'failed'
ORDER BY updated_at DESC;
```

---

## Häufige Probleme

### "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY"
→ `.env` Datei erstellen oder Environment Variables setzen

### "Table does not exist"
→ SQL Migration ausführen

### "Cannot connect to Shopify store"
→ Access Token prüfen, Shop Domain korrekt (muss `.myshopify.com` enthalten)

### "No POD AutoM shops found"
→ Shop in `pod_autom_shops` mit `connection_status = 'connected'` erstellen
→ Settings in `pod_autom_settings` mit `enabled = true` erstellen

---

## Workflow für echte Tests

1. **Shop verbinden** (über Frontend oder manuell in DB)
2. **Settings aktivieren** (`enabled = true`)
3. **Nische erstellen**
4. **Produkte in Queue einfügen** (Status: `pending`)
5. **Job ausführen** (`python main.py`)
6. **Ergebnis prüfen** (Supabase + Shopify Admin)
