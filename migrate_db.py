import sqlite3
import os

def migrate():
    # Detect DB paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    urban_db = os.path.join(base_dir, "backend", "urban_production.db")
    rural_db = os.path.join(base_dir, "backend", "rural_production.db")
    
    for db_path in [urban_db, rural_db]:
        if not os.path.exists(db_path):
            print(f"Skipping {db_path} (not found)")
            continue
            
        print(f"Migrating {db_path}...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # New columns to add
        new_cols = [
            ("title", "TEXT"),
            ("priority", "TEXT DEFAULT 'medium'"),
            ("status", "TEXT DEFAULT 'pending'")
        ]
        
        for col_name, col_type in new_cols:
            try:
                cursor.execute(f"ALTER TABLE actions ADD COLUMN {col_name} {col_type}")
                print(f"  Added column: {col_name}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print(f"  Column {col_name} already exists.")
                else:
                    print(f"  Error adding {col_name}: {e}")
        
        conn.commit()
        conn.close()
    
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
