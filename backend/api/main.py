"""
ReBoss API Service
Flask API for Shopify proxy and OAuth flows
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import route blueprints
from routes.shopify import shopify_bp
from routes.pinterest_oauth import pinterest_bp
from routes.auth import auth_bp
from routes.pod_autom import pod_autom_bp
from routes.stripe_webhook import stripe_bp

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3007",
            "http://localhost:5173",
            "https://reboss.app",
            "https://reboss-frontend.onrender.com",
            "https://pod-autom.de",
            "https://app.pod-autom.de"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Register blueprints
app.register_blueprint(shopify_bp)
app.register_blueprint(pinterest_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(pod_autom_bp)
app.register_blueprint(stripe_bp)

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'reboss-api',
        'version': '1.0.0'
    })

@app.route('/')
def root():
    """Root endpoint"""
    return jsonify({
        'message': 'ReBoss API Service',
        'endpoints': {
            'health': '/health',
            'shopify': {
                'test_connection': 'POST /api/shopify/test-connection',
                'get_collections': 'POST /api/shopify/get-collections',
                'get_products': 'POST /api/shopify/get-products'
            },
            'pinterest': {
                'authorize': 'GET /api/oauth/pinterest/authorize',
                'callback': 'GET /api/oauth/pinterest/callback'
            },
            'pod_autom': {
                'shopify_install': 'GET /api/pod-autom/shopify/install',
                'shops': 'GET/POST /api/pod-autom/shops',
                'shop': 'DELETE /api/pod-autom/shops/<shop_id>',
                'test_connection': 'POST /api/pod-autom/shops/<shop_id>/test',
                'settings': 'GET/PUT /api/pod-autom/settings/<shop_id>',
                'niches': 'GET/POST/DELETE /api/pod-autom/niches/<settings_id>',
                'prompts': 'GET/POST /api/pod-autom/prompts/<settings_id>',
                'prompt': 'PUT/DELETE /api/pod-autom/prompts/<settings_id>/<prompt_id>',
                'product_queue': 'GET /api/pod-autom/products/<shop_id>/queue',
                'retry_product': 'POST /api/pod-autom/products/<shop_id>/queue/<product_id>/retry',
                'delete_product': 'DELETE /api/pod-autom/products/<shop_id>/queue/<product_id>'
            },
            'stripe': {
                'webhook': 'POST /api/stripe/webhook',
                'create_checkout': 'POST /api/stripe/create-checkout',
                'customer_portal': 'POST /api/stripe/portal'
            }
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
