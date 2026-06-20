"""Server endpoints."""

import logging
import sqlite3
from flask import Blueprint, jsonify, request
from werkzeug.exceptions import NotFound

from backend import get_db
from backend.models import ApiResponse

logger = logging.getLogger(__name__)

servers_bp = Blueprint('servers', __name__)


@servers_bp.route('/api/servers', methods=['GET'])
def get_servers():
    """
    Get all servers with optional filtering.
    
    Query parameters:
    - region: Filter by region (EU, NA, SA, OCE)
    - pvp_type: Filter by PvP type
    - battleye: Filter by BattlEye status (Green, Yellow)
    """
    try:
        with get_db() as conn:
            query = "SELECT * FROM servers WHERE 1=1"
            params = []
            
            # Apply filters
            region = request.args.get('region')
            if region:
                query += " AND region = ?"
                params.append(region)
            
            pvp_type = request.args.get('pvp_type')
            if pvp_type:
                query += " AND pvp_type = ?"
                params.append(pvp_type)
            
            battleye = request.args.get('battleye')
            if battleye:
                query += " AND battleye = ?"
                params.append(battleye)
            
            query += " ORDER BY name"
            
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            servers = [dict(row) for row in rows]
            
            response = ApiResponse(
                success=True,
                data={"servers": servers},
                count=len(servers)
            )
            return jsonify(response.model_dump())
            
    except sqlite3.Error as e:
        logger.error(f"Database error in get_servers: {e}")
        raise


@servers_bp.route('/api/servers/<int:server_id>', methods=['GET'])
def get_server(server_id: int):
    """Get a specific server by ID."""
    try:
        with get_db() as conn:
            cursor = conn.execute(
                "SELECT * FROM servers WHERE id = ?",
                (server_id,)
            )
            row = cursor.fetchone()
            
            if not row:
                raise NotFound(f"Server with ID {server_id} not found")
            
            response = ApiResponse(
                success=True,
                data={"server": dict(row)}
            )
            return jsonify(response.model_dump())
            
    except sqlite3.Error as e:
        logger.error(f"Database error in get_server: {e}")
        raise
