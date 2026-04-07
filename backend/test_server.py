"""
Minimal test server to isolate the register 500 error.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import traceback

from database import urban_engine, rural_engine
import models

models.Base.metadata.create_all(bind=urban_engine)
models.Base.metadata.create_all(bind=rural_engine)

from api.auth import router as auth_router

app = FastAPI()
app.include_router(auth_router, prefix="/auth")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print("=== UNHANDLED EXCEPTION ===")
    print(tb)
    return JSONResponse(status_code=500, content={"detail": str(exc), "traceback": tb})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
