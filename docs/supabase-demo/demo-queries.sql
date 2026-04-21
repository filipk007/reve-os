-- ============================================================
-- CRM DATA LAKE DEMO — Query Playbook
-- Run these in order during a client demo
-- Each query reveals a different insight HubSpot can't provide
-- ============================================================


-- ============================================================
-- QUERY 1: Pipeline Risk
-- "Where's our pipeline at risk right now?"
-- WOW: $300K deal is stale, ESPN is single-threaded + stale
-- ============================================================
SELECT deal_name, amount, stage, rep, company_name,
       contacts_engaged, threading_status, activity_status
FROM demo_pipeline_risk;


-- ============================================================
-- QUERY 2: Objection Kill Rate
-- "Which objections are killing our deals?"
-- WOW: Legal review = 100% loss rate when it reaches a decision
-- ============================================================
SELECT * FROM demo_objection_analysis;


-- ============================================================
-- QUERY 3: Rep Performance
-- "How do our reps compare on discovery calls?"
-- WOW: Lower talk ratio correlates with more positive outcomes
-- ============================================================
SELECT * FROM demo_rep_performance;


-- ============================================================
-- QUERY 4: Competitive Landscape
-- "Who are we competing against and how do we perform?"
-- WOW: AWS Rekognition is in 4 conversations across 2 deals
-- ============================================================
SELECT * FROM demo_competitive_landscape;


-- ============================================================
-- QUERY 5: Parent-Child Detection
-- "Which contacts are misrouted in HubSpot?"
-- WOW: Amanda Rodriguez and Carlos Reyes both @nfl.com
--      but work for Chiefs and Cowboys respectively
-- ============================================================
SELECT
  c.first_name || ' ' || c.last_name as contact,
  c.email,
  c.title,
  c.company_name as hubspot_says,
  ch.child_name as actually_works_at,
  d.deal_name as should_be_on_deal
FROM demo_contacts c
JOIN demo_company_hierarchy ch ON ch.parent_domain = split_part(c.email, '@', 2)
LEFT JOIN demo_deals d ON d.company_domain = ch.child_domain
WHERE c.title ILIKE '%' || ch.child_name || '%'
  OR c.title ILIKE '%' || split_part(ch.child_name, ' ', 1) || '%';


-- ============================================================
-- QUERY 6: Stale Big Deals
-- "What big deals are going dark?"
-- WOW: $420K+ in pipeline hasn't been touched in 10+ days
-- ============================================================
SELECT
  d.deal_name,
  d.amount,
  d.stage,
  d.owner_name as rep,
  d.company_name,
  now() - d.updated_at as days_stale,
  count(DISTINCT c.email) as contacts_on_deal
FROM demo_deals d
LEFT JOIN demo_contacts c ON c.company_domain = d.company_domain
WHERE d.stage NOT IN ('closed_won', 'closed_lost')
  AND d.updated_at < now() - interval '10 days'
  AND d.amount >= 50000
GROUP BY d.deal_name, d.amount, d.stage, d.owner_name, d.company_name, d.updated_at
ORDER BY d.amount DESC;


-- ============================================================
-- QUERY 7: Enrichment Gaps
-- "Which contacts on active deals are missing data?"
-- WOW: CTO at Peloton has no phone, Findymail couldn't find it
-- ============================================================
SELECT
  c.first_name || ' ' || c.last_name as contact,
  c.email,
  c.company_name,
  CASE WHEN c.phone IS NULL THEN 'MISSING' ELSE 'has phone' END as phone_status,
  eh.provider as enriched_by,
  eh.fields_missing,
  eh.enriched_at
FROM demo_contacts c
LEFT JOIN demo_enrichment_history eh ON eh.entity_id = c.email AND eh.entity_type = 'contact'
WHERE c.phone IS NULL
ORDER BY c.company_name;


-- ============================================================
-- QUERY 8: Pipeline Summary
-- "What does our pipeline look like by stage?"
-- ============================================================
SELECT
  stage,
  count(*) as deals,
  sum(amount) as total_value,
  round(avg(amount)) as avg_deal_size
FROM demo_deals
WHERE stage NOT IN ('closed_won', 'closed_lost')
GROUP BY stage
ORDER BY total_value DESC;


-- ============================================================
-- QUERY 9: Key Quotes from Calls (the qualitative gold)
-- "What are prospects actually saying?"
-- ============================================================
SELECT
  calls.company_name,
  ce.call_type,
  ce.sentiment,
  unnest(ce.key_quotes) as prospect_quote
FROM demo_call_extractions ce
JOIN demo_calls calls ON calls.id = ce.call_id
ORDER BY calls.call_date DESC;


-- ============================================================
-- QUERY 10: Full Deal Intelligence (the everything query)
-- Joins CRM + calls + extractions + enrichment in one view
-- THIS is the query that's impossible in HubSpot
-- ============================================================
SELECT
  d.deal_name,
  d.amount,
  d.stage,
  d.owner_name as rep,
  co.name as company,
  co.industry,
  count(DISTINCT c.email) as contacts,
  count(DISTINCT calls.id) as total_calls,
  max(calls.call_date) as last_call,
  array_agg(DISTINCT unnest_obj) FILTER (WHERE unnest_obj IS NOT NULL) as all_objections,
  array_agg(DISTINCT unnest_comp) FILTER (WHERE unnest_comp IS NOT NULL) as all_competitors,
  bool_or(eh.entity_id IS NOT NULL) as company_enriched
FROM demo_deals d
LEFT JOIN demo_companies co ON co.domain = d.company_domain
LEFT JOIN demo_contacts c ON c.company_domain = d.company_domain
LEFT JOIN demo_calls calls ON calls.company_domain = d.company_domain
LEFT JOIN demo_call_extractions ce ON ce.call_id = calls.id
LEFT JOIN LATERAL unnest(ce.objections) as unnest_obj ON true
LEFT JOIN LATERAL unnest(ce.competitors) as unnest_comp ON true
LEFT JOIN demo_enrichment_history eh ON eh.entity_id = d.company_domain AND eh.entity_type = 'company'
WHERE d.stage NOT IN ('closed_won', 'closed_lost')
GROUP BY d.deal_name, d.amount, d.stage, d.owner_name, co.name, co.industry
ORDER BY d.amount DESC;
