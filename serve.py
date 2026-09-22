"""Tiny local server for previewing the static meditation timer.

Run:
    python3 serve.py
Then open:
    http://localhost:8000
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)

if __name__ == "__main__":
    print("Still Meditation Timer: http://localhost:8000")
    ThreadingHTTPServer(("localhost", 8000), SimpleHTTPRequestHandler).serve_forever()
