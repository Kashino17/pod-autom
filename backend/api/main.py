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

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:3007", "http://localhost:5173", "https://reboss.app"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Register blueprints
app.register_blueprint(shopify_bp)
app.register_blueprint(pinterest_bp)
app.register_blueprint(auth_bp)

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
            }
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
