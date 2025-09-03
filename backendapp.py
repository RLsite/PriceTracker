#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
מערכת מעקב מחירים - Flask Application
"""

from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from datetime import datetime, timedelta
import logging

# הגדרות בסיסיות
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///price_tracker.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# הרחבות
db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)
CORS(app)

# הגדרת logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ייבוא מודלים
from models.product import Product
from models.user import User
from models.price_history import PriceHistory
from models.alert import Alert

# ייבוא services
from services.price_monitor import PriceMonitorService
from services.notification import NotificationService

# ייבוא API routes
from api.products import products_bp
from api.users import users_bp
from api.alerts import alerts_bp

# רישום Blueprints
app.register_blueprint(products_bp, url_prefix='/api/products')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(alerts_bp, url_prefix='/api/alerts')

@app.route('/')
def index():
    """עמוד בית"""
    return render_template('index.html')

@app.route('/api/health')
def health_check():
    """בדיקת תקינות המערכת"""
    try:
        # בדיקת בסיס נתונים
        db.session.execute('SELECT 1')
        db_status = "healthy"
    except Exception as e:
        db_status = f"error: {str(e)}"
        logger.error(f"Database health check failed: {e}")
    
    return jsonify({
        'status': 'healthy' if db_status == 'healthy' else 'unhealthy',
        'timestamp': datetime.utcnow().isoformat(),
        'database': db_status,
        'version': '1.0.0'
    })

@app.route('/api/search', methods=['POST'])
def search_products():
    """חיפוש מוצרים"""
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({'error': 'Missing search query'}), 400
        
        query = data['query'].strip()
        category = data.get('category', '')
        max_price = data.get('max_price')
        
        if not query:
            return jsonify({'error': 'Empty search query'}), 400
        
        # חיפוש במסד הנתונים
        results = Product.search(query, category, max_price)
        
        # אם לא נמצא, הפעל scraping חדש
        if not results:
            monitor_service = PriceMonitorService()
            scraping_results = monitor_service.search_new_product(query, category)
            
            if scraping_results:
                # שמירת התוצאות החדשות
                for result in scraping_results:
                    product = Product.create_from_scraping(result)
                    db.session.add(product)
                
                db.session.commit()
                results = Product.search(query, category, max_price)
        
        return jsonify({
            'success': True,
            'results': [product.to_dict() for product in results],
            'count': len(results)
        })
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        return jsonify({'error': 'Search failed'}), 500

@app.route('/api/track', methods=['POST'])
def start_tracking():
    """התחלת מעקב אחר מוצר"""
    try:
        data = request.get_json()
        
        product_id = data.get('product_id')
        user_email = data.get('email')
        user_phone = data.get('phone')
        alert_settings = data.get('alert_settings', {})
        tracking_duration = data.get('tracking_duration', 7)  # ימים
        
        if not product_id or not (user_email or user_phone):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # יצירת/עדכון משתמש
        user = User.get_or_create(email=user_email, phone=user_phone)
        
        # יצירת alert
        alert = Alert(
            user_id=user.id,
            product_id=product_id,
            settings=alert_settings,
            expires_at=datetime.utcnow() + timedelta(days=tracking_duration),
            is_active=True
        )
        
        db.session.add(alert)
        db.session.commit()
        
        # שליחת אימייל/SMS אישור
        notification_service = NotificationService()
        notification_service.send_tracking_confirmation(user, alert)
        
        logger.info(f"Started tracking product {product_id} for user {user.email}")
        
        return jsonify({
            'success': True,
            'alert_id': alert.id,
            'message': 'Tracking started successfully'
        })
        
    except Exception as e:
        logger.error(f"Tracking start error: {e}")
        return jsonify({'error': 'Failed to start tracking'}), 500

@app.route('/api/stop-tracking', methods=['POST'])
def stop_tracking():
    """עצירת מעקב"""
    try:
        data = request.get_json()
        alert_id = data.get('alert_id')
        
        if not alert_id:
            return jsonify({'error': 'Missing alert_id'}), 400
        
        alert = Alert.query.get(alert_id)
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404
        
        alert.is_active = False
        alert.stopped_at = datetime.utcnow()
        db.session.commit()
        
        # שליחת הודעת עצירה
        notification_service = NotificationService()
        notification_service.send_tracking_stopped(alert.user, alert)
        
        logger.info(f"Stopped tracking alert {alert_id}")
        
        return jsonify({
            'success': True,
            'message': 'Tracking stopped successfully'
        })
        
    except Exception as e:
        logger.error(f"Stop tracking error: {e}")
        return jsonify({'error': 'Failed to stop tracking'}), 500

@app.route('/api/stats')
def get_stats():
    """סטטיסטיקות המערכת"""
    try:
        stats = {
            'total_products': Product.query.count(),
            'active_alerts': Alert.query.filter_by(is_active=True).count(),
            'total_users': User.query.count(),
            'price_updates_today': PriceHistory.query.filter(
                PriceHistory.created_at >= datetime.utcnow().date()
            ).count()
        }
        
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return jsonify({'error': 'Failed to get stats'}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

def create_tables():
    """יצירת טבלאות בסיס נתונים"""
    with app.app_context():
        db.create_all()
        logger.info("Database tables created")

if __name__ == '__main__':
    # יצירת טבלאות אם לא קיימות
    create_tables()
    
    # הרצת האפליקציה
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    port = int(os.getenv('PORT', 5000))
    
    logger.info(f"Starting Price Tracker API on port {port}, debug={debug_mode}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug_mode
    )