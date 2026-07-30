"""Clinic, therapist and subscription (business / SaaS) models."""
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, DateTime
from datetime import datetime, timezone

from app.core.database import Base


class Clinic(Base):
    __tablename__ = "clinics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    fhir_endpoint = Column(String(256))  # HL7/FHIR server base url
    hl7_endpoint = Column(String(256))
    timezone = Column(String(64), default="Asia/Singapore")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Therapist(Base):
    __tablename__ = "therapists"

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"))
    full_name = Column(String(128), nullable=False)
    email = Column(String(128), unique=True)
    license_no = Column(String(64))
    role = Column(String(32), default="physiotherapist")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"))
    plan = Column(String(32), default="pro")  # free / pro / enterprise
    max_patients = Column(Integer, default=200)
    max_edge_nodes = Column(Integer, default=10)
    active = Column(Boolean, default=True)
    renews_at = Column(DateTime)
