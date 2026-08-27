import urllib.request
import json

def inspect(name, url, method="GET", body=None):
    try:
        req = urllib.request.Request(url, method=method)
        if body:
            req.add_header("Content-Type", "application/json")
            req.data = json.dumps(body).encode("utf-8")
        with urllib.request.urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode("utf-8"))
            print(f"=== {name} ===")
            print(json.dumps(data, indent=2, default=str)[:1200])
            print("\n" + "="*50 + "\n")
            return data
    except Exception as e:
        print(f"=== {name} ERROR: {e} ===")
        return None

if __name__ == "__main__":
    overview = inspect("Overview", "http://127.0.0.1:8000/api/overview")
    schools = inspect("Schools List", "http://127.0.0.1:8000/api/schools?limit=2")
    if schools and schools.get("schools"):
        first_sch = schools["schools"][0]["school_id"]
        inspect("School Detail", f"http://127.0.0.1:8000/api/schools/{first_sch}")
    grades = inspect("Grades", "http://127.0.0.1:8000/api/grades")
    subjects = inspect("Subjects", "http://127.0.0.1:8000/api/subjects")
    students = inspect("Students List", "http://127.0.0.1:8000/api/students?limit=2")
    if students and students.get("students"):
        first_stu = students["students"][0]["student_id"]
        inspect("Student Detail", f"http://127.0.0.1:8000/api/students/{first_stu}")
    risk = inspect("Risk", "http://127.0.0.1:8000/api/risk?limit=2")
    interventions = inspect("Interventions", "http://127.0.0.1:8000/api/interventions?limit=2")
    insights = inspect("Insights", "http://127.0.0.1:8000/api/insights")
    insights_sum = inspect("Insights Summary", "http://127.0.0.1:8000/api/insights/summary")
    agent = inspect("AI Agent Query", "http://127.0.0.1:8000/api/agent/query", method="POST", body={"question": "Which schools are underperforming?"})
    # We can inspect report format schema as well
