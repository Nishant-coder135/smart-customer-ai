import os
import math
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Urban Mode -> isolated SQLite (Absolute paths to prevent Windows/OneDrive Errno 22)
_base_dir = os.path.dirname(os.path.abspath(__file__))
URBAN_DB_PATH = os.path.join(_base_dir, "urban_production.db")
RURAL_DB_PATH = os.path.join(_base_dir, "rural_production.db")

URBAN_DATABASE_URL = os.environ.get("DATABASE_URL_URBAN", f"sqlite:///{URBAN_DB_PATH}")
RURAL_DATABASE_URL = os.environ.get("DATABASE_URL_RURAL", f"sqlite:///{RURAL_DB_PATH}")

# --- SQLITE CUSTOM AGGREGATES ---
class SQLiteStdDev:
    def __init__(self):
        self.M = 0.0
        self.S = 0.0
        self.k = 0

    def step(self, value):
        if value is None:
            return
        self.k += 1
        new_M = self.M + (value - self.M) / self.k
        new_S = self.S + (value - self.M) * (value - new_M)
        self.M = new_M
        self.S = new_S

    def finalize(self):
        if self.k < 2:
            return 0.0
        return math.sqrt(self.S / (self.k - 1))

# Engines
urban_engine = create_engine(
    URBAN_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in URBAN_DATABASE_URL else {}
)

rural_engine = create_engine(
    RURAL_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Use DELETE mode for maximum compatibility on Windows/OneDrive
@event.listens_for(urban_engine, "connect")
def set_compatible_mode_urban(dbapi_conn, connection_record):
    if "sqlite" in URBAN_DATABASE_URL:
        dbapi_conn.execute("PRAGMA journal_mode=DELETE;")
        dbapi_conn.execute("PRAGMA synchronous=FULL;")
        dbapi_conn.execute("PRAGMA foreign_keys=ON;")
        # Register custom stddev function for SQLite
        dbapi_conn.create_aggregate("stddev", 1, SQLiteStdDev)
        dbapi_conn.create_aggregate("STDDEV", 1, SQLiteStdDev)

@event.listens_for(rural_engine, "connect")
def set_compatible_mode_rural(dbapi_conn, connection_record):
    if "sqlite" in RURAL_DATABASE_URL:
        dbapi_conn.execute("PRAGMA journal_mode=DELETE;")
        dbapi_conn.execute("PRAGMA synchronous=FULL;")
        dbapi_conn.execute("PRAGMA foreign_keys=ON;")
        # Register custom stddev function for SQLite
        dbapi_conn.create_aggregate("stddev", 1, SQLiteStdDev)

UrbanSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=urban_engine)
RuralSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=rural_engine)

Base = declarative_base()

def get_db(mode: str = "urban"):
    """
    Returns the strict isolated database session based on mode.
    Will be used as a dependency in FastAPI.
    """
    if mode == "rural":
        db = RuralSessionLocal()
    else:
        db = UrbanSessionLocal()
    try:
        yield db
    finally:
        db.close()
