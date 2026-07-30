"""PhysioVision API Gateway.

Entry point for the FastAPI application. Mounts the v1 routers, configures
CORS, websocket hub for live video/telemetry, and health/observability routes.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine, Base

# Create tables for the demo (production uses Alembic migrations).
# Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # TODO: initialise database tables / external clients on startup.
    yield
    # TODO: graceful shutdown / connection cleanup.


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "AI-powered rehabilitation platform for physiotherapy clinics. "
        "Multi-patient monitoring, movement analysis, and therapist decision support."
    ),
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok", "service": "physiovision-api", "version": settings.VERSION}


@app.get("/metrics", tags=["system"])
def metrics():
    """Prometheus scrape endpoint (stub)."""
    return {"active_sessions": 0, "edge_nodes": 0}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
