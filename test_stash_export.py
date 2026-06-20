"""
Test script for the new /api/export/stash-plan endpoint
"""
import requests
import json

def test_stash_export_plan():
    """Test the stash export plan endpoint"""
    url = "http://localhost:5000/api/export/stash-plan"
    
    print("Testing /api/export/stash-plan endpoint...")
    print("-" * 60)
    
    # Test 1: Basic request
    print("\n1. Basic request (all servers):")
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ Success! Found {data['count']} servers")
        if data['data']['servers']:
            top_server = data['data']['servers'][0]
            print(f"   ✓ Top server: {top_server['server_name']} ({top_server['battleye']})")
            print(f"   ✓ Net profit (weighted): {top_server.get('net_profit_weighted', 0):,} gp")
            print(f"   ✓ Net profit (instant): {top_server.get('net_profit_instant', 0):,} gp")
            print(f"   ✓ Net profit (listing): {top_server.get('net_profit_listing', 0):,} gp")
            print(f"   ✓ Instant coverage: {top_server.get('instant_coverage_pct', 0)}%")
            print(f"   ✓ Listing coverage: {top_server.get('listing_coverage_pct', 0)}%")
            print(f"   ✓ Avg liquidity score: {top_server.get('avg_liquidity_score', 0)}")
            print(f"   ✓ Total activity: {top_server.get('total_activity', 0):,} offers")
            print(f"   ✓ Transfer cost: {data['data']['transfer_cost_gold']:,} gp")
            
            # Show top 3 items
            if data['data']['top_server_items']:
                print(f"\n   Top 3 items by weighted value:")
                for i, item in enumerate(data['data']['top_server_items'][:3], 1):
                    print(f"   {i}. {item['item_name']}: {item.get('weighted_value', 0):,.0f} gp ({item.get('recommended_strategy', 'unknown')} strategy)")
    else:
        print(f"   ✗ Error: {response.status_code}")
        print(f"   {response.text}")
    
    # Test 2: Green BattlEye only
    print("\n2. Green BattlEye only:")
    response = requests.get(url, params={'battleye_filter': 'green'})
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ Success! Found {data['count']} Green servers")
        if data['data']['servers']:
            print(f"   ✓ Top Green server: {data['data']['servers'][0]['server_name']}")
    else:
        print(f"   ✗ Error: {response.status_code}")
    
    # Test 3: Min coverage filter
    print("\n3. Min coverage 50%:")
    response = requests.get(url, params={'min_coverage': 50})
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ Success! Found {data['count']} servers with 50%+ coverage")
    else:
        print(f"   ✗ Error: {response.status_code}")
    
    print("\n" + "-" * 60)
    print("Tests completed!")

if __name__ == '__main__':
    try:
        test_stash_export_plan()
    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to API. Make sure the server is running.")
    except Exception as e:
        print(f"✗ Error: {e}")
