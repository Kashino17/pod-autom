"""
Shopify Webhooks Routes
Handles mandatory compliance webhooks and other Shopify webhooks.
All webhooks are verified using HMAC signatures.
"""
import os
import sys
import hmac
import hashlib
import logging
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import JSONResponse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import settings
from services.supabase_service import supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)


# =====================================================
# HMAC VERIFICATION
# =====================================================

def verify_shopify_webhook(data: bytes, hmac_header: str) -> bool:
    """
    Verify Shopify webhook HMAC signature.
    https://shopify.dev/docs/apps/build/webhooks/subscribe/https#step-5-verify-the-webhook
    """
    if not settings.SHOPIFY_CLIENT_SECRET:
        logger.error("SHOPIFY_CLIENT_SECRET not configured")
        return False

    calculated_hmac = hmac.new(
        settings.SHOPIFY_CLIENT_SECRET.encode('utf-8'),
        data,
        hashlib.sha256
    ).digest()

    import base64
    calculated_hmac_base64 = base64.b64encode(calculated_hmac).decode('utf-8')

    return hmac.compare_digest(calculated_hmac_base64, hmac_header)


async def get_verified_webhook_data(request: Request) -> dict:
    """Get and verify webhook data from request."""
    # Get raw body for HMAC verification
    body = await request.body()

    # Get HMAC header
    hmac_header = request.headers.get("X-Shopify-Hmac-Sha256")
    if not hmac_header:
        logger.warning("Missing X-Shopify-Hmac-Sha256 header")
        raise HTTPException(status_code=401, detail="Missing HMAC header")

    # Verify HMAC
    if not verify_shopify_webhook(body, hmac_header):
        logger.warning("Invalid webhook HMAC signature")
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    # Parse JSON
    import json
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    return data


# =====================================================
# MANDATORY COMPLIANCE WEBHOOKS
# https://shopify.dev/docs/apps/build/privacy-law-compliance
# =====================================================

@router.post("/customers/data_request")
async def customers_data_request(request: Request):
    """
    Handle customer data request webhook.
    Sent when a customer requests their data under GDPR/CCPA.

    Your app should respond with the customer's data within 30 days.
    """
    data = await get_verified_webhook_data(request)

    shop_domain = data.get("shop_domain")
    customer = data.get("customer", {})
    customer_id = customer.get("id")
    customer_email = customer.get("email")

    logger.info(f"Customer data request received for shop {shop_domain}, customer {customer_id}")

    # Log the request for manual handling
    # In a real implementation, you would:
    # 1. Collect all data you have about this customer
    # 2. Send it to the shop owner within 30 days

    # For POD AutoM, we likely don't store customer data directly,
    # but we should log this for compliance

    try:
        await supabase_client.log_compliance_request(
            request_type="data_request",
            shop_domain=shop_domain,
            customer_id=str(customer_id) if customer_id else None,
            customer_email=customer_email,
            payload=data
        )
    except Exception as e:
        logger.error(f"Failed to log compliance request: {e}")

    return JSONResponse(content={"success": True}, status_code=200)


@router.post("/customers/redact")
async def customers_redact(request: Request):
    """
    Handle customer redaction webhook.
    Sent when a customer requests deletion of their data under GDPR/CCPA.

    Your app must delete all customer data within 30 days.
    """
    data = await get_verified_webhook_data(request)

    shop_domain = data.get("shop_domain")
    customer = data.get("customer", {})
    customer_id = customer.get("id")
    customer_email = customer.get("email")
    orders_to_redact = data.get("orders_to_redact", [])

    logger.info(f"Customer redact request received for shop {shop_domain}, customer {customer_id}")

    # Delete customer data from our systems
    # For POD AutoM, we might have:
    # - Order data
    # - Generated product data linked to customer orders

    try:
        # Log the request
        await supabase_client.log_compliance_request(
            request_type="customer_redact",
            shop_domain=shop_domain,
            customer_id=str(customer_id) if customer_id else None,
            customer_email=customer_email,
            payload=data
        )

        # Actually delete customer data if we have any
        # This is a placeholder - implement based on what data you store
        await supabase_client.redact_customer_data(
            shop_domain=shop_domain,
            customer_id=str(customer_id) if customer_id else None,
            orders=orders_to_redact
        )
    except Exception as e:
        logger.error(f"Failed to process customer redact: {e}")

    return JSONResponse(content={"success": True}, status_code=200)


@router.post("/shop/redact")
async def shop_redact(request: Request):
    """
    Handle shop redaction webhook.
    Sent 48 hours after a shop uninstalls your app.

    Your app must delete all shop data.
    """
    data = await get_verified_webhook_data(request)

    shop_id = data.get("shop_id")
    shop_domain = data.get("shop_domain")

    logger.info(f"Shop redact request received for shop {shop_domain} (ID: {shop_id})")

    # Delete all data for this shop
    try:
        # Log the request
        await supabase_client.log_compliance_request(
            request_type="shop_redact",
            shop_domain=shop_domain,
            customer_id=None,
            customer_email=None,
            payload=data
        )

        # Delete shop data
        await supabase_client.redact_shop_data(shop_domain=shop_domain)

    except Exception as e:
        logger.error(f"Failed to process shop redact: {e}")

    return JSONResponse(content={"success": True}, status_code=200)


# =====================================================
# APP UNINSTALL WEBHOOK
# =====================================================

@router.post("/app/uninstalled")
async def app_uninstalled(request: Request):
    """
    Handle app uninstall webhook.
    Sent immediately when a shop uninstalls the app.
    """
    data = await get_verified_webhook_data(request)

    shop_domain = data.get("domain") or data.get("myshopify_domain")
    shop_id = data.get("id")

    logger.info(f"App uninstalled from shop {shop_domain}")

    try:
        # Mark shop as disconnected (don't delete yet - wait for shop/redact)
        await supabase_client.mark_shop_disconnected(shop_domain=shop_domain)
    except Exception as e:
        logger.error(f"Failed to process app uninstall: {e}")

    return JSONResponse(content={"success": True}, status_code=200)
