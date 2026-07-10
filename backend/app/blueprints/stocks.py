from flask import Blueprint, request, jsonify
from app.services.market_feed import (
    STOCK_PROFILES, INDICES, get_live_price, get_stock_details, 
    get_historical_data, get_market_movers
)

stocks_bp = Blueprint('stocks', __name__)

@stocks_bp.route('/search', methods=['GET'])
def search_stocks():
    query = request.args.get('q', '').upper()
    if not query:
        # Return default recommended list
        suggestions = [
            {"symbol": key, "name": val["name"], "sector": val["sector"]}
            for key, val in STOCK_PROFILES.items()
        ]
        return jsonify(suggestions), 200
        
    suggestions = []
    # Search in presets
    for symbol, profile in STOCK_PROFILES.items():
        if query in symbol or query in profile["name"].upper():
            suggestions.append({
                "symbol": symbol,
                "name": profile["name"],
                "sector": profile["sector"]
            })
            
    # If query is a custom ticker, check if it already exists or dynamically allow search
    if len(query) >= 2 and not any(s["symbol"] == query for s in suggestions):
        suggestions.append({
            "symbol": query,
            "name": f"{query} Corporation",
            "sector": "General Market"
        })
        
    return jsonify(suggestions[:10]), 200


@stocks_bp.route('/details/<symbol>', methods=['GET'])
def stock_details(symbol):
    try:
        details = get_stock_details(symbol)
        return jsonify(details), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@stocks_bp.route('/history/<symbol>', methods=['GET'])
def stock_history(symbol):
    range_val = request.args.get('range', '5D').upper()
    try:
        history = get_historical_data(symbol, range_val)
        return jsonify(history), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@stocks_bp.route('/indices', methods=['GET'])
def market_indices():
    # Fluctuate indices and return
    res = {}
    for name, idx in INDICES.items():
        live = get_live_price(name)
        res[name] = {
            "name": idx["name"],
            "value": live["price"],
            "change": live["change"],
            "change_pct": live["change_pct"],
            "region": idx["region"]
        }
    return jsonify(res), 200


@stocks_bp.route('/market-movers', methods=['GET'])
def market_movers():
    try:
        movers = get_market_movers()
        return jsonify(movers), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@stocks_bp.route('/comparison', methods=['GET'])
def compare_stocks():
    symbols_str = request.args.get('symbols', '')
    if not symbols_str:
        return jsonify({'error': 'Missing symbols parameters'}), 400
        
    symbols = [s.strip().upper() for s in symbols_str.split(',') if s.strip()]
    if len(symbols) < 2:
        return jsonify({'error': 'Provide at least two symbols for comparison'}), 400
        
    comparison_data = []
    for symbol in symbols:
        try:
            details = get_stock_details(symbol)
            comparison_data.append({
                "symbol": details["symbol"],
                "name": details["name"],
                "price": details["price"],
                "change_pct": details["change_pct"],
                "pe_ratio": details["pe_ratio"],
                "market_cap": details["market_cap"],
                "div_yield": details["div_yield"],
                "high_52w": details["high_52w"],
                "low_52w": details["low_52w"]
            })
        except Exception:
            pass
            
    return jsonify(comparison_data), 200
