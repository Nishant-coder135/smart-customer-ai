import requests
import json
import os

BASE_URL = "http://localhost:8107/api"

def run_strict_isolation_test():
    print("--- Starting STRICT MODE ISOLATION Verification ---")
    
    # 1. Clear All
    try:
        requests.post(f"{BASE_URL}/reset")
    except Exception as e:
        print(f"Error resetting database: {e}")
        return

    # 2. Add Rural Credit (₹10,000)
    rural_payload = {
        "records": [
            {"customer": "Rural_Agent_007", "amount": 10000, "isCredit": True, "date": "2026-03-25T10:00:00Z"}
        ]
    }
    r = requests.post(f"{BASE_URL}/manual_entry", json=rural_payload)
    print(f"Rural Entry Sync: {r.status_code}")
    
    # Check Rural Dashboard - Expect ₹10,000 credit
    res = requests.get(f"{BASE_URL}/dashboard_data?mode=rural")
    rural_data = res.json()
    rural_credit = rural_data['credit_stats']['total_pending']
    print(f"Rural Dashboard Credit: INR {rural_credit}")
    
    # 3. Upload Urban CSV (With NO credit)
    # Create temp CSV for test
    csv_content = "CustomerID,InvoiceDate,Quantity,UnitPrice,IsCredit\nU_1,2026-03-25,1,500.0,False\n"
    with open("temp_urban.csv", "w") as f:
        f.write(csv_content)
        
    with open("temp_urban.csv", "rb") as f:
        files = {"file": f}
        requests.post(f"{BASE_URL}/upload", files=files)
    
    # Check Urban Dashboard - Expect ₹0 credit (Isolation Proof)
    res = requests.get(f"{BASE_URL}/dashboard_data?mode=urban")
    urban_data = res.json()
    urban_credit = urban_data['credit_stats']['total_pending']
    print(f"Urban Dashboard Credit: INR {urban_credit}")
    
    # 4. Check Rural Dashboard again - Expect still ₹10,000 (Isolation Proof)
    res = requests.get(f"{BASE_URL}/dashboard_data?mode=rural")
    rural_data_after = res.json()
    rural_credit_after = rural_data_after['credit_stats']['total_pending']
    print(f"Rural Dashboard Credit (After Urban Update): INR {rural_credit_after}")
    
    print("\n--- FINAL VERDICT ---")
    if urban_credit == 0 and rural_credit_after == 10000:
        print("RESULT: 100% MODE ISOLATION VERIFIED (Credit is separate).")
    else:
        print(f"RESULT: ISOLATION FAILED. Urban saw Rural data or vice versa.")
        print(f"Urban Credit: {urban_credit}, Rural Credit After: {rural_credit_after}")

    # cleanup
    if os.path.exists("temp_urban.csv"):
        os.remove("temp_urban.csv")

if __name__ == "__main__":
    run_strict_isolation_test()
