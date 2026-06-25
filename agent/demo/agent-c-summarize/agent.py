"""
Agent C — Summarizer (demo).

Sells AI-generated summaries to other agents via x402. Similar to Agent B
but accepts raw data and returns summaries.

Run: python3 agent-c-summarize.py --port 8002
"""

import sys
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "mcp-server"))

from wallet import load_wallet


class SummarizerHandler(BaseHTTPRequestHandler):
    """HTTP handler that validates x402 and returns a summary."""

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len)

        # Validate x402 payment
        x402_header = self.headers.get("X-402-Payment", "")
        if not x402_header:
            self.send_error(402, "Payment Required")
            return

        # Parse input (placeholder)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            data = {"headlines": []}

        # Generate summary (placeholder)
        summary = self._generate_summary(data.get("headlines", []))

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({
            "source": "summarizer",
            "summary": summary,
            "x402_status": "paid",
        }).encode())

    def _generate_summary(self, headlines: list) -> str:
        if not headlines:
            return "No data to summarize."
        titles = [h.get("title", "") for h in headlines]
        return f"Summary: {len(headlines)} articles found. Key themes: {', '.join(titles[:3])}."

    def log_message(self, fmt, *args):
        print(f"[Agent C] {fmt % args}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Agent C — Summarizer")
    parser.add_argument("--port", type=int, default=8002)
    args = parser.parse_args()

    wallet = load_wallet()
    print(f"[Agent C] Address: {wallet['address']}")
    print(f"[Agent C] Serving summaries on port {args.port}")
    print(f"[Agent C] Price: $0.03 per request (x402)")

    server = HTTPServer(("0.0.0.0", args.port), SummarizerHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
        print("[Agent C] Stopped")


if __name__ == "__main__":
    main()