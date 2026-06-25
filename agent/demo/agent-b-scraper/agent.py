"""
Agent B — Scraper (demo).

Sells scraped data to other agents via x402. Runs a small HTTP endpoint
that accepts x402 payment headers and returns JSON data.

Run: python3 agent-b-scraper.py --port 8001
"""

import sys
import os
import asyncio
import hashlib
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "mcp-server"))

from wallet import load_wallet
from x402 import x402_verify


class ScraperHandler(BaseHTTPRequestHandler):
    """HTTP handler that validates x402 payment and returns scraped data."""

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        # Validate x402 payment header
        x402_header = self.headers.get("X-402-Payment", "")
        if not x402_header:
            self.send_error(402, "Payment Required")
            return

        # In production: decode the x402 header, verify via relayer
        # For demo: just return sample data
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(
            json.dumps({
                "source": "scraper",
                "urls_scraped": 10,
                "headlines": [
                    {"title": "Stellar DeFi surges in LATAM", "url": "https://example.com/1"},
                    {"title": "New x402 protocol launched", "url": "https://example.com/2"},
                ],
                "x402_status": "paid",
            }).encode()
        )

    def log_message(self, fmt, *args):
        print(f"[Agent B] {fmt % args}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Agent B — Scraper")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()

    wallet = load_wallet()
    print(f"[Agent B] Address: {wallet['address']}")
    print(f"[Agent B] Serving scraped data on port {args.port}")
    print(f"[Agent B] Price: $0.05 per request (x402)")

    server = HTTPServer(("0.0.0.0", args.port), ScraperHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
        print("[Agent B] Stopped")


if __name__ == "__main__":
    import json
    main()