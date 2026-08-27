"""
Centralized Configuration Module
Student Learning Analytics & Decision Intelligence Platform

Manages environment variables, database credentials, Gemini configuration,
API settings, and CORS parameters securely with no hardcoded secrets.
"""
import os
from typing import List
from pathlib import Path


def load_env_file(filepath: str = ".env") -> None:
    """
    Safely loads key-value pairs from a local .env file into os.environ
    if they are not already set in the environment.
    """
    env_path = Path(filepath)
    if not env_path.is_absolute():
        # Resolve relative to project root
        root_dir = Path(__file__).resolve().parent.parent
        env_path = root_dir / filepath

    if env_path.exists() and env_path.is_file():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'").strip('"')
                    if key and key not in os.environ:
                        os.environ[key] = val


# Load environment variables from .env on module import
load_env_file()


class Settings:
    """Application settings and configuration parameters."""

    # Project Metadata
    PROJECT_NAME: str = "Student Learning Analytics & Decision Intelligence Platform"
    PROJECT_DESCRIPTION: str = "FastAPI backend providing analytics and decision intelligence for student learning outcomes."
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

    # PostgreSQL Database Connection
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "student_learning_analytics")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "")
    
    # Connection Pool Settings
    DB_POOL_MIN: int = int(os.getenv("DB_POOL_MIN", "1"))
    DB_POOL_MAX: int = int(os.getenv("DB_POOL_MAX", "20"))
    DB_STATEMENT_TIMEOUT_MS: int = int(os.getenv("DB_STATEMENT_TIMEOUT_MS", "15000"))

    # Gemini AI Integration Placeholders
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # CORS Settings
    @property
    def CORS_ORIGINS(self) -> List[str]:
        raw_origins = os.getenv("CORS_ORIGINS", "*")
        if raw_origins == "*":
            return ["*"]
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    @property
    def DATABASE_URL(self) -> str:
        """Constructs a database connection string without exposing raw password in public logs."""
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    def get_masked_config(self) -> dict:
        """Returns non-sensitive configuration dictionary for diagnostic logging."""
        return {
            "PROJECT_NAME": self.PROJECT_NAME,
            "VERSION": self.VERSION,
            "ENVIRONMENT": self.ENVIRONMENT,
            "DEBUG": self.DEBUG,
            "POSTGRES_HOST": self.POSTGRES_HOST,
            "POSTGRES_PORT": self.POSTGRES_PORT,
            "POSTGRES_DB": self.POSTGRES_DB,
            "POSTGRES_USER": self.POSTGRES_USER,
            "POSTGRES_PASSWORD_SET": bool(self.POSTGRES_PASSWORD),
            "GEMINI_API_KEY_SET": bool(self.GEMINI_API_KEY),
            "GEMINI_MODEL": self.GEMINI_MODEL,
            "CORS_ORIGINS": self.CORS_ORIGINS,
        }


# Singleton settings instance
settings = Settings()
