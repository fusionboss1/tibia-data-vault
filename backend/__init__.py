"""Tibia Data Vault backend module."""

from backend.config import (
    DB_PATH,
    API_HOST,
    API_PORT,
    API_DEBUG,
    TIBIA_MARKET_API_URL,
    REQUEST_TIMEOUT,
    REQUEST_DELAY,
    LOG_LEVEL,
    LOG_FORMAT,
    print_config,
)
from backend.db import get_db, init_db, check_db_health

__version__ = "0.1.0"

__all__ = [
    "DB_PATH",
    "API_HOST",
    "API_PORT",
    "API_DEBUG",
    "TIBIA_MARKET_API_URL",
    "REQUEST_TIMEOUT",
    "REQUEST_DELAY",
    "LOG_LEVEL",
    "LOG_FORMAT",
    "print_config",
    "get_db",
    "init_db",
    "check_db_health",
]
