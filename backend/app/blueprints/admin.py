from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, User, Transaction, Holding

admin_bp = Blueprint('admin', __name__)

def admin_required(fn):
    """
    Custom decorator to check if user has admin role
    """
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin privileges required'}), 403
        return fn(*args, **kwargs)
    # Renaming wrapper for Flask routes compatibility
    wrapper.__name__ = fn.__name__
    return jwt_required()(wrapper)


@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    total_users = User.query.count()
    total_transactions = Transaction.query.count()
    
    # Calculate sum of all users balance + value of their stock holdings
    all_users = User.query.all()
    system_total_balance = sum(u.balance for u in all_users)
    
    # Simple transaction volume sum
    total_tx_vol = db.session.query(db.func.sum(Transaction.price * Transaction.quantity)).scalar() or 0.0
    
    # Active orders breakdown
    buy_orders = Transaction.query.filter_by(type='BUY').count()
    sell_orders = Transaction.query.filter_by(type='SELL').count()
    
    return jsonify({
        'total_users': total_users,
        'total_transactions': total_transactions,
        'system_total_balance': system_total_balance,
        'transaction_volume': round(total_tx_vol, 2),
        'buy_orders': buy_orders,
        'sell_orders': sell_orders
    }), 200


@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    users = User.query.all()
    user_list = []
    
    for u in users:
        # Sum user's holdings count
        holdings_cnt = Holding.query.filter_by(user_id=u.id).count()
        tx_cnt = Transaction.query.filter_by(user_id=u.id).count()
        
        ud = u.to_dict()
        ud.update({
            'holdings_count': holdings_cnt,
            'transactions_count': tx_cnt
        })
        user_list.append(ud)
        
    return jsonify(user_list), 200


@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@admin_required
def update_user_role(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json() or {}
    new_role = data.get('role')
    if new_role not in ['user', 'admin']:
        return jsonify({'error': 'Invalid role'}), 400
        
    user.role = new_role
    db.session.commit()
    return jsonify({'message': f'User role updated to {new_role}', 'user': user.to_dict()}), 200


@admin_bp.route('/transactions', methods=['GET'])
@admin_required
def list_all_transactions():
    txs = Transaction.query.order_by(Transaction.timestamp.desc()).all()
    res = []
    for t in txs:
        user = User.query.get(t.user_id)
        td = t.to_dict()
        td['username'] = user.username if user else 'Unknown'
        res.append(td)
    return jsonify(res), 200
