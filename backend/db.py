"""Database connection and utility functions."""

import sqlite3
import logging
from contextlib import contextmanager
from typing import Optional

from backend.config import DB_PATH

logger = logging.getLogger(__name__)


@contextmanager
def get_db():
    """
    Context manager for database connections.
    
    Usage:
        with get_db() as conn:
            cursor = conn.execute("SELECT * FROM servers")
            results = cursor.fetchall()
    """
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        logger.debug(f"Database connection opened: {DB_PATH}")
        yield conn
    except sqlite3.Error as e:
        logger.error(f"Database connection error: {e}")
        raise
    finally:
        if conn:
            conn.close()
            logger.debug("Database connection closed")


def init_db():
    """
    Initialize the database with required tables if they don't exist.
    This is a lightweight check - full migrations should use migrate_schema.py
    """
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='servers'"
        )
        if not cursor.fetchone():
            logger.warning("Database tables not found. Run migrate_schema.py to initialize.")
            return False
        logger.info("Database initialized and ready")
        return True


def check_db_health() -> dict:
    """Check database health and return status information."""
    health = {
        "connected": False,
        "tables": [],
        "record_counts": {},
        "error": None
    }
    
    try:
        with get_db() as conn:
            health["connected"] = True
            
            # Get list of tables
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            tables = [row["name"] for row in cursor.fetchall()]
            health["tables"] = tables
            
            # Get record counts
            for table in tables:
                try:
                    cursor = conn.execute(f"SELECT COUNT(*) as count FROM {table}")
                    count = cursor.fetchone()["count"]
                    health["record_counts"][table] = count
                except sqlite3.Error as e:
                    health["record_counts"][table] = f"error: {e}"
                    
    except sqlite3.Error as e:
        health["error"] = str(e)
        logger.error(f"Database health check failed: {e}")
    
    return health
