"""
Stripe Webhook Routes for POD AutoM Subscriptions
Handles subscription lifecycle events from Stripe
"""
import os
import stripe
from flask import Blueprint, request, jsonify
from supabase import create_client, Client

stripe_bp = Blueprint('stripe', __name__)

# Stripe configuration
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')

# Initialize Stripe
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Supabase client
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')


def get_supabase() -> Client:
    """Get Supabase client"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise Exception('Missing Supabase configuration')
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_tier_from_price(price_id: str) -> str:
    """Map Stripe price ID to subscription tier"""
    price_tier_map = {
        os.environ.get('STRIPE_PRICE_BASIS'): 'basis',
        os.environ.get('STRIPE_PRICE_PREMIUM'): 'premium',
        os.environ.get('STRIPE_PRICE_VIP'): 'vip',
    }
    return price_tier_map.get(price_id, 'basis')


@stripe_bp.route('/api/stripe/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events"""
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')

    if not STRIPE_WEBHOOK_SECRET:
        print("Warning: STRIPE_WEBHOOK_SECRET not configured")
        return jsonify({'error': 'Webhook not configured'}), 500

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        print(f"Invalid payload: {e}")
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        print(f"Invalid signature: {e}")
        return jsonify({'error': 'Invalid signature'}), 400

    event_type = event['type']
    data = event['data']['object']

    print(f"Received Stripe event: {event_type}")

    try:
        # Handle different event types
        if event_type == 'checkout.session.completed':
            handle_checkout_completed(data)

        elif event_type == 'customer.subscription.created':
            handle_subscription_created(data)

        elif event_type == 'customer.subscription.updated':
            handle_subscription_updated(data)

        elif event_type == 'customer.subscription.deleted':
            handle_subscription_deleted(data)

        elif event_type == 'invoice.paid':
            handle_invoice_paid(data)

        elif event_type == 'invoice.payment_failed':
            handle_invoice_payment_failed(data)

        else:
            print(f"Unhandled event type: {event_type}")

        return jsonify({'received': True})

    except Exception as e:
        print(f"Error handling webhook: {e}")
        return jsonify({'error': str(e)}), 500


def handle_checkout_completed(session):
    """Handle successful checkout session"""
    customer_id = session.get('customer')
    subscription_id = session.get('subscription')
    client_reference_id = session.get('client_reference_id')  # user_id

    if not client_reference_id:
        print("No client_reference_id in checkout session")
        return

    print(f"Checkout completed for user {client_reference_id}")

    supabase = get_supabase()

    # Update or create subscription record
    existing = supabase.table('pod_autom_subscriptions').select('id').eq(
        'user_id', client_reference_id
    ).execute()

    if existing.data:
        supabase.table('pod_autom_subscriptions').update({
            'stripe_customer_id': customer_id,
            'stripe_subscription_id': subscription_id,
            'status': 'active',
            'updated_at': 'now()'
        }).eq('user_id', client_reference_id).execute()
    else:
        supabase.table('pod_autom_subscriptions').insert({
            'user_id': client_reference_id,
            'stripe_customer_id': customer_id,
            'stripe_subscription_id': subscription_id,
            'status': 'active',
            'tier': 'basis'  # Default, will be updated by subscription.created
        }).execute()


def handle_subscription_created(subscription):
    """Handle new subscription created"""
    customer_id = subscription.get('id')
    stripe_customer_id = subscription.get('customer')
    status = subscription.get('status')
    current_period_end = subscription.get('current_period_end')

    # Get price to determine tier
    items = subscription.get('items', {}).get('data', [])
    price_id = items[0].get('price', {}).get('id') if items else None
    tier = get_tier_from_price(price_id)

    print(f"Subscription created: {customer_id}, tier: {tier}, status: {status}")

    supabase = get_supabase()

    # Find user by stripe_customer_id
    result = supabase.table('pod_autom_subscriptions').select('id').eq(
        'stripe_customer_id', stripe_customer_id
    ).execute()

    if result.data:
        supabase.table('pod_autom_subscriptions').update({
            'stripe_subscription_id': customer_id,
            'tier': tier,
            'status': status,
            'current_period_end': current_period_end,
            'updated_at': 'now()'
        }).eq('stripe_customer_id', stripe_customer_id).execute()


def handle_subscription_updated(subscription):
    """Handle subscription update (plan change, status change)"""
    subscription_id = subscription.get('id')
    status = subscription.get('status')
    current_period_end = subscription.get('current_period_end')
    cancel_at_period_end = subscription.get('cancel_at_period_end')

    # Get new tier from price
    items = subscription.get('items', {}).get('data', [])
    price_id = items[0].get('price', {}).get('id') if items else None
    tier = get_tier_from_price(price_id)

    print(f"Subscription updated: {subscription_id}, tier: {tier}, status: {status}")

    supabase = get_supabase()

    update_data = {
        'tier': tier,
        'status': 'canceling' if cancel_at_period_end else status,
        'current_period_end': current_period_end,
        'updated_at': 'now()'
    }

    supabase.table('pod_autom_subscriptions').update(
        update_data
    ).eq('stripe_subscription_id', subscription_id).execute()


def handle_subscription_deleted(subscription):
    """Handle subscription cancellation/deletion"""
    subscription_id = subscription.get('id')

    print(f"Subscription deleted: {subscription_id}")

    supabase = get_supabase()

    supabase.table('pod_autom_subscriptions').update({
        'status': 'canceled',
        'updated_at': 'now()'
    }).eq('stripe_subscription_id', subscription_id).execute()


def handle_invoice_paid(invoice):
    """Handle successful invoice payment"""
    subscription_id = invoice.get('subscription')

    if not subscription_id:
        return

    print(f"Invoice paid for subscription: {subscription_id}")

    supabase = get_supabase()

    # Update subscription status to active
    supabase.table('pod_autom_subscriptions').update({
        'status': 'active',
        'updated_at': 'now()'
    }).eq('stripe_subscription_id', subscription_id).execute()


def handle_invoice_payment_failed(invoice):
    """Handle failed invoice payment"""
    subscription_id = invoice.get('subscription')

    if not subscription_id:
        return

    print(f"Invoice payment failed for subscription: {subscription_id}")

    supabase = get_supabase()

    # Update subscription status
    supabase.table('pod_autom_subscriptions').update({
        'status': 'past_due',
        'updated_at': 'now()'
    }).eq('stripe_subscription_id', subscription_id).execute()


# =====================================================
# SUBSCRIPTION MANAGEMENT ROUTES
# =====================================================

@stripe_bp.route('/api/stripe/create-checkout', methods=['POST'])
def create_checkout_session():
    """Create Stripe Checkout session for subscription"""
    if not STRIPE_SECRET_KEY:
        return jsonify({'error': 'Stripe not configured'}), 500

    try:
        data = request.json
        price_id = data.get('price_id')
        user_id = data.get('user_id')
        success_url = data.get('success_url', os.environ.get('FRONTEND_URL', 'http://localhost:3001') + '/dashboard?subscription=success')
        cancel_url = data.get('cancel_url', os.environ.get('FRONTEND_URL', 'http://localhost:3001') + '/pricing?subscription=canceled')

        if not price_id or not user_id:
            return jsonify({'error': 'price_id und user_id erforderlich'}), 400

        # Check for existing subscription
        supabase = get_supabase()
        existing = supabase.table('pod_autom_subscriptions').select(
            'stripe_customer_id'
        ).eq('user_id', user_id).execute()

        customer_id = None
        if existing.data and existing.data[0].get('stripe_customer_id'):
            customer_id = existing.data[0]['stripe_customer_id']

        # Create checkout session
        session_params = {
            'payment_method_types': ['card'],
            'line_items': [{
                'price': price_id,
                'quantity': 1,
            }],
            'mode': 'subscription',
            'success_url': success_url,
            'cancel_url': cancel_url,
            'client_reference_id': user_id,
            'allow_promotion_codes': True,
        }

        if customer_id:
            session_params['customer'] = customer_id

        session = stripe.checkout.Session.create(**session_params)

        return jsonify({
            'success': True,
            'url': session.url,
            'session_id': session.id
        })

    except stripe.error.StripeError as e:
        print(f"Stripe error: {e}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@stripe_bp.route('/api/stripe/portal', methods=['POST'])
def create_portal_session():
    """Create Stripe Customer Portal session for managing subscription"""
    if not STRIPE_SECRET_KEY:
        return jsonify({'error': 'Stripe not configured'}), 500

    try:
        data = request.json
        user_id = data.get('user_id')
        return_url = data.get('return_url', os.environ.get('FRONTEND_URL', 'http://localhost:3001') + '/settings')

        if not user_id:
            return jsonify({'error': 'user_id erforderlich'}), 400

        # Get customer ID
        supabase = get_supabase()
        result = supabase.table('pod_autom_subscriptions').select(
            'stripe_customer_id'
        ).eq('user_id', user_id).execute()

        if not result.data or not result.data[0].get('stripe_customer_id'):
            return jsonify({'error': 'Kein aktives Abonnement gefunden'}), 404

        customer_id = result.data[0]['stripe_customer_id']

        # Create portal session
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )

        return jsonify({
            'success': True,
            'url': session.url
        })

    except stripe.error.StripeError as e:
        print(f"Stripe error: {e}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
