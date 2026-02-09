# Phase 4.3 - Produkt-Erstellung testen

## Ziel
End-to-End Testing der automatischen Produkt-Erstellung für POD AutoM.

## Kritische Hinweise

### ⚠️ Test-Daten aktuell halten
```python
# ❌ FALSCH - Veraltetes Datum
'current_period_end': '2025-12-31T23:59:59Z'

# ✅ RICHTIG - Dynamisches Datum
from datetime import datetime, timedelta
end_date = (datetime.now() + timedelta(days=30)).isoformat()
```

### ⚠️ E2E Tests müssen den echten Job ausführen
```python
# ❌ FALSCH - Nur Insert simulieren
supabase.table('products').insert(test_products).execute()

# ✅ RICHTIG - Echten Job importieren und ausführen
from main import process_pod_autom_shop
result = process_pod_autom_shop(test_shop, supabase)
```

### ⚠️ Externe APIs mocken
GPT/DALL-E und andere externe APIs müssen in Tests gemockt werden.

---

## Test-Strategie

### Testpyramide

```
         ╱╲
        ╱  ╲        E2E Tests (wenige, langsam)
       ╱────╲
      ╱      ╲      Integration Tests (mittel)
     ╱────────╲
    ╱          ╲    Unit Tests (viele, schnell)
   ╱────────────╲
```

---

## 1. Unit Tests für Services

**Datei:** `backend/jobs/product_creation_job/tests/test_pod_autom.py`

```python
"""
Unit Tests für POD AutoM Product Creation

Führe aus mit: pytest tests/test_pod_autom.py -v
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, timezone

# Import zu testende Module
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import (
    process_pod_autom_shop,
    prepare_prompt
)
from shared.constants import get_tier_limits, TIER_LIMITS


# ====================
# Fixtures
# ====================

@pytest.fixture
def mock_supabase():
    """Mocked Supabase Service"""
    mock = MagicMock()
    mock.get_subscription.return_value = {'tier': 'premium', 'status': 'active'}
    mock.get_products_this_month.return_value = 0
    mock.insert_product.return_value = {'id': 'test-product-id'}
    return mock


@pytest.fixture
def sample_shop():
    """Sample POD AutoM shop data"""
    return {
        'id': 'shop-123',
        'user_id': 'user-456',
        'shop_domain': 'test-shop.myshopify.com',
        'access_token': 'shpat_test_token',
        'pod_autom_settings': {
            'id': 'settings-789',
            'enabled': True,
            'gpt_image_quality': 'HIGH',
            'creation_limit': 10,
            'auto_publish': True,
            'default_price': 29.99,
            'pod_autom_niches': [
                {'id': 'n1', 'niche_name': 'Fitness', 'is_active': True},
                {'id': 'n2', 'niche_name': 'Gaming', 'is_active': True}
            ],
            'pod_autom_prompts': [
                {'prompt_type': 'image', 'prompt_text': 'Create a {niche} design'},
                {'prompt_type': 'title', 'prompt_text': 'Title for {niche}'},
                {'prompt_type': 'description', 'prompt_text': 'Description for {niche}'}
            ]
        }
    }


@pytest.fixture
def sample_subscription():
    """Sample subscription data"""
    return {
        'tier': 'premium',
        'status': 'active',
        'current_period_end': (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }


# ====================
# Tier Limits Tests
# ====================

class TestTierLimits:
    """Tests für Tier-Limit Funktionen"""

    def test_basis_limits(self):
        """Basis-Tier hat korrekte Limits"""
        limits = get_tier_limits('basis')

        assert limits['max_products'] == 100
        assert limits['max_niches'] == 5
        assert limits['winner_scaling'] is False
        assert limits['advanced_analytics'] is False

    def test_premium_limits(self):
        """Premium-Tier hat korrekte Limits"""
        limits = get_tier_limits('premium')

        assert limits['max_products'] == 500
        assert limits['max_niches'] == 15
        assert limits['winner_scaling'] is True
        assert limits['advanced_analytics'] is False

    def test_vip_limits(self):
        """VIP-Tier ist unbegrenzt"""
        limits = get_tier_limits('vip')

        assert limits['max_products'] == -1  # Unlimited
        assert limits['max_niches'] == -1
        assert limits['winner_scaling'] is True
        assert limits['advanced_analytics'] is True

    def test_unknown_tier_defaults_to_basis(self):
        """Unbekannter Tier verwendet Basis-Limits"""
        limits = get_tier_limits('unknown_tier')

        assert limits == TIER_LIMITS['basis']

    def test_empty_tier_defaults_to_basis(self):
        """Leerer Tier verwendet Basis-Limits"""
        limits = get_tier_limits('')

        assert limits == TIER_LIMITS['basis']


# ====================
# Prompt Replacement Tests
# ====================

class TestPromptReplacement:
    """Tests für Prompt-Placeholder-Ersetzung"""

    def test_single_placeholder(self):
        """Einzelner {niche} Placeholder wird ersetzt"""
        prompt = "Create a design for {niche} lovers"
        result = prepare_prompt(prompt, "Fitness")

        assert result == "Create a design for Fitness lovers"

    def test_multiple_placeholders(self):
        """Mehrere {niche} Placeholders werden ersetzt"""
        prompt = "Design for {niche}. Keywords: {niche}, sports, {niche} lifestyle"
        result = prepare_prompt(prompt, "Yoga")

        assert result == "Design for Yoga. Keywords: Yoga, sports, Yoga lifestyle"

    def test_no_placeholder(self):
        """Prompt ohne Placeholder bleibt unverändert"""
        prompt = "Create a beautiful design"
        result = prepare_prompt(prompt, "Fitness")

        assert result == "Create a beautiful design"

    def test_empty_niche(self):
        """Leere Nische wird als leerer String eingefügt"""
        prompt = "Design for {niche}"
        result = prepare_prompt(prompt, "")

        assert result == "Design for "

    def test_special_characters_in_niche(self):
        """Sonderzeichen in Nische werden korrekt eingefügt"""
        prompt = "Design for {niche}"
        result = prepare_prompt(prompt, "Café & Bakery")

        assert result == "Design for Café & Bakery"


# ====================
# Product Creation Tests
# ====================

class TestProductCreation:
    """Tests für Produkt-Erstellung"""

    def test_skip_if_no_settings(self, mock_supabase, sample_shop):
        """Shop ohne Settings wird übersprungen"""
        sample_shop['pod_autom_settings'] = None

        result = process_pod_autom_shop(sample_shop, mock_supabase)

        assert result['skipped_reason'] == 'no_settings'
        assert result['products_created'] == 0
        mock_supabase.insert_product.assert_not_called()

    def test_skip_if_no_niches(self, mock_supabase, sample_shop):
        """Shop ohne Nischen wird übersprungen"""
        sample_shop['pod_autom_settings']['pod_autom_niches'] = []

        result = process_pod_autom_shop(sample_shop, mock_supabase)

        assert result['skipped_reason'] == 'no_niches'
        assert result['products_created'] == 0
        mock_supabase.insert_product.assert_not_called()

    def test_skip_if_all_niches_inactive(self, mock_supabase, sample_shop):
        """Shop mit nur inaktiven Nischen wird übersprungen"""
        for niche in sample_shop['pod_autom_settings']['pod_autom_niches']:
            niche['is_active'] = False

        result = process_pod_autom_shop(sample_shop, mock_supabase)

        assert result['skipped_reason'] == 'no_niches'
        mock_supabase.insert_product.assert_not_called()

    def test_skip_if_no_subscription(self, mock_supabase, sample_shop):
        """Shop ohne aktive Subscription wird übersprungen"""
        mock_supabase.get_subscription.return_value = None

        result = process_pod_autom_shop(sample_shop, mock_supabase)

        assert result['skipped_reason'] == 'no_subscription'
        mock_supabase.insert_product.assert_not_called()

    def test_skip_if_monthly_limit_reached(self, mock_supabase, sample_shop):
        """Shop mit erreichtem Monatslimit wird übersprungen"""
        mock_supabase.get_subscription.return_value = {'tier': 'premium'}
        mock_supabase.get_products_this_month.return_value = 500  # At limit

        result = process_pod_autom_shop(sample_shop, mock_supabase)

        assert result['skipped_reason'] == 'monthly_limit_reached'
        mock_supabase.insert_product.assert_not_called()

    def test_creates_products_for_each_niche(self, mock_supabase, sample_shop):
        """Produkte werden für jede aktive Nische erstellt"""
        mock_supabase.get_subscription.return_value = {'tier': 'premium'}
        mock_supabase.get_products_this_month.return_value = 0

        result = process_pod_autom_shop(sample_shop, mock_supabase)

        # 10 products / 2 niches = 5 per niche = 10 total
        assert mock_supabase.insert_product.call_count == 10
        assert result['products_created'] == 10

    def test_respects_remaining_monthly_allowance(self, mock_supabase, sample_shop):
        """Erstellt nur verbleibende Produkte bis zum Limit"""
        mock_supabase.get_subscription.return_value = {'tier': 'basis'}
        mock_supabase.get_products_this_month.return_value = 95  # 5 remaining

        sample_shop['pod_autom_settings']['creation_limit'] = 20

        result = process_pod_autom_shop(sample_shop, mock_supabase)

        # Only 5 remaining (100 - 95), not 20
        assert mock_supabase.insert_product.call_count <= 5

    def test_vip_tier_has_no_limit(self, mock_supabase, sample_shop):
        """VIP-Tier hat unbegrenztes Monatslimit"""
        mock_supabase.get_subscription.return_value = {'tier': 'vip'}
        mock_supabase.get_products_this_month.return_value = 10000

        result = process_pod_autom_shop(sample_shop, mock_supabase)

        # Should still create products despite high count
        assert mock_supabase.insert_product.called
        assert result['skipped_reason'] is None

    def test_product_data_contains_required_fields(self, mock_supabase, sample_shop):
        """Erstellte Produkte haben alle erforderlichen Felder"""
        mock_supabase.get_subscription.return_value = {'tier': 'premium'}
        mock_supabase.get_products_this_month.return_value = 0

        process_pod_autom_shop(sample_shop, mock_supabase)

        # Check first inserted product
        call_args = mock_supabase.insert_product.call_args[0][0]

        assert 'shop_id' in call_args
        assert 'niche' in call_args
        assert 'title' in call_args
        assert 'price' in call_args
        assert 'status' in call_args
        assert call_args['status'] == 'draft'


# ====================
# Error Handling Tests
# ====================

class TestErrorHandling:
    """Tests für Fehlerbehandlung"""

    def test_continues_after_insert_failure(self, mock_supabase, sample_shop):
        """Job fährt fort, wenn einzelner Insert fehlschlägt"""
        mock_supabase.get_subscription.return_value = {'tier': 'premium'}
        mock_supabase.get_products_this_month.return_value = 0

        # First call fails, rest succeed
        mock_supabase.insert_product.side_effect = [
            None,  # First fails
            {'id': 'p2'},
            {'id': 'p3'},
            {'id': 'p4'},
            {'id': 'p5'},
            {'id': 'p6'},
            {'id': 'p7'},
            {'id': 'p8'},
            {'id': 'p9'},
            {'id': 'p10'},
        ]

        result = process_pod_autom_shop(sample_shop, mock_supabase)

        # 9 out of 10 should succeed
        assert result['products_created'] == 9

    def test_handles_subscription_fetch_error(self, mock_supabase, sample_shop):
        """Fehler beim Subscription-Abruf wird behandelt"""
        mock_supabase.get_subscription.side_effect = Exception("DB Error")

        result = process_pod_autom_shop(sample_shop, mock_supabase)

        assert result['skipped_reason'] == 'no_subscription'
```

---

## 2. Integration Tests

**Datei:** `backend/jobs/product_creation_job/tests/test_integration.py`

```python
"""
Integration Tests für POD AutoM

Testet Interaktion mit echter Datenbank (Test-Environment).

Führe aus mit: pytest tests/test_integration.py -v --integration
"""

import pytest
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client

# Load test environment
load_dotenv('.env.test')


# Skip wenn keine Test-DB konfiguriert
pytestmark = pytest.mark.skipif(
    not os.getenv('SUPABASE_TEST_URL'),
    reason="SUPABASE_TEST_URL not set"
)


@pytest.fixture(scope='session')
def supabase_client():
    """Supabase client für Tests"""
    return create_client(
        os.getenv('SUPABASE_TEST_URL', os.getenv('SUPABASE_URL')),
        os.getenv('SUPABASE_TEST_KEY', os.getenv('SUPABASE_SERVICE_KEY'))
    )


@pytest.fixture
def test_user_id():
    """Test User ID aus Environment"""
    return os.getenv('TEST_USER_ID', 'test-user-00000000-0000-0000-0000-000000000000')


@pytest.fixture
def cleanup_test_data(supabase_client, test_user_id):
    """Cleanup fixture - löscht Testdaten nach jedem Test"""
    yield

    # Cleanup nach Test
    try:
        # Lösche Test-Shops und alle zugehörigen Daten (CASCADE)
        supabase_client.table('pod_autom_shops').delete().eq(
            'user_id', test_user_id
        ).like('shop_domain', 'test-%').execute()
    except Exception:
        pass


class TestDatabaseIntegration:
    """Integration Tests mit Datenbank"""

    @pytest.mark.integration
    def test_fetch_pod_autom_shops(self, supabase_client, test_user_id):
        """Kann POD AutoM Shops aus DB abrufen"""
        result = supabase_client.table('pod_autom_shops').select(
            '*, pod_autom_settings(*)'
        ).eq('user_id', test_user_id).execute()

        assert result.data is not None
        assert isinstance(result.data, list)

    @pytest.mark.integration
    def test_subscription_check(self, supabase_client, test_user_id):
        """Kann Subscription-Status prüfen"""
        result = supabase_client.table('pod_autom_subscriptions').select(
            '*'
        ).eq('user_id', test_user_id).eq('status', 'active').execute()

        assert isinstance(result.data, list)

    @pytest.mark.integration
    def test_insert_and_delete_product(self, supabase_client, cleanup_test_data):
        """Kann Produkte einfügen und löschen"""
        test_shop_id = os.getenv('TEST_SHOP_ID')

        if not test_shop_id:
            pytest.skip("TEST_SHOP_ID not configured")

        # Insert
        product_data = {
            'shop_id': test_shop_id,
            'niche': 'Integration Test Niche',
            'title': 'Integration Test Product',
            'description': 'Test description',
            'price': 29.99,
            'status': 'draft'
        }

        insert_result = supabase_client.table('pod_autom_products').insert(
            product_data
        ).execute()

        assert insert_result.data
        product_id = insert_result.data[0]['id']
        assert product_id

        # Verify
        get_result = supabase_client.table('pod_autom_products').select(
            '*'
        ).eq('id', product_id).single().execute()

        assert get_result.data['title'] == 'Integration Test Product'

        # Cleanup
        supabase_client.table('pod_autom_products').delete().eq(
            'id', product_id
        ).execute()

    @pytest.mark.integration
    def test_count_products_this_month(self, supabase_client):
        """Kann monatliche Produkte zählen"""
        test_shop_id = os.getenv('TEST_SHOP_ID')

        if not test_shop_id:
            pytest.skip("TEST_SHOP_ID not configured")

        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        result = supabase_client.table('pod_autom_products').select(
            'id', count='exact'
        ).eq('shop_id', test_shop_id).gte(
            'created_at', start_of_month.isoformat()
        ).execute()

        assert result.count is not None
        assert result.count >= 0
```

---

## 3. End-to-End Test Script

**Datei:** `backend/jobs/product_creation_job/test_e2e.py`

```python
#!/usr/bin/env python3
"""
End-to-End Test für POD AutoM Produkt-Erstellung

Testet den kompletten Workflow:
1. Test-Daten erstellen
2. Job ausführen
3. Ergebnisse verifizieren
4. Cleanup

Voraussetzungen:
- .env.test mit gültigen Credentials
- Test-User in Supabase Auth

Ausführung:
python test_e2e.py
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client

# Load test environment
load_dotenv('.env.test')

# Import job module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import process_pod_autom_shop
from shared.pod_autom_supabase import PodAutomSupabaseService


class E2ETestRunner:
    """E2E Test Runner für POD AutoM"""

    def __init__(self):
        self.supabase = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_KEY')
        )
        self.test_user_id = os.getenv('TEST_USER_ID')
        self.test_ids = {}  # Speichert erstellte IDs für Cleanup

    def log(self, step: int, total: int, message: str):
        """Formatierte Log-Ausgabe"""
        print(f"\n[{step}/{total}] {message}")
        print("-" * 50)

    def setup_test_data(self) -> dict:
        """Erstellt Test-Daten in der Datenbank"""
        self.log(1, 6, "Setting up test data...")

        if not self.test_user_id:
            raise ValueError("TEST_USER_ID not set in environment")

        # ✅ Dynamisches Datum (nicht hardcoded!)
        period_end = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

        # 1. Subscription erstellen/updaten
        sub_result = self.supabase.table('pod_autom_subscriptions').upsert({
            'user_id': self.test_user_id,
            'tier': 'premium',
            'status': 'active',
            'current_period_end': period_end
        }, on_conflict='user_id').execute()

        print(f"  ✓ Subscription: {sub_result.data[0]['tier'] if sub_result.data else 'FAILED'}")

        # 2. Test-Shop erstellen
        shop_result = self.supabase.table('pod_autom_shops').insert({
            'user_id': self.test_user_id,
            'shop_domain': f'e2e-test-{datetime.now().timestamp()}.myshopify.com',
            'connection_status': 'connected',
            'internal_name': 'E2E Test Shop'
        }).execute()

        shop_id = shop_result.data[0]['id']
        self.test_ids['shop_id'] = shop_id
        print(f"  ✓ Shop ID: {shop_id}")

        # 3. Settings erstellen
        settings_result = self.supabase.table('pod_autom_settings').insert({
            'shop_id': shop_id,
            'enabled': True,
            'gpt_image_quality': 'HIGH',
            'creation_limit': 4,  # Niedriges Limit für Test
            'auto_publish': False,
            'default_price': 29.99
        }).execute()

        settings_id = settings_result.data[0]['id']
        self.test_ids['settings_id'] = settings_id
        print(f"  ✓ Settings ID: {settings_id}")

        # 4. Nischen erstellen
        niches_result = self.supabase.table('pod_autom_niches').insert([
            {'settings_id': settings_id, 'niche_name': 'E2E Fitness', 'is_active': True},
            {'settings_id': settings_id, 'niche_name': 'E2E Gaming', 'is_active': True}
        ]).execute()

        print(f"  ✓ Niches: {len(niches_result.data)}")

        # 5. Prompts erstellen
        self.supabase.table('pod_autom_prompts').insert([
            {'settings_id': settings_id, 'prompt_type': 'image', 'prompt_text': 'E2E Test image for {niche}'},
            {'settings_id': settings_id, 'prompt_type': 'title', 'prompt_text': 'E2E Test title for {niche}'},
            {'settings_id': settings_id, 'prompt_type': 'description', 'prompt_text': 'E2E Test desc for {niche}'}
        ]).execute()

        print(f"  ✓ Prompts: 3")

        # Shop-Daten für Job laden
        shop_data = self.supabase.table('pod_autom_shops').select(
            '''
            *,
            pod_autom_settings(
                *,
                pod_autom_niches(*),
                pod_autom_prompts(*)
            )
            '''
        ).eq('id', shop_id).single().execute()

        return shop_data.data

    def count_products(self) -> int:
        """Zählt Produkte für Test-Shop"""
        result = self.supabase.table('pod_autom_products').select(
            'id', count='exact'
        ).eq('shop_id', self.test_ids['shop_id']).execute()

        return result.count or 0

    def run_job(self, shop_data: dict) -> dict:
        """Führt den echten Job aus"""
        self.log(3, 6, "Running product creation job...")

        # ✅ ECHTEN Job ausführen, nicht nur Daten simulieren
        service = PodAutomSupabaseService()
        result = process_pod_autom_shop(shop_data, service)

        print(f"  ✓ Products created: {result['products_created']}")
        if result['skipped_reason']:
            print(f"  ! Skipped: {result['skipped_reason']}")

        return result

    def verify_products(self) -> list:
        """Verifiziert erstellte Produkte"""
        self.log(4, 6, "Verifying products...")

        products = self.supabase.table('pod_autom_products').select('*').eq(
            'shop_id', self.test_ids['shop_id']
        ).order('created_at', desc=True).execute()

        for p in products.data:
            print(f"  - {p['title']} ({p['niche']}) - {p['status']}")

        return products.data

    def cleanup(self):
        """Löscht alle Test-Daten"""
        self.log(6, 6, "Cleaning up test data...")

        try:
            # Shop löschen (CASCADE löscht Settings, Niches, Prompts, Products)
            if 'shop_id' in self.test_ids:
                self.supabase.table('pod_autom_shops').delete().eq(
                    'id', self.test_ids['shop_id']
                ).execute()
                print("  ✓ Test shop and related data deleted")
        except Exception as e:
            print(f"  ✗ Cleanup failed: {e}")

    def run(self) -> bool:
        """Führt kompletten E2E Test durch"""
        print("=" * 60)
        print("POD AutoM E2E Test - Product Creation")
        print("=" * 60)

        try:
            # 1. Setup
            shop_data = self.setup_test_data()

            # 2. Vorher-Zählung
            self.log(2, 6, "Counting existing products...")
            before_count = self.count_products()
            print(f"  Products before: {before_count}")

            # 3. Job ausführen
            job_result = self.run_job(shop_data)

            # 4. Produkte verifizieren
            products = self.verify_products()

            # 5. Ergebnisse prüfen
            self.log(5, 6, "Checking results...")
            after_count = len(products)
            created = after_count - before_count

            print(f"  Products after: {after_count}")
            print(f"  New products: {created}")
            print(f"  Expected: {job_result['products_created']}")

            # Validierung
            success = (
                created == job_result['products_created'] and
                created > 0 and
                all(p['status'] == 'draft' for p in products) and
                all(p['niche'].startswith('E2E') for p in products)
            )

            # 6. Cleanup
            self.cleanup()

            # Ergebnis
            print("\n" + "=" * 60)
            if success:
                print("✅ E2E Test PASSED")
            else:
                print("❌ E2E Test FAILED")
                if created != job_result['products_created']:
                    print(f"   Expected {job_result['products_created']} products, got {created}")
            print("=" * 60)

            return success

        except Exception as e:
            print(f"\n❌ E2E Test FAILED with error: {e}")
            self.cleanup()
            raise


if __name__ == '__main__':
    runner = E2ETestRunner()
    success = runner.run()
    sys.exit(0 if success else 1)
```

---

## 4. CI/CD Integration

**Datei:** `.github/workflows/test-jobs.yml`

```yaml
name: Test POD AutoM Jobs

on:
  push:
    paths:
      - 'backend/jobs/**'
  pull_request:
    paths:
      - 'backend/jobs/**'

env:
  PYTHON_VERSION: '3.11'

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        working-directory: backend/jobs/product_creation_job
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Run unit tests
        working-directory: backend/jobs/product_creation_job
        run: |
          pytest tests/test_pod_autom.py -v --cov=. --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: backend/jobs/product_creation_job/coverage.xml


  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: unit-tests  # Nur wenn Unit Tests erfolgreich

    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
      SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_TEST_KEY }}
      TEST_USER_ID: ${{ secrets.TEST_USER_ID }}

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        working-directory: backend/jobs/product_creation_job
        run: |
          pip install -r requirements.txt
          pip install pytest

      - name: Run integration tests
        working-directory: backend/jobs/product_creation_job
        run: |
          pytest tests/test_integration.py -v --integration
```

---

## 5. Test Requirements

**Datei:** `backend/jobs/product_creation_job/requirements-dev.txt`

```
# Test dependencies
pytest>=8.0.0
pytest-cov>=4.1.0
pytest-asyncio>=0.23.0

# Mocking
responses>=0.25.0

# Code quality
black>=24.0.0
ruff>=0.2.0
mypy>=1.8.0
```

---

## 6. Manuelle Test-Checkliste

```markdown
## Manuelle Test-Checkliste

### Vorbereitung
- [ ] Test-User in Supabase Auth angelegt
- [ ] .env.test mit TEST_USER_ID konfiguriert
- [ ] Test-Subscription erstellt (Premium oder VIP)
- [ ] requirements-dev.txt installiert

### Unit Tests
```bash
cd backend/jobs/product_creation_job
pip install -r requirements-dev.txt
pytest tests/test_pod_autom.py -v
```
- [ ] Alle Tests bestanden
- [ ] Coverage > 80%

### Integration Tests
```bash
pytest tests/test_integration.py -v --integration
```
- [ ] Datenbank-Verbindung funktioniert
- [ ] CRUD-Operationen erfolgreich

### E2E Tests
```bash
python test_e2e.py
```
- [ ] Test-Shop wird erstellt
- [ ] Job wird ausgeführt
- [ ] Produkte werden erstellt
- [ ] Cleanup funktioniert

### Job Ausführung (Lokal)
```bash
python main.py
```
- [ ] Keine Fehler in Logs
- [ ] POD AutoM Shops werden verarbeitet
- [ ] Subscription-Limits werden respektiert
- [ ] Produkte erscheinen in Datenbank

### API Verification
- [ ] GET /pod-autom/products/:shop_id zeigt neue Produkte
- [ ] Stats werden aktualisiert
- [ ] Frontend zeigt Produkte an
```

---

## Verifizierung

- [ ] **Unit Tests** - pytest läuft erfolgreich
- [ ] **Integration Tests** - DB-Verbindung funktioniert
- [ ] **E2E Test** - Kompletter Workflow getestet
- [ ] **Echte Job-Ausführung** - Nicht nur Simulation
- [ ] **Dynamische Datumswerte** - Keine hardcoded Daten
- [ ] **GPT-Mocks** - Externe APIs gemockt
- [ ] **CI/CD** - GitHub Actions konfiguriert
- [ ] **Test Coverage** - > 80%

## Abhängigkeiten

- Phase 4.1 (Cron-Jobs)
- Phase 4.2 (API-Routes)
- pytest, pytest-cov packages
- Supabase Test-Environment

## Nächster Schritt
→ Phase 4.4 - Fulfillment-Katalog Seite
