# Phase 6.1 - Stripe Integration

## Ziel
Sichere Integration von Stripe für Subscription-Billing mit JWT-Authentifizierung, Webhook-Idempotenz und vollständiger Fehlerbehandlung.

## Übersicht

Stripe wird für:
- Subscription-Verwaltung (Basis, Premium, VIP)
- Automatische Rechnungsstellung
- Zahlungsmethoden-Verwaltung
- Sichere Webhook-Verarbeitung mit Idempotenz

---

## 1. TypeScript-Typen

### src/types/stripe.types.ts

```typescript
// Subscription Tiers
export type SubscriptionTier = 'basis' | 'premium' | 'vip'

// Subscription Status
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused'

// Stripe Checkout Session Request
export interface CreateCheckoutSessionRequest {
  tier: SubscriptionTier
  success_url?: string
  cancel_url?: string
}

// Stripe Checkout Session Response
export interface CreateCheckoutSessionResponse {
  session_id: string
  url: string
}

// Stripe Portal Session Response
export interface CreatePortalSessionResponse {
  url: string
}

// Subscription Record (Database)
export interface PodAutomSubscription {
  id: string
  user_id: string
  tier: SubscriptionTier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  created_at: string
  updated_at: string
}

// Webhook Event Log (Database)
export interface StripeWebhookEvent {
  id: string
  event_id: string
  event_type: string
  processed_at: string
  payload: Record<string, unknown>
}

// Pricing Tier Configuration
export interface PricingTierConfig {
  name: string
  price: number
  currency: string
  maxNiches: number
  maxProducts: number
  winnerScaling: boolean
  advancedAnalytics: boolean
  support: 'email' | 'priority' | '1:1'
  features: string[]
}

// Stripe API Error
export interface StripeApiError {
  error: string
  code?: string
  decline_code?: string
}
```

---

## 2. SQL-Migration

### supabase/migrations/20260131_stripe_integration.sql

```sql
-- ============================================
-- POD AutoM Stripe Integration Tables
-- ============================================

-- Subscriptions Table (erweitert)
CREATE TABLE IF NOT EXISTS pod_autom_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('basis', 'premium', 'vip')),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'incomplete' CHECK (
    status IN ('active', 'past_due', 'canceled', 'trialing',
               'incomplete', 'incomplete_expired', 'unpaid', 'paused')
  ),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Indexes für Subscriptions
CREATE INDEX IF NOT EXISTS idx_pod_autom_subscriptions_user_id
  ON pod_autom_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_autom_subscriptions_stripe_customer
  ON pod_autom_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_pod_autom_subscriptions_status
  ON pod_autom_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_pod_autom_subscriptions_period_end
  ON pod_autom_subscriptions(current_period_end);

-- Webhook Event Log (für Idempotenz)
CREATE TABLE IF NOT EXISTS pod_autom_stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB,
  error_message TEXT,

  CONSTRAINT unique_stripe_event UNIQUE (event_id)
);

-- Index für schnelle Event-Suche
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_event_id
  ON pod_autom_stripe_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_event_type
  ON pod_autom_stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_processed_at
  ON pod_autom_stripe_webhook_events(processed_at);

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_pod_autom_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pod_autom_subscriptions_updated_at
  BEFORE UPDATE ON pod_autom_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_pod_autom_subscriptions_updated_at();

-- RLS aktivieren
ALTER TABLE pod_autom_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_autom_stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies für Subscriptions
CREATE POLICY "Users can view own subscription"
  ON pod_autom_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service Role kann alles (für Webhooks)
CREATE POLICY "Service role full access subscriptions"
  ON pod_autom_subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Webhook Events nur für Service Role
CREATE POLICY "Service role full access webhook events"
  ON pod_autom_stripe_webhook_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Cleanup alte Webhook Events (älter als 30 Tage)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM pod_autom_stripe_webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure für Subscription Upsert
CREATE OR REPLACE FUNCTION upsert_pod_autom_subscription(
  p_user_id UUID,
  p_tier VARCHAR(20),
  p_stripe_customer_id VARCHAR(255),
  p_stripe_subscription_id VARCHAR(255),
  p_status VARCHAR(30),
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_cancel_at_period_end BOOLEAN DEFAULT FALSE
)
RETURNS pod_autom_subscriptions AS $$
DECLARE
  result pod_autom_subscriptions;
BEGIN
  INSERT INTO pod_autom_subscriptions (
    user_id, tier, stripe_customer_id, stripe_subscription_id,
    status, current_period_start, current_period_end, cancel_at_period_end
  )
  VALUES (
    p_user_id, p_tier, p_stripe_customer_id, p_stripe_subscription_id,
    p_status, p_current_period_start, p_current_period_end, p_cancel_at_period_end
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, pod_autom_subscriptions.stripe_customer_id),
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 3. Backend: Stripe Routes

### backend/api/routes/stripe_routes.py

```python
"""
Stripe Integration Routes für POD AutoM
- Checkout Session erstellen
- Customer Portal Session erstellen
- Webhook-Verarbeitung mit Idempotenz
"""

from flask import Blueprint, request, jsonify, current_app
import stripe
import os
import hmac
import hashlib
import time
from datetime import datetime, timezone
from functools import wraps
from supabase import create_client
import logging

bp = Blueprint('stripe', __name__, url_prefix='/stripe')

# Logging
logger = logging.getLogger(__name__)

# Stripe Configuration
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')
IS_TEST_MODE = os.getenv('STRIPE_TEST_MODE', 'false').lower() == 'true'

# Supabase Client
supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

# Price IDs (aus Stripe Dashboard)
PRICE_IDS = {
    'basis': os.getenv('STRIPE_PRICE_BASIS'),
    'premium': os.getenv('STRIPE_PRICE_PREMIUM'),
    'vip': os.getenv('STRIPE_PRICE_VIP')
}

TIER_FROM_PRICE = {v: k for k, v in PRICE_IDS.items() if v}

# Frontend URLs
FRONTEND_URL = os.getenv('POD_AUTOM_FRONTEND_URL', 'http://localhost:5173')


# ============================================
# JWT Authentication Decorator
# ============================================

def verify_jwt(f):
    """Verifiziert JWT Token aus Authorization Header"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ')[1]

        try:
            # Verify with Supabase
            user = supabase.auth.get_user(token)
            if not user or not user.user:
                return jsonify({'error': 'Invalid token'}), 401

            request.user_id = user.user.id
            request.user_email = user.user.email

        except Exception as e:
            logger.error(f"JWT verification failed: {e}")
            return jsonify({'error': 'Token verification failed'}), 401

        return f(*args, **kwargs)
    return decorated


# ============================================
# Rate Limiting (Simple In-Memory)
# ============================================

rate_limit_store = {}
RATE_LIMIT_REQUESTS = 10
RATE_LIMIT_WINDOW = 60  # seconds


def check_rate_limit(identifier: str) -> bool:
    """Prüft Rate Limit für einen Identifier"""
    now = time.time()

    if identifier not in rate_limit_store:
        rate_limit_store[identifier] = []

    # Alte Einträge entfernen
    rate_limit_store[identifier] = [
        t for t in rate_limit_store[identifier]
        if now - t < RATE_LIMIT_WINDOW
    ]

    if len(rate_limit_store[identifier]) >= RATE_LIMIT_REQUESTS:
        return False

    rate_limit_store[identifier].append(now)
    return True


def rate_limit(f):
    """Rate Limiting Decorator"""
    @wraps(f)
    def decorated(*args, **kwargs):
        identifier = request.headers.get('X-Forwarded-For', request.remote_addr)

        if not check_rate_limit(identifier):
            return jsonify({
                'error': 'Rate limit exceeded. Please try again later.'
            }), 429

        return f(*args, **kwargs)
    return decorated


# ============================================
# API Endpoints
# ============================================

@bp.route('/create-checkout-session', methods=['POST'])
@verify_jwt
@rate_limit
def create_checkout_session():
    """
    Erstellt Stripe Checkout Session für neue Subscription

    Request Body:
        tier: 'basis' | 'premium' | 'vip'
        success_url?: string
        cancel_url?: string

    Response:
        session_id: string
        url: string
    """
    try:
        data = request.get_json() or {}
        tier = data.get('tier')

        # Validierung
        if not tier or tier not in PRICE_IDS:
            return jsonify({
                'error': 'Invalid tier. Must be one of: basis, premium, vip'
            }), 400

        price_id = PRICE_IDS[tier]
        if not price_id:
            return jsonify({
                'error': f'Price ID not configured for tier: {tier}'
            }), 500

        user_id = request.user_id
        user_email = request.user_email

        # URLs
        success_url = data.get('success_url') or f"{FRONTEND_URL}/settings?checkout=success"
        cancel_url = data.get('cancel_url') or f"{FRONTEND_URL}/settings?checkout=cancel"

        # Existing customer check
        existing_sub = supabase.table('pod_autom_subscriptions').select(
            'stripe_customer_id, status'
        ).eq('user_id', user_id).maybeSingle().execute()

        customer_id = None

        if existing_sub.data:
            # Prüfe ob bereits aktive Subscription
            if existing_sub.data.get('status') == 'active':
                return jsonify({
                    'error': 'Active subscription exists. Use portal to change plan.'
                }), 400

            customer_id = existing_sub.data.get('stripe_customer_id')

        # Create or retrieve Stripe Customer
        if not customer_id:
            customer = stripe.Customer.create(
                email=user_email,
                metadata={
                    'pod_autom_user_id': user_id,
                    'source': 'pod_autom'
                }
            )
            customer_id = customer.id
            logger.info(f"Created Stripe customer {customer_id} for user {user_id}")

        # Create Checkout Session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card', 'sepa_debit'],  # EU-Payment Methods
            line_items=[{
                'price': price_id,
                'quantity': 1
            }],
            mode='subscription',
            success_url=success_url + '&session_id={CHECKOUT_SESSION_ID}',
            cancel_url=cancel_url,
            allow_promotion_codes=True,
            billing_address_collection='required',
            customer_update={
                'address': 'auto',
                'name': 'auto'
            },
            subscription_data={
                'metadata': {
                    'pod_autom_user_id': user_id,
                    'tier': tier
                }
            },
            metadata={
                'pod_autom_user_id': user_id,
                'tier': tier
            },
            locale='de'  # Deutsche Sprache
        )

        logger.info(f"Created checkout session {session.id} for user {user_id}, tier {tier}")

        return jsonify({
            'session_id': session.id,
            'url': session.url
        })

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error in create_checkout_session: {e}")
        return jsonify({
            'error': 'Payment service error. Please try again.',
            'code': e.code if hasattr(e, 'code') else None
        }), 400

    except Exception as e:
        logger.exception(f"Unexpected error in create_checkout_session: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@bp.route('/create-portal-session', methods=['POST'])
@verify_jwt
@rate_limit
def create_portal_session():
    """
    Erstellt Stripe Customer Portal Session für Subscription-Verwaltung

    Request Body:
        return_url?: string

    Response:
        url: string
    """
    try:
        data = request.get_json() or {}
        return_url = data.get('return_url') or f"{FRONTEND_URL}/settings"

        user_id = request.user_id

        # Get customer ID
        sub = supabase.table('pod_autom_subscriptions').select(
            'stripe_customer_id'
        ).eq('user_id', user_id).maybeSingle().execute()

        if not sub.data or not sub.data.get('stripe_customer_id'):
            return jsonify({
                'error': 'No subscription found. Please subscribe first.'
            }), 404

        customer_id = sub.data['stripe_customer_id']

        # Create Portal Session
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
            locale='de'
        )

        logger.info(f"Created portal session for user {user_id}")

        return jsonify({'url': session.url})

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error in create_portal_session: {e}")
        return jsonify({
            'error': 'Payment service error. Please try again.'
        }), 400

    except Exception as e:
        logger.exception(f"Unexpected error in create_portal_session: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@bp.route('/webhook', methods=['POST'])
def webhook():
    """
    Handle Stripe Webhooks mit Idempotenz

    Verarbeitet:
    - checkout.session.completed
    - customer.subscription.created
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.paid
    - invoice.payment_failed
    """
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')

    if not sig_header:
        logger.warning("Webhook received without signature")
        return jsonify({'error': 'Missing signature'}), 400

    # Verify Webhook Signature
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {e}")
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid webhook signature: {e}")
        return jsonify({'error': 'Invalid signature'}), 400

    event_id = event['id']
    event_type = event['type']

    # Idempotenz-Check: Event bereits verarbeitet?
    existing_event = supabase.table('pod_autom_stripe_webhook_events').select(
        'id'
    ).eq('event_id', event_id).maybeSingle().execute()

    if existing_event.data:
        logger.info(f"Webhook event {event_id} already processed, skipping")
        return jsonify({'received': True, 'status': 'already_processed'})

    # Event verarbeiten
    try:
        data_object = event['data']['object']

        if event_type == 'checkout.session.completed':
            handle_checkout_completed(data_object)

        elif event_type == 'customer.subscription.created':
            handle_subscription_created(data_object)

        elif event_type == 'customer.subscription.updated':
            handle_subscription_updated(data_object)

        elif event_type == 'customer.subscription.deleted':
            handle_subscription_deleted(data_object)

        elif event_type == 'invoice.paid':
            handle_invoice_paid(data_object)

        elif event_type == 'invoice.payment_failed':
            handle_payment_failed(data_object)

        # Event als verarbeitet markieren
        supabase.table('pod_autom_stripe_webhook_events').insert({
            'event_id': event_id,
            'event_type': event_type,
            'payload': event['data']
        }).execute()

        logger.info(f"Successfully processed webhook event {event_id} ({event_type})")
        return jsonify({'received': True, 'status': 'processed'})

    except Exception as e:
        # Event mit Fehler loggen
        supabase.table('pod_autom_stripe_webhook_events').insert({
            'event_id': event_id,
            'event_type': event_type,
            'payload': event['data'],
            'error_message': str(e)
        }).execute()

        logger.exception(f"Error processing webhook event {event_id}: {e}")
        # Stripe erwartet 200, sonst Retry
        return jsonify({'received': True, 'status': 'error', 'message': str(e)}), 200


# ============================================
# Webhook Event Handlers
# ============================================

def handle_checkout_completed(session: dict):
    """Handle successful checkout"""
    user_id = session.get('metadata', {}).get('pod_autom_user_id')
    tier = session.get('metadata', {}).get('tier')
    customer_id = session.get('customer')
    subscription_id = session.get('subscription')

    if not user_id or not subscription_id:
        logger.warning(f"Checkout completed but missing user_id or subscription_id")
        return

    # Get subscription details from Stripe
    subscription = stripe.Subscription.retrieve(subscription_id)

    current_period_start = datetime.fromtimestamp(
        subscription.current_period_start, tz=timezone.utc
    ).isoformat()
    current_period_end = datetime.fromtimestamp(
        subscription.current_period_end, tz=timezone.utc
    ).isoformat()

    # Upsert subscription
    supabase.rpc('upsert_pod_autom_subscription', {
        'p_user_id': user_id,
        'p_tier': tier or 'basis',
        'p_stripe_customer_id': customer_id,
        'p_stripe_subscription_id': subscription_id,
        'p_status': 'active',
        'p_current_period_start': current_period_start,
        'p_current_period_end': current_period_end,
        'p_cancel_at_period_end': False
    }).execute()

    logger.info(f"Subscription created for user {user_id}, tier {tier}")


def handle_subscription_created(subscription: dict):
    """Handle new subscription (alternative to checkout)"""
    subscription_id = subscription['id']
    customer_id = subscription['customer']
    status = subscription['status']

    # Get tier from price
    price_id = subscription['items']['data'][0]['price']['id']
    tier = TIER_FROM_PRICE.get(price_id, 'basis')

    # Get user_id from metadata or customer
    user_id = subscription.get('metadata', {}).get('pod_autom_user_id')

    if not user_id:
        # Try to find user by customer_id
        existing = supabase.table('pod_autom_subscriptions').select(
            'user_id'
        ).eq('stripe_customer_id', customer_id).maybeSingle().execute()

        if existing.data:
            user_id = existing.data['user_id']

    if not user_id:
        logger.warning(f"Subscription created but no user found: {subscription_id}")
        return

    current_period_start = datetime.fromtimestamp(
        subscription['current_period_start'], tz=timezone.utc
    ).isoformat()
    current_period_end = datetime.fromtimestamp(
        subscription['current_period_end'], tz=timezone.utc
    ).isoformat()

    supabase.rpc('upsert_pod_autom_subscription', {
        'p_user_id': user_id,
        'p_tier': tier,
        'p_stripe_customer_id': customer_id,
        'p_stripe_subscription_id': subscription_id,
        'p_status': map_stripe_status(status),
        'p_current_period_start': current_period_start,
        'p_current_period_end': current_period_end,
        'p_cancel_at_period_end': subscription.get('cancel_at_period_end', False)
    }).execute()

    logger.info(f"Subscription {subscription_id} created for user {user_id}")


def handle_subscription_updated(subscription: dict):
    """Handle subscription update (plan change, renewal, cancellation schedule)"""
    subscription_id = subscription['id']
    status = subscription['status']
    cancel_at_period_end = subscription.get('cancel_at_period_end', False)

    # Get tier from price
    price_id = subscription['items']['data'][0]['price']['id']
    tier = TIER_FROM_PRICE.get(price_id, 'basis')

    current_period_start = datetime.fromtimestamp(
        subscription['current_period_start'], tz=timezone.utc
    ).isoformat()
    current_period_end = datetime.fromtimestamp(
        subscription['current_period_end'], tz=timezone.utc
    ).isoformat()

    canceled_at = None
    if subscription.get('canceled_at'):
        canceled_at = datetime.fromtimestamp(
            subscription['canceled_at'], tz=timezone.utc
        ).isoformat()

    update_data = {
        'tier': tier,
        'status': map_stripe_status(status),
        'current_period_start': current_period_start,
        'current_period_end': current_period_end,
        'cancel_at_period_end': cancel_at_period_end
    }

    if canceled_at:
        update_data['canceled_at'] = canceled_at

    supabase.table('pod_autom_subscriptions').update(
        update_data
    ).eq('stripe_subscription_id', subscription_id).execute()

    logger.info(f"Subscription {subscription_id} updated: status={status}, tier={tier}")


def handle_subscription_deleted(subscription: dict):
    """Handle subscription cancellation (immediate)"""
    subscription_id = subscription['id']

    canceled_at = datetime.now(timezone.utc).isoformat()
    if subscription.get('canceled_at'):
        canceled_at = datetime.fromtimestamp(
            subscription['canceled_at'], tz=timezone.utc
        ).isoformat()

    supabase.table('pod_autom_subscriptions').update({
        'status': 'canceled',
        'canceled_at': canceled_at
    }).eq('stripe_subscription_id', subscription_id).execute()

    logger.info(f"Subscription {subscription_id} deleted/canceled")


def handle_invoice_paid(invoice: dict):
    """Handle successful invoice payment (renewal)"""
    subscription_id = invoice.get('subscription')
    if not subscription_id:
        return

    # Subscription auf active setzen
    supabase.table('pod_autom_subscriptions').update({
        'status': 'active'
    }).eq('stripe_subscription_id', subscription_id).execute()

    logger.info(f"Invoice paid for subscription {subscription_id}")


def handle_payment_failed(invoice: dict):
    """Handle failed payment"""
    subscription_id = invoice.get('subscription')
    if not subscription_id:
        return

    # Status auf past_due setzen
    supabase.table('pod_autom_subscriptions').update({
        'status': 'past_due'
    }).eq('stripe_subscription_id', subscription_id).execute()

    logger.info(f"Payment failed for subscription {subscription_id}")

    # TODO: Benachrichtigung an User senden
    # - E-Mail über Supabase Edge Function
    # - In-App Notification


def map_stripe_status(stripe_status: str) -> str:
    """Map Stripe subscription status to internal status"""
    status_map = {
        'active': 'active',
        'past_due': 'past_due',
        'canceled': 'canceled',
        'trialing': 'trialing',
        'incomplete': 'incomplete',
        'incomplete_expired': 'incomplete_expired',
        'unpaid': 'unpaid',
        'paused': 'paused'
    }
    return status_map.get(stripe_status, 'incomplete')


# ============================================
# Health Check
# ============================================

@bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'stripe',
        'test_mode': IS_TEST_MODE,
        'prices_configured': all(PRICE_IDS.values())
    })
```

### backend/api/main.py (Blueprint Registration)

```python
# In main.py hinzufügen:

from routes.stripe_routes import bp as stripe_bp

# Nach anderen Blueprint-Registrierungen:
app.register_blueprint(stripe_bp)
```

---

## 4. Frontend: Stripe Hooks

### src/hooks/useStripe.ts

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@src/contexts/AuthContext'
import { API_URL } from '@src/lib/constants'
import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionResponse,
  SubscriptionTier
} from '@src/types/stripe.types'

/**
 * Hook zum Erstellen einer Stripe Checkout Session
 */
export function useCreateCheckoutSession() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tier: SubscriptionTier): Promise<string> => {
      if (!session?.access_token) {
        throw new Error('Nicht authentifiziert')
      }

      const response = await fetch(`${API_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          tier,
          success_url: `${window.location.origin}/settings?checkout=success`,
          cancel_url: `${window.location.origin}/settings?checkout=cancel`
        } satisfies CreateCheckoutSessionRequest)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Checkout konnte nicht erstellt werden')
      }

      const data: CreateCheckoutSessionResponse = await response.json()
      return data.url
    },

    onError: (error: Error) => {
      console.error('Checkout session error:', error)
      toast.error('Fehler beim Starten des Checkouts', {
        description: error.message
      })
    },

    onSuccess: () => {
      // Cache invalidieren nach Rückkehr
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    }
  })
}

/**
 * Hook zum Erstellen einer Stripe Customer Portal Session
 */
export function useCreatePortalSession() {
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (): Promise<string> => {
      if (!session?.access_token) {
        throw new Error('Nicht authentifiziert')
      }

      const response = await fetch(`${API_URL}/stripe/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          return_url: `${window.location.origin}/settings`
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Portal konnte nicht geöffnet werden')
      }

      const data: CreatePortalSessionResponse = await response.json()
      return data.url
    },

    onError: (error: Error) => {
      console.error('Portal session error:', error)
      toast.error('Fehler beim Öffnen des Portals', {
        description: error.message
      })
    }
  })
}

/**
 * Hook zum Verarbeiten von Checkout-Callbacks
 */
export function useCheckoutCallback() {
  const queryClient = useQueryClient()

  const processCallback = (searchParams: URLSearchParams) => {
    const checkoutStatus = searchParams.get('checkout')
    const sessionId = searchParams.get('session_id')

    if (checkoutStatus === 'success') {
      toast.success('Zahlung erfolgreich!', {
        description: 'Dein Abonnement wurde aktiviert.'
      })
      // Subscription-Daten neu laden
      queryClient.invalidateQueries({ queryKey: ['subscription'] })

      // URL bereinigen
      window.history.replaceState({}, '', '/settings')
      return 'success'
    }

    if (checkoutStatus === 'cancel') {
      toast.info('Checkout abgebrochen', {
        description: 'Du kannst jederzeit ein Abonnement abschließen.'
      })
      window.history.replaceState({}, '', '/settings')
      return 'cancel'
    }

    return null
  }

  return { processCallback }
}
```

---

## 5. Frontend: PricingCard Komponente

### src/components/PricingCard.tsx

```typescript
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useCreateCheckoutSession } from '@src/hooks/useStripe'
import { Check, Loader2, Sparkles, Crown, Zap } from 'lucide-react'
import { SUBSCRIPTION_TIERS } from '@src/lib/constants'
import type { SubscriptionTier } from '@src/types/stripe.types'

interface PricingCardProps {
  tier: SubscriptionTier
  isPopular?: boolean
  showCurrentBadge?: boolean
}

export default function PricingCard({
  tier,
  isPopular = false,
  showCurrentBadge = true
}: PricingCardProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { tier: currentTier, isActive } = useSubscription()
  const checkoutMutation = useCreateCheckoutSession()

  const plan = SUBSCRIPTION_TIERS[tier]
  const isCurrentPlan = currentTier === tier && isActive
  const isUpgrade = currentTier && getTierOrder(tier) > getTierOrder(currentTier)
  const isDowngrade = currentTier && getTierOrder(tier) < getTierOrder(currentTier)

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/register', { state: { selectedTier: tier } })
      return
    }

    try {
      const url = await checkoutMutation.mutateAsync(tier)
      window.location.href = url
    } catch {
      // Error wird in Hook behandelt
    }
  }

  const features = getFeatures(tier, plan)

  const tierIcons: Record<SubscriptionTier, typeof Crown> = {
    basis: Zap,
    premium: Sparkles,
    vip: Crown
  }
  const TierIcon = tierIcons[tier]

  return (
    <div
      className={`
        card relative flex flex-col
        ${isPopular ? 'border-primary ring-2 ring-primary/20' : ''}
        ${isCurrentPlan ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
      `}
      role="article"
      aria-labelledby={`pricing-${tier}-title`}
    >
      {/* Popular Badge */}
      {isPopular && !isCurrentPlan && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2"
          aria-label="Beliebtester Plan"
        >
          <div className="flex items-center gap-1 bg-primary text-white text-sm font-medium px-3 py-1 rounded-full">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Beliebt
          </div>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && showCurrentBadge && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2"
          aria-label="Dein aktueller Plan"
        >
          <div className="flex items-center gap-1 bg-emerald-500 text-white text-sm font-medium px-3 py-1 rounded-full">
            <Check className="w-4 h-4" aria-hidden="true" />
            Aktuell
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6 pt-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-highlight mb-3">
          <TierIcon
            className={`w-6 h-6 ${tier === 'vip' ? 'text-amber-400' : tier === 'premium' ? 'text-primary' : 'text-zinc-400'}`}
            aria-hidden="true"
          />
        </div>
        <h3
          id={`pricing-${tier}-title`}
          className="text-xl font-bold mb-2 capitalize"
        >
          {tier}
        </h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold">{plan.price}€</span>
          <span className="text-zinc-400">/Monat</span>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          zzgl. MwSt.
        </p>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-1" aria-label={`Features des ${tier} Plans`}>
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check
              className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={handleSubscribe}
        disabled={isCurrentPlan || checkoutMutation.isPending}
        aria-busy={checkoutMutation.isPending}
        aria-describedby={isCurrentPlan ? `current-plan-${tier}` : undefined}
        className={`
          w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium
          transition-all duration-200
          ${isCurrentPlan
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            : isPopular
              ? 'btn-primary'
              : 'btn-secondary hover:bg-primary hover:text-white'
          }
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface
        `}
      >
        {checkoutMutation.isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            <span>Wird geladen...</span>
          </>
        ) : isCurrentPlan ? (
          <>
            <Check className="w-5 h-5" aria-hidden="true" />
            <span id={`current-plan-${tier}`}>Aktueller Plan</span>
          </>
        ) : isUpgrade ? (
          'Jetzt upgraden'
        ) : isDowngrade ? (
          'Plan wechseln'
        ) : (
          'Jetzt starten'
        )}
      </button>
    </div>
  )
}

// Helper Functions

function getTierOrder(tier: SubscriptionTier): number {
  const order: Record<SubscriptionTier, number> = {
    basis: 1,
    premium: 2,
    vip: 3
  }
  return order[tier]
}

function getFeatures(tier: SubscriptionTier, plan: typeof SUBSCRIPTION_TIERS['basis']): string[] {
  const platformFeature = {
    basis: 'Pinterest ODER Meta Ads',
    premium: 'Pinterest + Meta Ads',
    vip: 'Alle Ad-Plattformen'
  }

  const features = [
    platformFeature[tier],
    plan.maxNiches === -1 ? 'Unbegrenzte Nischen' : `${plan.maxNiches} Nischen`,
    plan.maxProducts === -1 ? 'Unbegrenzte Produkte' : `${plan.maxProducts} Produkte/Monat`,
    'Automatische Produkterstellung',
    'KI-optimierte Titel & Beschreibungen'
  ]

  if (plan.winnerScaling) {
    features.push('Winner Scaling Automation')
  }

  if (plan.advancedAnalytics) {
    features.push('Advanced Analytics Dashboard')
  }

  const supportText = {
    'email': 'E-Mail Support',
    'priority': 'Priority Support',
    '1:1': 'Persönlicher 1:1 Support'
  }
  features.push(supportText[plan.support])

  return features
}
```

---

## 6. Stripe Dashboard Konfiguration

### Produkte erstellen

1. **Stripe Dashboard → Products**

| Produkt | Preis | Billing |
|---------|-------|---------|
| POD AutoM Basis | 200€ | Monatlich |
| POD AutoM Premium | 500€ | Monatlich |
| POD AutoM VIP | 835€ | Monatlich |

2. **Customer Portal aktivieren:**
   - Settings → Billing → Customer Portal
   - ✅ Subscription kündigen erlauben
   - ✅ Plan wechseln erlauben
   - ✅ Zahlungsmethode ändern erlauben

3. **Webhook einrichten:**
   - Developers → Webhooks → Add endpoint
   - URL: `https://your-api.com/stripe/webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`

---

## 7. Umgebungsvariablen

### Backend (.env)

```env
# Stripe API
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_TEST_MODE=false

# Stripe Price IDs
STRIPE_PRICE_BASIS=price_xxx
STRIPE_PRICE_PREMIUM=price_xxx
STRIPE_PRICE_VIP=price_xxx

# Frontend URL
POD_AUTOM_FRONTEND_URL=https://app.pod-autom.de
```

### Frontend (.env)

```env
# Stripe Public Key (optional, nur für Stripe.js)
VITE_STRIPE_PUBLIC_KEY=pk_live_xxx
```

---

## 8. Verifizierung

### Funktionale Tests
- [ ] Checkout Session wird mit JWT erstellt
- [ ] Redirect zu Stripe Checkout funktioniert
- [ ] SEPA Debit als Zahlungsmethode verfügbar
- [ ] Webhook empfängt und verarbeitet Events
- [ ] Idempotenz: Doppelte Events werden ignoriert
- [ ] Subscription wird in DB korrekt gespeichert
- [ ] Portal Session funktioniert
- [ ] Plan-Wechsel (Up-/Downgrade) funktioniert
- [ ] Kündigung funktioniert
- [ ] Payment Failed → Status wird auf `past_due` gesetzt

### Sicherheitstests
- [ ] Endpoints ohne JWT geben 401 zurück
- [ ] Rate Limiting funktioniert (10 Requests/Minute)
- [ ] Webhook ohne Signatur gibt 400 zurück
- [ ] Ungültige Tier-Werte werden abgelehnt

### Accessibility Tests
- [ ] PricingCard hat korrekte ARIA-Labels
- [ ] Keyboard-Navigation funktioniert
- [ ] Screen Reader liest Features korrekt vor
- [ ] Focus-States sind sichtbar

---

## 9. Abhängigkeiten

- Stripe Account mit Produkten konfiguriert
- Backend API läuft mit Flask
- Supabase mit `pod_autom_subscriptions` Tabelle
- Frontend mit `@tanstack/react-query` und `sonner`

---

## 10. Nächster Schritt

→ Phase 6.2 - Subscription Management
