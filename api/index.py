import sys
import os

# Adds the parent directory to Python path so BACKEND module can be found
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from BACKEND.APP.main import app
