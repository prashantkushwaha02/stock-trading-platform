from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.models import db, User
from config import Config

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    jwt = JWTManager(app)

    # Register blueprints
    from app.blueprints.auth import auth_bp
    from app.blueprints.stocks import stocks_bp
    from app.blueprints.trading import trading_bp
    from app.blueprints.watchlist import watchlist_bp
    from app.blueprints.news import news_bp
    from app.blueprints.alerts import alerts_bp
    from app.blueprints.calculators import calculators_bp
    from app.blueprints.insights import insights_bp
    from app.blueprints.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(stocks_bp, url_prefix='/api/stocks')
    app.register_blueprint(trading_bp, url_prefix='/api/trade')
    app.register_blueprint(watchlist_bp, url_prefix='/api/watchlists')
    app.register_blueprint(news_bp, url_prefix='/api/news')
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')
    app.register_blueprint(calculators_bp, url_prefix='/api/calculators')
    app.register_blueprint(insights_bp, url_prefix='/api/insights')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # Global error handlers
    @app.route('/health')
    def health_check():
        return {"status": "healthy", "database": "connected"}, 200

    # Auto-create tables (SQLite or external)
    with app.app_context():
        db.create_all()
        # Seed default admin if none exists
        if User.query.filter_by(role='admin').first() is None:
            admin = User(username="admin", email="admin@zentrade.com")
            admin.set_password("admin123")
            admin.role = "admin"
            db.session.add(admin)
            db.session.commit()
            print("Seeded default admin account (admin@zentrade.com / admin123)")

    return app
