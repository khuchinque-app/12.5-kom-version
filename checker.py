import re
import tkinter as tk
from tkinter import scrolledtext, messagebox

class OrderCheckerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("🧐 Order Sanity Checker")
        self.root.geometry("600x700")

        # --- TOP: Instructions ---
        lbl_instruction = tk.Label(root, text="Paste your messy orders below and hit 'Check Orders'", font=("Arial", 10, "bold"))
        lbl_instruction.pack(pady=5)

        # --- MIDDLE: Text Input Area ---
        self.text_area = scrolledtext.ScrolledText(root, width=70, height=25, font=("Consolas", 11), undo=True)
        self.text_area.pack(padx=10, pady=5)
        
        # Configure the "error" tag to highlight background in red/pink
        self.text_area.tag_config("error", background="#ffcccc", foreground="red")
        self.text_area.tag_config("valid", background="#e6ffcc")

        # Bind Ctrl+A to select all
        self.text_area.bind("<Control-a>", self.select_all)
        # Ctrl+Z for undo and Ctrl+Y for redo are enabled by default with undo=True

        # --- BOTTOM: Buttons and Results ---
        btn_frame = tk.Frame(root)
        btn_frame.pack(pady=10)

        self.btn_check = tk.Button(btn_frame, text="✅ Check Orders", command=self.check_orders, bg="#4CAF50", fg="white", font=("Arial", 11, "bold"), padx=20)
        self.btn_check.pack(side=tk.LEFT, padx=10)

        self.btn_clear = tk.Button(btn_frame, text="🗑️ Clear", command=self.clear_text, padx=10)
        self.btn_clear.pack(side=tk.LEFT, padx=10)

        self.lbl_result = tk.Label(root, text="Ready to scan...", font=("Arial", 12), fg="blue", justify=tk.LEFT)
        self.lbl_result.pack(pady=10)

    def select_all(self, event):
        self.text_area.tag_add(tk.SEL, "1.0", tk.END)
        self.text_area.mark_set(tk.INSERT, tk.END)
        self.text_area.see(tk.INSERT)
        return "break"

    def clear_text(self):
        self.text_area.delete('1.0', tk.END)
        self.lbl_result.config(text="Ready to scan...", fg="blue")

    def check_orders(self):
        # 1. Clear previous highlights
        self.text_area.tag_remove("error", "1.0", tk.END)
        self.text_area.tag_remove("valid", "1.0", tk.END)

        raw_text = self.text_area.get("1.0", tk.END)
        lines = raw_text.split('\n')
        
        total_price = 0
        item_count = 0
        error_count = 0
        
        # 2. DEFINING THE PATTERNS (The Brains)
        
        # Price: Matches anywhere in the line, e.g., 15k, 15 K, 15rb, 15.000, 15000
        # Captures space between number and suffix to detect malformed prices.
        # Group 1: Number. Group 2: Space. Group 3: Optional suffix (k/rb).
        rgx_price = re.compile(r'(\d+(?:[.,]\d+)?)(\s*)(k|rb)?\b', re.IGNORECASE)
        
        # Notes/Modifiers: Lines that shouldn't be counted as items
        # Starts with (, -, *, Note, or is just very short/symbols
        rgx_note = re.compile(r'^[\(\-\*]|^(note|catatan):', re.IGNORECASE)
        
        # Headers: Ends with : (e.g., "Lexku:")
        rgx_header = re.compile(r':\s*$')

        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped: continue  # Skip empty lines

            # --- CHECK LOGIC ---
            
            # Case A: It's a header (User Name) -> Skip
            if rgx_header.search(stripped):
                continue

            # Case C: No Price. Is it a Note/Modifier?
            # If line starts with ( or - or is very short (e.g. "pedas"), we assume it's a note.
            if rgx_note.match(stripped) or len(stripped) < 4:
                continue

            # Find all potential prices
            matches = rgx_price.finditer(stripped)
            valid_prices = []
            malformed = False
            for match in matches:
                num_str = match.group(1).replace('.', '').replace(',', '')
                space = match.group(2)
                suffix = match.group(3).lower() if match.group(3) else ""
                
                if suffix and space:
                    malformed = True
                    continue  # Skip adding to valid_prices
                
                try:
                    val = float(num_str)
                    # Normalize: if they typed 15k -> 15000. If 15000 -> 15000.
                    if suffix:
                        val *= 1000
                    
                    # Only consider it a valid price if >= 1000
                    if val >= 1000:
                        valid_prices.append(int(val))
                except ValueError:
                    pass  # Should not happen with regex
            
            num_valid = len(valid_prices)
            
            if malformed or num_valid != 1:
                error_count += 1
                self.highlight_line(i + 1, "error")
            else:
                total_price += valid_prices[0]
                item_count += 1
                # Highlight valid lines in green
                self.highlight_line(i + 1, "valid")

        # 3. OUTPUT REPORT
        status_color = "red" if error_count > 0 else "green"
        result_text = (
            f"📦 Items Found: {item_count}\n"
            f"💰 Estimated Total: {total_price:,}\n"
            f"⚠️ Missing Prices: {error_count} lines (Highlighted in Red)"
        )
        self.lbl_result.config(text=result_text, fg=status_color)
        
        if error_count > 0:
            messagebox.showwarning("Missing Prices!", "I found lines that look like orders but have no price, multiple prices, or malformed prices (e.g., space between number and 'k').\n\nCheck the RED highlighted lines.")

    def highlight_line(self, line_num, tag):
        # Tkinter text indexing is "line.char" (e.g., "1.0", "2.0")
        start = f"{line_num}.0"
        end = f"{line_num}.end"
        self.text_area.tag_add(tag, start, end)

if __name__ == "__main__":
    # Check for Tkinter (common issue on minimal Linux installs)
    try:
        root = tk.Tk()
        app = OrderCheckerApp(root)
        root.mainloop()
    except ImportError:
        print("❌ Error: Tkinter not found.")
        print("👉 Run this command in your terminal: sudo apt-get install python3-tk")