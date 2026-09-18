import sys
import os

# Add parent directory to sys.path so server.py and its dependencies can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app
