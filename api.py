"""
Backward compatibility wrapper for the API.

This file allows running the API with `python api.py` for existing workflows.
The actual implementation is in backend/api.py.
"""

from backend.api import run_app

if __name__ == '__main__':
    run_app()
