import sqlite3
import os

def wipe_db(db_path):
    if not os.path.exists(db_path):
        print(f"DB not found: {db_path}")
        return
        
    print(f"--- Wiping {db_path} ---")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    tables = ["customers", "transactions", "segments"]
    for table in tables:
        try:
            cur.execute(f"DELETE FROM {table}")
            print(f"  Cleaned {table}")
        except Exception as e:
            print(f"  Error cleaning {table}: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    base = "backend"
    wipe_db(os.path.join(base, "urban_production.db"))
    wipe_db(os.path.join(base, "rural_production.db"))
    print("--- Databases Purged. Multi-tenancy Isolation Ready. ---")
