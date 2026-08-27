from .validate import DataValidator
from datetime import datetime

class SchoolValidator(DataValidator):
    def __init__(self):
        super().__init__("schools", "school_id", required_fields=[
            "school_id", "school_name", "school_type", "management_type", "state",
            "district", "city", "urban_rural", "school_medium", "board",
            "establishment_year", "total_students", "teacher_count", "student_teacher_ratio",
            "infrastructure_score", "digital_access_score", "assessment_frequency"
        ])

    def validate_dataset_specific(self, cleaned, issues, rejections):
        pk = cleaned.get(self.pk_field)
        
        # Capitalization / category normalization
        valid_types = ["Government", "Private", "Aided"]
        valid_boards = ["CBSE", "ICSE", "State Board"]
        
        if cleaned.get("school_type"):
            norm_type = self.normalize_category(cleaned["school_type"], valid_types)
            if norm_type != cleaned["school_type"]:
                if norm_type in valid_types:
                    issues.append({"dataset": self.dataset, "issue_type": "capitalization", "column_name": "school_type", "record_identifier": pk, "issue_description": "Inconsistent casing", "original_value": cleaned["school_type"], "action_taken": "normalized_case"})
                    cleaned["school_type"] = norm_type
                else:
                    issues.append({"dataset": self.dataset, "issue_type": "invalid_category", "column_name": "school_type", "record_identifier": pk, "issue_description": "Unknown category", "original_value": cleaned["school_type"], "action_taken": "defaulted_government"})
                    cleaned["school_type"] = "Government" # Or default
        
        if cleaned.get("board"):
            norm_board = self.normalize_category(cleaned["board"], valid_boards)
            if norm_board != cleaned["board"]:
                if norm_board in valid_boards:
                    issues.append({"dataset": self.dataset, "issue_type": "capitalization", "column_name": "board", "record_identifier": pk, "issue_description": "Inconsistent casing", "original_value": cleaned["board"], "action_taken": "normalized_case"})
                    cleaned["board"] = norm_board
                else:
                    issues.append({"dataset": self.dataset, "issue_type": "invalid_category", "column_name": "board", "record_identifier": pk, "issue_description": "Unknown category", "original_value": cleaned["board"], "action_taken": "defaulted_state_board"})
                    cleaned["board"] = "State Board"
                    
        # Null handling / numeric out of range
        if not cleaned.get("infrastructure_score"):
            issues.append({"dataset": self.dataset, "issue_type": "missing_value", "column_name": "infrastructure_score", "record_identifier": pk, "issue_description": "Missing score", "original_value": None, "action_taken": "imputed_median"})
            cleaned["infrastructure_score"] = "50.00"
        else:
            try:
                score = float(cleaned["infrastructure_score"])
                if score < 0 or score > 100:
                    issues.append({"dataset": self.dataset, "issue_type": "numeric_out_of_range", "column_name": "infrastructure_score", "record_identifier": pk, "issue_description": "Score out of range", "original_value": cleaned["infrastructure_score"], "action_taken": "capped_to_bounds"})
                    cleaned["infrastructure_score"] = str(max(0.0, min(100.0, score)))
            except ValueError:
                cleaned["infrastructure_score"] = "50.00"
                
        if cleaned.get("student_teacher_ratio"):
            try:
                ratio = float(cleaned["student_teacher_ratio"])
                if ratio < 0:
                    issues.append({"dataset": self.dataset, "issue_type": "numeric_out_of_range", "column_name": "student_teacher_ratio", "record_identifier": pk, "issue_description": "Negative ratio", "original_value": cleaned["student_teacher_ratio"], "action_taken": "set_positive"})
                    cleaned["student_teacher_ratio"] = str(abs(ratio))
            except ValueError:
                pass


class StudentValidator(DataValidator):
    def __init__(self):
        super().__init__("students", "student_id", required_fields=[
            "student_id", "school_id", "grade", "section", "academic_year",
            "enrollment_date", "age", "gender", "medium", "attendance_pct",
            "previous_year_score", "socioeconomic_band", "digital_access",
            "learning_mode", "baseline_reading_level", "active_status"
        ])

    def validate_dataset_specific(self, cleaned, issues, rejections):
        pk = cleaned.get(self.pk_field)
        
        # FK Validation - school_id is required
        school_id = cleaned.get("school_id")
        if school_id and school_id not in self.valid_fk_cache.get("schools", set()):
            rejections.append({"dataset": self.dataset, "record_identifier": pk, "rejection_reason": "parent_school_rejected", "raw_record": cleaned})
            return
        
        # Gender normalization
        valid_genders = ["Male", "Female", "Other"]
        if cleaned.get("gender"):
            norm_gender = self.normalize_category(cleaned["gender"], valid_genders)
            if norm_gender != cleaned["gender"]:
                if norm_gender in valid_genders:
                    issues.append({"dataset": self.dataset, "issue_type": "capitalization", "column_name": "gender", "record_identifier": pk, "issue_description": "Inconsistent casing", "original_value": cleaned["gender"], "action_taken": "normalized_case"})
                    cleaned["gender"] = norm_gender
                else:
                    issues.append({"dataset": self.dataset, "issue_type": "invalid_category", "column_name": "gender", "record_identifier": pk, "issue_description": "Unknown gender", "original_value": cleaned["gender"], "action_taken": "defaulted_other"})
                    cleaned["gender"] = "Other"

        # Missing values
        if not cleaned.get("attendance_pct"):
            issues.append({"dataset": self.dataset, "issue_type": "missing_value", "column_name": "attendance_pct", "record_identifier": pk, "issue_description": "Missing attendance", "original_value": None, "action_taken": "imputed_75"})
            cleaned["attendance_pct"] = "75.00"
        else:
            try:
                att = float(cleaned["attendance_pct"])
                if att < 0 or att > 100:
                    issues.append({"dataset": self.dataset, "issue_type": "numeric_out_of_range", "column_name": "attendance_pct", "record_identifier": pk, "issue_description": "Attendance out of bounds", "original_value": cleaned["attendance_pct"], "action_taken": "capped_to_bounds"})
                    cleaned["attendance_pct"] = f"{max(0.0, min(100.0, att)):.2f}"
            except ValueError:
                cleaned["attendance_pct"] = "75.00"

        # Age/Grade mismatch (Grade 6 + Age 20)
        if cleaned.get("grade") and cleaned.get("age"):
            try:
                grade = int(cleaned["grade"])
                age = int(cleaned["age"])
                if not (6 <= grade <= 10):
                    rejections.append({"dataset": self.dataset, "record_identifier": pk, "rejection_reason": f"Grade {grade} out of scope (6-10)", "raw_record": cleaned})
                    return
                if age > grade + 9: # e.g. Grade 6, age > 15
                    issues.append({"dataset": self.dataset, "issue_type": "logical_inconsistency", "column_name": "age,grade", "record_identifier": pk, "issue_description": "Impossible age for grade", "original_value": str(age), "action_taken": "derived_from_grade"})
                    cleaned["age"] = str(grade + 5) # Approximate logical age
            except ValueError:
                pass


class AssessmentValidator(DataValidator):
    def __init__(self):
        super().__init__("assessments", "assessment_id", required_fields=[
            "assessment_id", "student_id", "school_id", "grade", "subject",
            "assessment_type", "assessment_date", "academic_year", "term",
            "attempt_number", "status", "submission_channel", "processing_time_sec",
            "assessment_month", "assessment_sequence"
        ])

    def validate_dataset_specific(self, cleaned, issues, rejections):
        pk = cleaned.get(self.pk_field)
        
        # FK Validation
        student_id = cleaned.get("student_id")
        school_id = cleaned.get("school_id")
        
        if school_id and school_id not in self.valid_fk_cache.get("schools", set()):
            rejections.append({"dataset": self.dataset, "record_identifier": pk, "rejection_reason": "parent_school_rejected", "raw_record": cleaned})
            return
            
        if student_id and student_id not in self.valid_fk_cache.get("students", set()):
            rejections.append({"dataset": self.dataset, "record_identifier": pk, "rejection_reason": "parent_student_rejected", "raw_record": cleaned})
            return
            
        # Capitalization
        if cleaned.get("subject"):
            norm_sub = self.normalize_category(cleaned["subject"], ["English", "Mathematics", "Science"])
            if norm_sub != cleaned["subject"]:
                if norm_sub in ["English", "Mathematics", "Science"]:
                    issues.append({"dataset": self.dataset, "issue_type": "capitalization", "column_name": "subject", "record_identifier": pk, "issue_description": "Inconsistent casing", "original_value": cleaned["subject"], "action_taken": "normalized_case"})
                    cleaned["subject"] = norm_sub
                else:
                    issues.append({"dataset": self.dataset, "issue_type": "invalid_category", "column_name": "subject", "record_identifier": pk, "issue_description": "Unknown subject", "original_value": cleaned["subject"], "action_taken": "defaulted_english"})
                    cleaned["subject"] = "English"
                    
        # Invalid Date
        if cleaned.get("assessment_date"):
            dt_str = cleaned["assessment_date"]
            try:
                dt = datetime.strptime(dt_str, "%Y-%m-%d")
                if dt.year > 2027 or dt.year < 2024:
                    issues.append({"dataset": self.dataset, "issue_type": "date_out_of_range", "column_name": "assessment_date", "record_identifier": pk, "issue_description": "Date outside observation period", "original_value": dt_str, "action_taken": "clamped_to_period"})
                    if dt.year > 2027:
                        cleaned["assessment_date"] = "2027-01-01"
                    else:
                        cleaned["assessment_date"] = "2024-06-01"
            except ValueError:
                pass


class PerformanceValidator(DataValidator):
    def __init__(self):
        super().__init__("performance", "performance_id", required_fields=[
            "performance_id", "assessment_id", "student_id", "school_id", "grade",
            "subject", "wpm", "wcpm", "fluency_score", "pronunciation_score",
            "accuracy_pct", "comprehension_score", "vocabulary_score", "grammar_score",
            "reading_score", "percentile", "benchmark_status", "improvement_pct",
            "performance_band", "performance_date"
        ])

    def validate_dataset_specific(self, cleaned, issues, rejections):
        pk = cleaned.get(self.pk_field)
        
        # FK Validation
        school_id = cleaned.get("school_id")
        student_id = cleaned.get("student_id")
        assessment_id = cleaned.get("assessment_id")

        if school_id and school_id not in self.valid_fk_cache.get("schools", set()):
            rejections.append({"dataset": self.dataset, "record_identifier": pk, "rejection_reason": "parent_school_rejected", "raw_record": cleaned})
            return
        if student_id and student_id not in self.valid_fk_cache.get("students", set()):
            rejections.append({"dataset": self.dataset, "record_identifier": pk, "rejection_reason": "parent_student_rejected", "raw_record": cleaned})
            return
        if assessment_id and assessment_id not in self.valid_fk_cache.get("assessments", set()):
            rejections.append({"dataset": self.dataset, "record_identifier": pk, "rejection_reason": "parent_assessment_rejected", "raw_record": cleaned})
            return
            
        # Range validations
        for col in ["reading_score", "accuracy_pct"]:
            if cleaned.get(col):
                try:
                    val = float(cleaned[col])
                    if val < 0 or val > 100:
                        issues.append({"dataset": self.dataset, "issue_type": "numeric_out_of_range", "column_name": col, "record_identifier": pk, "issue_description": f"{col} out of range", "original_value": cleaned[col], "action_taken": "capped_to_bounds"})
                        cleaned[col] = f"{max(0.0, min(100.0, val)):.2f}"
                except ValueError:
                    pass
                    
        # Logical violation: WCPM > WPM
        if cleaned.get("wpm") and cleaned.get("wcpm"):
            try:
                wpm = float(cleaned["wpm"])
                wcpm = float(cleaned["wcpm"])
                if wcpm > wpm:
                    issues.append({"dataset": self.dataset, "issue_type": "logical_inconsistency", "column_name": "wcpm,wpm", "record_identifier": pk, "issue_description": "WCPM > WPM", "original_value": f"wpm:{wpm}, wcpm:{wcpm}", "action_taken": "wcpm_capped_to_wpm"})
                    cleaned["wcpm"] = cleaned["wpm"]
            except ValueError:
                pass


class EngagementValidator(DataValidator):
    def __init__(self):
        super().__init__("engagement", "engagement_id", required_fields=[
            "engagement_id", "student_id", "school_id", "grade", "academic_year",
            "month", "attendance_pct", "classes_attended", "classes_missed",
            "assignments_assigned", "assignments_completed", "assignment_completion_pct",
            "learning_sessions", "platform_minutes", "participation_score",
            "engagement_level", "engagement_date"
        ])

    def validate_dataset_specific(self, cleaned, issues, rejections):
        pk = cleaned.get(self.pk_field)
        
        # FK Validation
        school_id = cleaned.get("school_id")
        student_id = cleaned.get("student_id")
        
        if school_id and school_id not in self.valid_fk_cache.get("schools", set()):
            rejections.append({"dataset": self.dataset, "record_identifier": pk, "rejection_reason": "parent_school_rejected", "raw_record": cleaned})
            return
        if student_id and student_id not in self.valid_fk_cache.get("students", set()):
            rejections.append({"dataset": self.dataset, "record_identifier": pk, "rejection_reason": "parent_student_rejected", "raw_record": cleaned})
            return
            
        # Negative handling
        for col in ["learning_sessions", "platform_minutes"]:
            if cleaned.get(col):
                try:
                    val = int(cleaned[col])
                    if val < 0:
                        issues.append({"dataset": self.dataset, "issue_type": "numeric_negative", "column_name": col, "record_identifier": pk, "issue_description": "Negative value", "original_value": str(val), "action_taken": "set_to_zero"})
                        cleaned[col] = "0"
                except ValueError:
                    pass
                    
        # Assignment logical check
        if cleaned.get("assignments_assigned") and cleaned.get("assignments_completed"):
            try:
                assigned = int(cleaned["assignments_assigned"])
                completed = int(cleaned["assignments_completed"])
                if completed > assigned:
                    issues.append({"dataset": self.dataset, "issue_type": "logical_inconsistency", "column_name": "assignments", "record_identifier": pk, "issue_description": "Completed > Assigned", "original_value": f"c:{completed}, a:{assigned}", "action_taken": "capped_completed_to_assigned"})
                    cleaned["assignments_completed"] = cleaned["assignments_assigned"]
            except ValueError:
                pass


class InterventionValidator(DataValidator):
    def __init__(self):
        super().__init__("interventions", "intervention_id", required_fields=[
            "intervention_id", "student_id", "school_id", "grade", "identified_date",
            "risk_level", "risk_score", "risk_reason", "priority", "recommended_action",
            "assigned_to", "status" # resolution_date is nullable
        ])

    def validate_dataset_specific(self, cleaned, issues, rejections):
        pk = cleaned.get(self.pk_field)
        
        # FK Validation
        school_id = cleaned.get("school_id")
        student_id = cleaned.get("student_id")
        
        if school_id and school_id not in self.valid_fk_cache.get("schools", set()):
            rejections.append({"dataset": self.dataset, "record_identifier": pk, "rejection_reason": "parent_school_rejected", "raw_record": cleaned})
            return
        if student_id and student_id not in self.valid_fk_cache.get("students", set()):
            rejections.append({"dataset": self.dataset, "record_identifier": pk, "rejection_reason": "parent_student_rejected", "raw_record": cleaned})
            return
            
        # Date logic: resolution < identified
        if cleaned.get("identified_date") and cleaned.get("resolution_date"):
            try:
                id_dt = datetime.strptime(cleaned["identified_date"], "%Y-%m-%d")
                res_dt = datetime.strptime(cleaned["resolution_date"], "%Y-%m-%d")
                if res_dt < id_dt:
                    rejections.append({"dataset": self.dataset, "record_identifier": pk, "rejection_reason": "invalid_date_logic:resolution_before_identified", "raw_record": cleaned})
                    return
            except ValueError:
                pass
                
        # Status mismatch: Open but has resolution date
        if cleaned.get("status") == "Open" and cleaned.get("resolution_date"):
            issues.append({"dataset": self.dataset, "issue_type": "logical_status_mismatch", "column_name": "status,resolution_date", "record_identifier": pk, "issue_description": "Open status with resolution date", "original_value": cleaned["resolution_date"], "action_taken": "nullified_resolution_date"})
            cleaned["resolution_date"] = None
