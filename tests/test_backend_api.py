"""
Backend API & Decision Intelligence Validation Suite
Tests SQL assertion suite, insight generation script, and all FastAPI endpoints.
"""
import unittest
import os
import json
import psycopg2
from fastapi.testclient import TestClient
from etl import config
from backend.main import app
try:
    from scripts.generate_insights import export_insights_reports
except ImportError:
    export_insights_reports = None

class TestDecisionIntelligenceBackend(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.conn = psycopg2.connect(
            host=config.POSTGRES_HOST,
            port=config.POSTGRES_PORT,
            dbname=config.POSTGRES_DB,
            user=config.POSTGRES_USER,
            password=config.POSTGRES_PASSWORD
        )

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def test_01_sql_validation_suite(self):
        """Executes sql/10_validate_decision_intelligence.sql and asserts 0 violations."""
        with open("sql/10_validate_decision_intelligence.sql", "r", encoding="utf-8") as f:
            sql_script = f.read()

        with self.conn.cursor() as cur:
            cur.execute(sql_script)
            results = cur.fetchall()
            for test_name, status, delta in results:
                with self.subTest(test_name=test_name):
                    self.assertEqual(status, "PASS", f"Failed test: {test_name} with delta/violations: {delta}")

    def test_02_insights_export_reports(self):
        """Verifies scripts/generate_insights.py produces valid JSON, CSV, and MD reports."""
        if export_insights_reports is None:
            self.skipTest("scripts.generate_insights not yet implemented in this phase")
        export_insights_reports()
        self.assertTrue(os.path.exists("reports/insights.json"))
        self.assertTrue(os.path.exists("reports/insights.csv"))
        self.assertTrue(os.path.exists("reports/insights.md"))

        with open("reports/insights.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            self.assertIn("insights", data)
            self.assertGreater(len(data["insights"]), 0)
            # Check required fields on the first insight
            first_ins = data["insights"][0]
            required_keys = [
                "insight_id", "category", "entity_type", "entity_id", "entity_name",
                "metric", "value", "comparison_value", "difference", "priority",
                "title", "description", "recommended_action", "source", "generated_at"
            ]
            for key in required_keys:
                self.assertIn(key, first_ins, f"Missing key in insight JSON: {key}")

    def test_03_health_endpoint(self):
        """Tests GET /health"""
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "healthy")

    def test_04_overview_endpoint(self):
        """Tests GET /api/overview and filtering"""
        resp = self.client.get("/api/overview")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("kpis", data)
        self.assertGreater(data["kpis"]["total_students"], 0)
        self.assertIn("trends", data)
        self.assertIn("distributions", data)
        self.assertIn("rankings", data)

        # Sliced overview
        resp_filtered = self.client.get("/api/overview?management_type=Government&grade=8")
        self.assertEqual(resp_filtered.status_code, 200)

    def test_05_schools_endpoints(self):
        """Tests GET /api/schools and GET /api/schools/{id}"""
        resp = self.client.get("/api/schools?limit=10")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["limit"], 10)
        self.assertGreater(len(data["schools"]), 0)

        # Single school
        sample_school_id = data["schools"][0]["school_id"]
        resp_single = self.client.get(f"/api/schools/{sample_school_id}")
        self.assertEqual(resp_single.status_code, 200)
        single_data = resp_single.json()
        self.assertIn("school", single_data)
        self.assertIn("grade_breakdown", single_data)

    def test_06_grades_endpoint(self):
        """Tests GET /api/grades"""
        resp = self.client.get("/api/grades")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("grades", data)
        self.assertEqual(len(data["grades"]), 5) # Grades 6-10

    def test_07_subjects_endpoint(self):
        """Tests GET /api/subjects"""
        resp = self.client.get("/api/subjects")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("subjects", data)
        self.assertEqual(len(data["subjects"]), 3)

    def test_08_students_endpoints(self):
        """Tests GET /api/students and GET /api/students/{id}"""
        resp = self.client.get("/api/students?limit=5")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["students"]), 5)

        sample_student_id = data["students"][0]["student_id"]
        resp_single = self.client.get(f"/api/students/{sample_student_id}")
        self.assertEqual(resp_single.status_code, 200)
        self.assertIn("profile", resp_single.json())

    def test_09_risk_endpoint(self):
        """Tests GET /api/risk"""
        resp = self.client.get("/api/risk?limit=10")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("kpis", data)
        self.assertIn("triage_queue", data)

    def test_10_interventions_endpoint(self):
        """Tests GET /api/interventions"""
        resp = self.client.get("/api/interventions?limit=10")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("kpis", data)
        self.assertIn("interventions", data)

    def test_11_insights_endpoints(self):
        """Tests GET /api/insights and GET /api/insights/summary"""
        resp = self.client.get("/api/insights")
        self.assertEqual(resp.status_code, 200)
        self.assertGreater(len(resp.json()["insights"]), 0)

        resp_sum = self.client.get("/api/insights/summary")
        self.assertEqual(resp_sum.status_code, 200)
        self.assertIn("by_category", resp_sum.json())

    def test_12_analysis_pipeline_endpoint(self):
        """Tests GET /api/analysis-pipeline"""
        resp = self.client.get("/api/analysis-pipeline")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "completed")
        self.assertIn("findings", data)
        self.assertIn("risks", data)
        self.assertIn("recommendations", data)

    def test_13_agent_query_endpoint(self):
        """Tests POST /api/agent/query"""
        payload = {"question": "Which schools are underperforming?"}
        resp = self.client.post("/api/agent/query", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("executed_sql", data)
        self.assertGreater(data["evidence_row_count"], 0)

if __name__ == "__main__":
    unittest.main()
