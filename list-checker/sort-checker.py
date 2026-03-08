import tkinter as tk
from tkinter import scrolledtext, messagebox
import re
from collections import defaultdict, Counter
import webbrowser
import os
import tempfile
import html

# Original: Group by person for boxing (tidy and sorted)
def tidy_bill(bill_text):
    lines = bill_text.split('\n')
    items_by_name = defaultdict(list)
    current_name = 'General'
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('*') or 'total' in line.lower() or 'item =' in line or 'order' in line.lower() or 'customer' in line.lower() or 'address' in line.lower():
            continue
        
        if len(line) < 10 and line.isupper() and not any(char.isdigit() for char in line):
            current_name = line
            continue
        
        match_paren = re.search(r'\s*\((.*?)\)\s*$', line)
        if match_paren:
            name = match_paren.group(1).strip()
            item = re.sub(r'\s*\(.*?\)\s*$', '', line).strip()
            items_by_name[name].append(item)
            continue
        
        prices = re.findall(r'\d+K', line)
        if prices:
            price = prices[-1]
            pre_price, post_price = re.split(r'\s*' + re.escape(price) + r'\s*', line, maxsplit=1)
            pre_price = pre_price.strip()
            post_price = post_price.strip()
            
            if post_price and post_price.isupper() and len(post_price) <= 10:
                name = post_price
                item = pre_price + ' ' + price
            else:
                words = pre_price.split()
                if words and len(words[-1]) <= 5 and words[-1].isupper() and not any(c.isdigit() for c in words[-1]):
                    name = words[-1]
                    item = ' '.join(words[:-1]) + ' ' + price
                else:
                    name = current_name
                    item = line
            items_by_name[name].append(item)
        else:
            items_by_name[current_name].append(line)
    
    output = ''
    for name in sorted(items_by_name.keys()):
        output += f"{name}:\n"
        for item in sorted(items_by_name[name]):
            output += f"  - {item}\n"
        output += '\n'
    
    return output

# New: Aggregate item counts for packing (strips names, keeps TAMBAHAN separate)
def aggregate_for_packing(bill_text):
    lines = bill_text.split('\n')
    main_items = []
    additional_items = []
    current_list = main_items
    in_additional = False
    
    common_dish_words = {'NASI', 'LONTONG', 'AYAM', 'SATE', 'CUMI', 'TELUR', 'PETE', 'SOSIS', 'KAMPUNG', 'ABAH', 'KHAS'}  # Expand if needed
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('*') or 'total' in line.lower() or 'item =' in line or 'order' in line.lower() or 'customer' in line.lower() or 'address' in line.lower():
            continue
        if line.upper() == 'TAMBAHAN':
            in_additional = True
            current_list = additional_items
            continue
        if len(line) < 15 and (line.isupper() or line in ['NDO', 'JUN', 'LILLY', 'JHONY']):
            continue
        
        prices = re.findall(r'\d+K', line)
        if not prices:
            if len(line) < 20 and (line.isupper() or '(' in line or ')' in line):
                continue
            else:
                current_list.append(line)
            continue
        
        price = prices[-1]
        parts = re.split(r'\s*' + re.escape(price) + r'\s*', line, maxsplit=1)
        pre = parts[0].strip()
        post = parts[1].strip() if len(parts) > 1 else ''
        
        item = pre + ' ' + price
        
        if post and (post.isupper() or '(' in post or ')' in post):
            pass
        
        match = re.search(r'\s*\((.*?)\)\s*$', pre)
        if match:
            item = re.sub(r'\s*\(.*?\)\s*$', '', pre).strip() + ' ' + price
        
        words = pre.split()
        if words and len(words[-1]) <= 5 and words[-1].isupper() and not any(c.isdigit() for c in words[-1]) and words[-1] not in common_dish_words:
            item = ' '.join(words[:-1]).strip() + ' ' + price
        
        item = re.sub(r'[^\w\s+()-]', '', item)  # Remove emojis/symbols
        item = re.sub(r'\s+', ' ', item).strip()
        
        current_list.append(item)
    
    main_counter = Counter(main_items)
    add_counter = Counter(additional_items)
    
    output = "Main Items (aggregated for packing):\n"
    for item, count in sorted(main_counter.items(), key=lambda x: x[0]):
        output += f"- {item}: {count}x\n"
    
    if add_counter:
        output += "\nTAMBAHAN (last-minute additions):\n"
        for item, count in sorted(add_counter.items(), key=lambda x: x[0]):
            output += f"- {item}: {count}x\n"
    
    return output

# GUI Application
class BillSorterApp:
    def __init__(self, root):
        self.root = root
        root.title("Bill Sorter GUI")
        
        # Input Label
        input_label = tk.Label(root, text="Paste Bill Text Here:")
        input_label.pack()
        
        # Input Text Area
        self.input_text = scrolledtext.ScrolledText(root, width=60, height=15, undo=True)
        self.input_text.pack()
        
        # Buttons Frame
        buttons_frame = tk.Frame(root)
        buttons_frame.pack(pady=10)
        
        # Tidy Bill Button
        tidy_button = tk.Button(buttons_frame, text="Tidy by Person (for Boxing)", command=self.tidy_bill_action)
        tidy_button.pack(side=tk.LEFT, padx=5)
        
        # Aggregate Button
        aggregate_button = tk.Button(buttons_frame, text="Aggregate for Packing", command=self.aggregate_action)
        aggregate_button.pack(side=tk.LEFT, padx=5)
        
        # Clear Button
        clear_button = tk.Button(buttons_frame, text="Clear All", command=self.clear_all)
        clear_button.pack(side=tk.LEFT, padx=5)
        
        # Output Label
        output_label = tk.Label(root, text="Output:")
        output_label.pack()
        
        # Output Text Area
        self.output_text = scrolledtext.ScrolledText(root, width=60, height=15, undo=True)
        self.output_text.pack()

        # Print Button below output
        print_button = tk.Button(root, text="Print Output", command=self.print_output)
        print_button.pack(pady=10)

        # Bind keyboard shortcuts to both input and output text areas
        for widget in [self.input_text, self.output_text]:
            widget.bind("<Control-a>", self.select_all)
            widget.bind("<Control-x>", self.cut)
            widget.bind("<Control-z>", self.undo)
            widget.bind("<Control-y>", self.redo)  # Standard redo
            widget.bind("<Control-p>", self.print_text)

    def select_all(self, event):
        event.widget.tag_add(tk.SEL, "1.0", tk.END)
        event.widget.mark_set(tk.INSERT, "1.0")
        event.widget.see(tk.INSERT)
        return "break"

    def cut(self, event):
        event.widget.event_generate("<<Cut>>")
        return "break"

    def undo(self, event):
        try:
            event.widget.edit_undo()
        except tk.TclError:
            pass
        return "break"

    def redo(self, event):
        try:
            event.widget.edit_redo()
        except tk.TclError:
            pass
        return "break"

    def print_text(self, event=None):
        if event:
            widget = event.widget
        else:
            widget = self.output_text  # For the print button
        text = widget.get("1.0", tk.END)
        if not text.strip():
            return "break" if event else None
        
        escaped_text = html.escape(text)
        html_content = f"""
        <html>
        <head>
            <title>Print List</title>
            <style>
                @media print {{
                    body {{ margin: 0; padding: 0; }}
                    pre {{ margin: 0; padding: 0; width: 58mm; font-family: monospace; font-size: 10pt; white-space: pre-wrap; word-wrap: break-word; }}
                }}
                body {{ margin: 0; padding: 0; }}
                pre {{ width: 58mm; font-family: monospace; font-size: 10pt; white-space: pre-wrap; word-wrap: break-word; }}
            </style>
        </head>
        <body>
        <pre>{escaped_text}</pre>
        <script>window.print();</script>
        </body>
        </html>
        """
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.html', encoding='utf-8') as temp_file:
            temp_file.write(html_content)
            temp_path = temp_file.name
        
        url = 'file:///' + os.path.realpath(temp_path)
        success = webbrowser.open(url)
        
        if not success:
            messagebox.showerror("Print Error", "Could not open the browser for printing. Please install a web browser such as Firefox or Chromium and set it as the default for HTML files.")
        
        # Delete temp file after 1 minute to allow time for printing
        self.root.after(60000, lambda: os.remove(temp_path))
        
        return "break" if event else None

    def print_output(self):
        self.print_text()
    
    def tidy_bill_action(self):
        bill_text = self.input_text.get("1.0", tk.END).strip()
        if bill_text:
            result = tidy_bill(bill_text)
            self.output_text.delete("1.0", tk.END)
            self.output_text.insert(tk.END, result)
    
    def aggregate_action(self):
        bill_text = self.input_text.get("1.0", tk.END).strip()
        if bill_text:
            result = aggregate_for_packing(bill_text)
            self.output_text.delete("1.0", tk.END)
            self.output_text.insert(tk.END, result)
    
    def clear_all(self):
        self.input_text.delete("1.0", tk.END)
        self.output_text.delete("1.0", tk.END)

if __name__ == "__main__":
    root = tk.Tk()
    app = BillSorterApp(root)
    root.mainloop()
