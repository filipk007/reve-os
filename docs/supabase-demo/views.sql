-- ============================================================
-- CRM DATA LAKE DEMO — Views
-- Pre-built views for smooth demo flow
-- ============================================================

-- PIPELINE RISK VIEW
-- Shows every active deal with threading status and activity freshness
CREATE VIEW demo_pipeline_risk AS
SELECT
  d.deal_name,
  d.amount,
  d.stage,
  d.owner_name as rep,
  d.company_name,
  count(DISTINCT c.email) as contacts_engaged,
  max(calls.call_date) as last_call_date,
  now() - max(calls.call_date) as days_since_call,
  now() - d.updated_at as days_since_update,
  CASE
    WHEN count(DISTINCT c.email) <= 1 AND d.amount >= 50000 THEN 'Single-threaded'
    ELSE 'Multi-threaded'
  END as threading_status,
  CASE
    WHEN now() - d.updated_at > interval '14 days' THEN 'Stale'
    WHEN now() - d.updated_at > interval '7 days' THEN 'Cooling'
    ELSE 'Active'
  END as activity_status
FROM demo_deals d
LEFT JOIN demo_contacts c ON c.company_domain = d.company_domain
LEFT JOIN demo_calls calls ON calls.company_domain = d.company_domain
WHERE d.stage NOT IN ('closed_won', 'closed_lost')
GROUP BY d.deal_name, d.amount, d.stage, d.owner_name, d.company_name, d.updated_at
ORDER BY d.amount DESC;

-- OBJECTION ANALYSIS VIEW
-- Which objections come up most and which kill deals
CREATE VIEW demo_objection_analysis AS
SELECT
  objection,
  count(*) as times_raised,
  count(DISTINCT calls.company_domain) as deals_affected,
  count(CASE WHEN d.stage = 'closed_lost' THEN 1 END) as led_to_loss,
  count(CASE WHEN d.stage NOT IN ('closed_lost', 'closed_won') THEN 1 END) as still_active,
  count(CASE WHEN d.stage = 'closed_won' THEN 1 END) as overcame_and_won,
  CASE
    WHEN count(CASE WHEN d.stage IN ('closed_won', 'closed_lost') THEN 1 END) > 0
    THEN round(100.0 * count(CASE WHEN d.stage = 'closed_lost' THEN 1 END) /
         count(CASE WHEN d.stage IN ('closed_won', 'closed_lost') THEN 1 END))
    ELSE 0
  END as loss_rate_pct
FROM demo_call_extractions ce
JOIN demo_calls calls ON calls.id = ce.call_id
LEFT JOIN demo_deals d ON d.company_domain = calls.company_domain
CROSS JOIN LATERAL unnest(ce.objections) as objection
GROUP BY objection
ORDER BY times_raised DESC;

-- REP PERFORMANCE VIEW
-- Talk ratios, call counts, sentiment breakdown per rep
CREATE VIEW demo_rep_performance AS
SELECT
  calls.rep_name,
  count(*) as total_calls,
  count(DISTINCT calls.company_domain) as accounts_worked,
  round(avg(ce.talk_ratio), 2) as avg_talk_ratio,
  round(avg(CASE WHEN ce.call_type = 'discovery' THEN ce.talk_ratio END), 2) as discovery_talk_ratio,
  count(CASE WHEN ce.sentiment = 'positive' THEN 1 END) as positive_calls,
  count(CASE WHEN ce.sentiment = 'negative' THEN 1 END) as negative_calls,
  count(CASE WHEN ce.call_type = 'discovery' THEN 1 END) as discovery_calls,
  count(CASE WHEN ce.call_type = 'demo' THEN 1 END) as demo_calls,
  count(CASE WHEN ce.call_type = 'negotiation' THEN 1 END) as negotiation_calls
FROM demo_calls calls
JOIN demo_call_extractions ce ON ce.call_id = calls.id
GROUP BY calls.rep_name
ORDER BY total_calls DESC;

-- COMPETITIVE LANDSCAPE VIEW
-- Which competitors show up and how we perform against them
CREATE VIEW demo_competitive_landscape AS
SELECT
  competitor,
  count(*) as total_mentions,
  count(DISTINCT calls.company_domain) as deals_involved,
  count(CASE WHEN d.stage = 'closed_won' THEN 1 END) as won_against,
  count(CASE WHEN d.stage = 'closed_lost' THEN 1 END) as lost_to,
  count(CASE WHEN d.stage NOT IN ('closed_won', 'closed_lost') THEN 1 END) as still_competing,
  array_agg(DISTINCT calls.company_name) as companies
FROM demo_call_extractions ce
JOIN demo_calls calls ON calls.id = ce.call_id
LEFT JOIN demo_deals d ON d.company_domain = calls.company_domain
CROSS JOIN LATERAL unnest(ce.competitors) as competitor
GROUP BY competitor
ORDER BY total_mentions DESC;
