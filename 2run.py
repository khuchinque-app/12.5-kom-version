import os
import http.server
import socketserver
import webbrowser

# FIXED: Added underscores to __file__ 
# This changes the working directory to where the script is located
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8021
Handler = http.server.SimpleHTTPRequestHandler

# Allow reusing the address to prevent "Address already in use" errors
class ReuseTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

try:
    with ReuseTCPServer(("", PORT), Handler) as httpd:
        print("server berjalan.. buka chrome browser dan masukan")
        print(f"http://localhost:{PORT}/")
        
        # Optional: Uncomment to automatically open the browser
        # webbrowser.open(f"http://localhost:{PORT}/")
        
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
