"""
Tibia Data Vault Flask API

Provides REST endpoints for accessing Tibia game data.
"""

import logging
import sqlite3

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import BadRequest, NotFound

from backend import (
    init_db,
    API_HOST,
    API_PORT,
    API_DEBUG,
    LOG_LEVEL,
    LOG_FORMAT,
)
from backend.models import ErrorResponse

# Import route blueprints
from backend.routes.health import health_bp
from backend.routes.servers import servers_bp
from backend.routes.items import items_bp
from backend.routes.market import market_bp
from backend.routes.delivery import delivery_bp
from backend.routes.export import export_bp
from backend.routes.inventory import inventory_bp

# Configure logging
logging.basicConfig(level=getattr(logging, LOG_LEVEL), format=LOG_FORMAT)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


@app.errorhandler(BadRequest)
def handle_bad_request(error):
    """Handle 400 Bad Request errors."""
    logger.warning(f"Bad request: {error}")
    response = ErrorResponse(error=str(error.description), details="Invalid request data")
    return jsonify(response.model_dump()), 400


@app.errorhandler(NotFound)
def handle_not_found(error):
    """Handle 404 Not Found errors."""
    logger.warning(f"Resource not found: {request.path}")
    response = ErrorResponse(error="Resource not found", details=str(error.description))
    return jsonify(response.model_dump()), 404


@app.errorhandler(sqlite3.Error)
def handle_db_error(error):
    """Handle database errors."""
    logger.error(f"Database error: {error}")
    response = ErrorResponse(error="Database error", details="An error occurred while accessing the database")
    return jsonify(response.model_dump()), 500


@app.errorhandler(Exception)
def handle_generic_error(error):
    """Handle unexpected errors."""
    logger.exception(f"Unhandled error: {error}")
    response = ErrorResponse(error="Internal server error", details="An unexpected error occurred")
    return jsonify(response.model_dump()), 500


# Register blueprints
app.register_blueprint(health_bp)
app.register_blueprint(servers_bp)
app.register_blueprint(items_bp)
app.register_blueprint(market_bp)
app.register_blueprint(delivery_bp)
app.register_blueprint(export_bp)
app.register_blueprint(inventory_bp)


# =============================================================================
# Application Startup
# =============================================================================

@app.before_request
def check_db():
    """Verify database is accessible on first request."""
    if not hasattr(app, '_db_checked'):
        try:
            init_db()
            app._db_checked = True
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")


def run_app():
    """Entry point for running the Flask application."""
    logger.info(f"Starting Tibia Data Vault API on {API_HOST}:{API_PORT}")
    app.run(host=API_HOST, port=API_PORT, debug=API_DEBUG)


if __name__ == '__main__':
    run_app()
