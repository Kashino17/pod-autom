"""
ReBoss API Service
Shopify Proxy + Pinterest OAuth + Health Check
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)

# Enable CORS for all routes
CORS(app, origins=['*'], supports_credentials=True)

# Import and register blueprints
from routes.shopify import shopify_bp
from routes.pinterest_oauth import pinterest_bp

app.register_blueprint(shopify_bp)
app.register_blueprint(pinterest_bp)


@app.route('/')
def index():
    """Root endpoint"""
    return jsonify({
        'name': 'ReBoss API',
        'version': '1.0.0',
        'status': 'running'
    })


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'reboss-api'
    })


@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
