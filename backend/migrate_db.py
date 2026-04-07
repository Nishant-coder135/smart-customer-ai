import sqlite3
import os

def migrate():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dbs = ["urban_production.db", "rural_production.db"]
    
    for db_name in dbs:
        db_path = os.path.join(base_dir, db_name)
        if not os.path.exists(db_path):
            print(f"Skipping {db_name}: Not found.")
            continue
            
        print(f"Migrating {db_name}...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Add 'notes' to 'transactions' if missing
        try:
            cursor.execute("PRAGMA table_info(transactions)")
            columns = [col[1] for col in cursor.fetchall()]
            if 'notes' not in columns:
                print(f"  Adding 'notes' column to 'transactions' in {db_name}...")
                cursor.execute("ALTER TABLE transactions ADD COLUMN notes TEXT")
            else:
                print(f"  'notes' column already exists in 'transactions' in {db_name}.")
        except Exception as e:
            print(f"  Error checking transactions in {db_name}: {e}")
            
        # 2. Add 'is_active' to 'customers' if missing
        try:
            cursor.execute("PRAGMA table_info(customers)")
            columns = [col[1] for col in cursor.fetchall()]
            if 'is_active' not in columns:
                print(f"  Adding 'is_active' column to 'customers' in {db_name}...")
                cursor.execute("ALTER TABLE customers ADD COLUMN is_active INTEGER DEFAULT 1")
            else:
                print(f"  'is_active' column already exists in 'customers' in {db_name}.")
        except Exception as e:
            print(f"  Error checking customers in {db_name}: {e}")

        # 3. Create missing tables if they don't exist (e.g. segments, actions, etc.)
        # Base.metadata.create_all(engine) usually handles this, so we'll use SQLAlchemy for this part.
        
        conn.commit()
        conn.close()
        print(f"Finished migrating {db_name}.\n")

if __name__ == "__main__":
    migrate()
