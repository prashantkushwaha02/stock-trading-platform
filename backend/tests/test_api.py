import unittest
import json
import sys
import os

# Adjust path to import app correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models import db, User, Holding, Transaction
from config import Config

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:' # Use memory database for testing
    JWT_SECRET_KEY = 'test-secret-key-12847'

class ZenTradeAPITests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_auth_flow(self):
        # 1. Register User
        res = self.client.post('/api/auth/register', json={
            'username': 'trader1',
            'email': 'trader1@zentrade.com',
            'password': 'password123'
        })
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data.decode('utf-8'))
        self.assertIn('token', data)
        self.assertEqual(data['user']['username'], 'trader1')
        
        # 2. Login User
        res_login = self.client.post('/api/auth/login', json={
            'email': 'trader1@zentrade.com',
            'password': 'password123'
        })
        self.assertEqual(res_login.status_code, 200)
        login_data = json.loads(res_login.data.decode('utf-8'))
        token = login_data['token']
        
        # 3. Get profile
        res_prof = self.client.get('/api/auth/profile', headers={
            'Authorization': f'Bearer {token}'
        })
        self.assertEqual(res_prof.status_code, 200)
        prof_data = json.loads(res_prof.data.decode('utf-8'))
        self.assertEqual(prof_data['balance'], 1000000.0)

    def test_sip_calculator(self):
        res = self.client.post('/api/calculators/sip', json={
            'monthly_investment': 10000,
            'annual_rate': 12,
            'years': 3
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data.decode('utf-8'))
        self.assertEqual(data['total_invested'], 360000.00)
        self.assertGreater(data['future_value'], 360000.00)

if __name__ == '__main__':
    unittest.main()
