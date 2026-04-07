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
    print("--- python-dotenv not installed, reading env from system ---")

# Add backend to path
sys.path.append(current_dir)

import models
from database import urban_engine, rural_engine, get_db
from api.router import router as api_router
from api.auth import router as auth_router
from api.actions import router as actions_router
from api.advisor import router as advisor_router
from api.voice import router as voice_router
from api.authenticity import router as authenticity_router
from api.visuals import router as visuals_router

# Check for crucial environment variables
if not os.environ.get("SECRET_KEY"):
    print("[CRITICAL] SECRET_KEY not found in environment. JWT auth will fail.")
if not os.environ.get("GEMINI_API_KEY"):
    print("[WARNING] GEMINI_API_KEY not found. AI Advisor will use deterministic fallbacks.")

# Initialize the database tables in BOTH strictly isolated databases
print("--- Initializing DB Tables ---")
models.Base.metadata.create_all(bind=urban_engine)
models.Base.metadata.create_all(bind=rural_engine)

app = FastAPI(title="SmartCustomer AI Platform")

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

@app.get("/api/ping")
def ping():
    return {"status": "ok", "message": "Backend is alive"}

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
app.include_router(api_router, prefix="/api")

# Mount frontend
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

print("--- App Ready. Routes Registered ---")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
