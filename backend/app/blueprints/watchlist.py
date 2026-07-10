from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, Watchlist, WatchlistItem, User

watchlist_bp = Blueprint('watchlist', __name__)

@watchlist_bp.route('', methods=['GET'])
@jwt_required()
def get_watchlists():
    user_id = get_jwt_identity()
    watchlists = Watchlist.query.filter_by(user_id=user_id).all()
    
    # If user doesn't have any watchlist, create a default one
    if not watchlists:
        default_wl = Watchlist(name="My Watchlist", user_id=user_id)
        db.session.add(default_wl)
        db.session.commit()
        
        # Add a couple of default symbols: RELIANCE, AAPL, TCS
        for sym in ["RELIANCE", "AAPL", "TCS"]:
            item = WatchlistItem(watchlist_id=default_wl.id, symbol=sym)
            db.session.add(item)
        db.session.commit()
        
        watchlists = [default_wl]
        
    return jsonify([w.to_dict() for w in watchlists]), 200


@watchlist_bp.route('', methods=['POST'])
@jwt_required()
def create_watchlist():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    name = data.get('name')
    
    if not name:
        return jsonify({'error': 'Watchlist name is required'}), 400
        
    wl = Watchlist(name=name, user_id=user_id)
    db.session.add(wl)
    db.session.commit()
    
    return jsonify(wl.to_dict()), 201


@watchlist_bp.route('/<int:wl_id>', methods=['DELETE'])
@jwt_required()
def delete_watchlist(wl_id):
    user_id = get_jwt_identity()
    wl = Watchlist.query.filter_by(id=wl_id, user_id=user_id).first()
    if not wl:
        return jsonify({'error': 'Watchlist not found'}), 404
        
    db.session.delete(wl)
    db.session.commit()
    return jsonify({'message': 'Watchlist deleted successfully'}), 200


@watchlist_bp.route('/<int:wl_id>/items', methods=['POST'])
@jwt_required()
def add_watchlist_item(wl_id):
    user_id = get_jwt_identity()
    wl = Watchlist.query.filter_by(id=wl_id, user_id=user_id).first()
    if not wl:
        return jsonify({'error': 'Watchlist not found'}), 404
        
    data = request.get_json() or {}
    symbol = data.get('symbol', '').upper()
    if not symbol:
        return jsonify({'error': 'Symbol is required'}), 400
        
    # Check if already exists in this watchlist
    existing = WatchlistItem.query.filter_by(watchlist_id=wl.id, symbol=symbol).first()
    if existing:
        return jsonify({'error': 'Symbol already in watchlist'}), 400
        
    item = WatchlistItem(watchlist_id=wl.id, symbol=symbol)
    db.session.add(item)
    db.session.commit()
    
    return jsonify(wl.to_dict()), 200


@watchlist_bp.route('/<int:wl_id>/items/<symbol>', methods=['DELETE'])
@jwt_required()
def remove_watchlist_item(wl_id, symbol):
    user_id = get_jwt_identity()
    symbol = symbol.upper()
    wl = Watchlist.query.filter_by(id=wl_id, user_id=user_id).first()
    if not wl:
        return jsonify({'error': 'Watchlist not found'}), 404
        
    item = WatchlistItem.query.filter_by(watchlist_id=wl.id, symbol=symbol).first()
    if not item:
        return jsonify({'error': 'Symbol not found in watchlist'}), 404
        
    db.session.delete(item)
    db.session.commit()
    
    return jsonify(wl.to_dict()), 200
