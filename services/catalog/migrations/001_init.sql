-- Agent Fabric catalog — initial schema.
CREATE SCHEMA IF NOT EXISTS catalog;

CREATE TABLE IF NOT EXISTS catalog.units (
  id          text PRIMARY KEY,          -- {slug}@{version}
  slug        text NOT NULL,
  version     text NOT NULL,
  manifest    jsonb NOT NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS units_slug_idx ON catalog.units (slug);
