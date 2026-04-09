import sys, os, traceback
from fastapi.testclient import TestClient

# Mock the environment if needed
os.environ["SECRET_KEY"] = "test_secret"

try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
    os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))
    
    from app import app
    client = TestClient(app)
    
    print("--- Attempting Internal Register Call ---")
    payload = {
        "name": "FullAppTest",
        "username": "8888888888", # Added to fix 422 error
        "phone": "8888888888",
        "password": "password123",
        "business_type": "urban"
    }
    
    response = client.post("/api/auth/register", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
    
except Exception as e:
    print(f"FATAL CRASH during TestClient execution:")
    traceback.print_exc()
