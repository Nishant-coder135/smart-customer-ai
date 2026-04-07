import sqlite3
import os

def migrate_db(db_path):
    if not os.path.exists(db_path):
        print(f"Skipping {db_path} - not found.")
        return
        
    print(f"Migrating {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(actions)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'pitch' not in columns:
            print("Adding 'pitch' column...")
            cursor.execute("ALTER TABLE actions ADD COLUMN pitch TEXT")
            
        if 'template' not in columns:
            print("Adding 'template' column...")
            cursor.execute("ALTER TABLE actions ADD COLUMN template TEXT")
            
        conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Error migrating {db_path}: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    migrate_db(os.path.join(base_dir, "urban_production.db"))
    migrate_db(os.path.join(base_dir, "rural_production.db"))
