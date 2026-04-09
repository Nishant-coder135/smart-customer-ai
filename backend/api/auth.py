from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
import os, traceback

from backend.database import get_db, UrbanSessionLocal, RuralSessionLocal
from backend import models

# Secret key for JWT
SECRET_KEY = os.environ.get("SECRET_KEY", "smartcustomer_ai_default_secret_key_998877")
if SECRET_KEY == "smartcustomer_ai_default_secret_key_998877":
    print("[INFO] SECRET_KEY not set. Using built-in fallback for development.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

# Removed broken passlib CryptContext, using raw bcrypt below
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter()

# --- Pydantic Schemas ---
class UserCreate(BaseModel):
    name: str # Full Name
    username: str # Aligned with frontend login (often same as phone)
    password: str
    business_type: str # 'urban' or 'rural'
    phone: Optional[str] = None # Unique Enterprise ID

class LoginRequest(BaseModel):
    username: str
    password: str
    mode: str # Business mode selected on login

class Token(BaseModel):
    access_token: str
    token_type: str
    business_type: str
    name: str

class TokenData(BaseModel):
    phone: Optional[str] = None
    business_type: Optional[str] = None
    user_id: Optional[int] = None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # Bcrypt expects bytes for both the password and the hash.
        # SQLite returns strings, so we must encode them.
        password_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        
        result = bcrypt.checkpw(password_bytes, hash_bytes)
        return result
    except Exception as e:
        print(f"[AUTH] Error during bcrypt verification: {str(e)}")
        return False

def get_password_hash(password):
    if isinstance(password, str):
        password = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone: str = payload.get("sub")
        business_type: str = payload.get("business_type")
        user_id: int = payload.get("user_id")
        
        if phone is None or business_type is None:
            raise credentials_exception
        token_data = TokenData(phone=phone, business_type=business_type, user_id=user_id)
    except JWTError:
        raise credentials_exception
        
    db = RuralSessionLocal() if token_data.business_type == "rural" else UrbanSessionLocal()
    user = db.query(models.User).filter(models.User.id == token_data.user_id).first()
    db.close()
    
    if user is None:
        raise credentials_exception
    return user

# --- Routes ---

@router.post("/register")
def register(user: UserCreate):
    phone_val = user.phone or user.username
    print(f"\n[AUTH] === Processing Registration for {phone_val} ({user.name}) ===")
    
    # ── Database Instance Selection ──────────────────────────────────────────
    try:
        db = RuralSessionLocal() if user.business_type == "rural" else UrbanSessionLocal()
    except Exception as e:
        print(f"[AUTH ERROR] Failed to initialize DB session: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration Engine Offline (Database Connection Error)")

    try:
        # Check for existing user by phone (primary identifier)
        db_user = db.query(models.User).filter(models.User.phone == phone_val).first()
        if db_user:
            print(f"[AUTH] DENIED: Enterprise ID {phone_val} already exists.")
            raise HTTPException(status_code=400, detail="Enterprise ID (Phone) already registered. Please sign in.")
            
        hashed_password = get_password_hash(user.password)
        
        new_user = models.User(
            name=user.name,
            phone=phone_val, 
            password_hash=hashed_password,
            business_type=user.business_type
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"[AUTH] SUCCESS: Created user {new_user.id} ({new_user.business_type})")
        return {"id": new_user.id, "name": new_user.name, "phone": new_user.phone}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[AUTH ERROR] Internal registration failure: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Registration Service Error - Please contact support.")
    finally:
        db.close()


@router.post("/login", response_model=Token)
def login(data: LoginRequest):
    print(f"\n[AUTH] === Processing JSON Login for {data.username} [{data.mode}] ===")
    
    db = RuralSessionLocal() if data.mode == "rural" else UrbanSessionLocal()
    user = db.query(models.User).filter(models.User.phone == data.username).first()
    
    if not user:
        print(f"[AUTH] Login failed: User not found with phone/username: {data.username}")
        db.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(data.password, user.password_hash):
        print(f"[AUTH] Login failed: Password mismatch for user: {data.username}")
        # Log a hint if the hash looks weird (e.g. not bcrypt)
        if not user.password_hash.startswith('$2b$'):
            print(f"[AUTH] WARNING: User hash for {data.username} does not appear to be a valid bcrypt hash.")
        db.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Ensure the mode matches (or update it if we allow cross-mode)
    if user.business_type != data.mode:
        print(f"[AUTH] WARNING: User registered as {user.business_type} but logging in as {data.mode}")
        # For SmartCustomer AI PWA v8, we allow the mode to be flexible but default to account registration
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.phone, "business_type": user.business_type, "user_id": user.id}, 
        expires_delta=access_token_expires
    )
    
    print(f"[AUTH] SUCCESS: Logged in {user.name}")
    db.close()
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "business_type": user.business_type,
        "name": user.name
    }

@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "business_type": current_user.business_type
    }
