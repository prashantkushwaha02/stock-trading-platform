from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, Alert
from app.services.market_feed import get_live_price

alerts_bp = Blueprint('alerts', __name__)

@alerts_bp.route('', methods=['GET'])
@jwt_required()
def get_alerts():
    user_id = get_jwt_identity()
    alerts = Alert.query.filter_by(user_id=user_id).all()
    return jsonify([a.to_dict() for a in alerts]), 200


@alerts_bp.route('', methods=['POST'])
@jwt_required()
def create_alert():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    symbol = data.get('symbol', '').upper()
    target_price = data.get('target_price')
    condition = data.get('condition', 'ABOVE').upper()
    
    if not symbol or target_price is None or condition not in ['ABOVE', 'BELOW']:
        return jsonify({'error': 'Invalid alert params'}), 400
        
    alert = Alert(
        user_id=user_id,
        symbol=symbol,
        target_price=float(target_price),
        condition=condition
    )
    db.session.add(alert)
    db.session.commit()
    
    return jsonify(alert.to_dict()), 201


@alerts_bp.route('/<int:alert_id>', methods=['DELETE'])
@jwt_required()
def delete_alert(alert_id):
    user_id = get_jwt_identity()
    alert = Alert.query.filter_by(id=alert_id, user_id=user_id).first()
    if not alert:
        return jsonify({'error': 'Alert not found'}), 404
        
    db.session.delete(alert)
    db.session.commit()
    return jsonify({'message': 'Alert deleted successfully'}), 200


@alerts_bp.route('/check', methods=['POST'])
@jwt_required()
def check_alerts():
    user_id = get_jwt_identity()
    active_alerts = Alert.query.filter_by(user_id=user_id, is_active=True).all()
    triggered = []
    
    for alert in active_alerts:
        try:
            live = get_live_price(alert.symbol)
            price = live["price"]
            
            is_triggered = False
            if alert.condition == 'ABOVE' and price >= alert.target_price:
                is_triggered = True
            elif alert.condition == 'BELOW' and price <= alert.target_price:
                is_triggered = True
                
            if is_triggered:
                alert.is_active = False
                triggered.append({
                    "id": alert.id,
                    "symbol": alert.symbol,
                    "condition": alert.condition,
                    "target_price": alert.target_price,
                    "trigger_price": price,
                    "message": f"ALERT TRIGGERED: {alert.symbol} has gone {alert.condition.lower()} {alert.target_price} (Current: {price})"
                })
        except Exception:
            pass
            
    if triggered:
        db.session.commit()
        
    return jsonify({"triggered": triggered}), 200
