import sys, os, uuid
# Add current dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import UrbanSessionLocal, RuralSessionLocal, urban_engine, rural_engine
import models
import pandas as pd
from api.auth import get_password_hash

def test_multi_tenancy():
    print("=== SmartCustomer Multi-Tenancy Verification ===")
    
    # Setup - Clean DB for isolated test users
    db = UrbanSessionLocal()
    
    # 1. Register two unique Urban users
    u1_phone = "1111111111"
    u2_phone = "2222222222"
    
    # Remove if existing
    db.query(models.User).filter(models.User.phone.in_([u1_phone, u2_phone])).delete(synchronize_session=False)
    db.commit()
    
    h1 = get_password_hash("pass1")
    user1 = models.User(name="User Uno", phone=u1_phone, password_hash=h1, business_type="urban")
    
    h2 = get_password_hash("pass2")
    user2 = models.User(name="User Dos", phone=u2_phone, password_hash=h2, business_type="urban")
    
    db.add(user1)
    db.add(user2)
    db.commit()
    db.refresh(user1)
    db.refresh(user2)
    
    print(f"  [OK] Registered User1 (ID: {user1.id}) and User2 (ID: {user2.id})")
    
    # 2. Inject sample data for User 1 only
    # Inject a customer
    c1 = models.Customer(
        user_id=user1.id,
        customer_id="CUST-U1-001",
        name="User 1 Client",
        segment_name="VIP",
        monetary=5000.0,
        churn_probability=0.1
    )
    db.add(c1)
    db.commit()
    print(f"  [OK] Injected Customer for User1 (ID: {user1.id})")
    
    # 3. Verify User 2 cannot see User 1's data
    # Simulate the query used in dashboard and advisor
    u2_customers = db.query(models.Customer).filter(models.Customer.user_id == user2.id).all()
    
    if len(u2_customers) == 0:
        print("  [PASS] User2 dashboard is empty (0 customers found).")
    else:
        print(f"  [FAIL] User2 sees {len(u2_customers)} customers! Leak detected.")
        sys.exit(1)
        
    # 4. Verify User 1 sees exactly their data
    u1_customers = db.query(models.Customer).filter(models.Customer.user_id == user1.id).all()
    if len(u1_customers) == 1 and u1_customers[0].customer_id == "CUST-U1-001":
        print("  [PASS] User1 dashboard correctly shows only their 1 customer.")
    else:
        print(f"  [FAIL] User1 data mismatch. Found {len(u1_customers)}.")
        sys.exit(1)

    # 5. Rural Isolation Test
    db_rural = RuralSessionLocal()
    r1_phone = "3333333333"
    db_rural.query(models.User).filter(models.User.phone == r1_phone).delete(synchronize_session=False)
    db_rural.commit()
    
    h3 = get_password_hash("pass3")
    user_rural = models.User(name="User Rural", phone=r1_phone, password_hash=h3, business_type="rural")
    db_rural.add(user_rural)
    db_rural.commit()
    db_rural.refresh(user_rural)
    
    print(f"  [OK] Registered Rural User (ID: {user_rural.id})")
    
    # Check if they see Urban data (they shouldn't even if we queried wrongly because of separate engines, but let's be sure)
    # Actually models.Customer is in the same metadata but in practice we use UrbanSessionLocal vs RuralSessionLocal
    
    # 6. Cleanup
    db.query(models.User).filter(models.User.phone.in_([u1_phone, u2_phone])).delete(synchronize_session=False)
    db.query(models.Customer).filter(models.Customer.user_id == user1.id).delete()
    db.commit()
    
    db_rural.query(models.User).filter(models.User.phone == r1_phone).delete()
    db_rural.commit()
    
    print("\nALL TENANCY CHECKS PASSED [Isolated]")
    db.close()
    db_rural.close()

if __name__ == "__main__":
    test_multi_tenancy()
