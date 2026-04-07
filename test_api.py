import requests
import json
import random

def test_register():
    url = "http://localhost:8000/api/auth/register"
    phone = f"999{random.randint(1000000, 9999999)}"
    data = {
        "name": "Test User",
        "username": phone,
        "phone": phone,
        "password": "testpassword",
        "business_type": "urban"
    }
    
    print(f"Testing registration on {url}...")
    try:
        response = requests.post(url, json=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    test_register()
