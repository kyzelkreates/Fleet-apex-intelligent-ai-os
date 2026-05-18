-- Fleet Apex — Compliance Automation Functions
-- Runs scheduled checks via pg_cron

-- ── Auto-expire old hazards ────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_expire_hazards()
RETURNS void AS $$
BEGIN
  UPDATE hazards
  SET resolved = true, resolved_at = NOW()
  WHERE resolved = false
    AND reported_at < NOW() - INTERVAL '24 hours'
    AND type NOT IN ('road_closure', 'low_bridge', 'weight_restriction', 'tight_road_parked');
END;
$$ LANGUAGE plpgsql;

-- Run every hour
SELECT cron.schedule('expire-hazards', '0 * * * *', 'SELECT auto_expire_hazards()');

-- ── Check driver hours ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_driver_hours()
RETURNS void AS $$
DECLARE
  driver_record RECORD;
BEGIN
  FOR driver_record IN
    SELECT id, company_id, hours_today
    FROM drivers
    WHERE status IN ('active', 'on_break')
      AND hours_today >= 4.5
  LOOP
    -- Check if break alert already sent
    IF NOT EXISTS (
      SELECT 1 FROM compliance_alerts
      WHERE driver_id = driver_record.id
        AND type = 'break_due'
        AND created_at > NOW() - INTERVAL '30 minutes'
    ) THEN
      INSERT INTO compliance_alerts (company_id, driver_id, type, severity, message)
      VALUES (
        driver_record.company_id,
        driver_record.id,
        'break_due',
        CASE WHEN driver_record.hours_today >= 9 THEN 'critical' ELSE 'warning' END,
        'Driver has been active for ' || driver_record.hours_today || ' hours. Break required.'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('check-driver-hours', '*/15 * * * *', 'SELECT check_driver_hours()');

-- ── Check document expiries ────────────────────────────────────
CREATE OR REPLACE FUNCTION check_document_expiries()
RETURNS void AS $$
BEGIN
  -- Driver licence expiry (30 days warning)
  INSERT INTO compliance_alerts (company_id, driver_id, type, severity, message)
  SELECT DISTINCT
    d.company_id, d.id,
    'license_expiry',
    CASE WHEN d.license_expiry <= CURRENT_DATE + 7 THEN 'critical' ELSE 'warning' END,
    'Driver licence expires ' || to_char(d.license_expiry, 'DD Mon YYYY')
  FROM drivers d
  WHERE d.license_expiry <= CURRENT_DATE + 30
    AND d.license_expiry >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM compliance_alerts ca
      WHERE ca.driver_id = d.id AND ca.type = 'license_expiry'
        AND ca.created_at > NOW() - INTERVAL '24 hours'
    );

  -- Vehicle MOT expiry
  INSERT INTO compliance_alerts (company_id, vehicle_id, type, severity, message)
  SELECT DISTINCT
    v.company_id, v.id,
    'mot_expiry',
    CASE WHEN v.mot_expiry <= CURRENT_DATE + 7 THEN 'critical' ELSE 'warning' END,
    v.registration || ' MOT expires ' || to_char(v.mot_expiry, 'DD Mon YYYY')
  FROM vehicles v
  WHERE v.mot_expiry <= CURRENT_DATE + 30
    AND v.mot_expiry >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM compliance_alerts ca
      WHERE ca.vehicle_id = v.id AND ca.type = 'mot_expiry'
        AND ca.created_at > NOW() - INTERVAL '24 hours'
    );

  -- Vehicle insurance expiry
  INSERT INTO compliance_alerts (company_id, vehicle_id, type, severity, message)
  SELECT DISTINCT
    v.company_id, v.id,
    'insurance_expiry',
    'critical',
    v.registration || ' Insurance expires ' || to_char(v.insurance_expiry, 'DD Mon YYYY')
  FROM vehicles v
  WHERE v.insurance_expiry <= CURRENT_DATE + 14
    AND v.insurance_expiry >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM compliance_alerts ca
      WHERE ca.vehicle_id = v.id AND ca.type = 'insurance_expiry'
        AND ca.created_at > NOW() - INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql;

-- Run daily at 7am UTC
SELECT cron.schedule('check-expiries', '0 7 * * *', 'SELECT check_document_expiries()');

-- ── Safety score calculation ───────────────────────────────────
CREATE OR REPLACE FUNCTION recalculate_safety_scores()
RETURNS void AS $$
BEGIN
  UPDATE drivers d
  SET safety_score = (
    100
    -- Deduct for speeding alerts (last 30 days)
    - LEAST(30, (SELECT COUNT(*) * 5 FROM compliance_alerts WHERE driver_id = d.id AND type = 'speeding' AND created_at > NOW() - INTERVAL '30 days'))
    -- Deduct for hazards reported by driver (negative — it's good to report)
    + LEAST(10, (SELECT COUNT(*) * 2 FROM hazards WHERE driver_id = d.id AND reported_at > NOW() - INTERVAL '30 days'))
    -- Deduct for incidents
    - LEAST(40, (SELECT COUNT(*) * 10 FROM incidents WHERE driver_id = d.id AND occurred_at > NOW() - INTERVAL '90 days'))
    -- Deduct for hours violations
    - LEAST(20, (SELECT COUNT(*) * 5 FROM compliance_alerts WHERE driver_id = d.id AND type IN ('break_violation','driver_fatigue') AND created_at > NOW() - INTERVAL '30 days'))
  )
  WHERE status != 'suspended';

  -- Clamp between 0 and 100
  UPDATE drivers SET safety_score = GREATEST(0, LEAST(100, safety_score));
END;
$$ LANGUAGE plpgsql;

-- Run daily at midnight
SELECT cron.schedule('safety-scores', '0 0 * * *', 'SELECT recalculate_safety_scores()');
