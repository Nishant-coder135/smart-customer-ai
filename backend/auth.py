import json
import os
import hashlib

USERS_FILE = os.path.join(os.path.dirname(__file__), "users.json")

def load_users():
    if not os.path.exists(USERS_FILE):
        return {}
    try:
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=4)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def create_user(username, email, password):
    users = load_users()
    if username in users:
        return False, "Username already exists"
    
    users[username] = {
        "email": email,
        "password": hash_password(password),
        "created_at": str(pd.Timestamp.now()) if 'pd' in globals() else str(hashlib.sha256().hexdigest()[:10]) # Fallback
    }
    save_users(users)
    return True, "User created successfully"

def authenticate_user(username, password):
    users = load_users()
    if username not in users:
        return False
    return users[username]["password"] == hash_password(password)

def get_user_count():
    return len(load_users())
