import os
import sys

def stop_port_process(port):
    """ 
    Finds the Process ID (PID) running on the specified port and kills it.
    This uses standard Linux/Ubuntu commands (lsof and kill).
    """
    print(f"Attempting to free up port {port}...")
    
    if sys.platform.startswith('linux') or sys.platform.startswith('darwin'):
        # Command for Ubuntu/Linux/macOS:
        # lsof -ti tcp:{port} finds the Process ID (PID)
        # xargs kill -9 forcefully terminates the PID(s) found
        command = f"lsof -ti tcp:{port} | xargs kill -9"
        
        # Execute the command in the shell
        result = os.system(command)
        
        if result == 0:
            print(f"✅ Port {port} freed successfully (or was already free).")
        else:
            print(f"❌ Could not terminate the process on port {port}. It might not have been running, or an error occurred.")
        
        print(f"To verify, run: lsof -i :{port}")
    
    elif sys.platform.startswith('win32'):
        print("\n--- Running on Windows ---")
        print("To stop the port on Windows, you must find the PID first.")
        print(f"Run this command manually: netstat -ano | findstr :{port}")
        print("Then use taskkill /PID [PID] /F")
    
    else:
        print(f"Unsupported OS: {sys.platform}. Please check the command manually.")

# --- Execution ---
PORT_TO_STOP = 8060
stop_port_process(PORT_TO_STOP)
