import json
import sqlite3
from datetime import datetime

# Load data
with open('item_metadata.json', 'r') as f:
    items = json.load(f)

# Process each item
processed_items = []
for item in items:
    # Find best NPC sell price (lowest price)
    npc_sell = item.get('npc_sell', [])
    if npc_sell:
        min_price = min(n['price'] for n in npc_sell)
        best_npcs = list(set(n['name'] for n in npc_sell if n['price'] == min_price))  # Deduplicate
    else:
        min_price = None
        best_npcs = []
    
    # Find best NPC buy price (highest price)
    npc_buy = item.get('npc_buy', [])
    if npc_buy:
        max_price = max(n['price'] for n in npc_buy)
        best_npcs_buy = list(set(n['name'] for n in npc_buy if n['price'] == max_price))  # Deduplicate
    else:
        max_price = None
        best_npcs_buy = []
    
    processed_items.append((
        item['id'],
        item['name'],
        item['category'],
        item['tier'],
        item['wiki_name'],
        min_price,
        json.dumps(best_npcs),
        max_price,
        json.dumps(best_npcs_buy)
    ))

# Insert into database
conn = sqlite3.connect('tibia_data.db')
cursor = conn.cursor()
cursor.executemany('''
    INSERT OR REPLACE INTO items 
    (id, name, category, tier, wiki_name, best_npc_sell_price, best_npc_sell_npcs, 
     best_npc_buy_price, best_npc_buy_npcs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
''', processed_items)
conn.commit()
conn.close()

print(f'Inserted {len(processed_items)} items')