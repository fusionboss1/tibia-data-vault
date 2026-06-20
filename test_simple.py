import requests
import json

response = requests.get("http://localhost:5000/api/export/stash-plan")
data = response.json()

if data['data']['servers']:
    server = data['data']['servers'][0]
    print("Server fields:")
    for key in sorted(server.keys()):
        print(f"  {key}: {server[key]}")
    
    print("\n\nFirst item fields:")
    if data['data']['top_server_items']:
        item = data['data']['top_server_items'][0]
        for key in sorted(item.keys()):
            print(f"  {key}: {item[key]}")
