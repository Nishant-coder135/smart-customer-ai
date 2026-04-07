import sys, os, traceback
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from database import UrbanSessionLocal, RuralSessionLocal
    import models
    print("[OK] DB imports OK")

    db = UrbanSessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.phone == '9999999999').first()
        print(f"[OK] DB query OK. Existing user: {existing}")
    except Exception as e:
        print(f"[ERR] DB query failed: {e}")
        traceback.print_exc()
    finally:
        db.close()

    # Now test hashing
    import bcrypt
    pw = "test123".encode()
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pw, salt)
    print(f"[OK] bcrypt hash: {hashed}")

    # Now simulate register
    from api.auth import get_password_hash, verify_password
    h = get_password_hash("test123")
    print(f"[OK] get_password_hash: {h}")
    ok = verify_password("test123", h)
    print(f"[OK] verify_password: {ok}")

    # Now actually try adding to DB
    db2 = UrbanSessionLocal()
    try:
        test_user = models.User(name="TestUser", phone="9999999998", password_hash=h, business_type="urban")
        db2.add(test_user)
        db2.commit()
        db2.refresh(test_user)
        print(f"[OK] User created with id: {test_user.id}")
        db2.delete(test_user)
        db2.commit()
        print("[OK] User cleaned up")
    except Exception as e:
        print(f"[ERR] User create failed: {e}")
        traceback.print_exc()
        db2.rollback()
    finally:
        db2.close()

except Exception as e:
    print(f"[FATAL] Import or init failure: {e}")
    traceback.print_exc()
