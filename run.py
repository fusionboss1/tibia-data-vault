"""
Tibia Data Vault process orchestrator.

Starts both the Flask API and React frontend, managing them as child processes.
Provides graceful shutdown on Ctrl+C.
"""

import atexit
import logging
import os
import platform
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

from backend import API_PORT, LOG_LEVEL, LOG_FORMAT

# Configure logging
logging.basicConfig(level=getattr(logging, LOG_LEVEL), format=LOG_FORMAT)
logger = logging.getLogger(__name__)

# Global process references for cleanup
_processes = []


def find_executable(name: str) -> str:
    """Find an executable in PATH."""
    cmd = shutil.which(name)
    if not cmd:
        raise RuntimeError(
            f"'{name}' not found in PATH. "
            f"Please install {name} or add it to your PATH.\n"
            f"You can install pnpm with: npm install -g pnpm"
        )
    return cmd


def terminate_processes():
    """Terminate all child processes gracefully."""
    logger.info("Terminating child processes...")
    
    for proc in _processes:
        if proc and proc.poll() is None:  # Process is still running
            try:
                logger.debug(f"Terminating process {proc.pid}")
                proc.terminate()
                # Wait up to 5 seconds for graceful shutdown
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                logger.warning(f"Process {proc.pid} did not terminate gracefully, killing...")
                proc.kill()
                proc.wait()
            except Exception as e:
                logger.error(f"Error terminating process {proc.pid}: {e}")


def signal_handler(signum, frame):
    """Handle shutdown signals."""
    sig_name = signal.Signals(signum).name
    logger.info(f"Received {sig_name}, shutting down...")
    print(f"\nReceived {sig_name}, shutting down...")
    sys.exit(0)


def start_api() -> subprocess.Popen:
    """Start the Flask API server."""
    logger.info(f"Starting Flask API on port {API_PORT}...")
    print(f"Starting Flask API on port {API_PORT}...")
    
    env = os.environ.copy()
    # Set PYTHONPATH to include backend module
    if 'PYTHONPATH' in env:
        env['PYTHONPATH'] = str(Path(__file__).parent) + os.pathsep + env['PYTHONPATH']
    else:
        env['PYTHONPATH'] = str(Path(__file__).parent)
    
    proc = subprocess.Popen(
        [sys.executable, '-m', 'backend.api'],
        env=env,
        # Don't use shell=True for security
        shell=False
    )
    _processes.append(proc)
    logger.info(f"API process started with PID {proc.pid}")
    return proc


def start_frontend() -> subprocess.Popen:
    """Start the React frontend dev server."""
    logger.info("Starting React frontend on port 3000...")
    print("Starting React frontend on port 3000...")
    
    pnpm_cmd = find_executable('pnpm')
    
    proc = subprocess.Popen(
        [pnpm_cmd, 'dev'],
        # Don't use shell=True even on Windows - pass list properly
        shell=False
    )
    _processes.append(proc)
    logger.info(f"Frontend process started with PID {proc.pid}")
    return proc


def wait_for_processes():
    """Wait for processes and handle their exit."""
    try:
        # Wait for both processes
        exit_codes = []
        for proc in _processes:
            exit_code = proc.wait()
            exit_codes.append(exit_code)
            logger.info(f"Process {proc.pid} exited with code {exit_code}")
        
        # If any process exited with error, return that code
        for code in exit_codes:
            if code != 0:
                return code
        return 0
        
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
        return 0


def main():
    """Main entry point."""
    print("=" * 50)
    print("Tibia Data Vault")
    print("=" * 50)
    
    # Register cleanup handlers
    atexit.register(terminate_processes)
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Windows doesn't have SIGTERM, but we handle what we can
    if hasattr(signal, 'SIGBREAK'):
        signal.signal(signal.SIGBREAK, signal_handler)
    
    try:
        # Start services
        api_process = start_api()
        
        # Give API a moment to start
        time.sleep(1)
        
        frontend_process = start_frontend()
        
        print("=" * 50)
        print("Both services are running!")
        print(f"API:      http://localhost:{API_PORT}")
        print("Frontend: http://localhost:3000")
        print("Press Ctrl+C to stop both services")
        print("=" * 50)
        
        # Wait for processes
        exit_code = wait_for_processes()
        
    except RuntimeError as e:
        logger.error(str(e))
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        print(f"Error: {e}")
        sys.exit(1)
    
    finally:
        print("\nStopping services...")
        terminate_processes()
        print("Services stopped.")
    
    sys.exit(exit_code)


if __name__ == '__main__':
    main()
