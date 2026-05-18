-- ═══════════════════════════════════════════════════════════════
-- Fleet Apex Intelligent AI — Master Supabase Schema
-- Version: 1.0.0
-- ═══════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";       -- For geo queries
CREATE EXTENSION IF NOT EXISTS "pg_cron";       -- For scheduled jobs
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- For fuzzy text search

-- ── Companies (Multi-tenant root) ───────────────────────────────
CREATE TABLE companies (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  trading_name  TEXT,
  subdomain     TEXT UNIQUE,
  custom_domain TEXT UNIQUE,
  plan          TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Branding Profiles ────────────────────────────────────────────
CREATE TABLE branding_profiles (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id        UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  app_name          TEXT NOT NULL DEFAULT 'Fleet Apex',
  logo_url          TEXT,
  logo_dark_url     TEXT,
  favicon_url       TEXT,
  pwa_icon_url      TEXT,
  splash_screen_url TEXT,
  primary_color     TEXT DEFAULT '#0A1628',
  secondary_color   TEXT DEFAULT '#1E3A5F',
  accent_color      TEXT DEFAULT '#00D4FF',
  font_preference   TEXT DEFAULT 'Inter',
  dark_mode         TEXT DEFAULT 'dark' CHECK (dark_mode IN ('dark', 'light', 'auto')),
  welcome_message   TEXT,
  support_email     TEXT,
  support_phone     TEXT,
  website_url       TEXT,
  bg_image_url      TEXT,
  custom_css        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Users ────────────────────────────────────────────────────────
CREATE TABLE fleet_users (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  auth_id      UUID,   -- Supabase auth.users.id
  email        TEXT NOT NULL,
  full_name    TEXT NOT NULL,
  role         TEXT DEFAULT 'driver' CHECK (role IN ('superadmin', 'admin', 'dispatcher', 'driver', 'viewer')),
  phone        TEXT,
  avatar_url   TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  last_seen    TIMESTAMPTZ,
  push_token   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Drivers ──────────────────────────────────────────────────────
CREATE TABLE drivers (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id        UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES fleet_users(id),
  license_number    TEXT NOT NULL,
  license_expiry    DATE NOT NULL,
  license_category  TEXT[],
  cpc_expiry        DATE,
  tacho_card        TEXT,
  status            TEXT DEFAULT 'offline' CHECK (status IN ('active', 'offline', 'on_break', 'emergency', 'suspended')),
  safety_score      NUMERIC(5,2) DEFAULT 100,
  current_vehicle   UUID,
  current_route     UUID,
  shift_started     TIMESTAMPTZ,
  hours_today       NUMERIC(5,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Vehicles ──────────────────────────────────────────────────────
CREATE TABLE vehicles (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id       UUID REFERENCES companies(id) ON DELETE CASCADE,
  registration     TEXT NOT NULL,
  type             TEXT NOT NULL,
  make             TEXT,
  model            TEXT,
  year             INTEGER,
  colour           TEXT,
  width_m          NUMERIC(4,2),
  height_m         NUMERIC(4,2),
  length_m         NUMERIC(5,2),
  weight_kg        INTEGER,
  max_payload_kg   INTEGER,
  mot_expiry       DATE,
  insurance_expiry DATE,
  last_inspection  DATE,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'offline', 'decommissioned')),
  fuel_type        TEXT,
  euro_class       TEXT,
  tracker_id       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Routes ────────────────────────────────────────────────────────
CREATE TABLE routes (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id       UUID REFERENCES companies(id) ON DELETE CASCADE,
  driver_id        UUID REFERENCES drivers(id),
  vehicle_id       UUID REFERENCES vehicles(id),
  name             TEXT,
  origin_address   TEXT,
  origin_lat       NUMERIC(10,7),
  origin_lng       NUMERIC(10,7),
  dest_address     TEXT,
  dest_lat         NUMERIC(10,7),
  dest_lng         NUMERIC(10,7),
  waypoints        JSONB DEFAULT '[]',
  stops            JSONB DEFAULT '[]',
  stops_completed  INTEGER DEFAULT 0,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'suspended')),
  estimated_km     NUMERIC(8,2),
  actual_km        NUMERIC(8,2),
  estimated_mins   INTEGER,
  actual_mins      INTEGER,
  risk_score       NUMERIC(5,2) DEFAULT 0,
  ai_optimized     BOOLEAN DEFAULT FALSE,
  ai_notes         TEXT,
  fuel_used_l      NUMERIC(8,2),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Location Updates ──────────────────────────────────────────────
CREATE TABLE location_updates (
  id              BIGSERIAL PRIMARY KEY,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  driver_id       UUID REFERENCES drivers(id),
  vehicle_id      UUID REFERENCES vehicles(id),
  route_id        UUID REFERENCES routes(id),
  lat             NUMERIC(10,7) NOT NULL,
  lng             NUMERIC(10,7) NOT NULL,
  accuracy_m      NUMERIC(6,2),
  speed_kmh       NUMERIC(6,2),
  heading_deg     NUMERIC(5,2),
  altitude_m      NUMERIC(8,2),
  battery_pct     INTEGER,
  signal_strength INTEGER,
  is_moving       BOOLEAN,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions
CREATE TABLE location_updates_2025_q4 PARTITION OF location_updates
  FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE location_updates_2026_q1 PARTITION OF location_updates
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE location_updates_2026_q2 PARTITION OF location_updates
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE location_updates_2026_q3 PARTITION OF location_updates
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

-- Latest position per driver (fast lookup)
CREATE TABLE driver_positions (
  driver_id    UUID REFERENCES drivers(id) ON DELETE CASCADE PRIMARY KEY,
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  lat          NUMERIC(10,7),
  lng          NUMERIC(10,7),
  speed_kmh    NUMERIC(6,2),
  heading_deg  NUMERIC(5,2),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Hazards ───────────────────────────────────────────────────────
CREATE TABLE hazards (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id           UUID REFERENCES companies(id) ON DELETE CASCADE,
  driver_id            UUID REFERENCES drivers(id),
  vehicle_id           UUID REFERENCES vehicles(id),
  type                 TEXT NOT NULL,
  severity             TEXT DEFAULT 'orange' CHECK (severity IN ('red', 'orange', 'yellow')),
  lat                  NUMERIC(10,7) NOT NULL,
  lng                  NUMERIC(10,7) NOT NULL,
  road_name            TEXT,
  description          TEXT,
  photos               TEXT[],
  voice_note_url       TEXT,
  video_url            TEXT,
  vehicle_type         TEXT,
  affected_types       TEXT[],
  verified             BOOLEAN DEFAULT FALSE,
  verified_by          UUID REFERENCES fleet_users(id),
  verified_at          TIMESTAMPTZ,
  resolved             BOOLEAN DEFAULT FALSE,
  resolved_by          UUID REFERENCES fleet_users(id),
  resolved_at          TIMESTAMPTZ,
  ai_risk_score        NUMERIC(5,2),
  ai_notes             TEXT,
  nearby_drivers_notified TEXT[],
  reported_at          TIMESTAMPTZ DEFAULT NOW(),
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── AI Requests & Audit ───────────────────────────────────────────
CREATE TABLE ai_requests (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id        UUID REFERENCES companies(id) ON DELETE CASCADE,
  request_type      TEXT NOT NULL,
  context_data      JSONB,
  prompt            TEXT,
  raw_response      TEXT,
  final_response    TEXT,
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending','approved','modified','flagged','blocked')),
  risk_score        NUMERIC(5,2),
  block_reason      TEXT,
  ai_provider       TEXT,
  tokens_used       INTEGER,
  latency_ms        INTEGER,
  audit_log         JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Compliance Alerts ─────────────────────────────────────────────
CREATE TABLE compliance_alerts (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  driver_id    UUID REFERENCES drivers(id),
  vehicle_id   UUID REFERENCES vehicles(id),
  type         TEXT NOT NULL,
  severity     TEXT CHECK (severity IN ('critical','warning','info')),
  message      TEXT NOT NULL,
  data         JSONB,
  resolved     BOOLEAN DEFAULT FALSE,
  resolved_by  UUID REFERENCES fleet_users(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Incidents ─────────────────────────────────────────────────────
CREATE TABLE incidents (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  driver_id     UUID REFERENCES drivers(id),
  vehicle_id    UUID REFERENCES vehicles(id),
  route_id      UUID REFERENCES routes(id),
  type          TEXT NOT NULL,
  description   TEXT,
  lat           NUMERIC(10,7),
  lng           NUMERIC(10,7),
  severity      TEXT CHECK (severity IN ('minor','moderate','severe','critical')),
  photos        TEXT[],
  documents     TEXT[],
  ai_analysis   TEXT,
  escalated     BOOLEAN DEFAULT FALSE,
  escalated_to  UUID REFERENCES fleet_users(id),
  status        TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  occurred_at   TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Messages ──────────────────────────────────────────────────────
CREATE TABLE messages (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  from_id     UUID REFERENCES fleet_users(id),
  to_id       UUID REFERENCES fleet_users(id),
  route_id    UUID REFERENCES routes(id),
  type        TEXT DEFAULT 'text' CHECK (type IN ('text','hazard','alert','system','emergency')),
  content     TEXT,
  media_url   TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  is_urgent   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Documents ─────────────────────────────────────────────────────
CREATE TABLE documents (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  type        TEXT NOT NULL,
  name        TEXT,
  url         TEXT NOT NULL,
  expires_at  DATE,
  is_verified BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES fleet_users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── AI Safety Rules ───────────────────────────────────────────────
CREATE TABLE ai_safety_rules (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  rule_type   TEXT,
  conditions  JSONB,
  action      TEXT CHECK (action IN ('block','flag','modify','warn')),
  is_active   BOOLEAN DEFAULT TRUE,
  created_by  UUID REFERENCES fleet_users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX idx_drivers_company ON drivers(company_id);
CREATE INDEX idx_vehicles_company ON vehicles(company_id);
CREATE INDEX idx_routes_company ON routes(company_id);
CREATE INDEX idx_routes_driver ON routes(driver_id);
CREATE INDEX idx_routes_status ON routes(status);
CREATE INDEX idx_hazards_company ON hazards(company_id);
CREATE INDEX idx_hazards_location ON hazards(lat, lng);
CREATE INDEX idx_hazards_type ON hazards(type);
CREATE INDEX idx_hazards_severity ON hazards(severity);
CREATE INDEX idx_hazards_resolved ON hazards(resolved);
CREATE INDEX idx_location_driver ON location_updates(driver_id);
CREATE INDEX idx_location_time ON location_updates(recorded_at DESC);
CREATE INDEX idx_compliance_company ON compliance_alerts(company_id);
CREATE INDEX idx_compliance_resolved ON compliance_alerts(resolved);
CREATE INDEX idx_messages_to ON messages(to_id);
CREATE INDEX idx_messages_from ON messages(from_id);
CREATE INDEX idx_ai_requests_company ON ai_requests(company_id);

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Users can only see their company's data
CREATE POLICY "company_isolation" ON fleet_users
  FOR ALL USING (company_id = (SELECT company_id FROM fleet_users WHERE auth_id = auth.uid() LIMIT 1));

CREATE POLICY "company_isolation" ON drivers
  FOR ALL USING (company_id = (SELECT company_id FROM fleet_users WHERE auth_id = auth.uid() LIMIT 1));

CREATE POLICY "company_isolation" ON routes
  FOR ALL USING (company_id = (SELECT company_id FROM fleet_users WHERE auth_id = auth.uid() LIMIT 1));

CREATE POLICY "company_isolation" ON hazards
  FOR ALL USING (company_id = (SELECT company_id FROM fleet_users WHERE auth_id = auth.uid() LIMIT 1));

-- Drivers can only see their own messages
CREATE POLICY "driver_messages" ON messages
  FOR SELECT USING (
    to_id = (SELECT id FROM fleet_users WHERE auth_id = auth.uid() LIMIT 1) OR
    from_id = (SELECT id FROM fleet_users WHERE auth_id = auth.uid() LIMIT 1)
  );

-- ── Realtime subscriptions ───────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE hazards;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE routes;
ALTER PUBLICATION supabase_realtime ADD TABLE compliance_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;

-- ── Updated_at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_drivers_updated BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_routes_updated BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
