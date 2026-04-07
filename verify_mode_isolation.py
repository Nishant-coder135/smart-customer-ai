# pyre-ignore[21]
import requests
import json
import time

BASE_URL = "http://localhost:8888/api"

def test_rural_mode():
    print("--- Testing Rural Mode ---")
    # 1. Clear/Reset (Urban)
    requests.post(f"{BASE_URL}/reset")
    
    # 2. Add Rural Manual Entry
    payload = {
        "records": [
            {"customer": "Rural_User_1", "amount": 5000, "isCredit": True, "date": "2026-03-25T10:00:00Z"},
            {"customer": "Rural_User_2", "amount": 2000, "isCredit": False, "date": "2026-03-25T11:00:00Z"}
        ]
    }
    res = requests.post(f"{BASE_URL}/manual_entry", json=payload)
    print(f"Manual Entry Sync: {res.status_code} - {res.json()}")

    # 3. Get Rural Dashboard
    res = requests.get(f"{BASE_URL}/dashboard_data?mode=rural")
    data = res.json()
    print(f"Rural Dashboard BHS: {data['kpis']['health_score']}")
    print(f"Rural Dashboard Revenue: {data['kpis']['total_revenue']}")
    print(f"Rural Dashboard Credit: {data['credit_stats']['total_pending']}")
    
    assert data['kpis']['health_score'] > 0
    assert data['kpis']['total_revenue'] == 7000
    assert data['credit_stats']['total_pending'] == 5000
    print("Rural Mode Verification: PASSED")
    return data

def test_urban_mode():
    print("\n--- Testing Urban Mode ---")
    # 1. Upload CSV
    files = {'file': open('sample_retail_data.csv', 'rb')}
    res = requests.post(f"{BASE_URL}/upload", files=files)
    print(f"Urban CSV Upload: {res.status_code} - {res.json()}")
    
    # 2. Get Urban Dashboard
    res = requests.get(f"{BASE_URL}/dashboard_data?mode=urban")
    data = res.json()
    print(f"Urban Dashboard BHS: {data['kpis']['health_score']}")
    print(f"Urban Dashboard Total Customers: {data['kpis']['total_customers']}")
    
    assert data['kpis']['total_customers'] > 0
    assert data['kpis']['health_score'] > 0
    print("Urban Mode Verification: PASSED")
    return data

def test_isolation():
    print("\n--- Testing Data Isolation ---")
    # Get Rural again
    res = requests.get(f"{BASE_URL}/dashboard_data?mode=rural")
    rural_data = res.json()
    
    # Get Urban again
    res = requests.get(f"{BASE_URL}/dashboard_data?mode=urban")
    urban_data = res.json()
    
    print(f"Rural Revenue: {rural_data['kpis']['total_revenue']} (Expected 7000)")
    print(f"Urban Revenue: {urban_data['kpis']['total_revenue']} (Expected Sum of CSV)")
    
    # Verification of isolation:
    # Rural Revenue should still be exactly 7000 from the manual entries.
    # Urban Revenue should be based on the CSV (likely much higher or different).
    assert rural_data['kpis']['total_revenue'] == 7000
    print("Data Isolation Verification: PASSED")

if __name__ == "__main__":
    try:
        test_rural_mode()
        test_urban_mode()
        test_isolation()
        print("\nALL DUAL-MODE TESTS PASSED SUCCESSFULLY.")
    except Exception as e:
        print(f"\nTEST FAILED: {str(e)}")
        # Try to get the last successful response from the server for debugging
        try:
            res = requests.get(f"{BASE_URL}/dashboard_data?mode=rural")
            print(f"DEBUG - Full Rural Response: {json.dumps(res.json(), indent=2)}")
        except:
            pass
