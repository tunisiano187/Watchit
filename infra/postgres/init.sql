-- Create the umami analytics database (used when the analytics profile is enabled).
-- Runs once on first Postgres startup; safe to leave even if Umami is not started.
CREATE DATABASE umami;
GRANT ALL PRIVILEGES ON DATABASE umami TO watchit;
