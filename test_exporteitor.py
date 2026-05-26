"""
Quick test for the Exporteitor endpoint
"""
import requests

source_server_id = 7

print(f"Testing Exporteitor endpoint with source server ID: {source_server_id}")
print("=" * 60)

# Test without item filter
response = requests.get(
    f"http://localhost:5000/api/export/opportunities?source_server_id={source_server_id}"
)

if response.status_code == 200:
    data = response.json()
    print(f"\n✓ Success! Found {data['count']} opportunities")
    print(f"Source server: {data['data']['source_server_name']}")
    
    if data['data']['opportunities']:
        print("\nTop 5 opportunities (by activity):")
        for i, opp in enumerate(data['data']['opportunities'][:5], 1):
            print(f"\n{i}. {opp['item_name']}")
            print(f"   Source price (buy from sellers): {opp['source_price']:,} gp")
            print(f"   Avg Sell (list on market): {opp['avg_sell_price']:,.2f} gp (+{opp['profit_sell_pct']:.2f}%)")
            print(f"   Avg Buy (instant sell): {opp['avg_buy_price']:,.2f} gp (+{opp['profit_buy_pct']:.2f}%)")
            print(f"   Total activity: {opp['total_activity']} offers")
            print(f"   Available on {opp['target_server_count']} servers")
else:
    print(f"✗ Error: {response.status_code}")
    print(response.text)

# Test with item name filter
print("\n" + "=" * 60)
print("\nTesting with item filter: 'coin'")
response = requests.get(
    f"http://localhost:5000/api/export/opportunities?source_server_id={source_server_id}&item_name=coin"
)

if response.status_code == 200:
    data = response.json()
    print(f"✓ Found {data['count']} items matching 'coin'")
    for opp in data['data']['opportunities']:
        print(f"  - {opp['item_name']}")
else:
    print(f"✗ Error: {response.status_code}")
