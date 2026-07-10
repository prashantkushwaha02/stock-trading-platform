from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, User, Holding, Transaction
from app.services.market_feed import get_live_price, get_stock_details, STOCK_PROFILES
import csv
import io

trading_bp = Blueprint('trading', __name__)

@trading_bp.route('/buy', methods=['POST'])
@jwt_required()
def buy_stock():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json() or {}
    symbol = data.get('symbol', '').upper()
    quantity = data.get('quantity')
    
    if not symbol or not quantity or int(quantity) <= 0:
        return jsonify({'error': 'Invalid symbol or quantity'}), 400
        
    quantity = int(quantity)
    
    # Get live stock price
    try:
        live = get_live_price(symbol)
        price = live['price']
    except Exception:
        return jsonify({'error': f'Failed to retrieve market price for {symbol}'}), 400
        
    total_cost = price * quantity
    if user.balance < total_cost:
        return jsonify({'error': f'Insufficient balance. Required: ₹{total_cost:,.2f}, Available: ₹{user.balance:,.2f}'}), 400
        
    # Deduct balance
    user.balance -= total_cost
    
    # Update Holdings
    holding = Holding.query.filter_by(user_id=user.id, symbol=symbol).first()
    if holding:
        # Calculate new average buy price
        total_qty = holding.quantity + quantity
        total_val = (holding.quantity * holding.avg_buy_price) + total_cost
        holding.avg_buy_price = round(total_val / total_qty, 2)
        holding.quantity = total_qty
    else:
        holding = Holding(
            user_id=user.id,
            symbol=symbol,
            quantity=quantity,
            avg_buy_price=price
        )
        db.session.add(holding)
        
    # Log Transaction
    tx = Transaction(
        user_id=user.id,
        symbol=symbol,
        quantity=quantity,
        price=price,
        type='BUY'
    )
    db.session.add(tx)
    db.session.commit()
    
    return jsonify({
        'message': f'Bought {quantity} shares of {symbol} at ₹{price:,.2f}',
        'balance': user.balance,
        'holding': holding.to_dict()
    }), 200


@trading_bp.route('/sell', methods=['POST'])
@jwt_required()
def sell_stock():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json() or {}
    symbol = data.get('symbol', '').upper()
    quantity = data.get('quantity')
    
    if not symbol or not quantity or int(quantity) <= 0:
        return jsonify({'error': 'Invalid symbol or quantity'}), 400
        
    quantity = int(quantity)
    
    # Check holding
    holding = Holding.query.filter_by(user_id=user.id, symbol=symbol).first()
    if not holding or holding.quantity < quantity:
        available = holding.quantity if holding else 0
        return jsonify({'error': f'Insufficient shares. Available: {available}'}), 400
        
    # Get live stock price
    try:
        live = get_live_price(symbol)
        price = live['price']
    except Exception:
        return jsonify({'error': f'Failed to retrieve market price for {symbol}'}), 400
        
    total_earnings = price * quantity
    
    # Update balance
    user.balance += total_earnings
    
    # Update holdings
    holding.quantity -= quantity
    if holding.quantity == 0:
        db.session.delete(holding)
        
    # Log Transaction
    tx = Transaction(
        user_id=user.id,
        symbol=symbol,
        quantity=quantity,
        price=price,
        type='SELL'
    )
    db.session.add(tx)
    db.session.commit()
    
    return jsonify({
        'message': f'Sold {quantity} shares of {symbol} at ₹{price:,.2f}',
        'balance': user.balance,
        'remaining_quantity': holding.quantity if holding.quantity > 0 else 0
    }), 200


@trading_bp.route('/portfolio', methods=['GET'])
@jwt_required()
def get_portfolio():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    holdings = Holding.query.filter_by(user_id=user.id).all()
    
    total_investment = 0.0
    current_value = 0.0
    today_pnl = 0.0
    holdings_data = []
    
    # Gather sector categories
    sector_alloc = {}
    symbol_alloc = {}
    
    for h in holdings:
        live = get_live_price(h.symbol)
        prof = STOCK_PROFILES.get(h.symbol, {"sector": "General Market", "open": live["price"]})
        
        c_price = live["price"]
        inv = h.quantity * h.avg_buy_price
        val = h.quantity * c_price
        
        # PNL Calculations
        total_pnl = val - inv
        total_pnl_pct = (total_pnl / inv * 100) if inv > 0 else 0.0
        
        # Today PNL calculation
        op = prof.get("open", c_price)
        t_pnl = h.quantity * (c_price - op)
        today_pnl += t_pnl
        
        total_investment += inv
        current_value += val
        
        h_dict = h.to_dict()
        h_dict.update({
            'current_price': c_price,
            'current_value': val,
            'total_investment': inv,
            'total_pnl': total_pnl,
            'total_pnl_pct': total_pnl_pct,
            'today_pnl': t_pnl,
            'sector': prof.get("sector")
        })
        holdings_data.append(h_dict)
        
        # Sector allocation accum
        sec = prof.get("sector", "General Market")
        sector_alloc[sec] = sector_alloc.get(sec, 0.0) + val
        
        # Symbol allocation accum
        symbol_alloc[h.symbol] = val
        
    overall_pnl = current_value - total_investment
    overall_pnl_pct = (overall_pnl / total_investment * 100) if total_investment > 0 else 0.0
    
    # Normalize allocations to percent
    total_alloc_val = current_value if current_value > 0 else 1.0
    sector_alloc_pct = {k: round((v / total_alloc_val) * 100, 2) for k, v in sector_alloc.items()}
    symbol_alloc_pct = {k: round((v / total_alloc_val) * 100, 2) for k, v in symbol_alloc.items()}
    
    # Diversification Score (0-100)
    # Concentration risk: HHI (Herfindahl-Hirschman Index) style
    # Sum of squared allocation percentages. HHI ranges from 0 to 10000.
    # Safe score ranges: HHI <= 1500 (great diversification), HHI >= 2500 (concentrated, lower score)
    hhi = sum((v**2 for v in symbol_alloc_pct.values())) if symbol_alloc_pct else 10000
    # Map HHI to a diversification score (0-100 scale)
    if not holdings:
        diversification_score = 0
    else:
        # If HHI = 10000 (1 holding), score is 30. If HHI = 1000 (10 holdings equally split), score is 95.
        diversification_score = max(10, min(100, int(110 - (hhi / 125))))
        
    return jsonify({
        'balance': user.balance,
        'total_investment': total_investment,
        'current_value': current_value,
        'portfolio_value': user.balance + current_value,
        'overall_pnl': overall_pnl,
        'overall_pnl_pct': overall_pnl_pct,
        'today_pnl': today_pnl,
        'holdings': holdings_data,
        'allocations': {
            'sector': sector_alloc_pct,
            'symbol': symbol_alloc_pct
        },
        'diversification_score': diversification_score
    }), 200


@trading_bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_transactions():
    user_id = get_jwt_identity()
    txs = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.timestamp.desc()).all()
    return jsonify([t.to_dict() for t in txs]), 200


@trading_bp.route('/export/csv', methods=['GET'])
@jwt_required()
def export_csv():
    user_id = get_jwt_identity()
    holdings = Holding.query.filter_by(user_id=user_id).all()
    
    data = []
    for h in holdings:
        live = get_live_price(h.symbol)
        c_price = live["price"]
        inv = h.quantity * h.avg_buy_price
        val = h.quantity * c_price
        pnl = val - inv
        data.append({
            "Symbol": h.symbol,
            "Quantity": h.quantity,
            "Avg Buy Price (INR)": h.avg_buy_price,
            "Current Price (INR)": c_price,
            "Total Investment (INR)": inv,
            "Current Value (INR)": val,
            "Total PnL (INR)": pnl
        })
        
    output = io.StringIO()
    if data:
        writer = csv.DictWriter(output, fieldnames=list(data[0].keys()))
        writer.writeheader()
        writer.writerows(data)
    
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=holdings_report.csv"
    response.headers["Content-type"] = "text/csv"
    return response


@trading_bp.route('/export/pdf', methods=['GET'])
@jwt_required()
def export_pdf():
    # To keep simple and dependency-free, export a styled textual report that clients can print as PDF or display.
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    holdings = Holding.query.filter_by(user_id=user_id).all()
    
    report = []
    report.append("==================================================")
    report.append("                 ZENTRADE REPORT                  ")
    report.append("==================================================")
    report.append(f"Client: {user.username}")
    report.append(f"Date: {datetime.now().strftime('%d-%b-%Y %H:%M:%S')}")
    report.append(f"Available Balance: INR {user.balance:,.2f}")
    report.append("--------------------------------------------------")
    report.append(f"{'SYMBOL':<10}{'QTY':<8}{'AVG BUY':<12}{'CURRENT':<12}{'PNL':<12}")
    report.append("--------------------------------------------------")
    
    total_inv = 0.0
    total_val = 0.0
    for h in holdings:
        live = get_live_price(h.symbol)
        price = live["price"]
        inv = h.quantity * h.avg_buy_price
        val = h.quantity * price
        pnl = val - inv
        total_inv += inv
        total_val += val
        report.append(f"{h.symbol:<10}{h.quantity:<8}{h.avg_buy_price:<12.2f}{price:<12.2f}{pnl:<12.2f}")
        
    overall_pnl = total_val - total_inv
    report.append("--------------------------------------------------")
    report.append(f"Total Invested Value : INR {total_inv:,.2f}")
    report.append(f"Total Current Value  : INR {total_val:,.2f}")
    report.append(f"Overall Gain / Loss  : INR {overall_pnl:,.2f}")
    report.append("==================================================")
    
    txt_report = "\n".join(report)
    
    response = make_response(txt_report)
    response.headers["Content-Disposition"] = "attachment; filename=holdings_report.txt"
    response.headers["Content-type"] = "text/plain"
    return response
