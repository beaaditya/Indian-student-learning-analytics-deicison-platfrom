import csv
import os
from . import config

def extract_csv(filename):
    """
    Extracts data from a CSV file located in DATA_SOURCE_RAW_DIR.
    Returns the fieldnames and a list of dictionaries representing the rows.
    """
    filepath = os.path.join(config.DATA_SOURCE_RAW_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Source file not found: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = [dict(row) for row in reader]

    return fieldnames, rows

class Extractor:
    def extract_schools(self):
        return extract_csv("schools_raw.csv")

    def extract_students(self):
        return extract_csv("students_raw.csv")

    def extract_assessments(self):
        return extract_csv("assessments_raw.csv")

    def extract_performance(self):
        return extract_csv("performance_raw.csv")

    def extract_engagement(self):
        return extract_csv("engagement_raw.csv")

    def extract_interventions(self):
        return extract_csv("interventions_raw.csv")
