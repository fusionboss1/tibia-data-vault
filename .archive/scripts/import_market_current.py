import json
import sqlite3
import requests
import time
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

def get_last_fetch_time(server_id):
    """Get the last fetch time for a server"""
    conn = sqlite3.connect('tibia_data.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT market_last_fetch FROM servers WHERE id = ?', (server_id,))
    result = cursor.fetchone()
    conn.close()
    
    if result and result[0]:
        return result[0]
    return None

def update_last_fetch_time(server_id):
    """Update the last fetch time for a server"""
    conn = sqlite3.connect('tibia_data.db')
    cursor = conn.cursor()
    
    cursor.execute('UPDATE servers SET market_last_fetch = ? WHERE id = ?', (time.time(), server_id))
    conn.commit()
    conn.close()

def import_market_current(server, limit=5000):
    # Get server ID
    server_id = get_server_id(server)
    if server_id is None:
        return 0, False
    
    # Check if we fetched recently
    last_fetch = get_last_fetch_time(server_id)
    current_time = time.time()
    
    if last_fetch and (current_time - last_fetch) < 86400:
        hours_ago = int((current_time - last_fetch) / 3600)
        print(f'[SKIP] {server}: Fetched recently ({hours_ago} hours ago)')
        return 0, False
    
    # Fetch data from API
    print(f'[API CALL] Fetching data for {server}...')
    url = f"https://api.tibiamarket.top/market_values?server={server}&limit={limit}"
    response = requests.get(url)
    
    # Check if response is valid JSON
    try:
        data = response.json()
    except:
        print(f'[ERROR] {server}: Invalid JSON response - {response.text[:100]}')
        return 0, True
    
    # Check if data is a list (expected format)
    if not isinstance(data, list):
        print(f'[ERROR] {server}: API returned non-list response - {str(data)[:100]}')
        return 0, True
    
    # Process data - extract all fields
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
        INSERT OR REPLACE INTO market_current 
        (item_id, server_id, time, buy_offer, sell_offer, buy_offers, sell_offers)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', processed_data)
    
    conn.commit()
    conn.close()
    
    # Update last fetch time
    update_last_fetch_time(server_id)
    
    print(f'[SUCCESS] {server}: Imported {len(processed_data)} items')
    return len(processed_data), True

def get_green_battleye_servers():
    """Get all Green BattlEye servers"""
    conn = sqlite3.connect('tibia_data.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT name FROM servers 
        WHERE battleye = 'Green' 
    ''')
    
    servers = [row[0] for row in cursor.fetchall()]
    conn.close()
    return servers

if __name__ == '__main__':
    servers = get_green_battleye_servers()
    print(f'Found {len(servers)} Green BattlEye servers')
    
    total_imported = 0
    api_calls_made = 0
    for i, server in enumerate(servers):
        try:
            count, made_api_call = import_market_current(server)
            total_imported += count
            if made_api_call:
                api_calls_made += 1
        except Exception as e:
            print(f'[ERROR] Exception importing {server}: {e}')
        
        # Wait 30 seconds between API calls (except after last one)
        # Only wait if we actually made an API call
        if made_api_call and i < len(servers) - 1:
            print(f'Waiting 30 seconds before next server...')
            time.sleep(30)
    
    print(f'\n=== Summary ===')
    print(f'Total API calls made: {api_calls_made}/{len(servers)}')
    print(f'Total items imported: {total_imported}')
