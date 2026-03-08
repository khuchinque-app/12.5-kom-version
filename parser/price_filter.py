import tkinter as tk
from tkinter import scrolledtext
import difflib
import re

def load_menu(file_path):
    """Parses menu.txt into a dictionary of {item_name: price}."""
    menu = {}
    try:
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                # Matches patterns like '10K', '12k', '15.5K' at the end of lines
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
        output_area.insert(tk.END, "Error: 'menu.txt' not found in this folder!")
        return

    processed_lines = []
    menu_items = list(menu.keys())

    for line in raw_text:
        line = line.strip()
        if not line:
            processed_lines.append("")
            continue

        # Extract prefix and order_part
        if ':' in line:
            prefix, order_part = [part.strip() for part in line.split(':', 1)]
            has_prefix = True
        else:
            prefix = ''
            order_part = line
            has_prefix = False

        # Split order_part into parts
        parts = [p.strip() for p in re.split(r'\s*\+\s*', order_part) if p.strip()]

        # Peel off extras if more than 2 parts
        extras = []
        while len(parts) > 2:
            extras.insert(0, parts.pop())

        main_str = ' + '.join(parts) if parts else ''

        # Process main
        main_with = process_item(main_str, menu_items, menu)

        # Append main line if exists
        if main_with or prefix:
            main_line = f"{prefix} : {main_with}" if prefix else main_with
            processed_lines.append(main_line)

        # Process extras
        for extra_str in extras:
            extra_with = process_item(extra_str, menu_items, menu)
            if has_prefix:
                processed_lines.append(extra_with)
            else:
                processed_lines.append(f"+ {extra_with}")

    output_area.delete("1.0", tk.END)
    output_area.insert(tk.END, "\n".join(processed_lines))

def process_item(item_str, menu_items, menu):
    if not item_str:
        return ''
    
    # Parse quantity
    match_qty = re.match(r'^(\d+)\s+(.*)$', item_str.strip())
    if match_qty:
        quantity = int(match_qty.group(1))
        sub_item = match_qty.group(2).strip()
    else:
        quantity = 1
        sub_item = item_str.strip()
    
    # Check if has price
    match_price = re.search(r'(.*)\s+(\d+\.?\d*[Kk])$', sub_item)
    if match_price:
        item_name = match_price.group(1).strip()
        unit_price_str = match_price.group(2).upper()
    else:
        item_name = sub_item
        unit_price_str = get_price_for_item(item_name, menu_items, menu)
    
    if unit_price_str:
        unit_price = float(re.sub(r'[Kk]', '', unit_price_str))
    else:
        unit_price = 0
        unit_price_str = '0K'
    
    total = quantity * unit_price
    total_str = f"{int(total) if total % 1 == 0 else total}K"
    
    qty_prefix = f"{quantity} " if quantity > 1 else ''
    result = f"{qty_prefix}{item_name} {total_str}".strip()
    return result

def get_price_for_item(item_str, menu_items, menu):
    clean = re.sub(r'[^\w\s+]', '', item_str).strip().upper()
    matches = difflib.get_close_matches(clean, menu_items, n=1, cutoff=0.4)
    if matches:
        return menu[matches[0]]
    return None

def select_all(event):
    event.widget.tag_add(tk.SEL, "1.0", tk.END)
    event.widget.mark_set(tk.INSERT, "1.0")
    event.widget.see(tk.INSERT)
    return "break"

# --- GUI Setup ---
root = tk.Tk()
root.title("Abah Kasir - Price Filler")
root.geometry("600x700")

# Input Label
tk.Label(root, text="Paste Customer Orders Here:", font=("Arial", 10, "bold")).pack(pady=5)

# Input Box
input_area = scrolledtext.ScrolledText(root, height=15, width=70)
input_area.pack(padx=10, pady=5)
input_area.bind("<Control-a>", select_all)
input_area.bind("<Control-A>", select_all)  # For case sensitivity if needed

# Process Button
process_btn = tk.Button(root, text="FILL PRICES", command=process_orders, bg="green", fg="white", font=("Arial", 12, "bold"))
process_btn.pack(pady=10)

# Output Label
tk.Label(root, text="Result (Ready to Copy):", font=("Arial", 10, "bold")).pack(pady=5)

# Output Box
output_area = scrolledtext.ScrolledText(root, height=15, width=70, bg="#f0f0f0")
output_area.pack(padx=10, pady=5)
output_area.bind("<Control-a>", select_all)
output_area.bind("<Control-A>", select_all)  # For case sensitivity if needed

root.mainloop()
