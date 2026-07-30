# PhysioVision — REST API Specification (v1)

Base URL: `https://api.physiovision.health/api/v1`
Local: `http://localhost:8000/api/v1`
Interactive docs: `/docs` (Swagger), `/redoc` (ReDoc)

All timestamps are ISO-8601 UTC. Auth uses `Bearer <JWT>` (role: therapist / admin).

---

## 1. Patients

| Method | Path | Description |
|--------|------|-------------|
| GET | `/patients` | List patients (filter `?clinic_id=`) |
| POST | `/patients` | Register a patient (FHIR MRN) |
| GET | `/patients/{id}` | Patient profile |
| GET | `/patients/{id}/history` | SOAP reports history |
| GET | `/patients/{id}/sessions` | Session metrics (last 20) |

**PatientCreate**
```json
{ "mrn": "MRN-10042", "full_name": "Lim Wei Jie", "date_of_birth": "1985-04-12",
  "gender": "M", "diagnosis": "Post-ACL reconstruction", "risk_tier": "moderate" }
```

---

## 2. Exercises

| Method | Path | Description |
|--------|------|-------------|
| GET | `/exercises` | Exercise library (`?category=mobility`) |
| POST | `/exercises` | Add exercise |
| POST | `/exercises/prescriptions` | Prescribe to patient |
| GET | `/exercises/prescriptions/{patient_id}` | Active prescriptions |

---

## 3. Sessions (Live Monitoring)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sessions/start` | Start a session (`patient_id`, `exercise_id`, `edge_node_id`) |
| POST | `/sessions/{id}/frame` | Ingest pose frame (landmarks + angles) |
| GET | `/sessions/{id}/summary` | Session summary metrics |
| WS | `/sessions/{id}/ws` | Real-time telemetry stream (skeleton overlay) |

**PoseFrameIn**
```json
{ "session_id": 12, "ts": 3.24,
  "landmarks": { "right_knee": [0.4, 0.7, 0.1] },
  "joint_angles": { "right_knee": 92.3 } }
```

**LiveTelemetry (websocket payload)**
```json
{ "session_id": 12, "ts": 3.24, "rep_count": 5, "current_rom_deg": 95.0,
  "movement_quality_score": 86, "risk_score": 22, "fatigue_index": 18,
  "compensation_detected": false,
  "skeleton": [[x,y], ...] }
```

---

## 4. Alerts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/alerts` | List alerts (`?unack=true`) |
| POST | `/alerts/{id}/acknowledge` | Acknowledge alert |

Alert types: `wrong_form` · `fatigue` · `compensation` · `safety`.
Severity: `info` · `warning` · `critical`. Delivered to Telegram + dashboard.

---

## 5. Reports (AI / SOAP)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reports` | List reports (`?patient_id=`) |
| POST | `/reports/soap` | Manually create SOAP note |
| POST | `/reports/{session_id}/generate` | Auto-generate SOAP from session (SOAP Agent) |

---

## 6. Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/patient/{id}/trend` | Recovery trend (`?days=30`) |
| GET | `/analytics/clinic/kpi` | Clinic KPIs (active patients, sessions/day, alert rate) |

---

## 7. Clinic Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clinic/profile` | Clinic profile + FHIR/HL7 endpoints |
| GET | `/clinic/subscription` | Subscription plan & limits |
| GET | `/clinic/therapists` | Therapist roster |
| GET | `/clinic/schedule` | Appointment schedule (`?date=`) |
| POST | `/clinic/schedule` | Book appointment / assign therapist |

---

## AI Agent Integration

```
frame → movement_analysis → risk_assessment → rehab_coach
                                  │
                                  ├─→ therapist_assistant → soap_report (FHIR)
                                  └─→ analytics (trends/KPIs)
```

Agents: **Movement Analysis**, **Risk Assessment**, **Rehab Coach**,
**Therapist Assistant**, **SOAP Report**, **Analytics**.
