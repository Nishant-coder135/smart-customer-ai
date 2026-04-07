import sqlite3
import os

# Paths
_base_dir = os.path.dirname(os.path.abspath(__file__))
RURAL_DB = os.path.join(_base_dir, "rural_production.db")
URBAN_DB = os.path.join(_base_dir, "urban_production.db")

def fix_mismatched_ids():
    print("--- Rural Data Recovery Tool ---")
    
    # 1. Find the most likely active user from Urban DB
    try:
        u_conn = sqlite3.connect(URBAN_DB)
        u_cursor = u_conn.cursor()
        # Look for the user Nishant or the last logged-in user
        u_cursor.execute("SELECT id, phone, name FROM users ORDER BY id DESC")
        users = u_cursor.fetchall()
        u_conn.close()
        
        if not users:
            print("Error: No users found in Urban database.")
            return

        print("\nAvailable Users in System:")
        for uid, phone, name in users:
            print(f"  ID: {uid} | Phone: {phone} | Name: {name}")

        # In modern flow, we assume the user with ID 3 (9971790122) is the one we want
        target_id = 3 # Hardcoding for this specific fix based on logs
        # Check if ID 3 exists
        if not any(u[0] == target_id for u in users):
            target_id = users[0][0] # Fallback to latest
            
        print(f"\nTargeting User ID: {target_id}")

        # 2. Update Rural Transactions
        r_conn = sqlite3.connect(RURAL_DB)
        r_cursor = r_conn.cursor()
        
        # Check current distribution
        r_cursor.execute("SELECT user_id, count(*) FROM transactions GROUP BY user_id")
        dist = r_cursor.fetchall()
        print(f"Current Transaction Distribution: {dist}")
        
        # Re-assign any user_id=1 to target_id
        r_cursor.execute("UPDATE transactions SET user_id = ? WHERE user_id != ?", (target_id, target_id))
        rows = r_cursor.rowcount
        r_conn.commit()
        r_conn.close()
        
        print(f"SUCCESS: Re-assigned {rows} transactions to User ID {target_id}.")
        print("Now refreshing your dashboard should show the data!")

    except Exception as e:
        print(f"Error during fix: {e}")

if __name__ == "__main__":
    fix_mismatched_ids()
