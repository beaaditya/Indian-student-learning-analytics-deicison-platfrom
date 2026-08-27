import psycopg2
from .database import execute_batch_insert

def build_insert_query(schema, table, columns):
    cols_str = ", ".join(columns)
    vals_str = ", ".join(["%s"] * len(columns))
    return f"INSERT INTO {schema}.{table} ({cols_str}) VALUES %s"

def build_upsert_query(schema, table, columns, pk):
    cols_str = ", ".join(columns)
    
    # build update set
    set_clauses = []
    for c in columns:
        if c != pk:
            set_clauses.append(f"{c} = EXCLUDED.{c}")
    
    set_str = ", ".join(set_clauses)
    
    return f"""
        INSERT INTO {schema}.{table} ({cols_str}) 
        VALUES %s 
        ON CONFLICT ({pk}) 
        DO UPDATE SET {set_str}
    """

class Loader:
    def __init__(self, conn):
        self.conn = conn

    def load_staging(self, dataset, table_name, fieldnames, records):
        if not records:
            return
            
        # extract tuples
        data = [tuple(r.get(c) for c in fieldnames) for r in records]
        
        query = build_insert_query("raw", table_name, fieldnames)
        try:
            execute_batch_insert(self.conn, query, data)
        except Exception as e:
            raise RuntimeError(f"Failed to load staging table {table_name}: {e}")

    def load_analytics(self, dataset, table_name, fieldnames, pk_field, records):
        if not records:
            return
            
        data = [tuple(r.get(c) for c in fieldnames) for r in records]
        
        query = build_upsert_query("analytics", table_name, fieldnames, pk_field)
        try:
            execute_batch_insert(self.conn, query, data)
        except Exception as e:
            raise RuntimeError(f"Failed to load analytics table {table_name}: {e}")
