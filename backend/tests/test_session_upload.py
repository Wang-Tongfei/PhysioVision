"""Main flow: a device uploads an engine Session -> it is stored -> reports use it."""
import sys
import unittest
import uuid
from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from physiosight.pipeline import analyze_sequence  # noqa: E402
from physiosight.session.models import Session  # noqa: E402
from physiosight.testing import synth  # noqa: E402

from app.api.v1.endpoints.auth import current_user  # noqa: E402
from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.models.patient import Patient  # noqa: E402
from app.services.session_records import quality_from_session  # noqa: E402
from main import app  # noqa: E402

CLINIC = 9401


def squat_session(reps=4, depth=88.0, **kw) -> dict:
    s = analyze_sequence(synth.render(synth.squat_script(reps, depth=depth, **kw)), "squat", 10,
                         stop_at_target=False).session
    return s.model_dump(mode="json")


class SessionUploadTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # entering the client runs the app's startup, including its SQLite migrations
        cls.client = TestClient(app)
        cls.client.__enter__()
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            p = Patient(full_name="Upload Patient", clinic_id=CLINIC)
            other = Patient(full_name="Other Clinic Patient", clinic_id=CLINIC + 1)
            db.add_all([p, other])
            db.commit()
            cls.patient_id, cls.other_id = p.id, other.id

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)

    def setUp(self):
        app.dependency_overrides[current_user] = lambda: SimpleNamespace(
            id=7, clinic_id=CLINIC, is_active=True, full_name="Dr. Test")

    def tearDown(self):
        app.dependency_overrides.clear()

    def upload(self, body, patient_id=None):
        return self.client.post(f"/api/v1/patients/{patient_id or self.patient_id}/sessions", json=body)

    def test_upload_store_list_and_serve_the_document(self):
        body = squat_session(4)
        r = self.upload(body)
        self.assertEqual(r.status_code, 201, r.text)
        row = r.json()
        self.assertEqual(row["exercise"], "squat")
        self.assertEqual(row["achieved"], 4)
        self.assertEqual(row["source"], "upload")
        self.assertEqual(row["status"], "completed")
        self.assertAlmostEqual(row["rom_achieved_deg"], 180 - 88, delta=1.0)

        listed = self.client.get(f"/api/v1/patients/{self.patient_id}/sessions").json()
        self.assertIn(row["id"], [x["id"] for x in listed])
        doc = self.client.get(f"/api/v1/sessions/{row['id']}/analysis").json()
        self.assertEqual(str(Session.model_validate(doc).session_id), body["session_id"])

    def test_duplicate_upload_is_rejected(self):
        body = squat_session(2)
        self.assertEqual(self.upload(body).status_code, 201)
        self.assertEqual(self.upload(body).status_code, 409)

    def test_inconsistent_session_is_rejected_by_the_engine_model(self):
        body = squat_session(2)
        body["session_id"] = str(uuid.uuid4())
        body["summary"]["achieved"] = 9  # does not match the valid reps
        self.assertEqual(self.upload(body).status_code, 422)

    def test_other_clinics_patient_is_not_found(self):
        self.assertEqual(self.upload(squat_session(2), patient_id=self.other_id).status_code, 404)

    def test_progress_series_and_fault_totals(self):
        good = self.upload(squat_session(4)).json()
        shallow = self.upload(squat_session(3, depth=120)).json()
        progress = self.client.get(f"/api/v1/patients/{self.patient_id}/progress").json()
        squat = next(e for e in progress["exercises"] if e["exercise"] == "squat")
        ids = [s["id"] for s in squat["sessions"]]
        self.assertIn(good["id"], ids)
        self.assertIn(shallow["id"], ids)
        self.assertGreaterEqual(squat["fault_totals"].get("shallow_squat", 0), 3)
        shallow_entry = next(s for s in squat["sessions"] if s["id"] == shallow["id"])
        self.assertEqual(shallow_entry["achieved"], 0)
        self.assertEqual(shallow_entry["fault_counts"]["shallow_squat"], 3)

    def test_soap_report_can_be_generated_from_an_uploaded_session(self):
        row = self.upload(squat_session(4)).json()
        r = self.client.post(f"/api/v1/reports/{row['id']}/generate")
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(set(r.json()["soap"]) >= {"subjective", "objective", "assessment", "plan"}, True)

    def test_quality_score_definition(self):
        s = Session.model_validate(squat_session(4))
        self.assertEqual(quality_from_session(s), 100 * (0.7 * 1.0 + 0.3 * 0.4))


if __name__ == "__main__":
    unittest.main()
