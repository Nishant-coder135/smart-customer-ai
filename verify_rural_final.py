import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def verify_rural_endpoints():
    print("--- Verifying Rural Endpoints ---")
    
    # 1. Login to get token (using the credentials from the logs: 9999999999 / rural)
    print("Logging in...")
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "9999999999",
        "password": "abc", # From logs: SUCCESS: Logged in abc
        "mode": "rural"
    })
    if login_res.status_code != 200:
        print(f"FAILED Login: {login_res.status_code} {login_res.text}")
        return
    
    token = login_res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    # 2. Test Manual Entry (Sync)
    print("Testing manual entry sync...")
    sync_data = {
        "records": [
            {
                "customer": "Ramesh Verification",
                "amount": 1500.0,
                "notes": "Verify Test",
                "isCredit": True,
                "date": "2026-04-03T10:00:00Z",
                "global_key": "9876543210"
            }
        ]
    }
    sync_res = requests.post(f"{BASE_URL}/manual_entry", json=sync_data, headers=headers)
    print(f"Sync Results: {sync_res.status_code} {sync_res.json()}")

    # 3. Test Retrieval
    print("Testing transaction retrieval...")
    get_res = requests.get(f"{BASE_URL}/rural/transactions?search=Ramesh", headers=headers)
    if get_res.status_code == 200:
        txs = get_res.json().get("transactions", [])
        print(f"Retrieved {len(txs)} transactions.")
        for t in txs:
            print(f" - {t['customer']}: ₹{t['amount']} (Key: {t['customer']})")
    else:
        print(f"FAILED Retrieval: {get_res.status_code} {get_res.text}")

if __name__ == "__main__":
    verify_rural_endpoints()
