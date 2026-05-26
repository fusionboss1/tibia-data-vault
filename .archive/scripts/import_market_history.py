import json
import sqlite3
import requests
from datetime import datetime

def get_server_id(server_name):
    """Get server ID from server name"""
    conn = sqlite3.connect('tibia_data.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM servers WHERE name = ?', (server_name,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return result[0]
    else:
        print(f'Error: Server {server_name} not found in database')
        return None

def import_market_history(server, item_id, start_days_ago=30, end_days_ago=-1):
    # Get server ID
    server_id = get_server_id(server)
    if server_id is None:
        return 0
    
    # Fetch data from API
    url = f"https://api.tibiamarket.top/item_history?server={server}&item_id={item_id}&start_days_ago={start_days_ago}&end_days_ago={end_days_ago}"
    response = requests.get(url)
    data = response.json()
    
    # Process data - extract only real fields
    processed_data = []
    for item in data:
        processed_data.append((
            item['id'],
            server_id,
            item['time'],
            item['buy_offer'],
            item['sell_offer'],
            item['buy_offers'],
            item['sell_offers']
        ))
    
    # Insert into database
    conn = sqlite3.connect('tibia_data.db')
    cursor = conn.cursor()
    
    cursor.executemany('''
        INSERT INTO market_history 
        (item_id, server_id, time, buy_offer, sell_offer, buy_offers, sell_offers)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', processed_data)
    
    conn.commit()
    conn.close()
    
    print(f'Imported {len(processed_data)} history records for item {item_id} on server {server}')

def import_all_history(server, item_ids, start_days_ago=30, end_days_ago=-1):
    """Import history for multiple items"""
    for item_id in item_ids:
        try:
            import_market_history(server, item_id, start_days_ago, end_days_ago)
        except Exception as e:
            print(f'Error importing item {item_id}: {e}')

if __name__ == '__main__':
    # Example: import history for a single item
    import_market_history('Antica', 813)
    
    # Or import for multiple items (uncomment and provide list)
    # item_ids = [813, 9635, 21200]  # Add your item IDs
    # import_all_history('Antica', item_ids)
