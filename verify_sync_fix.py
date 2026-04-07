import requests

BASE_URL = "http://localhost:8000/api"

def test_customers_endpoint():
    # We need a token. Let's try to login as the 'urban' user.
    # From previous logs, we know there's likely a user '8888888888' or similar.
    # But for a quick check, let's just see if the route exists (it should return 401 if not logged in, but not 404).
    
    response = requests.get(f"{BASE_URL}/customers")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 404:
        print("FAILED: /api/customers is still 404")
    elif response.status_code == 401:
        print("SUCCESS: /api/customers exists (returned 401 Unauthorized as expected)")
    else:
        print(f"Response: {response.text}")

if __name__ == "__main__":
    test_customers_endpoint()
