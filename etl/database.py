import psycopg2
from psycopg2.extras import execute_values
from . import config

class DatabaseContext:
    def __init__(self):
        self.conn = None

    def __enter__(self):
        try:
            self.conn = psycopg2.connect(
                host=config.POSTGRES_HOST,
                port=config.POSTGRES_PORT,
                dbname=config.POSTGRES_DB,
                user=config.POSTGRES_USER,
                password=config.POSTGRES_PASSWORD,
                connect_timeout=5
            )
            # Enable autocommit for certain operations if needed, but we'll use manual transactions
            self.conn.autocommit = False
            return self.conn
        except psycopg2.OperationalError as e:
            raise ConnectionError(f"Failed to connect to PostgreSQL: {e}")

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            if exc_type is not None:
                self.conn.rollback()
            else:
                self.conn.commit()
            self.conn.close()

def execute_batch_insert(conn, query, data):
    """Executes a batch insert/upsert using psycopg2's execute_values for performance."""
    with conn.cursor() as cur:
        execute_values(cur, query, data, page_size=1000)
