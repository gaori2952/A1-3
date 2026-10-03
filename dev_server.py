"""Run the same Python handler locally, including /api/analyze."""
from http.server import ThreadingHTTPServer
from api.index import handler

if __name__ == "__main__":
    print("ProjectFlow: http://localhost:8000/login.html")
    ThreadingHTTPServer(("127.0.0.1", 8000), handler).serve_forever()
