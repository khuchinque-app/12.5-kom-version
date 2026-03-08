import tkinter as tk
from tkinter import filedialog, messagebox
import re
from decimal import Decimal, ROUND_HALF_UP
import os
import platform
import sys

def get_initial_dir():
    system = platform.system()
    release = platform.uname().release.lower()
    if system == 'Windows':
        return os.path.join(os.environ.get('USERPROFILE', os.path.expanduser('~')), 'Downloads')
    elif system == 'Linux' and 'microsoft' in release:  # WSL
        username = os.environ.get('USERNAME', os.environ.get('USER'))
        return f"/mnt/c/Users/{username}/Downloads"
    else:
        return os.path.expanduser('~/Downloads')

def process_file(filepath):
    if not filepath:
        return
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        lines = content.splitlines()
        output = []
        grand_cash = None
        grand_aba = None
        grand_total = None
        i = 1  # skip header
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue
            if line.startswith('Grand Total'):
                parts = line.split(':', 1)
                key = parts[0].strip()
                if len(parts) > 1:
                    value = parts[1].strip()
                else:
                    value = ''
                if 'Cash' in key:
                    grand_cash = value
                elif 'ABA' in key:
                    grand_aba = value
                else:
                    grand_total = value
                i += 1
                continue
            # summary
            sum_parts = [part.strip() for part in line.split('\t') if part.strip()]
            if len(sum_parts) < 3:
                i += 1
                continue
            cust_name = sum_parts[0]
            addr = sum_parts[1]
            total = sum_parts[2]
            aba = sum_parts[3] if len(sum_parts) > 3 else ''
            i += 1
            if i >= len(lines):
                break
            det_line = lines[i].strip()
            i += 1
            # parse det_line
            match = re.search(r'\*order (\d{3})\*(\d{2}/\d{2}/\d{4}), (\d{2}:\d{2}:\d{2})', det_line)
            if match:
                order_id = match.group(1)
                date = match.group(2)
                time = match.group(3)
                rest = det_line[match.end():]
            else:
                continue
            cust_start = rest.find('CUSTOMER: ')
            if cust_start != -1:
                rest = rest[cust_start + len('CUSTOMER: '):]
                addr_start = rest.find('ADDRESS: ')
                customer = rest[:addr_start].strip()
                rest = rest[addr_start + len('ADDRESS: '):]
            notes_start = rest.find('NOTES: ')
            if notes_start != -1:
                address = rest[:notes_start].strip()
                rest = rest[notes_start + len('NOTES: '):]
                dash_start = rest.find('------------------------------------')
                notes = rest[:dash_start].strip()
                rest = rest[dash_start:]
            else:
                dash_start = rest.find('------------------------------------')
                address = rest[:dash_start].strip()
                notes = ''
                rest = rest[dash_start:]
            rest = rest[len('------------------------------------'):].lstrip()
            next_dash = rest.find('-----------------------------------')
            items_str = rest[:next_dash].strip()
            rest = rest[next_dash + len('-----------------------------------'):]
            item_start = rest.find('* ITEM = ')
            total_start = rest.find('* TOTAL : ')
            item_count = rest[item_start:total_start].strip()
            total_str = rest[total_start:].strip()
            items_list = re.split(r'-\s*', items_str)
            items_list = [item.strip() for item in items_list if item.strip()]
            output.append("==================================\n")
            output.append(f"{cust_name}\t{addr}\t{total}\t{aba}\n")
            output.append("\n")
            output.append(f"*order {order_id}*\n")
            output.append(f"{date}, {time}\n")
            output.append("\n")
            output.append(f"CUSTOMER: {customer}\n")
            output.append(f"ADDRESS: {address}\n")
            if notes:
                output.append(f"NOTES: {notes}\n")
            output.append("\n")
            output.append("------------------------------------ \n")
            for idx, item in enumerate(items_list):
                prefix = "" if idx == 0 else "- "
                output.append(f"{prefix}{item}\n")
            output.append("-----------------------------------\n")
            output.append("\n")
            output.append(f"{item_count}\n")
            output.append(f"{total_str}\n")
            output.append("==================================\n")
            output.append("\n")
        def calc_usd(val):
            if not val:
                return ''
            num = Decimal(val.replace('.', ''))
            usd = (num / Decimal('4000')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            return f"{val}/{usd}$"
        if grand_cash is not None:
            output.append("Grand Total Cash: \n")
            output.append(calc_usd(grand_cash) + "\n")
            output.append("\n")
        if grand_aba is not None:
            output.append("Grand Total ABA: \n")
            output.append(calc_usd(grand_aba) + "\n")
            output.append("\n")
        if grand_total is not None:
            output.append("Grand Total: \n")
            output.append(calc_usd(grand_total) + "\n")
        output_path = filepath.replace('.txt', '_tidy.txt')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(''.join(output))
        messagebox.showinfo("Success", f"Processed file saved to {output_path}")
    except Exception as e:
        messagebox.showerror("Error", str(e))

root = tk.Tk()
root.title("Data Tidy Tool")
root.geometry("300x100")
initialdir = get_initial_dir()
btn = tk.Button(root, text="Upload file.txt", command=lambda: process_file(filedialog.askopenfilename(initialdir=initialdir, filetypes=[("Text files", "*.txt")])))
btn.pack(pady=20)
root.mainloop()
