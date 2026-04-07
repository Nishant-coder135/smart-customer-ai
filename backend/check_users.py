import models
from database import UrbanSessionLocal, RuralSessionLocal

db = UrbanSessionLocal()
u = db.query(models.User).all()
print(f"URBAN USERS: {len(u)}")
for user in u:
    print(f"- {user.phone} ({user.name}) [{user.business_type}] HashLen: {len(user.password_hash)}")
db.close()

db2 = RuralSessionLocal()
u2 = db2.query(models.User).all()
print(f"\nRURAL USERS: {len(u2)}")
for user in u2:
    print(f"- {user.phone} ({user.name}) [{user.business_type}] HashLen: {len(user.password_hash)}")
db2.close()
