"""
Run this standalone: python diagnose.py
Directly calls the register function with a real DB session to get the full traceback.
"""
import sys, os, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=== SmartCustomer AI Diagnostics ===\n")
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
    print(f"--- .env loaded into environment ---")
except ImportError:
    print("--- python-dotenv not installed, assuming env is preset ---")

errors = []

# 1. Test all imports
print("[1] Testing imports...")
try:
    import fastapi; print("  [OK] fastapi")
except Exception as e: errors.append(f"fastapi: {e}")

try:
    import bcrypt; print("  [OK] bcrypt")
except Exception as e: errors.append(f"bcrypt: {e}")

try:
    from jose import jwt; print("  [OK] python-jose")
except Exception as e: errors.append(f"jose: {e}")

try:
    import sqlalchemy; print("  [OK] sqlalchemy")
except Exception as e: errors.append(f"sqlalchemy: {e}")

try:
    import pandas; print("  [OK] pandas")
except Exception as e: errors.append(f"pandas: {e}")

try:
    import sklearn; print("  [OK] scikit-learn")
except Exception as e: errors.append(f"sklearn: {e}")

# 2. Test local imports
print("\n[2] Testing local imports...")
try:
    from database import urban_engine, rural_engine, UrbanSessionLocal, RuralSessionLocal
    print("  [OK] database.py")
except Exception as e:
    errors.append(f"database: {e}")
    traceback.print_exc()

try:
    import models
    print("  [OK] models.py")
except Exception as e:
    errors.append(f"models: {e}")
    traceback.print_exc()

try:
    from api.auth import get_password_hash, verify_password, create_access_token, get_current_user, router as auth_router
    print("  [OK] api.auth")
except Exception as e:
    errors.append(f"api.auth: {e}")
    traceback.print_exc()

try:
    from api.actions import router as actions_router
    print("  [OK] api.actions")
except Exception as e:
    errors.append(f"api.actions: {e}")
    traceback.print_exc()

try:
    from api.advisor import router as advisor_router
    print("  [OK] api.advisor")
except Exception as e:
    errors.append(f"api.advisor: {e}")
    traceback.print_exc()

try:
    from api.router import router as main_router
    print("  [OK] api.router")
except Exception as e:
    errors.append(f"api.router: {e}")
    traceback.print_exc()

# 3. Test DB operations
print("\n[3] Testing DB operations...")
try:
    from database import UrbanSessionLocal, RuralSessionLocal
    import models
    
    models.Base.metadata.create_all(bind=urban_engine)
    models.Base.metadata.create_all(bind=rural_engine)
    print("  [OK] Tables created/verified")
    
    db = UrbanSessionLocal()
    count = db.query(models.User).count()
    print(f"  [OK] Urban DB has {count} users")
    db.close()
    
    db2 = RuralSessionLocal()
    count2 = db2.query(models.User).count()
    print(f"  [OK] Rural DB has {count2} users")
    db2.close()
except Exception as e:
    errors.append(f"DB ops: {e}")
    traceback.print_exc()

# 4. Full register simulation
print("\n[4] Testing registration flow...")
try:
    from api.auth import get_password_hash
    db = UrbanSessionLocal()
    
    # Check if test user exists
    existing = db.query(models.User).filter(models.User.phone == "0000000001").first()
    if existing:
        db.delete(existing)
        db.commit()
    
    hashed = get_password_hash("test123")
    user = models.User(name="DiagTest", phone="0000000001", password_hash=hashed, business_type="urban")
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"  [OK] User registered with id={user.id}")
    db.delete(user)
    db.commit()
    print("  [OK] User cleaned up")
    db.close()
except Exception as e:
    errors.append(f"register flow: {e}")
    traceback.print_exc()

# 5. ML imports
print("\n[5] Testing ML engine...")
try:
    from ml_engine.segmentation import process_rfm_segments, process_raw_transactions, segment_customers
    print("  [OK] ml_engine.segmentation")
except Exception as e:
    errors.append(f"segmentation: {e}")
    traceback.print_exc()

try:
    from ml_engine.prediction import predict_behavior
    print("  [OK] ml_engine.prediction")
except Exception as e:
    errors.append(f"prediction: {e}")
    traceback.print_exc()

try:
    from ml_engine.decision_engine import generate_daily_actions, generate_personalized_recommendation
    print("  [OK] ml_engine.decision_engine")
except Exception as e:
    errors.append(f"decision_engine: {e}")
    traceback.print_exc()

try:
    from ml_engine.seasonal_advisor import SeasonalAdvisor
    print("  [OK] ml_engine.seasonal_advisor")
except Exception as e:
    errors.append(f"seasonal_advisor: {e}")
    traceback.print_exc()

# Summary
print("\n" + "="*40)
if errors:
    print(f"FAILED -- {len(errors)} error(s) found:")
    for err in errors:
        print(f"  [ERROR] {err}")
else:
    print("ALL CHECKS PASSED [DONE]")
print("="*40)
