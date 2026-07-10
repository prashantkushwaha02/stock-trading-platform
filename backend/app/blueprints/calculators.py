from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, Goal

calculators_bp = Blueprint('calculators', __name__)

@calculators_bp.route('/sip', methods=['POST'])
def calculate_sip():
    data = request.get_json() or {}
    p = float(data.get('monthly_investment', 5000))
    r = float(data.get('annual_rate', 12))
    years = float(data.get('years', 5))
    
    i = (r / 100) / 12
    months = int(years * 12)
    
    # Formula: M = P * [((1 + i)^n - 1) / i] * (1 + i)
    future_value = p * (((1 + i)**months - 1) / i) * (1 + i)
    total_invested = p * months
    wealth_gain = future_value - total_invested
    
    return jsonify({
        'total_invested': round(total_invested, 2),
        'wealth_gain': round(wealth_gain, 2),
        'future_value': round(future_value, 2)
    }), 200


@calculators_bp.route('/brokerage', methods=['POST'])
def calculate_brokerage():
    data = request.get_json() or {}
    buy_price = float(data.get('buy_price', 1000))
    sell_price = float(data.get('sell_price', 1100))
    qty = int(data.get('quantity', 100))
    trade_type = data.get('type', 'delivery').lower() # 'delivery' or 'intraday'
    
    buy_val = buy_price * qty
    sell_val = sell_price * qty
    turnover = buy_val + sell_val
    
    # Zerodha-like Brokerage Structure
    if trade_type == 'delivery':
        brokerage = 0.0  # Free equity delivery
        stt = (buy_val + sell_val) * 0.001  # 0.1% on buy and sell
        stamp_duty = buy_val * 0.00015  # 0.015% on buy
    else:
        # Intraday: 0.03% or Rs. 20 (whichever is lower) per order
        b_buy = min(20.0, buy_val * 0.0003)
        b_sell = min(20.0, sell_val * 0.0003)
        brokerage = b_buy + b_sell
        stt = sell_val * 0.00025  # 0.025% on sell
        stamp_duty = buy_val * 0.00003  # 0.003% on buy
        
    exchange_txn = turnover * 0.0000345  # 0.00345%
    sebi_charges = turnover * 0.0000001  # ₹10 per crore (0.0001%)
    gst = (brokerage + exchange_txn) * 0.18  # 18% of brokerage + txn charges
    
    total_charges = brokerage + stt + exchange_txn + sebi_charges + gst + stamp_duty
    net_pnl = (sell_val - buy_val) - total_charges
    
    # Break-even calculation (approximate price increase needed)
    breakeven_diff = total_charges / qty
    breakeven_price = buy_price + breakeven_diff
    
    return jsonify({
        'turnover': round(turnover, 2),
        'brokerage': round(brokerage, 2),
        'stt': round(stt, 2),
        'exchange_txn': round(exchange_txn, 2),
        'stamp_duty': round(stamp_duty, 2),
        'sebi_charges': round(sebi_charges, 2),
        'gst': round(gst, 2),
        'total_charges': round(total_charges, 2),
        'net_pnl': round(net_pnl, 2),
        'breakeven_price': round(breakeven_price, 2)
    }), 200


@calculators_bp.route('/dividend', methods=['POST'])
def calculate_dividends():
    data = request.get_json() or {}
    shares = float(data.get('shares', 100))
    div_per_share = float(data.get('dividend_per_share', 15))
    frequency = int(data.get('frequency', 1)) # annual frequency
    
    annual_yield = shares * div_per_share * frequency
    monthly_equivalent = annual_yield / 12
    
    return jsonify({
        'annual_yield': round(annual_yield, 2),
        'monthly_equivalent': round(monthly_equivalent, 2)
    }), 200


# Goals CRUD
@calculators_bp.route('/goals', methods=['GET'])
@jwt_required()
def get_goals():
    user_id = get_jwt_identity()
    goals = Goal.query.filter_by(user_id=user_id).all()
    return jsonify([g.to_dict() for g in goals]), 200


@calculators_bp.route('/goals', methods=['POST'])
@jwt_required()
def create_goal():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    name = data.get('name')
    target_amount = data.get('target_amount')
    current_investment = data.get('current_investment', 0.0)
    target_date = data.get('target_date')
    
    if not name or target_amount is None or not target_date:
        return jsonify({'error': 'Missing goal parameters'}), 400
        
    goal = Goal(
        user_id=user_id,
        name=name,
        target_amount=float(target_amount),
        current_investment=float(current_investment),
        target_date=target_date
    )
    db.session.add(goal)
    db.session.commit()
    
    return jsonify(goal.to_dict()), 201


@calculators_bp.route('/goals/<int:goal_id>', methods=['PUT'])
@jwt_required()
def update_goal(goal_id):
    user_id = get_jwt_identity()
    goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first()
    if not goal:
        return jsonify({'error': 'Goal not found'}), 404
        
    data = request.get_json() or {}
    
    if 'name' in data:
        goal.name = data['name']
    if 'target_amount' in data:
        goal.target_amount = float(data['target_amount'])
    if 'current_investment' in data:
        goal.current_investment = float(data['current_investment'])
    if 'target_date' in data:
        goal.target_date = data['target_date']
        
    db.session.commit()
    return jsonify(goal.to_dict()), 200


@calculators_bp.route('/goals/<int:goal_id>', methods=['DELETE'])
@jwt_required()
def delete_goal(goal_id):
    user_id = get_jwt_identity()
    goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first()
    if not goal:
        return jsonify({'error': 'Goal not found'}), 404
        
    db.session.delete(goal)
    db.session.commit()
    return jsonify({'message': 'Goal deleted successfully'}), 200
