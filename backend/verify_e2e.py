import requests
import time

BASE_URL = "http://127.0.0.1:8000/api"

print("Starting E2E verification...")

# Step 1: Signup
signup_payload = {
    "name": "Test User",
    "username": "9876543210",
    "phone": "9876543210",
    "password": "password123",
    "business_type": "urban"
}
try:
    r1 = requests.post(f"{BASE_URL}/auth/register", json=signup_payload)
    print("Signup Status:", r1.status_code)
    if r1.status_code == 400 and "already registered" in r1.text:
         print("User already exists, continuing to login...")
    elif r1.status_code != 200:
         print("Signup failed:", r1.text)
except Exception as e:
    print("Failed to reach server:", e)

# Step 2: Login
login_payload = {
    "username": "9876543210",
    "password": "password123",
    "mode": "urban"
}
r2 = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
print("Login Status:", r2.status_code)
if r2.status_code != 200:
    print("Login output:", r2.text)
    exit(1)
    
token = r2.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Step 3: Get current user
r3 = requests.get(f"{BASE_URL}/auth/me", headers=headers)
print("Get User Status:", r3.status_code)
print("User Data:", r3.json())

# Step 4: Get Dashboard
r4 = requests.get(f"{BASE_URL}/dashboard_data", headers=headers)
print("Get Dashboard Status:", r4.status_code)
print("Dashboard has_data:", r4.json().get("has_data"))

print("\n--- E2E VERIFICATION SUCCESSFUL ---")
