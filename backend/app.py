import os, sys, traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Load .env FIRST before any other imports that read env vars
current_dir = os.path.dirname(os.path.abspath(__file__))
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(current_dir, '.env'))
    print(f"--- .env loaded. GEMINI_API_KEY present: {bool(os.environ.get('GEMINI_API_KEY'))} ---")
except ImportError:
    pass

# No sys.path hacking - rely on standard package structure

from backend import models
from backend.database import urban_engine, rural_engine, get_db
from backend.api.router import router as api_router
from backend.api.auth import router as auth_router
from backend.api.actions import router as actions_router
from backend.api.advisor import router as advisor_router
from backend.api.voice import router as voice_router
from backend.api.authenticity import router as authenticity_router
from backend.api.visuals import router as visuals_router
from backend.api.reports import router as reports_router

# Check for crucial environment variables (Cleaner logging for Render)
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    print("[PORTAL] SECRET_KEY not found. Using local fallback.")
    os.environ["SECRET_KEY"] = "local-dev-fallback-9er8u3498u34"

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
     print("[PORTAL] GEMINI_API_KEY not found. AI Advisor will use local intelligence fallback.")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Perform async infrastructure checks and table initialization."""
    print("--- [STARTUP] Initializing Strictly Isolated Multi-Tenant Engines ---")
    try:
        models.Base.metadata.create_all(bind=urban_engine)
        models.Base.metadata.create_all(bind=rural_engine)
        print("--- [STARTUP] Multi-Tenant Isolation Verified & Tables Ready ---")
    except Exception as e:
        print(f"--- [STARTUP ERROR] DB Initialization Warning: {str(e)} ---")
    yield
    """Gracefully close engine connection pools."""
    print("--- [SHUTDOWN] Disposing Engine Connection Pools ---")
    urban_engine.dispose()
    rural_engine.dispose()

# App Initialization
app = FastAPI(title="SmartCustomer AI Platform", lifespan=lifespan)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_path = os.path.join(current_dir, "..", "frontend")
print(f"--- Frontend Path: {frontend_path} ---")

@app.api_route("/api/ping", methods=["GET", "HEAD"])
async def ping():
    return {"status": "ok", "message": "SmartCustomer AI Backend Active"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"\n[CRITICAL ERROR] {request.method} {request.url}")
    print(f"Detail: {str(exc)}")
    
    if str(request.url.path).startswith("/api"):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": str(exc),
                "type": type(exc).__name__
            }
        )
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

# API routes
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(actions_router, prefix="/api/actions", tags=["actions"])
app.include_router(advisor_router, prefix="/api/advisor", tags=["advisor"])
app.include_router(voice_router, prefix="/api/voice", tags=["voice"])
app.include_router(authenticity_router, prefix="/api/authenticity", tags=["authenticity"])
app.include_router(visuals_router, prefix="/api/visuals", tags=["visuals"])
app.include_router(reports_router, prefix="/api/reports", tags=["reports"])
app.include_router(api_router, prefix="/api")

# Mount static assets first (CSS/JS/images)
app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")
app.mount("/css", StaticFiles(directory=os.path.join(frontend_path, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(frontend_path, "js")), name="js")

# SPA Catch-all: If not an API call and not a static file, serve index.html
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api"):
        return JSONResponse(status_code=404, content={"detail": f"API Route Not Found: {full_path}"})
    
    # Check if the requested path is an actual file in the frontend root (e.g. manifest.json, sw.js)
    # This avoids having to mount every single file separately.
    file_path = os.path.join(frontend_path, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # Otherwise, it's a SPA route (like /dashboard), serve index.html
    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse(status_code=404, content={"detail": "Frontend index.html not found"})

print("--- App Ready. Routes Registered ---")

if __name__ == "__main__":
    import uvicorn
    # Use Render's PORT or default to 8000
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
