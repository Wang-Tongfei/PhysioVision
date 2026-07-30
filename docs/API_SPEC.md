# PhysioVision — REST API Specification (v1)

Base URL: `https://api.physiovision.health/api/v1`
Local: `http://localhost:8000/api/v1`
Interactive docs: `/docs` (Swagger), `/redoc` (ReDoc)

All timestamps are ISO-8601 UTC. Authentication is not yet enforced in the
current prototype.

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
| GET | `/sessions/monitor/status` | Current camera/upload job and movement metrics |
| POST | `/sessions/monitor/live` | Start server camera (`exercise`, `camera_index`, `track_arm`) |
| POST | `/sessions/monitor/upload` | Upload a video as multipart form data |
| POST | `/sessions/monitor/stop` | Stop the active job |
| GET | `/sessions/monitor/stream` | MJPEG stream containing real video + Bot HUD |
| GET | `/sessions/monitor/result` | Processed WebM for the latest uploaded video |

Supported exercise values are `bicep_curl`, `squat`, `plank`, and `pushup`.
Only one monitoring job can run at a time. Uploads are limited to 500 MB.

**Monitor status**

```json
{
  "phase": "running",
  "source": "camera",
  "exercise": "squat",
  "progress": 4,
  "target": 10,
  "unit": "reps",
  "form_status": "Squat reps: 4/10",
  "form_ok": true,
  "metric_label": "Knee",
  "metric_value": 103.2,
  "has_frame": true
}
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

## Future AI Agent Integration

The following pipeline is a design option and is not part of the current core
runtime. Live monitoring uses the deterministic `Physio_AI_Bot` rules without
Redis, an external LLM, FHIR, or MinIO.

```
frame → movement_analysis → risk_assessment → rehab_coach
                                  │
                                  ├─→ therapist_assistant → soap_report (FHIR)
                                  └─→ analytics (trends/KPIs)
```

Agents: **Movement Analysis**, **Risk Assessment**, **Rehab Coach**,
**Therapist Assistant**, **SOAP Report**, **Analytics**.
