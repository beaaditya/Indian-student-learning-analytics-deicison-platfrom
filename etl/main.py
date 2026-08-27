import time
from collections import defaultdict

from .database import DatabaseContext
from .extract import Extractor
from .quality_logger import QualityLogger
from .load import Loader
from .transform import (
    SchoolValidator, StudentValidator, AssessmentValidator,
    PerformanceValidator, EngagementValidator, InterventionValidator
)
from .utils import write_etl_run_report, write_data_quality_report, write_rejected_records_report

def run_etl():
    print("=" * 50)
    print("STUDENT LEARNING ANALYTICS ETL")
    print("=" * 50)

    try:
        with DatabaseContext() as conn:
            # Create a run log entry
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO etl.etl_run_log (pipeline_name, status) VALUES (%s, %s) RETURNING run_id",
                    ("Student Analytics Pipeline Phase 2", "RUNNING")
                )
                run_id = cur.fetchone()[0]
                conn.commit()
            
            logger = QualityLogger(run_id, conn)
            extractor = Extractor()
            loader = Loader(conn)
            
            datasets = [
                ("schools", "stg_schools", "dim_school", "school_id", extractor.extract_schools, SchoolValidator),
                ("students", "stg_students", "dim_student", "student_id", extractor.extract_students, StudentValidator),
                ("assessments", "stg_assessments", "fact_assessment", "assessment_id", extractor.extract_assessments, AssessmentValidator),
                ("performance", "stg_performance", "fact_performance", "performance_id", extractor.extract_performance, PerformanceValidator),
                ("engagement", "stg_engagement", "fact_engagement", "engagement_id", extractor.extract_engagement, EngagementValidator),
                ("interventions", "stg_interventions", "fact_intervention", "intervention_id", extractor.extract_interventions, InterventionValidator),
            ]
            
            fk_cache = {}
            run_metrics = []
            all_rejections = []
            dq_summary = defaultdict(lambda: {"records_affected": 0, "records_repaired": 0, "records_rejected": 0})
            
            for ds_name, stg_table, an_table, pk_field, extract_func, validator_class in datasets:
                t0 = time.time()
                
                # 1. Extract
                fieldnames, raw_records = extract_func()
                
                # 2. Staging Load
                loader.load_staging(ds_name, stg_table, fieldnames, raw_records)
                
                # 3. Validation & Cleaning
                validator = validator_class()
                for entity, valid_ids in fk_cache.items():
                    validator.set_fk_cache(entity, valid_ids)
                    
                cleaned, issues, rejections = validator.process_records(raw_records)
                
                # Update FK cache for downstream tables
                fk_cache[ds_name] = {r[pk_field] for r in cleaned if r.get(pk_field)}
                
                # Log issues
                for iss in issues:
                    logger.log_issue(
                        iss["dataset"], iss["issue_type"], iss["column_name"], 
                        iss["record_identifier"], iss["issue_description"], 
                        iss["original_value"], iss["action_taken"]
                    )
                    dq_summary[(ds_name, iss["issue_type"])]["records_affected"] += 1
                    dq_summary[(ds_name, iss["issue_type"])]["records_repaired"] += 1
                
                for rej in rejections:
                    logger.reject_record(
                        rej["dataset"], rej["record_identifier"], 
                        rej["rejection_reason"], rej["raw_record"]
                    )
                    
                    # Group rejection by a custom issue type for reporting
                    fake_issue_type = "unrecoverable_error"
                    if "FK" in rej["rejection_reason"]:
                        fake_issue_type = "foreign_key_violation"
                    elif "PK" in rej["rejection_reason"]:
                        fake_issue_type = "missing_primary_key"
                    
                    dq_summary[(ds_name, fake_issue_type)]["records_affected"] += 1
                    dq_summary[(ds_name, fake_issue_type)]["records_rejected"] += 1
                    all_rejections.append(rej)
                
                logger.flush()
                
                # 4. Analytics Load
                loader.load_analytics(ds_name, an_table, fieldnames, pk_field, cleaned)
                
                t1 = time.time()
                
                # Metrics
                records_read = len(raw_records)
                records_loaded = len(cleaned)
                records_rejected = len(rejections)
                duplicates_removed = sum(1 for iss in issues if iss["issue_type"] == "duplicate_record")
                records_cleaned = len(issues) - duplicates_removed
                
                metrics = {
                    "dataset": ds_name,
                    "records_read": records_read,
                    "records_cleaned": records_cleaned,
                    "duplicates_removed": duplicates_removed,
                    "records_rejected": records_rejected,
                    "records_loaded": records_loaded,
                    "processing_time_seconds": round(t1 - t0, 2),
                    "status": "SUCCESS"
                }
                run_metrics.append(metrics)
                
                # Update run log in DB incrementally
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE etl.etl_run_log 
                        SET records_read = records_read + %s,
                            records_loaded = records_loaded + %s,
                            records_rejected = records_rejected + %s,
                            records_cleaned = records_cleaned + %s
                        WHERE run_id = %s
                    """, (records_read, records_loaded, records_rejected, records_cleaned, run_id))
                conn.commit()
                
                # Console Summary Output
                print(f"Dataset: {ds_name}")
                print(f"Records Read: {records_read}")
                print(f"Records Cleaned: {records_cleaned}")
                print(f"Duplicates Removed: {duplicates_removed}")
                print(f"Records Rejected: {records_rejected}")
                print(f"Records Loaded: {records_loaded}")
                print(f"Processing Time: {metrics['processing_time_seconds']}s")
                print(f"Status: SUCCESS")
                print("-" * 50)
            
            # Mark Run as SUCCESS
            with conn.cursor() as cur:
                cur.execute("UPDATE etl.etl_run_log SET status = 'SUCCESS', end_time = CURRENT_TIMESTAMP WHERE run_id = %s", (run_id,))
            conn.commit()
            
            # Final Totals
            total_read = sum(m["records_read"] for m in run_metrics)
            total_cleaned = sum(m["records_cleaned"] for m in run_metrics)
            total_dups = sum(m["duplicates_removed"] for m in run_metrics)
            total_rejected = sum(m["records_rejected"] for m in run_metrics)
            total_loaded = sum(m["records_loaded"] for m in run_metrics)
            total_time = sum(m["processing_time_seconds"] for m in run_metrics)
            
            print("TOTALS")
            print(f"Records Read: {total_read}")
            print(f"Records Cleaned: {total_cleaned}")
            print(f"Duplicates Removed: {total_dups}")
            print(f"Records Rejected: {total_rejected}")
            print(f"Records Loaded: {total_loaded}")
            print(f"Processing Time: {round(total_time, 2)}s")
            print("=" * 50)

            # Write CSV Reports
            write_etl_run_report(run_metrics)
            
            dq_report_rows = []
            for (ds, itype), counts in dq_summary.items():
                dq_report_rows.append({
                    "dataset": ds,
                    "issue_type": itype,
                    "records_affected": counts["records_affected"],
                    "records_repaired": counts["records_repaired"],
                    "records_rejected": counts["records_rejected"]
                })
            write_data_quality_report(dq_report_rows)
            
            rejection_report_rows = [
                (run_id, r["dataset"], r["record_identifier"], r["rejection_reason"]) 
                for r in all_rejections
            ]
            write_rejected_records_report(rejection_report_rows)

    except Exception as e:
        print(f"ETL PIPELINE FAILED: {e}")
        # Try to log failure to DB
        try:
            with DatabaseContext() as conn:
                with conn.cursor() as cur:
                    # Update the latest RUNNING log
                    cur.execute("UPDATE etl.etl_run_log SET status = 'FAILED', error_message = %s, end_time = CURRENT_TIMESTAMP WHERE status = 'RUNNING'", (str(e),))
                conn.commit()
        except:
            pass
        raise

if __name__ == "__main__":
    run_etl()
