import os, sys
# Ensure we can import from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import models
    from database import urban_engine, rural_engine
    
    print("--- SmartCustomer AI: Multi-Tenant Schema Rebuilder ---")
    
    print("\n[1/2] Initializing URBAN Production Database...")
    try:
        models.Base.metadata.drop_all(bind=urban_engine) # Wipe any remnants
        models.Base.metadata.create_all(bind=urban_engine)
        print("Urban Database initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Urban: {e}")

    print("\n[2/2] Initializing RURAL Production Database...")
    try:
        models.Base.metadata.drop_all(bind=rural_engine) # Wipe any remnants
        models.Base.metadata.create_all(bind=rural_engine)
        print("Rural Database initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Rural: {e}")

    print("\nClean start complete. Ready for new registrations.")

except Exception as e:
    print(f"Unexpected Error during schema reset: {e}")
    sys.exit(1)
