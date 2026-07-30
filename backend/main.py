"""PhysioVision API Gateway.

Entry point for the FastAPI application. Mounts the v1 routers, configures
CORS, websocket hub for live video/telemetry, and health/observability routes.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models import Clinic, Subscription  # Imports all models into metadata.


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Keep local/demo startup self-contained. Production deployments should
    # replace this with versioned Alembic migrations.
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        clinic = db.get(Clinic, 1)
        if clinic is None:
            clinic = Clinic(
                id=1,
                name="Orchard Rehab",
                fhir_endpoint="https://fhir.orchardhealth.sg",
                timezone="Asia/Singapore",
            )
            db.add(clinic)
        if (
            db.query(Subscription)
            .filter(Subscription.clinic_id == 1)
            .first()
            is None
        ):
            db.add(
                Subscription(
                    clinic_id=1,
                    plan="pro",
                    max_patients=200,
                    max_edge_nodes=10,
                    active=True,
                )
            )
        db.commit()
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
