import random
from datetime import datetime, timedelta
# pandas import removed for 3.13 wheel compatibility
import requests

# Static stock profiles with realistic data
STOCK_PROFILES = {
    "RELIANCE": {
        "name": "Reliance Industries Limited",
        "symbol": "RELIANCE",
        "open": 2450.0, "high": 2480.0, "low": 2435.0, "volume": 5800000,
        "market_cap": "16.5T", "pe_ratio": 26.4, "div_yield": 0.37,
        "high_52w": 2630.0, "low_52w": 2180.0, "sector": "Energy & Conglomerate",
        "description": "Reliance Industries Limited is an Indian multinational conglomerate company, headquartered in Mumbai. It includes businesses across energy, petrochemicals, natural gas, retail, telecommunications, mass media, and textiles.",
        "buy_rating": 78, "hold_rating": 15, "sell_rating": 7
    },
    "TCS": {
        "name": "Tata Consultancy Services Limited",
        "symbol": "TCS",
        "open": 3820.0, "high": 3865.0, "low": 3800.0, "volume": 2100000,
        "market_cap": "14.1T", "pe_ratio": 30.1, "div_yield": 1.25,
        "high_52w": 4250.0, "low_52w": 3070.0, "sector": "Information Technology",
        "description": "Tata Consultancy Services Limited is an Indian multinational information technology services and consulting company headquartered in Mumbai. It is a part of the Tata Group and operates in 150 locations across 46 countries.",
        "buy_rating": 65, "hold_rating": 25, "sell_rating": 10
    },
    "INFY": {
        "name": "Infosys Limited",
        "symbol": "INFY",
        "open": 1420.0, "high": 1445.0, "low": 1410.0, "volume": 4200000,
        "market_cap": "5.9T", "pe_ratio": 24.8, "div_yield": 2.46,
        "high_52w": 1760.0, "low_52w": 1215.0, "sector": "Information Technology",
        "description": "Infosys Limited is an Indian multinational information technology company that provides business consulting, information technology and outsourcing services. The company is headquartered in Bangalore.",
        "buy_rating": 72, "hold_rating": 18, "sell_rating": 10
    },
    "HDFCBANK": {
        "name": "HDFC Bank Limited",
        "symbol": "HDFCBANK",
        "open": 1510.0, "high": 1532.0, "low": 1502.0, "volume": 12000000,
        "market_cap": "11.5T", "pe_ratio": 18.2, "div_yield": 1.13,
        "high_52w": 1720.0, "low_52w": 1360.0, "sector": "Banking & Finance",
        "description": "HDFC Bank Limited is an Indian banking and financial services company headquartered in Mumbai. It is India's largest private sector bank by assets and the world's tenth largest bank by market capitalization.",
        "buy_rating": 85, "hold_rating": 12, "sell_rating": 3
    },
    "ICICIBANK": {
        "name": "ICICI Bank Limited",
        "symbol": "ICICIBANK",
        "open": 1080.0, "high": 1105.0, "low": 1075.0, "volume": 9800000,
        "market_cap": "7.6T", "pe_ratio": 17.5, "div_yield": 0.85,
        "high_52w": 1160.0, "low_52w": 890.0, "sector": "Banking & Finance",
        "description": "ICICI Bank Limited is an Indian multinational bank and financial services company headquartered in Mumbai. It offers a wide range of banking products and financial services for corporate and retail customers.",
        "buy_rating": 89, "hold_rating": 9, "sell_rating": 2
    },
    "AAPL": {
        "name": "Apple Inc.",
        "symbol": "AAPL",
        "open": 210.50, "high": 213.20, "low": 209.80, "volume": 52000000,
        "market_cap": "3.2T", "pe_ratio": 32.1, "div_yield": 0.48,
        "high_52w": 220.20, "low_52w": 164.08, "sector": "Consumer Electronics",
        "description": "Apple Inc. is an American multinational technology company headquartered in Cupertino, California. Apple is the world's largest technology company by revenue, and as of 2024, the world's most valuable company.",
        "buy_rating": 74, "hold_rating": 20, "sell_rating": 6
    },
    "MSFT": {
        "name": "Microsoft Corporation",
        "symbol": "MSFT",
        "open": 420.20, "high": 425.80, "low": 418.90, "volume": 22000000,
        "market_cap": "3.1T", "pe_ratio": 35.8, "div_yield": 0.71,
        "high_52w": 468.35, "low_52w": 315.18, "sector": "Software & Cloud Services",
        "description": "Microsoft Corporation is an American multinational technology corporation headquartered in Redmond, Washington. It is best known for the Windows line of operating systems, the Microsoft 365 suite, and Azure cloud computing.",
        "buy_rating": 88, "hold_rating": 10, "sell_rating": 2
    },
    "GOOGL": {
        "name": "Alphabet Inc.",
        "symbol": "GOOGL",
        "open": 182.10, "high": 185.30, "low": 181.50, "volume": 25000000,
        "market_cap": "2.2T", "pe_ratio": 25.5, "div_yield": 0.44,
        "high_52w": 191.85, "low_52w": 115.35, "sector": "Internet & Cloud Services",
        "description": "Alphabet Inc. is an American multinational technology conglomerate holding company headquartered in Mountain View, California. It was created through a restructuring of Google on October 2, 2015, and became the parent company of Google.",
        "buy_rating": 82, "hold_rating": 15, "sell_rating": 3
    },
    "TSLA": {
        "name": "Tesla Inc.",
        "symbol": "TSLA",
        "open": 240.50, "high": 248.80, "low": 235.20, "volume": 85000000,
        "market_cap": "750B", "pe_ratio": 55.4, "div_yield": 0.0,
        "high_52w": 299.29, "low_52w": 138.80, "sector": "Automotive & Clean Energy",
        "description": "Tesla, Inc. is an American multinational automotive and clean energy company headquartered in Austin, Texas. Tesla designs and manufactures electric vehicles, battery energy storage from home to grid-scale, solar panels, and solar roof tiles.",
        "buy_rating": 45, "hold_rating": 35, "sell_rating": 20
    },
    "AMZN": {
        "name": "Amazon.com Inc.",
        "symbol": "AMZN",
        "open": 195.40, "high": 198.20, "low": 194.10, "volume": 35000000,
        "market_cap": "2.0T", "pe_ratio": 41.2, "div_yield": 0.0,
        "high_52w": 201.20, "low_52w": 118.35, "sector": "E-commerce & Cloud Services",
        "description": "Amazon.com, Inc. is an American multinational technology company focusing on e-commerce, cloud computing, online advertising, digital streaming, and artificial intelligence.",
        "buy_rating": 92, "hold_rating": 7, "sell_rating": 1
    }
}

INDICES = {
    "NIFTY 50": {"name": "Nifty 50 Index", "value": 24320.50, "change": 142.30, "change_pct": 0.59, "region": "India"},
    "SENSEX": {"name": "BSE Sensex Index", "value": 79890.20, "change": 450.80, "change_pct": 0.57, "region": "India"},
    "NASDAQ": {"name": "NASDAQ Composite", "value": 18400.12, "change": -85.40, "change_pct": -0.46, "region": "US"},
    "S&P 500": {"name": "S&P 500 Index", "value": 5560.80, "change": -12.10, "change_pct": -0.22, "region": "US"},
    "DOW JONES": {"name": "Dow Jones Industrial Average", "value": 40100.50, "change": 120.40, "change_pct": 0.30, "region": "US"}
}

# In-memory storage for active simulated prices to ensure consecutive calls simulate dynamic walk
_active_prices = {}

def get_live_price(symbol):
    """
    Get the live price for a given stock symbol.
    If the symbol is one of our preset simulated stocks, perform a random walk fluctuation.
    """
    symbol = symbol.upper()
    
    # Check in active prices first
    if symbol in _active_prices:
        current = _active_prices[symbol]
        # Perform random walk (-0.15% to +0.15%)
        pct = random.uniform(-0.0015, 0.0015)
        new_price = round(current * (1 + pct), 2)
        _active_prices[symbol] = new_price
        
        # Calculate daily open/change
        profile = STOCK_PROFILES.get(symbol, {"open": new_price})
        op = profile.get("open", new_price)
        change = round(new_price - op, 2)
        change_pct = round((change / op) * 100, 2)
        return {"symbol": symbol, "price": new_price, "change": change, "change_pct": change_pct}
    
    # If not in active prices but is in presets
    if symbol in STOCK_PROFILES:
        base_price = (STOCK_PROFILES[symbol]["high"] + STOCK_PROFILES[symbol]["low"]) / 2
        _active_prices[symbol] = round(base_price, 2)
        return get_live_price(symbol)
        
    # Check indices
    if symbol in INDICES:
        idx = INDICES[symbol]
        pct = random.uniform(-0.0008, 0.0008)
        new_val = round(idx["value"] * (1 + pct), 2)
        INDICES[symbol]["value"] = new_val
        change = round(new_val - (new_val / (1 + idx["change_pct"]/100)), 2)
        change_pct = round((change / (new_val - change)) * 100, 2)
        INDICES[symbol]["change"] = change
        INDICES[symbol]["change_pct"] = change_pct
        return {"symbol": symbol, "price": new_val, "change": change, "change_pct": change_pct}
        
    # Standard fallback for any other stock symbol queried (generate random profile and return)
    # Let's check yfinance in background for dynamic lookups, but make it very fast
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        history = ticker.history(period="1d")
        if not history.empty:
            last_price = history['Close'].iloc[-1]
            _active_prices[symbol] = round(last_price, 2)
            open_price = history['Open'].iloc[-1]
            change = round(last_price - open_price, 2)
            change_pct = round((change / open_price) * 100, 2)
            return {"symbol": symbol, "price": round(last_price, 2), "change": change, "change_pct": change_pct}
    except Exception:
        pass
        
    # If network/API fails, create a deterministic mock ticker
    seed = sum(ord(c) for c in symbol)
    random.seed(seed)
    mock_price = round(random.uniform(10.0, 1500.0), 2)
    random.seed() # reset seed
    _active_prices[symbol] = mock_price
    return {"symbol": symbol, "price": mock_price, "change": round(mock_price * 0.005, 2), "change_pct": 0.5}


def get_market_movers():
    """
    Get top gainers, top losers, and most active stocks.
    """
    movers = []
    for symbol in STOCK_PROFILES.keys():
        movers.append(get_live_price(symbol))
        
    # Sort them
    sorted_movers = sorted(movers, key=lambda x: x["change_pct"])
    top_losers = sorted_movers[:3]
    top_gainers = sorted_movers[-3:][::-1]
    
    # Most active: Reliance, HDFCBANK, TSLA
    most_active_symbols = ["RELIANCE", "HDFCBANK", "TSLA"]
    most_active = [m for m in movers if m["symbol"] in most_active_symbols]
    
    return {
        "gainers": top_gainers,
        "losers": top_losers,
        "most_active": most_active
    }


def get_stock_details(symbol):
    """
    Returns complete static and dynamic stock details.
    """
    symbol = symbol.upper()
    live = get_live_price(symbol)
    
    profile = STOCK_PROFILES.get(symbol)
    if not profile:
        # Generate mock profile details for dynamic symbol
        seed = sum(ord(c) for c in symbol)
        random.seed(seed)
        price = live["price"]
        profile = {
            "name": f"{symbol} Corp",
            "symbol": symbol,
            "open": round(price * 0.99, 2),
            "high": round(price * 1.02, 2),
            "low": round(price * 0.98, 2),
            "volume": int(random.uniform(500000, 5000000)),
            "market_cap": f"{round(random.uniform(1.0, 500.0), 1)}B",
            "pe_ratio": round(random.uniform(10.0, 60.0), 1),
            "div_yield": round(random.uniform(0.0, 3.5), 2),
            "high_52w": round(price * 1.3, 2),
            "low_52w": round(price * 0.7, 2),
            "sector": "Technology",
            "description": f"{symbol} Corp is a publicly-traded corporation engaged in research, production, and distribution within its global industrial sectors.",
            "buy_rating": int(random.uniform(40, 95)),
            "hold_rating": int(random.uniform(5, 30)),
            "sell_rating": int(random.uniform(1, 20))
        }
        random.seed() # reset seed
        
    # Update profile fields with live data
    profile["price"] = live["price"]
    profile["change"] = live["change"]
    profile["change_pct"] = live["change_pct"]
    
    # Calculate correct analyst distribution so they sum to 100
    tot = profile["buy_rating"] + profile["hold_rating"] + profile["sell_rating"]
    profile["buy_rating"] = int((profile["buy_rating"] / tot) * 100)
    profile["hold_rating"] = int((profile["hold_rating"] / tot) * 100)
    profile["sell_rating"] = 100 - profile["buy_rating"] - profile["hold_rating"]
    
    # Add dummy news specific to symbol
    profile["news"] = [
        {
            "title": f"Why {profile['name']} Shares Are Gaining Traction Today",
            "source": "ZTrade Insights",
            "published_at": "2 hours ago",
            "summary": f"{profile['name']} ({symbol}) saw elevated purchase quantities this morning after research analysts raised their mid-term growth projections."
        },
        {
            "title": f"Is {symbol} A Buy Right Now? Analyst Reports Breakdown",
            "source": "MarketPulse",
            "published_at": "5 hours ago",
            "summary": f"A comprehensive review of the financial sheets for {profile['name']} suggests strong liquidity ratios and competitive profit margins."
        }
    ]
    
    return profile


def get_historical_data(symbol, range_val="5D"):
    """
    Get mock historical candles for range_val.
    Supported ranges: 1D, 5D, 1M, 1Y, 5Y
    Returns a list of dictionaries with open, high, low, close, time, volume.
    """
    symbol = symbol.upper()
    live = get_live_price(symbol)
    current_price = live["price"]
    
    # Determine number of data points
    if range_val == "1D":
        points = 24
        delta = timedelta(hours=1)
        time_format = "%H:%M"
    elif range_val == "5D":
        points = 30
        delta = timedelta(hours=4)
        time_format = "%d %b %H:%M"
    elif range_val == "1M":
        points = 30
        delta = timedelta(days=1)
        time_format = "%d %b"
    elif range_val == "1Y":
        points = 52
        delta = timedelta(weeks=1)
        time_format = "%b %y"
    else:  # 5Y
        points = 60
        delta = timedelta(days=30)
        time_format = "%Y-%m"
        
    candles = []
    price_tracker = current_price
    
    # Attempt to fetch real historical data from yfinance if available
    try:
        import yfinance as yf
        period_map = {"1D": "1d", "5D": "5d", "1M": "1mo", "1Y": "1y", "5Y": "5y"}
        interval_map = {"1D": "15m", "5D": "1h", "1M": "1d", "1Y": "1wk", "5Y": "1mo"}
        
        ticker = yf.Ticker(symbol)
        history = ticker.history(period=period_map.get(range_val, "5d"), interval=interval_map.get(range_val, "1h"))
        
        if not history.empty:
            for idx, row in history.iterrows():
                candles.append({
                    "time": idx.strftime(time_format),
                    "open": round(row["Open"], 2),
                    "high": round(row["High"], 2),
                    "low": round(row["Low"], 2),
                    "close": round(row["Close"], 2),
                    "volume": int(row["Volume"])
                })
            return candles
    except Exception:
        pass
        
    # Mock fallback
    current_time = datetime.now()
    seed = sum(ord(c) for c in symbol) + len(range_val)
    random.seed(seed)
    
    # Generate path backwards, then reverse
    for i in range(points):
        # random walks
        change = random.uniform(-0.02, 0.02)
        close_price = round(price_tracker, 2)
        open_price = round(close_price / (1 + change), 2)
        high_price = round(max(open_price, close_price) * (1 + random.uniform(0.001, 0.01)), 2)
        low_price = round(min(open_price, close_price) * (1 - random.uniform(0.001, 0.01)), 2)
        volume = int(random.uniform(50000, 500000))
        
        time_stamp = current_time - (i * delta)
        candles.append({
            "time": time_stamp.strftime(time_format),
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price,
            "volume": volume
        })
        
        price_tracker = open_price # slide backward
        
    random.seed() # reset seed
    return candles[::-1] # return chronological


def get_news_feed(query=None):
    """
    Get modern general financial news.
    """
    news = [
        {
            "id": 1,
            "title": "Federal Reserve Hints at Potential Interest Rate Adjustments in Upcoming Session",
            "source": "Financial Pulse",
            "summary": "Economists suggest that tapering inflation numbers may prompt the central bank to reconsider borrowing benchmarks by early autumn.",
            "url": "https://example.com/fed-interest-rates",
            "image_url": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&h=250&q=80",
            "published_at": "1 hour ago",
            "category": "Macroeconomy"
        },
        {
            "id": 2,
            "title": "Tech Sector Regains Momentum Amid Hardware Breakthroughs & AI Advancements",
            "source": "TechCrunch Stocks",
            "summary": "Renewed capital flows into silicon design manufacturers pushed NASDAQ tech indices to a strong rebound early Friday.",
            "url": "https://example.com/tech-rebound",
            "image_url": "https://images.unsplash.com/photo-1618044733300-9472054094ee?auto=format&fit=crop&w=400&h=250&q=80",
            "published_at": "3 hours ago",
            "category": "Technology"
        },
        {
            "id": 3,
            "title": "Crude Oil Prices Stabilize Following Production Adjustments and Global Demand Reports",
            "source": "Energy Weekly",
            "summary": "Slight reductions in overseas extraction quotas balanced out rising commercial fuel inventories in the Western hemisphere.",
            "url": "https://example.com/oil-stabilization",
            "image_url": "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=400&h=250&q=80",
            "published_at": "6 hours ago",
            "category": "Commodities"
        },
        {
            "id": 4,
            "title": "Corporate Earnings Season Beats Estimates as Services Demand Reaches Multi-Year Peaks",
            "source": "WallStreet Journal",
            "summary": "Top banking groups reported net interest margins beating guidance forecasts, citing high commercial consumer credit reliability.",
            "url": "https://example.com/earnings-season",
            "image_url": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&h=250&q=80",
            "published_at": "8 hours ago",
            "category": "Earnings"
        },
        {
            "id": 5,
            "title": "Automotive Pioneers Unveil Advanced Battery Solid-State Prototypes",
            "source": "EV Global",
            "summary": "Breakthrough test cells demonstrate up to double the density of existing lithium layouts, potentially cutting recharge intervals to eight minutes.",
            "url": "https://example.com/battery-tech",
            "image_url": "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=400&h=250&q=80",
            "published_at": "12 hours ago",
            "category": "Automotive"
        }
    ]
    
    if query:
        query = query.lower()
        news = [n for n in news if query in n["title"].lower() or query in n["summary"].lower()]
        
    return news
