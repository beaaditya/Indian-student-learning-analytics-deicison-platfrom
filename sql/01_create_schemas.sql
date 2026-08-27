-- ==============================================================================
-- 01_create_schemas.sql
-- Indian Student Learning Analytics & Decision Intelligence Platform
-- Creates three core schemas: raw (staging), analytics (star schema), etl (audit)
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS etl;
