import http.server
import socketserver
import json
import os
import re

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(DIRECTORY, "data.json")
UPLOAD_DIR = os.path.join(DIRECTORY, "uploads")

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

class PortfolioAPIHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Allow cross-origin requests for easier debugging if needed
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Route API queries
        if self.path == "/api/data":
            if os.path.exists(DATA_FILE):
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
                content_bytes = content.encode("utf-8")
                self.send_header("Content-Length", str(len(content_bytes)))
                self.end_headers()
                self.wfile.write(content_bytes)
            else:
                self.send_error(404, "Data file not found")
        else:
            # Serve regular static files
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/data":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            
            try:
                # Validate JSON structure
                data = json.loads(post_data.decode("utf-8"))
                
                # Write to database file
                with open(DATA_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                response = {"status": "success", "message": "Data saved successfully"}
                self.wfile.write(json.dumps(response).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                response = {"status": "error", "message": str(e)}
                self.wfile.write(json.dumps(response).encode("utf-8"))

        elif self.path == "/api/upload":
            content_type = self.headers.get("Content-Type", "")
            content_length = int(self.headers.get("Content-Length", 0))
            
            if "multipart/form-data" not in content_type:
                self.send_error(400, "Bad Request: Expected multipart/form-data")
                return

            # Extract boundary
            boundary_match = re.search(r"boundary=(.+)", content_type)
            if not boundary_match:
                self.send_error(400, "Bad Request: No boundary found")
                return
            boundary = boundary_match.group(1).encode("utf-8")

            # Read all body bytes
            raw_body = self.rfile.read(content_length)

            try:
                # Multipart format parsing:
                # --boundary\r\nContent-Disposition: ... name="file"; filename="foo.jpg"\r\nContent-Type: ...\r\n\r\n[data]\r\n--boundary--
                parts = raw_body.split(b"--" + boundary)
                
                file_data = None
                filename = "uploaded_file.jpg"

                for part in parts:
                    if b"filename=" in part:
                        # Extract headers and content
                        header_data, content = part.split(b"\r\n\r\n", 1)
                        header_str = header_data.decode("utf-8", errors="ignore")
                        
                        # Find filename
                        fn_match = re.search(r'filename="([^"]+)"', header_str)
                        if fn_match:
                            filename = fn_match.group(1)
                            # Clean filename to avoid path traversal
                            filename = os.path.basename(filename)
                        
                        # Strip trailing \r\n from content
                        if content.endswith(b"\r\n"):
                            content = content[:-2]
                        
                        file_data = content
                        break

                if file_data is None:
                    raise Exception("No file found in multipart payload")

                # Make filename unique to prevent overwriting
                base, ext = os.path.splitext(filename)
                import time
                unique_filename = f"{base}_{int(time.time())}{ext}"
                file_path = os.path.join(UPLOAD_DIR, unique_filename)

                # Save file
                with open(file_path, "wb") as f:
                    f.write(file_data)

                # Return url relative to project root
                relative_url = f"uploads/{unique_filename}"
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                response = {"status": "success", "url": relative_url}
                self.wfile.write(json.dumps(response).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                response = {"status": "error", "message": str(e)}
                self.wfile.write(json.dumps(response).encode("utf-8"))
        else:
            self.send_error(404, "Not Found")

if __name__ == "__main__":
    print(f"Starting server on http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    with socketserver.TCPServer(("", PORT), PortfolioAPIHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server.")
