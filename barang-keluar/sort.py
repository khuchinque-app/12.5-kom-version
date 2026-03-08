import os
import re

def clean_text(text):
    """
    Helper function to clean a specific line of food item.
    1. Removes Emojis (non-ASCII characters).
    2. Removes Names (e.g., 'ILHAM :', 'NC >>', 'DION -').
    """
    # 1. Remove Emojis and non-ASCII characters
    # This regex keeps only standard text, numbers, and punctuation.
    text = re.sub(r'[^\x00-\x7F]+', '', text)

    # 2. Remove Names based on separators (:, -, >>)
    # Explanation:
    # ^             -> Start of string
    # .*?           -> Match any characters (the name) non-greedily
    # \s* -> Optional space
    # (:|>>|-)      -> The separator (colon, double arrow, or dash)
    # \s+           -> Required space after separator
    # This logic prevents removing things like "1-AYAM" (quantity) 
    # but removes "DION - AYAM" (name).
    match = re.match(r'^([A-Za-z0-9\s]+?)\s*(:|>>|-)\s+(.*)', text)
    if match:
        # If pattern found, keep only the part AFTER the separator (group 3)
        text = match.group(3)
        
    return text.strip()

def process_file():
    # 1. Ask the user for the filename
    filename = input("Enter the name of file (e.g., file.txt): ").strip()

    if not os.path.exists(filename):
        print(f"Error: The file '{filename}' was not found.")
        return

    # 2. Create Dynamic Output Filename
    # If input is "data.txt", output becomes "hasil(data).txt"
    base_name = os.path.splitext(filename)[0]
    output_filename = f"hasil({base_name}).txt"
    
    current_address = ""
    processed_orders = []
    order_count = 0 # Counter for paragraphs/orders

    try:
        with open(filename, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # --- HEADER DETECTION (Address) ---
            if not line.startswith('*'):
                parts = line.split('\t')
                if len(parts) < 2:
                    parts = line.split('   ') 
                if len(parts) >= 2:
                    current_address = parts[1].strip()
                continue

            # --- ORDER LINE PROCESSING ---
            if line.startswith('*order'):
                order_count += 1 # Increment counter
                
                # A. Remove Footer (* item = ...)
                if "* item =" in line:
                    content_only = line.split("* item =")[0]
                else:
                    content_only = line

                # B. Remove Header Prefix (*order... ADDRESS: ...)
                if "ADDRESS: " in content_only:
                    parts = content_only.split("ADDRESS: ", 1)
                    
                    if len(parts) > 1:
                        text_after_address_tag = parts[1]
                        
                        # C. Remove the actual address name
                        addr_len = len(current_address)
                        if text_after_address_tag[:addr_len].lower() == current_address.lower():
                            raw_order_text = text_after_address_tag[addr_len:].strip()
                        else:
                            raw_order_text = text_after_address_tag.strip()

                        # D. Remove Emojis EARLY from the whole block
                        # This makes processing easier
                        raw_order_text = re.sub(r'[^\x00-\x7F]+', '', raw_order_text)

                        # E. Split by Price (Add Newline after K or .000)
                        formatted_text = re.sub(r'(\d+(?:\.\d+)?K|\d+\.000)', r'\1\n', raw_order_text)

                        # F. Process individual items
                        items = formatted_text.split('\n')
                        for item in items:
                            cleaned_item = clean_text(item)
                            if cleaned_item: 
                                processed_orders.append(cleaned_item)

        # 3. Sort the results A-Z
        # We use a case-insensitive sort so 'a' and 'A' are treated the same
        processed_orders.sort(key=str.lower)

        # 4. Write Results
        with open(output_filename, 'w', encoding='utf-8') as f:
            for order in processed_orders:
                f.write(order + "\n")

        print("-" * 30)
        print(f"Processing Complete!")
        print(f"Total Orders (Paragraphs) Processed: {order_count}")
        print(f"Total Food Items Extracted: {len(processed_orders)}")
        print(f"Sorted results saved to: '{output_filename}'")
        print("-" * 30)

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    process_file()
