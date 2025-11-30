"""
Auth Routes - Admin user management using Supabase Service Role
"""
from flask import Blueprint, request, jsonify
import os
import requests

auth_bp = Blueprint('auth', __name__)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')


@auth_bp.route('/api/auth/create-user', methods=['POST'])
def create_user():
    """
    Create a user with email pre-confirmed (bypasses email verification)
    Uses Supabase Admin API with Service Role Key
    """
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name', '')

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password required'}), 400

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return jsonify({'success': False, 'error': 'Supabase not configured'}), 500

    try:
        # Create user via Supabase Admin API
        response = requests.post(
            f'{SUPABASE_URL}/auth/v1/admin/users',
            headers={
                'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
                'apikey': SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json'
            },
            json={
                'email': email,
                'password': password,
                'email_confirm': True,  # Auto-confirm email
                'user_metadata': {
                    'full_name': full_name
                }
            }
        )

        if response.status_code in [200, 201]:
            user_data = response.json()
            return jsonify({
                'success': True,
                'user': {
                    'id': user_data.get('id'),
                    'email': user_data.get('email')
                },
                'message': 'User created and email confirmed'
            })
        else:
            error_data = response.json()
            return jsonify({
                'success': False,
                'error': error_data.get('message', error_data.get('msg', 'Failed to create user'))
            }), response.status_code

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/api/auth/confirm-email', methods=['POST'])
def confirm_email():
    """
    Manually confirm a user's email (for existing users)
    """
    data = request.get_json()
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'success': False, 'error': 'user_id required'}), 400

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return jsonify({'success': False, 'error': 'Supabase not configured'}), 500

    try:
        # Update user to confirm email
        response = requests.put(
            f'{SUPABASE_URL}/auth/v1/admin/users/{user_id}',
            headers={
                'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
                'apikey': SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json'
            },
            json={
                'email_confirm': True
            }
        )

        if response.status_code == 200:
            return jsonify({
                'success': True,
                'message': 'Email confirmed'
            })
        else:
            error_data = response.json()
            return jsonify({
                'success': False,
                'error': error_data.get('message', 'Failed to confirm email')
            }), response.status_code

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/api/auth/list-users', methods=['GET'])
def list_users():
    """
    List all users (admin only)
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return jsonify({'success': False, 'error': 'Supabase not configured'}), 500

    try:
        response = requests.get(
            f'{SUPABASE_URL}/auth/v1/admin/users',
            headers={
                'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
                'apikey': SUPABASE_SERVICE_KEY
            }
        )

        if response.status_code == 200:
            data = response.json()
            users = data.get('users', [])
            return jsonify({
                'success': True,
                'users': [{
                    'id': u.get('id'),
                    'email': u.get('email'),
                    'email_confirmed': u.get('email_confirmed_at') is not None,
                    'created_at': u.get('created_at')
                } for u in users]
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to list users'
            }), response.status_code

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/api/auth/delete-user', methods=['DELETE'])
def delete_user():
    """
    Delete a user by ID
    """
    data = request.get_json()
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'success': False, 'error': 'user_id required'}), 400

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return jsonify({'success': False, 'error': 'Supabase not configured'}), 500

    try:
        response = requests.delete(
            f'{SUPABASE_URL}/auth/v1/admin/users/{user_id}',
            headers={
                'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
                'apikey': SUPABASE_SERVICE_KEY
            }
        )

        if response.status_code in [200, 204]:
            return jsonify({
                'success': True,
                'message': 'User deleted'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to delete user'
            }), response.status_code

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
