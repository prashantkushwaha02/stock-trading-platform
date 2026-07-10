from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, NewsBookmark
from app.services.market_feed import get_news_feed

news_bp = Blueprint('news', __name__)

@news_bp.route('', methods=['GET'])
def get_news():
    query = request.args.get('q')
    news_items = get_news_feed(query)
    return jsonify(news_items), 200


@news_bp.route('/bookmark', methods=['POST'])
@jwt_required()
def toggle_bookmark():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    title = data.get('title')
    url = data.get('url')
    source = data.get('source')
    summary = data.get('summary')
    image_url = data.get('image_url')
    published_at = data.get('published_at')
    
    if not title or not url:
        return jsonify({'error': 'Title and URL are required'}), 400
        
    # Check if already bookmarked
    bookmark = NewsBookmark.query.filter_by(user_id=user_id, url=url).first()
    if bookmark:
        db.session.delete(bookmark)
        db.session.commit()
        return jsonify({'message': 'Bookmark removed successfully', 'bookmarked': False}), 200
        
    # Add new bookmark
    new_bookmark = NewsBookmark(
        user_id=user_id,
        title=title,
        url=url,
        source=source,
        summary=summary,
        image_url=image_url,
        published_at=published_at
    )
    db.session.add(new_bookmark)
    db.session.commit()
    
    return jsonify({'message': 'Bookmark added successfully', 'bookmarked': True}), 201


@news_bp.route('/bookmarks', methods=['GET'])
@jwt_required()
def get_bookmarks():
    user_id = get_jwt_identity()
    bookmarks = NewsBookmark.query.filter_by(user_id=user_id).all()
    return jsonify([b.to_dict() for b in bookmarks]), 200
