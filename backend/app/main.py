from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import time
import os

from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import engine
from app.db.base_class import Base
from app.utils.logger import default_logger as logger

# Create FastAPI app instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Face Recognition Attendance System API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Mount static files directory
static_dir = os.path.abspath("./static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)
app.mount("/static", StaticFiles(directory=static_dir), name="static")
logger.info(f"Successfully mounted static files directory at: {static_dir}")

# Add logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info(f"Request started - Method: {request.method}, URL: {request.url}, Client: {request.client.host}")
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    logger.info(f"Request completed - Method: {request.method}, URL: {request.url}, Status: {response.status_code}, Duration: {duration:.3f}s")
    
    return response

# Log application startup
logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Log registered routes
logger.info("=== REGISTERED ROUTES ===")
logger.info(f"API_V1_STR setting: {settings.API_V1_STR}")
for route in app.routes:
    if hasattr(route, "methods"):
        logger.info(f"  {route.methods} {route.path}")
    elif hasattr(route, "path"):
        logger.info(f"  [MOUNT] {route.path}")

@app.get("/")
async def root():
    """Root endpoint for health check."""
    logger.info("Root endpoint accessed")
    return {"message": "Face Recognition Attendance System API", "version": settings.VERSION}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting development server on port 8000")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)