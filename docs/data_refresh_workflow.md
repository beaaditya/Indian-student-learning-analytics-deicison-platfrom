# Data Refresh Workflow

This document describes the end-to-end production data refresh workflow for the **Student Learning Analytics & Decision Intelligence Platform**.

## Objective
When new source data is provided, a single command executes the existing ETL workflow, applies validation rules, rejects dirty data, cleans valid data, and updates the PostgreSQL analytics tables and views securely, ensuring the system remains idempotent and reliable.

## Prerequisites
- The PostgreSQL database is running on `localhost:5432` with the `student_learning_analytics` database created.
- Python environment is activated.
- Source data CSV files are placed in `data/source_raw/`.

## 1. Refreshing the Data
To process new source data and load it into the analytics database, open a terminal at the project root and run the following command:

```bash
python -m etl.main
```

### What this command does:
1. **Extraction**: Reads raw data from `data/source_raw/`.
2. **Staging**: Loads data into staging tables in the `etl` schema.
3. **Validation**: Applies business rules and constraints (e.g., verifying `digital_access_score` is NOT NULL). Invalid records are logged and rejected; they DO NOT reach the analytics tables.
4. **Loading**: Idempotently inserts the cleaned data into the `analytics` schema dimension and fact tables.
5. **Reporting**: Generates data quality and execution reports in the `reports/` directory.

## 2. Validating System Health
After the ETL pipeline completes successfully, verify that the database, backend, and frontend are all functioning correctly. 

Run the system health check script:

```bash
python scripts/health_check.py
```

### Expected Output:
- **Database Connection and Tables**: Confirms connection and prints the record count for the 6 core analytics tables and the `v_powerbi_master` view.
- **Backend API**: Connects to `http://127.0.0.1:8000/health` to confirm the backend is up and responding.
- **Frontend**: Connects to `http://localhost:3000` to confirm the frontend is reachable.

## 3. Idempotency Guarantee
The ETL workflow is fully **idempotent**. Running `python -m etl.main` multiple times with the same source data will not create duplicate entries in the database. Primary keys are validated and enforced during the transformation process.

## 4. Troubleshooting
If a record fails to load:
1. Check the `reports/rejected_records.csv` file to see why the record was rejected (e.g., Missing Primary Key, Foreign Key Violation).
2. Fix the source data in `data/source_raw/`.
3. Re-run `python -m etl.main`.

If the Health Check fails:
- **Database Failure**: Ensure PostgreSQL is running and the `.env` credentials are correct.
- **Backend Failure**: Start the FastAPI backend with `python -m uvicorn backend.main:app --reload --port 8000`.
- **Frontend Failure**: Start the frontend with `python -m http.server 3000 --directory frontend` or your preferred local web server.
