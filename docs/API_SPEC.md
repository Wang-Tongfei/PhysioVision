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
| POST | `/patients/{id}/sessions` | Upload a physiosight Session JSON from the patient's device (201; 409 if already uploaded; 422 if it fails the engine's validation) |
| GET | `/patients/{id}/sessions` | Stored sessions, newest first (`?limit=`, default 50) |
| GET | `/patients/{id}/progress` | Per-exercise time series (reps, ROM, quality, fatigue, fault counts) over stored Sessions |
| GET | `/sessions/{id}/analysis` | Full Session document of one stored session |

**PatientCreate**
```json
{ "mrn": "MRN-10042", "full_name": "Lim Wei Jie", "date_of_birth": "1985-04-12",
  "gender": "M", "diagnosis": "Post-ACL reconstruction", "risk_tier": "moderate" }
```

**Uploading a Session.** The body is the file written by the engine, unchanged:

```bash
physiosight analyze squat.npz -e squat -o session.json      # or: physiosight run --sessions-dir sessions/
curl -X POST "$API/patients/12/sessions" -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" --data @session.json
```

Stored metrics come from the Session (`app/services/session_records.py`): `rom_achieved_deg`
is the median peak flexion of valid repetitions, `fatigue_index` the within-set velocity loss
(empty when not estimable), `movement_quality_score` 70% valid share + 30% completion. A SOAP
draft can then be generated with `POST /reports/{session_id}/generate`.

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
  "has_frame": true,
  "telegram_enabled": true
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

## Rules and language models

All movement analysis, scoring, risk tiers and coaching cues are deterministic
rules (the `physiosight` engine and `backend/app/agents/*`). The only optional
language-model call is the SOAP draft (`soap_agent` via `foundry_service`), used
when Azure AI Foundry credentials are configured; without them a fixed template
is used and the response says `"generation_mode": "template"`.
