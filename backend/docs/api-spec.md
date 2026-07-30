# PhysioVision — Backend API Specification (v1)

This document specifies the REST API exposed by the PhysioVision FastAPI
backend. The current backend implementation is a **structural stub**: route
handlers, schemas and ORM models are in place, but most endpoints return
placeholder/empty data and delegate to services/agents that are not yet
implemented (marked `TODO` in code).

- **Base path:** `/api/v1`
- **OpenAPI schema (auto-generated):** `/api/v1/openapi.json`
- **Interactive docs:** `/docs` (Swagger UI), `/redoc` (ReDoc)
- **Run:** `uvicorn main:app --reload` (from the `backend/` directory)
- **Content type:** `application/json`

## Conventions

| Aspect        | Convention                                                      |
|---------------|-----------------------------------------------------------------|
| IDs           | Integer, server-assigned                                         |
| Timestamps    | ISO-8601 strings with timezone (`2026-07-29T10:00:00+00:00`)    |
| Pagination    | Query params `skip` (default 0) and `limit` (default 50)        |
| Errors        | `{ "detail": "<message>" }`, standard HTTP status codes         |
| Auth (planned)| Bearer JWT in `Authorization` header (see Auth section)         |

### Common schemas

```json
Message  { "detail": "string" }
Page     { "total": 0, "page": 0, "page_size": 0 }
```

---

## Endpoints

### Health

| Method | Path           | Description              |
|--------|----------------|--------------------------|
| GET    | `/health`      | Liveness probe           |

```json
// 200
{ "status": "ok", "service": "PhysioVision", "version": "0.1.0" }
```

### Patients

Base path: `/patients`

| Method | Path              | Request body      | Response         | Status |
|--------|-------------------|-------------------|------------------|--------|
| GET    | `/patients`       | —                 | `PatientRead[]`  | 200    |
| POST   | `/patients`       | `PatientCreate`   | `PatientRead`    | 201*   |
| GET    | `/patients/{id}`  | —                 | `PatientRead`    | 200    |
| PATCH  | `/patients/{id}`  | `PatientUpdate`   | `PatientRead`    | 200    |

> *Currently returns `501 Not Implemented` (stub).

**Patient schemas**
```json
PatientBase   { "full_name": "string", "date_of_birth": "string|null",
                "sex": "string|null", "condition": "string|null",
                "status": "active" }
PatientCreate = PatientBase
PatientUpdate { all fields optional }
PatientRead   = PatientBase + { "id": 0, "created_at": "datetime" }
```

### Exercises

Base path: `/exercises`

| Method | Path                | Query              | Response          | Status |
|--------|---------------------|--------------------|-------------------|--------|
| GET    | `/exercises`        | `category?`,`skip`,`limit` | `ExerciseRead[]`  | 200    |
| POST   | `/exercises`        | `ExerciseCreate`   | `ExerciseRead`    | 201*   |
| GET    | `/exercises/{id}`   | —                  | `ExerciseRead`    | 200    |

> *Currently returns `501 Not Implemented` (stub).

**Exercise schemas**
```json
ExerciseBase  { "name": "string", "category": "string|null",
                "description": "string|null", "target_muscles": "string|null",
                "difficulty": "beginner", "duration_min": 10 }
ExerciseCreate = ExerciseBase
ExerciseRead   = ExerciseBase + { "id": 0, "created_at": "datetime" }
```

### Sessions (movement analysis)

Base path: `/sessions`

| Method | Path                       | Request body   | Response         | Status |
|--------|----------------------------|----------------|------------------|--------|
| GET    | `/sessions`                | `patient_id?`,`skip`,`limit` | `SessionRead[]`  | 200    |
| POST   | `/sessions`                | `SessionCreate` | `SessionRead`    | 201*   |
| GET    | `/sessions/{id}`           | —              | `SessionRead`    | 200    |
| POST   | `/sessions/{id}/analyze`   | —              | `SessionRead`    | 200*   |

> *Currently returns `501/404 Not Implemented` (stub). `analyze` triggers the movement-analysis agent.

**Session schemas**
```json
SessionBase  { "patient_id": 0, "exercise_id": "int|null",
               "started_at": "datetime|null", "ended_at": "datetime|null",
               "status": "scheduled", "rom_score": "float|null",
               "symmetry_score": "float|null", "pain_score": "float|null",
               "video_url": "string|null" }
SessionCreate = SessionBase
SessionRead   = SessionBase + { "id": 0, "created_at": "datetime" }
```

### Reports (AI)

Base path: `/reports`

| Method | Path                     | Request body  | Response        | Status |
|--------|--------------------------|---------------|-----------------|--------|
| GET    | `/reports`               | `patient_id?`,`skip`,`limit` | `ReportRead[]`  | 200    |
| POST   | `/reports`               | `ReportCreate` | `ReportRead`    | 201*   |
| GET    | `/reports/{id}`          | —             | `ReportRead`    | 200    |
| POST   | `/reports/generate`      | `patient_id`,`session_id?` | `ReportRead` | 200*   |

> *Currently returns `501/404 Not Implemented` (stub). `generate` triggers the report-generator agent.

**Report schemas**
```json
ReportBase   { "patient_id": 0, "session_id": "int|null",
               "type": "progress", "summary": "string|null",
               "findings": "string|null", "recommendations": "string|null",
               "risk_score": "float|null" }
ReportCreate = ReportBase
ReportRead   = ReportBase + { "id": 0, "generated_at": "datetime" }
```

### Agents

Base path: `/agents`

| Method | Path            | Body / Query            | Response        | Status |
|--------|-----------------|-------------------------|-----------------|--------|
| GET    | `/agents`       | —                       | `AgentInfo[]`   | 200    |
| POST   | `/agents/run`   | `name`, `target_id`     | `Message`       | 200*   |

> *Currently returns a placeholder `Message` (stub); dispatch not implemented.

**AgentInfo**
```json
{ "name": "movement_analysis | report_generator",
  "description": "string", "status": "stub" }
```

---

## Authentication (planned)

JWT-based auth is scaffolded in `app.core.security` (`create_access_token`)
but not yet enforced. The intended flow:

1. `POST /auth/login` → returns `access_token` (implemented in a later task).
2. Clients send `Authorization: Bearer <token>`.
3. A `get_current_user` dependency (to be added in `app.api.deps`) guards
   protected routes.

---

## Data model summary

| Entity   | Key fields                                                            |
|----------|-----------------------------------------------------------------------|
| Patient  | id, full_name, date_of_birth, sex, condition, status, created_at      |
| Exercise | id, name, category, description, target_muscles, difficulty, duration_min |
| Session  | id, patient_id, exercise_id, started_at, ended_at, status, rom/symmetry/pain scores, video_url |
| Report   | id, patient_id, session_id, type, summary, findings, recommendations, risk_score |

Relationships: `Patient 1—* Session`, `Exercise 1—* Session`,
`Patient 1—* Report`, `Session 1—? Report`.
