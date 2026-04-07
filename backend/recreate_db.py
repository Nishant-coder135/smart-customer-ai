import os
from sqlalchemy import create_engine
from models import Base
from database import URBAN_DATABASE_URL, RURAL_DATABASE_URL

def recreate():
    print("--- [SmartCustomer AI: Database Reconstructor] ---")
    
    engines = [
        ("URBAN", create_engine(URBAN_DATABASE_URL)),
        ("RURAL", create_engine(RURAL_DATABASE_URL))
    ]
    
    for name, engine in engines:
        print(f"\n[Processing {name}]...")
        try:
            # Drop All to ensure a clean slate
            Base.metadata.drop_all(engine)
            print(f"[OK] Dropped all old tables in {name}")
            
            # Create All with the latest models (includes user_id columns)
            Base.metadata.create_all(engine)
            print(f"[OK] Recreated all tables in {name} with modern schema")
        except Exception as e:
            print(f"[ERR] Error in {name}: {str(e)}")

    print("\n--- [Database Reconstruction Complete] ---")

if __name__ == "__main__":
    recreate()
