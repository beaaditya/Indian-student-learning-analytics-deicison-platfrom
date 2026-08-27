import json
import logging

class QualityLogger:
    def __init__(self, run_id, conn):
        self.run_id = run_id
        self.conn = conn
        self.issues = []
        self.rejections = []

    def log_issue(self, dataset, issue_type, column_name, record_identifier, issue_description, original_value, action_taken):
        issue = (
            self.run_id,
            dataset,
            issue_type,
            column_name,
            record_identifier,
            issue_description,
            original_value,
            action_taken
        )
        self.issues.append(issue)

    def reject_record(self, dataset, record_identifier, rejection_reason, raw_record_dict):
        # raw_record_dict must be serialized to JSON
        raw_record_json = json.dumps(raw_record_dict)
        rejection = (
            self.run_id,
            dataset,
            record_identifier,
            rejection_reason,
            raw_record_json
        )
        self.rejections.append(rejection)

    def flush(self):
        """Write accumulated logs to the database."""
        with self.conn.cursor() as cur:
            if self.issues:
                from psycopg2.extras import execute_values
                query = """
                    INSERT INTO etl.data_quality_log 
                    (run_id, dataset, issue_type, column_name, record_identifier, issue_description, original_value, action_taken)
                    VALUES %s
                """
                execute_values(cur, query, self.issues)
                self.issues = []

            if self.rejections:
                from psycopg2.extras import execute_values
                query = """
                    INSERT INTO etl.rejected_records 
                    (run_id, dataset, record_identifier, rejection_reason, raw_record)
                    VALUES %s
                """
                execute_values(cur, query, self.rejections)
                self.rejections = []
