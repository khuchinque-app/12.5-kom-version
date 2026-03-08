import tkinter as tk
from tkinter import scrolledtext
import difflib
import re

def load_menu(file_path):
    menu = {}
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Matches patterns like 'NASI GORENG 15K'
                match = re.search(r'(.*?)\s+(\d+\.?\d*[Kk])$', line)
                if match:
                    item_name = match.group(1).strip().upper()
                    price = match.group(2).upper()
                    menu[item_name] = price
    except FileNotFoundError:
        return None
    return menu

def process_orders():
    raw_text = input_area.get("1.0", tk.END).splitlines()
    menu = load_menu('menu.txt')
    
    if menu is None:
        output_area.delete("1.0", tk.END)
        output_area.insert(tk.END, "Error: 'menu.txt' not found!")
        return

    processed_lines = []
    menu_items = list(menu.keys())

    for line in raw_text:
        line = line.strip()
        if not line:
            processed_lines.append("")
            continue

        # Step 1: Handle Prefix (Names/Tables with : or =)
        prefix = ""
        content = line
        split_prefix = re.split(r'([:=])', line, 1) # Split at first : or =
        if len(split_prefix) == 3:
            prefix = split_prefix[0].strip() + " " + split_prefix[1]
            content = split_prefix[2].strip()
            processed_lines.append(prefix) # Prefix gets its own line

        # Step 2: HINT - Split line by every "+" symbol
        # Every part separated by "+" gets its own line
        parts = [p.strip() for p in re.split(r'\s*\+\s*', content) if p.strip()]
        
        for part in parts:
            # Process the item (adds price or defaults to 0K)
            item_result = process_single_part(part, menu_items, menu)
            
            # Step 3: REQUIREMENT - "Enter" after the price (Numeric K mark)
            # Use regex to find the price pattern (e.g., 12K) to avoid splitting words like BAKAR
            price_match = re.search(r'(\d+\.?\d*[Kk])', item_result)
            if price_match:
                end_of_price = price_match.end()
                line_one = item_result[:end_of_price].strip()
                line_two = item_result[end_of_price:].strip()
                
                processed_lines.append(line_one)
                if line_two: # If there are notes like (BUAT PEDAS) after the price
                    processed_lines.append(line_two)
            else:
                processed_lines.append(item_result)

    output_area.delete("1.0", tk.END)
    output_area.insert(tk.END, "\n".join(processed_lines))

def process_single_part(text_part, menu_items, menu):
    # Check for quantity (e.g., "2 NASI")
    qty = 1
    match_qty = re.match(r'^(\d+)\s+(.*)$', text_part)
    if match_qty:
        qty = int(match_qty.group(1))
        item_name_raw = match_qty.group(2).strip()
    else:
        item_name_raw = text_part

    # REQUIREMENT: If price is already there, don't add another
    has_price = re.search(r'(\d+\.?\d*[Kk])', item_name_raw)
    if has_price:
        return text_part 

    # REQUIREMENT: Lookup price or default to 0K
    unit_price_str = get_price_for_item(item_name_raw, menu_items, menu)
    if not unit_price_str:
        unit_price_str = "0K"
        
    # Calculate Total
    try:
        val = float(re.sub(r'[Kk]', '', unit_price_str))
        total_val = qty * val
        total_str = f"{int(total_val) if total_val % 1 == 0 else total_val}K"
    except:
        total_str = "0K"

    qty_prefix = f"{qty} " if qty > 1 else ""
    return f"{qty_prefix}{item_name_raw} {total_str}"

def get_price_for_item(item_str, menu_items, menu):
    # Remove symbols for cleaner matching
    clean = re.sub(r'[^\w\s]', '', item_str).strip().upper()
    if len(clean) < 3: return None # Avoid matching short names/codes
    
    # Cutoff 0.7 ensures "LEON" won't accidentally match "LEMON TEA"
    matches = difflib.get_close_matches(clean, menu_items, n=1, cutoff=0.7)
    if matches:
        return menu[matches[0]]
    return None

def select_all(event):
    event.widget.tag_add(tk.SEL, "1.0", tk.END)
    return "break"

# --- GUI ---
root = tk.Tk()
root.title("Abah Kasir - Price Filter Pro")
root.geometry("600x750")

tk.Label(root, text="Paste Customer Orders Here:", font=("Arial", 10, "bold")).pack(pady=5)
input_area = scrolledtext.ScrolledText(root, height=15, width=70)
input_area.pack(padx=10, pady=5)
input_area.bind("<Control-a>", select_all)

process_btn = tk.Button(root, text="FILL PRICES", command=process_orders, bg="#228B22", fg="white", font=("Arial", 12, "bold"))
process_btn.pack(pady=10)

tk.Label(root, text="Result (Ready to Copy):", font=("Arial", 10, "bold")).pack(pady=5)
output_area = scrolledtext.ScrolledText(root, height=15, width=70, bg="#f9f9f9")
output_area.pack(padx=10, pady=5)
output_area.bind("<Control-a>", select_all)

root.mainloop()
