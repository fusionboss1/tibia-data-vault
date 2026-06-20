"""Health check endpoints."""

import logging
from flask import Blueprint, jsonify

from backend import check_db_health
from backend.models import ApiResponse, ErrorResponse

logger = logging.getLogger(__name__)

health_bp = Blueprint('health', __name__)


@health_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    health = check_db_health()
    
    if health["connected"]:
        response = ApiResponse(
            success=True,
            data={"database": health},
            message="Service is healthy"
        )
        return jsonify(response.model_dump()), 200
    else:
        response = ErrorResponse(
            error="Service unhealthy",
            details=health.get("error", "Database connection failed")
        )
        return jsonify(response.model_dump()), 503
