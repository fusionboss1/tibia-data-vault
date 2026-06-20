"""Centralized configuration for the backend."""

import os
from pathlib import Path

# Try to load .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, use system env vars only

# Base paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR

# Database configuration
DB_PATH = os.getenv("TIBIA_DB_PATH", str(DATA_DIR / "tibia_data.db"))
ITEM_METADATA_PATH = os.getenv("TIBIA_ITEM_METADATA_PATH", str(DATA_DIR / "item_metadata.json"))

# API configuration
API_HOST = os.getenv("TIBIA_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("TIBIA_API_PORT", "5000"))
API_DEBUG = os.getenv("TIBIA_API_DEBUG", "false").lower() == "true"

# External API configuration
TIBIA_MARKET_API_URL = os.getenv("TIBIA_MARKET_API_URL", "https://api.tibiamarket.top")
REQUEST_TIMEOUT = int(os.getenv("TIBIA_REQUEST_TIMEOUT", "30"))
REQUEST_DELAY = int(os.getenv("TIBIA_REQUEST_DELAY", "30"))  # seconds between per-server requests

# Logging configuration
LOG_LEVEL = os.getenv("TIBIA_LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


def print_config():
    """Print current configuration for debugging."""
    print("Tibia Data Vault Configuration:")
    print(f"  DB_PATH: {DB_PATH}")
    print(f"  API_HOST: {API_HOST}")
    print(f"  API_PORT: {API_PORT}")
    print(f"  API_DEBUG: {API_DEBUG}")
    print(f"  TIBIA_MARKET_API_URL: {TIBIA_MARKET_API_URL}")
    print(f"  REQUEST_TIMEOUT: {REQUEST_TIMEOUT}")
    print(f"  REQUEST_DELAY: {REQUEST_DELAY}")
    print(f"  LOG_LEVEL: {LOG_LEVEL}")
