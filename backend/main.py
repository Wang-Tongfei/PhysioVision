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
from app.models import Clinic, Patient, Subscription, User  # Imports all models into metadata.
from app.models.patient import RiskTier
from app.core.security import hash_password
from sqlalchemy import inspect, text


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Keep local/demo startup self-contained. Production deployments should
    # replace this with versioned Alembic migrations.
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name == "sqlite":
        columns = {column["name"] for column in inspect(engine).get_columns("exercises")}
        if "clinic_id" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE exercises ADD COLUMN clinic_id INTEGER"))
                connection.execute(text("UPDATE exercises SET clinic_id = 1 WHERE clinic_id IS NULL"))
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
        if db.query(User).filter(User.email == "therapist@clinic.com").first() is None:
            db.add(
                User(
                    clinic_id=1,
                    full_name="Dr. Sarah Kim",
                    email="therapist@clinic.com",
                    password_hash=hash_password("demo1234"),
                    role="lead_therapist",
                )
            )
        if db.query(Patient).filter(Patient.clinic_id == 1).first() is None:
            db.add(
                Patient(
                    clinic_id=1,
                    mrn="DEMO-001",
                    full_name="Demo Patient",
                    diagnosis="Post-operative knee rehabilitation",
                    risk_tier=RiskTier.MODERATE,
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
