import requests
import json
import traceback

BASE_URL = "http://127.0.0.1:8006/api"

def test_registration():
    print(f"--- Testing Registration on {BASE_URL} ---")
    payload = {
        "name": "Diagnostic User",
        "phone": "9971790123",
        "password": "password123",
        "business_type": "urban"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload)
        print(f"Status Code: {response.status_code}")
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Response Text: {response.text}")
            
    except Exception as e:
        print(f"Connection Error: {str(e)}")

if __name__ == "__main__":
    test_registration()
