import unittest
from etl.transform import (
    SchoolValidator, StudentValidator, AssessmentValidator,
    PerformanceValidator, EngagementValidator, InterventionValidator
)

class TestValidation(unittest.TestCase):
    
    def test_null_digital_access_score_rejected(self):
        # 1. NULL digital_access_score -> rejected
        validator = SchoolValidator()
        raw = [{
            "school_id": "SCH1", "school_name": "Test", "school_type": "Gov",
            "management_type": "Gov", "state": "MH", "district": "Thane",
            "city": "Thane", "urban_rural": "Urban", "school_medium": "English",
            "board": "CBSE", "establishment_year": "2000", "total_students": "500",
            "teacher_count": "20", "student_teacher_ratio": "25",
            "infrastructure_score": "80", 
            "digital_access_score": None, # Missing!
            "assessment_frequency": "Monthly"
        }]
        cleaned, issues, rejections = validator.process_records(raw)
        self.assertEqual(len(cleaned), 0)
        self.assertEqual(len(rejections), 1)
        self.assertIn("missing_required_field:digital_access_score", rejections[0]["rejection_reason"])

    def test_blank_required_school_field_rejected(self):
        # 2. blank required school field -> rejected
        validator = SchoolValidator()
        raw = [{
            "school_id": "SCH1", "school_name": "   ", # Blank!
            "school_type": "Gov", "management_type": "Gov", "state": "MH", 
            "district": "Thane", "city": "Thane", "urban_rural": "Urban", 
            "school_medium": "English", "board": "CBSE", "establishment_year": "2000", 
            "total_students": "500", "teacher_count": "20", "student_teacher_ratio": "25",
            "infrastructure_score": "80", "digital_access_score": "50", 
            "assessment_frequency": "Monthly"
        }]
        cleaned, issues, rejections = validator.process_records(raw)
        self.assertEqual(len(cleaned), 0)
        self.assertEqual(len(rejections), 1)
        self.assertIn("missing_required_field:school_name", rejections[0]["rejection_reason"])

    def test_rejected_school_cascades_to_student(self):
        # 3. rejected school -> dependent student rejected
        validator = StudentValidator()
        # School cache is empty, so school SCH1 is implicitly rejected/non-existent
        validator.set_fk_cache("schools", [])
        raw = [{
            "student_id": "STU1", "school_id": "SCH1", "grade": "8", "section": "A",
            "academic_year": "2026-27", "enrollment_date": "2026-06-01", "age": "13",
            "gender": "Male", "medium": "English", "attendance_pct": "90",
            "previous_year_score": "80", "socioeconomic_band": "Middle",
            "digital_access": "High", "learning_mode": "Hybrid",
            "baseline_reading_level": "Level 3", "active_status": "Active"
        }]
        cleaned, issues, rejections = validator.process_records(raw)
        self.assertEqual(len(cleaned), 0)
        self.assertEqual(len(rejections), 1)
        self.assertEqual(rejections[0]["rejection_reason"], "parent_school_rejected")

    def test_rejected_student_cascades_to_assessment(self):
        # 4. rejected student -> dependent assessment rejected
        validator = AssessmentValidator()
        validator.set_fk_cache("schools", ["SCH1"])
        validator.set_fk_cache("students", []) # Student doesn't exist
        
        raw = [{
            "assessment_id": "ASS1", "student_id": "STU1", "school_id": "SCH1",
            "grade": "8", "subject": "Math", "assessment_type": "Formative",
            "assessment_date": "2026-08-01", "academic_year": "2026-27", "term": "Term 1",
            "attempt_number": "1", "status": "Completed", "submission_channel": "App",
            "processing_time_sec": "300", "assessment_month": "August", "assessment_sequence": "1"
        }]
        cleaned, issues, rejections = validator.process_records(raw)
        self.assertEqual(len(cleaned), 0)
        self.assertEqual(len(rejections), 1)
        self.assertEqual(rejections[0]["rejection_reason"], "parent_student_rejected")

    def test_rejected_assessment_cascades_to_performance(self):
        # 5. rejected assessment -> dependent performance rejected
        validator = PerformanceValidator()
        validator.set_fk_cache("schools", ["SCH1"])
        validator.set_fk_cache("students", ["STU1"])
        validator.set_fk_cache("assessments", []) # Assessment doesn't exist
        
        raw = [{
            "performance_id": "PERF1", "assessment_id": "ASS1", "student_id": "STU1", "school_id": "SCH1",
            "grade": "8", "subject": "Math", "wpm": "100", "wcpm": "90", "fluency_score": "80",
            "pronunciation_score": "80", "accuracy_pct": "90", "comprehension_score": "80",
            "vocabulary_score": "80", "grammar_score": "80", "reading_score": "80",
            "percentile": "75", "benchmark_status": "Met", "improvement_pct": "5",
            "performance_band": "Proficient", "performance_date": "2026-08-01"
        }]
        cleaned, issues, rejections = validator.process_records(raw)
        self.assertEqual(len(cleaned), 0)
        self.assertEqual(len(rejections), 1)
        self.assertEqual(rejections[0]["rejection_reason"], "parent_assessment_rejected")

    def test_wcpm_greater_than_wpm_handled(self):
        # 6. wcpm > wpm -> handled according to existing project rule
        validator = PerformanceValidator()
        validator.set_fk_cache("schools", ["SCH1"])
        validator.set_fk_cache("students", ["STU1"])
        validator.set_fk_cache("assessments", ["ASS1"])
        
        raw = [{
            "performance_id": "PERF1", "assessment_id": "ASS1", "student_id": "STU1", "school_id": "SCH1",
            "grade": "8", "subject": "Math", 
            "wpm": "100", "wcpm": "120", # Invalid
            "fluency_score": "80", "pronunciation_score": "80", "accuracy_pct": "90", "comprehension_score": "80",
            "vocabulary_score": "80", "grammar_score": "80", "reading_score": "80",
            "percentile": "75", "benchmark_status": "Met", "improvement_pct": "5",
            "performance_band": "Proficient", "performance_date": "2026-08-01"
        }]
        cleaned, issues, rejections = validator.process_records(raw)
        self.assertEqual(len(cleaned), 1)
        self.assertEqual(cleaned[0]["wcpm"], "100") # Capped
        self.assertEqual(issues[0]["issue_type"], "logical_inconsistency")

    def test_assignments_completed_greater_than_assigned(self):
        # 7. assignments_completed > assignments_assigned -> handled according to existing project rule
        validator = EngagementValidator()
        validator.set_fk_cache("schools", ["SCH1"])
        validator.set_fk_cache("students", ["STU1"])
        
        raw = [{
            "engagement_id": "ENG1", "student_id": "STU1", "school_id": "SCH1",
            "grade": "8", "academic_year": "2026-27", "month": "August",
            "attendance_pct": "90", "classes_attended": "20", "classes_missed": "2",
            "assignments_assigned": "5", 
            "assignments_completed": "10", # Invalid
            "assignment_completion_pct": "100", "learning_sessions": "10",
            "platform_minutes": "300", "participation_score": "80",
            "engagement_level": "High", "engagement_date": "2026-08-31"
        }]
        cleaned, issues, rejections = validator.process_records(raw)
        self.assertEqual(len(cleaned), 1)
        self.assertEqual(cleaned[0]["assignments_completed"], "5") # Capped
        self.assertEqual(issues[0]["issue_type"], "logical_inconsistency")

    def test_invalid_intervention_dates_rejected(self):
        # 8. invalid intervention dates -> rejected
        validator = InterventionValidator()
        validator.set_fk_cache("schools", ["SCH1"])
        validator.set_fk_cache("students", ["STU1"])
        
        raw = [{
            "intervention_id": "INT1", "student_id": "STU1", "school_id": "SCH1",
            "grade": "8", 
            "identified_date": "2026-08-10",
            "risk_level": "High", "risk_score": "80", "risk_reason": "Low Attendance",
            "priority": "High", "recommended_action": "Counseling",
            "assigned_to": "Counselor", "status": "Closed",
            "resolution_date": "2026-08-01" # Invalid! Before identified_date
        }]
        cleaned, issues, rejections = validator.process_records(raw)
        self.assertEqual(len(cleaned), 0)
        self.assertEqual(len(rejections), 1)
        self.assertEqual(rejections[0]["rejection_reason"], "invalid_date_logic:resolution_before_identified")

    def test_grade_outside_bounds_rejected(self):
        # 9. grade outside 6–10 -> rejected
        validator = StudentValidator()
        validator.set_fk_cache("schools", ["SCH1"])
        raw = [{
            "student_id": "STU1", "school_id": "SCH1", 
            "grade": "11", # Invalid
            "section": "A", "academic_year": "2026-27", "enrollment_date": "2026-06-01", "age": "16",
            "gender": "Male", "medium": "English", "attendance_pct": "90",
            "previous_year_score": "80", "socioeconomic_band": "Middle",
            "digital_access": "High", "learning_mode": "Hybrid",
            "baseline_reading_level": "Level 3", "active_status": "Active"
        }]
        cleaned, issues, rejections = validator.process_records(raw)
        self.assertEqual(len(cleaned), 0)
        self.assertEqual(len(rejections), 1)
        self.assertIn("Grade 11 out of scope (6-10)", rejections[0]["rejection_reason"])

    def test_valid_record_accepted(self):
        # 10. valid record -> accepted
        validator = SchoolValidator()
        raw = [{
            "school_id": "SCH1", "school_name": "Valid School", "school_type": "Government",
            "management_type": "Gov", "state": "MH", "district": "Thane",
            "city": "Thane", "urban_rural": "Urban", "school_medium": "English",
            "board": "CBSE", "establishment_year": "2000", "total_students": "500",
            "teacher_count": "20", "student_teacher_ratio": "25",
            "infrastructure_score": "80", 
            "digital_access_score": "50", 
            "assessment_frequency": "Monthly"
        }]
        cleaned, issues, rejections = validator.process_records(raw)
        self.assertEqual(len(cleaned), 1)
        self.assertEqual(len(rejections), 0)
        self.assertEqual(cleaned[0]["school_id"], "SCH1")
