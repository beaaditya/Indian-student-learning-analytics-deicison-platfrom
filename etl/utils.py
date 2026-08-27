import csv
import os
from . import config

def write_etl_run_report(run_metrics):
    filepath = os.path.join(config.REPORTS_DIR, "etl_run_report.csv")
    fieldnames = [
        "dataset", 
        "records_read", 
        "records_cleaned", 
        "duplicates_removed", 
        "records_rejected", 
        "records_loaded", 
        "processing_time_seconds", 
        "status"
    ]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(run_metrics)

def write_data_quality_report(issues_summary):
    filepath = os.path.join(config.REPORTS_DIR, "data_quality_report.csv")
    fieldnames = [
        "dataset", 
        "issue_type", 
        "records_affected", 
        "records_repaired", 
        "records_rejected"
    ]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(issues_summary)

def write_rejected_records_report(rejections):
    filepath = os.path.join(config.REPORTS_DIR, "rejected_records_report.csv")
    fieldnames = [
        "dataset", 
        "record_identifier", 
        "rejection_reason", 
        "rejected_at"
    ]
    
    # Just format current time for the report
    from datetime import datetime
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for rej in rejections:
            writer.writerow({
                "dataset": rej[1], # from tuple
                "record_identifier": rej[2],
                "rejection_reason": rej[3],
                "rejected_at": now
            })
