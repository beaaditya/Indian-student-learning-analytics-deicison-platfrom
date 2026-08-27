import json
from datetime import datetime

class DataValidator:
    def __init__(self, dataset_name, pk_field, required_fields=None):
        self.dataset = dataset_name
        self.pk_field = pk_field
        self.required_fields = required_fields or []
        self.valid_fk_cache = {}

    def set_fk_cache(self, entity_name, valid_ids):
        """Sets a set of valid IDs for foreign key validation."""
        self.valid_fk_cache[entity_name] = set(valid_ids)

    def clean_string(self, value):
        if value is None:
            return None
        if not isinstance(value, str):
            value = str(value)
        val = value.strip()
        return val if val != "" else None

    def normalize_category(self, value, valid_categories):
        """Attempts to normalize a category by checking case-insensitive matches."""
        if not value:
            return None
        val_lower = value.lower()
        for cat in valid_categories:
            if cat.lower() == val_lower:
                return cat
        return value # return original if no match

    def process_records(self, raw_records):
        """
        Process raw records.
        Returns (cleaned_records, issues, rejections)
        issues: list of dicts with issue details
        rejections: list of dicts with rejection details
        """
        cleaned_records = []
        issues = []
        rejections = []
        seen_pks = set()

        for record in raw_records:
            is_rejected = False
            pk = record.get(self.pk_field)
            
            # Deduplication
            if not pk:
                # Missing PK is fatal
                rejections.append({
                    "dataset": self.dataset,
                    "record_identifier": "UNKNOWN",
                    "rejection_reason": f"Missing Primary Key ({self.pk_field})",
                    "raw_record": record
                })
                continue
            
            pk = pk.strip()
            if pk in seen_pks:
                issues.append({
                    "dataset": self.dataset,
                    "issue_type": "duplicate_record",
                    "column_name": self.pk_field,
                    "record_identifier": pk,
                    "issue_description": "Exact duplicate record detected",
                    "original_value": pk,
                    "action_taken": "removed"
                })
                continue
                
            seen_pks.add(pk)
            
            # Create a cleaned copy
            cleaned = {}
            for k, v in record.items():
                cleaned_val = self.clean_string(v)
                if cleaned_val != v and v is not None:
                    # Log whitespace cleanup if it was just trailing/leading space, but avoid spamming.
                    # We'll just do it silently for whitespace as standard, or log if explicitly needed.
                    # But the requirement says "Every repair must be measurable."
                    if cleaned_val is not None and v.strip() == cleaned_val and len(v) != len(cleaned_val):
                        issues.append({
                            "dataset": self.dataset,
                            "issue_type": "whitespace",
                            "column_name": k,
                            "record_identifier": pk,
                            "issue_description": "Leading/trailing whitespace detected",
                            "original_value": v,
                            "action_taken": "cleaned_whitespace"
                        })
                cleaned[k] = cleaned_val

            # Dataset-specific validation and repair
            rejections_count_before = len(rejections)
            try:
                self.validate_dataset_specific(cleaned, issues, rejections)
            except Exception as e:
                rejections.append({
                    "dataset": self.dataset,
                    "record_identifier": pk,
                    "rejection_reason": f"Validation Exception: {str(e)}",
                    "raw_record": record
                })
                is_rejected = True
                
            if len(rejections) > rejections_count_before:
                is_rejected = True

            # NOT NULL Check (Required Fields)
            if not is_rejected:
                for req_f in self.required_fields:
                    if cleaned.get(req_f) is None or cleaned.get(req_f) == "":
                        rejections.append({
                            "dataset": self.dataset,
                            "record_identifier": pk,
                            "rejection_reason": f"missing_required_field:{req_f}",
                            "raw_record": record
                        })
                        issues.append({
                            "dataset": self.dataset,
                            "issue_type": "missing_value",
                            "column_name": req_f,
                            "record_identifier": pk,
                            "issue_description": f"Missing required field {req_f}",
                            "original_value": None,
                            "action_taken": "rejected"
                        })
                        is_rejected = True
                        break # Only reject once for missing fields

            if not is_rejected:
                cleaned_records.append(cleaned)
            
        return cleaned_records, issues, rejections

    def validate_dataset_specific(self, cleaned, issues, rejections):
        """Override this in subclasses for specific logic"""
        pass
