import os

def load_env_file(filepath=".env"):
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    if "=" in line:
                        key, val = line.split("=", 1)
                        # Only set if not already in environment
                        if key.strip() not in os.environ:
                            os.environ[key.strip()] = val.strip()

# Load env variables if .env exists
load_env_file()

POSTGRES_HOST = os.environ.get("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.environ.get("POSTGRES_PORT", "5432")
POSTGRES_DB = os.environ.get("POSTGRES_DB", "postgres")
POSTGRES_USER = os.environ.get("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "")

DATA_SOURCE_RAW_DIR = os.path.join("data", "source_raw")
REPORTS_DIR = "reports"

# Ensure output directories exist
os.makedirs(REPORTS_DIR, exist_ok=True)
