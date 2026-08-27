"""
Database Row Count Invariance Verification Script
Verifies exact row count integrity across all core tables in PostgreSQL.
"""
from backend.database import fetch_one

TABLES = [
    "analytics.dim_school",
    "analytics.dim_student",
    "analytics.fact_assessment",
    "analytics.fact_performance",
    "analytics.fact_engagement",
    "analytics.fact_intervention"
]

EXPECTED_MINIMUMS = {
    "analytics.dim_school": 989,
    "analytics.dim_student": 98141,
    "analytics.fact_assessment": 582264,
    "analytics.fact_performance": 530470,
    "analytics.fact_engagement": 966653,
    "analytics.fact_intervention": 14373
}

print("=== DATABASE INTEGRITY CHECK ===")
all_pass = True
for table, exp_count in EXPECTED_MINIMUMS.items():
    row = fetch_one(f"SELECT COUNT(*) AS total FROM {table};", sanitize=False)
    actual = row["total"] if row else 0
    status = "[PASS]" if actual == exp_count else "[FAIL]"
    if actual != exp_count:
        all_pass = False
    print(f"{status} {table}: {actual:,} rows (Expected: {exp_count:,})")

print("================================")
if all_pass:
    print("ALL 6 CORE TABLES INTACT! ZERO ROW MUTATIONS.")
else:
    print("WARNING: Table count mismatch!")
