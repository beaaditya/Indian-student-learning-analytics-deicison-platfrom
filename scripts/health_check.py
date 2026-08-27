import psycopg2
import urllib.request
import urllib.error
import json
import sys

DB_PARAMS = {
    "dbname": "student_learning_analytics",
    "user": "postgres",
    "password": "1234",
    "host": "localhost",
    "port": "5432"
}

def check_database():
    print("Checking Database Connection and Tables...")
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        
        # Check tables
        tables = [
            "dim_school", "dim_student", "fact_assessment",
            "fact_performance", "fact_engagement", "fact_intervention"
        ]
        print("\n--- Analytics Tables ---")
        for table in tables:
            cur.execute(f"SELECT COUNT(*) FROM analytics.{table}")
            count = cur.fetchone()[0]
            print(f"analytics.{table}: {count} records")
            
        print("\n--- Analytics Views ---")
        cur.execute("SELECT COUNT(*) FROM analytics.v_powerbi_master")
        count = cur.fetchone()[0]
        print(f"analytics.v_powerbi_master: {count} records")
        
        cur.close()
        conn.close()
        print("Database Check Passed! [OK]\n")
    except Exception as e:
        print(f"Database Check Failed! [FAILED]\nError: {e}")
        sys.exit(1)

def check_backend():
    print("Checking Backend API...")
    url = "http://127.0.0.1:8000/health"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                if data.get("status") == "healthy":
                    print("Backend Check Passed! [OK]\n")
                else:
                    print("Backend Check Failed (Unexpected JSON)! [FAILED]\n")
            else:
                print(f"Backend Check Failed (Status {response.status})! [FAILED]\n")
    except urllib.error.URLError as e:
        print(f"Backend Check Failed! [FAILED]\nError: {e}\nIs the backend running?")

def check_frontend():
    print("Checking Frontend...")
    url = "http://localhost:3000"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("Frontend Check Passed! [OK]\n")
            else:
                print(f"Frontend Check Failed (Status {response.status})! [FAILED]\n")
    except urllib.error.URLError as e:
        print(f"Frontend Check Failed! [FAILED]\nError: {e}\nIs the frontend running?")

if __name__ == "__main__":
    print("========================================")
    print(" SYSTEM HEALTH CHECK ")
    print("========================================")
    check_database()
    check_backend()
    check_frontend()
    print("========================================")
