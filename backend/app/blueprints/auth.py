from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models import db, User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({'error': 'Missing required fields'}), 400
        
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
        
    user = User(username=username, email=email)
    user.set_password(password)
    
    # Make the first user an admin for easy testing of admin views
    if User.query.count() == 0:
        user.role = 'admin'
        
    db.session.add(user)
    db.session.commit()
    
    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': 'User registered successfully',
        'token': access_token,
        'user': user.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Missing email or password'}), 400
        
    user = User.query.filter((User.email == email) | (User.username == email)).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401
        
    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': 'Login successful',
        'token': access_token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    return jsonify(user.to_dict()), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json() or {}
    
    # Update username or email if provided and not conflict
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    balance = data.get('balance') # For reset balance trigger
    
    if username and username != user.username:
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already taken'}), 400
        user.username = username
        
    if email and email != user.email:
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already in use'}), 400
        user.email = email
        
    if password:
        user.set_password(password)
        
    if balance is not None:
        user.balance = float(balance)
        
    db.session.commit()
    return jsonify({
        'message': 'Profile updated successfully',
        'user': user.to_dict()
    }), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        # Avoid user enumeration attacks, still return success
        return jsonify({'message': 'If the email exists, a reset code was generated'}), 200
        
    # Standard reset logic
    return jsonify({
        'message': 'Password reset request processed',
        'reset_token': 'zentrade-reset-token-984210' # mock token for local testing
    }), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    token = data.get('token')
    email = data.get('email')
    new_password = data.get('password')
    
    if not token or not email or not new_password:
        return jsonify({'error': 'Missing details'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user or token != 'zentrade-reset-token-984210':
        return jsonify({'error': 'Invalid reset token or email'}), 400
        
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Password reset successfully'}), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    # Since we are using stateless JWT tokens, client simply discards the token.
    # We return a successful response.
    return jsonify({'message': 'Logout successful'}), 200
