from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Holding, User
from app.services.market_feed import get_live_price, STOCK_PROFILES

insights_bp = Blueprint('insights', __name__)

@insights_bp.route('/portfolio', methods=['GET'])
@jwt_required()
def get_portfolio_insights():
    user_id = get_jwt_identity()
    holdings = Holding.query.filter_by(user_id=user_id).all()
    
    if not holdings:
        return jsonify({
            "diversification_score": 0,
            "risk_profile": "Unallocated",
            "insights": [
                "Your portfolio is currently empty. Allocate virtual capital to establish a risk score.",
                "Consider starting with large-cap index funds or liquid tech giants like RELIANCE, TCS, or MSFT."
            ],
            "recommendations": []
        }), 200
        
    # Analyze portfolio weight
    total_val = 0.0
    holding_details = []
    
    for h in holdings:
        live = get_live_price(h.symbol)
        val = h.quantity * live["price"]
        total_val += val
        holding_details.append({
            "symbol": h.symbol,
            "value": val,
            "sector": STOCK_PROFILES.get(h.symbol, {}).get("sector", "General Market")
        })
        
    # Concentration and Sector Allocations
    sector_weights = {}
    symbol_weights = {}
    for hd in holding_details:
        w = hd["value"] / total_val
        sector_weights[hd["sector"]] = sector_weights.get(hd["sector"], 0.0) + w
        symbol_weights[hd["symbol"]] = symbol_weights.get(hd["symbol"], 0.0) + w
        
    insights = []
    
    # 1. Diversification analysis
    max_symbol_w = max(symbol_weights.values()) if symbol_weights else 0
    max_symbol = max(symbol_weights, key=symbol_weights.get) if symbol_weights else ""
    
    if len(holdings) == 1:
        insights.append(f"High Concentration Risk: 100% of your holdings are in {max_symbol}. Consider diversifying into other sectors to spread risk.")
    elif max_symbol_w > 0.5:
        insights.append(f"Concentration Alert: {max_symbol} represents {max_symbol_w*100:.1f}% of your portfolio. Sell part of it and reallocate to other companies.")
    else:
        insights.append("Well Diversified Tickers: No single position represents more than 50% of your holdings. Excellent job managing concentration risk.")
        
    # 2. Sector analysis
    max_sector_w = max(sector_weights.values()) if sector_weights else 0
    max_sector = max(sector_weights, key=sector_weights.get) if sector_weights else ""
    
    if max_sector_w > 0.6:
        insights.append(f"Sector Concentration: {max_sector} occupies {max_sector_w*100:.1f}% of your wealth. Tech/Energy corrections could hit you hard. Blend in Finance or defensive stocks.")
    else:
        insights.append("Good Sector Rotation: Your holdings are distributed nicely across multiple sectors. This reduces sector-specific downturn exposure.")
        
    # 3. Overall Risk Rating
    # If mostly tech and single stocks -> high risk. If mixed and index funds -> moderate/conservative.
    has_high_risk = any(h.symbol in ["TSLA"] for h in holdings)
    if has_high_risk or max_symbol_w > 0.6:
        risk_profile = "Aggressive / Growth-heavy"
        insights.append("Risk Profile: Your allocations suggest an Aggressive growth profile. Expect high daily price swings but potential higher returns.")
    elif len(holdings) >= 3:
        risk_profile = "Moderate Balanced"
        insights.append("Risk Profile: Balanced distribution. Moderate exposure to cyclical equities with defensive sectors supporting dips.")
    else:
        risk_profile = "Conservative"
        insights.append("Risk Profile: Conservative setup. Focus on safety first; consider boosting yields via dividend-paying stocks.")
        
    # Generate recommendations based on missing sectors
    recs = []
    sectors_held = set(sector_weights.keys())
    
    # Simple recommendation rules
    if "Information Technology" not in sectors_held:
        recs.append({
            "symbol": "TCS",
            "name": "Tata Consultancy Services",
            "reason": "Stable IT services leader with historical consistency to anchor tech-sector underweights.",
            "type": "Defensive / Growth"
        })
    if "Banking & Finance" not in sectors_held:
        recs.append({
            "symbol": "HDFCBANK",
            "name": "HDFC Bank Ltd",
            "reason": "India's banking powerhouse. Excellent pick to capture financial system growth.",
            "type": "Core Finance"
        })
    if "Consumer Electronics" not in sectors_held:
        recs.append({
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "reason": "Cash-rich consumer electronics king. Acts as a safe-haven asset with massive share buybacks.",
            "type": "Mega Cap Growth"
        })
        
    return jsonify({
        "risk_profile": risk_profile,
        "insights": insights,
        "recommendations": recs
    }), 200


@insights_bp.route('/recommendations', methods=['GET'])
def get_general_recommendations():
    # Return recommendations for trading dashboard
    recs = [
        {
            "symbol": "HDFCBANK",
            "name": "HDFC Bank Limited",
            "score": "92/100",
            "rating": "Strong Buy",
            "reason": "Low PE ratio (18.2) relative to historical trends, coupled with strong loan book expansions."
        },
        {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "score": "88/100",
            "rating": "Buy",
            "reason": "Strong ecosystem retention and impending hardware cycles featuring integrated AI cores."
        },
        {
            "symbol": "RELIANCE",
            "name": "Reliance Industries",
            "score": "85/100",
            "rating": "Buy",
            "reason": "Expansion in retail and 5G services monetisation provides defensive cash flows plus growth levers."
        }
    ]
    return jsonify(recs), 200
