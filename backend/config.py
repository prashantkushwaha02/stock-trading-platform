import os
from datetime import timedelta

class Config:
    # Basic settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'zentrade-super-secret-key-129847192')
    
    # Database configuration (Defaults to local SQLite, but can use PostgreSQL)
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        'sqlite:///' + os.path.join(os.path.dirname(os.path.abspath(__file__)), 'zentrade.db')
    )
    # Fix for Heroku PostgreSQL URLs which start with postgres:// instead of postgresql://
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Configurations
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-zentrade-secret-892347102')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # Alpha Vantage or other APIs (if provided)
    ALPHA_VANTAGE_API_KEY = os.environ.get('ALPHA_VANTAGE_API_KEY', '')
    POLYGON_API_KEY = os.environ.get('POLYGON_API_KEY', '')
    
    # Initial balance for virtual trading
    INITIAL_BALANCE = 1000000.0  # ₹10,00,000
