"""Thin async research fetchers — no class, no cache, no dedup.

Called directly from webhook/job_queue when a research skill is invoked.
Uses Parallel.ai for web search and content extraction,
Sumble for structured company/people enrichment,
DeepLine for email waterfall and firmographic enrichment.
"""

import asyncio
import logging

import httpx

logger = logging.getLogger("clay-webhook-os")

# Broad default technologies for org enrichment when no specific tech_stack is provided.
_DEFAULT_TECHNOLOGIES = [
    "python", "java", "go", "ruby", "typescript", "react", "node.js",
    "kubernetes", "docker", "aws", "gcp", "azure", "terraform",
    "postgresql", "mongodb", "redis", "elasticsearch",
    "kafka", "spark", "snowflake", "databricks",
]


def _format_search_results(results) -> str:
    """Format Parallel search results into readable text with citations."""
    parts = []
    for r in results:
        title = getattr(r, "title", "")
        url = getattr(r, "url", "")
        excerpts = getattr(r, "excerpts", [])
        excerpt_text = " ".join(excerpts) if excerpts else ""
        if title:
            parts.append(f"**{title}** ({url})\n{excerpt_text}")
    return "\n\n".join(parts)


def _format_extract_content(results) -> str:
    """Extract full content from Parallel extract results."""
    for r in results:
        content = getattr(r, "full_content", None)
        if content:
            return content
    return ""


async def fetch_company_intel(domain: str, name: str, parallel_key: str) -> dict:
    """Parallel Search (news) + Extract (website) in parallel.

    Returns {"website_overview": "...", "recent_news": "..."}.
    """
    from parallel import AsyncParallel

    website_overview = ""
    recent_news = ""

    try:
        client = AsyncParallel(api_key=parallel_key)

        extract_coro = client.beta.extract(
            urls=[f"https://{domain}"],
            objective=(
                f"What does {name} do, their main products/services, "
                "key value propositions, and target customers"
            ),
            full_content=True,
            excerpts=False,
        )
        search_coro = client.beta.search(
            objective=(
                f'Recent news about "{name}" ({domain}): funding, acquisitions, '
                "partnerships, product launches, leadership changes in the last 90 days."
            ),
            search_queries=[f"{name} news", f"{name} funding announcement"],
            max_results=3,
            max_chars_per_result=500,
        )

        extract_result, search_result = await asyncio.gather(
            extract_coro, search_coro, return_exceptions=True,
        )

        if not isinstance(extract_result, Exception) and extract_result:
            website_overview = _format_extract_content(extract_result.results)[:2000]
        elif isinstance(extract_result, Exception):
            logger.warning("[research] Website extract failed for %s: %s", name, extract_result)

        if not isinstance(search_result, Exception) and search_result:
            recent_news = _format_search_results(search_result.results)[:2000]
        elif isinstance(search_result, Exception):
            logger.warning("[research] News search failed for %s: %s", name, search_result)

    except Exception as e:
        logger.warning("[research] fetch_company_intel failed for %s: %s", name, e)

    return {"website_overview": website_overview, "recent_news": recent_news}


async def fetch_company_profile(
    domain: str,
    data: dict,
    sumble_key: str,
    sumble_url: str = "https://api.sumble.com/v3",
    sumble_timeout: int = 30,
) -> dict:
    """Sumble organizations/enrich + people/find in parallel.

    Returns {"tech_stack": [...], "key_people": [...]}.
    """
    tech_stack_raw = data.get("tech_stack", [])
    if isinstance(tech_stack_raw, str):
        tech_stack_raw = [t.strip() for t in tech_stack_raw.split(",") if t.strip()]
    technologies = tech_stack_raw or _DEFAULT_TECHNOLOGIES

    job_functions = data.get("job_functions", ["Engineering", "Executive"])
    if isinstance(job_functions, str):
        job_functions = [f.strip() for f in job_functions.split(",") if f.strip()]
    job_levels = data.get("job_levels", ["VP", "Director", "C-Level"])
    if isinstance(job_levels, str):
        job_levels = [lv.strip() for lv in job_levels.split(",") if lv.strip()]

    enrich_payload = {
        "organization": {"domain": domain},
        "filters": {"technologies": technologies},
    }
    people_payload = {
        "organization": {"domain": domain},
        "filters": {"job_functions": job_functions, "job_levels": job_levels},
        "limit": data.get("people_limit", 10),
    }

    tech_stack: list = []
    key_people: list = []

    try:
        async with httpx.AsyncClient(
            base_url=sumble_url.rstrip("/"),
            headers={
                "Authorization": f"Bearer {sumble_key}",
                "Content-Type": "application/json",
                "User-Agent": "clay-webhook-os/3.0",
            },
            timeout=sumble_timeout,
        ) as client:
            enrich_coro = client.post("/organizations/enrich", json=enrich_payload)
            people_coro = client.post("/people/find", json=people_payload)
            enrich_resp, people_resp = await asyncio.gather(
                enrich_coro, people_coro, return_exceptions=True,
            )

        # Parse enrich response
        if not isinstance(enrich_resp, Exception) and enrich_resp.status_code < 400:
            body = enrich_resp.json()
            techs = body.get("technologies", [])
            for t in techs:
                if isinstance(t, dict):
                    tech_stack.append(t.get("name", str(t)))
                else:
                    tech_stack.append(str(t))
        elif isinstance(enrich_resp, Exception):
            logger.warning("[research] Sumble enrich failed for %s: %s", domain, enrich_resp)
        else:
            logger.warning("[research] Sumble enrich %d for %s", enrich_resp.status_code, domain)

        # Parse people response
        if not isinstance(people_resp, Exception) and people_resp.status_code < 400:
            body = people_resp.json()
            for p in body.get("people", []):
                key_people.append({
                    "name": p.get("name", ""),
                    "title": p.get("job_title", ""),
                    "level": p.get("job_level", ""),
                    "location": p.get("location", ""),
                })
        elif isinstance(people_resp, Exception):
            logger.warning("[research] Sumble people failed for %s: %s", domain, people_resp)
        else:
            logger.warning("[research] Sumble people %d for %s", people_resp.status_code, domain)

    except Exception as e:
        logger.warning("[research] fetch_company_profile failed for %s: %s", domain, e)

    return {"tech_stack": tech_stack, "key_people": key_people}


async def fetch_competitor_intel(competitor_domain: str, parallel_key: str) -> dict:
    """Parallel Extract on competitor site.

    Returns {"positioning": "...", "differentiators": "..."}.
    """
    positioning = ""
    differentiators = ""

    try:
        from parallel import AsyncParallel

        client = AsyncParallel(api_key=parallel_key)
        result = await client.beta.extract(
            urls=[f"https://{competitor_domain}"],
            objective=(
                f"Extract {competitor_domain}'s main products, pricing model, key "
                "differentiators, target customers, and any competitive claims "
                "against alternatives."
            ),
            full_content=True,
            excerpts=False,
        )

        if result and result.results:
            content = _format_extract_content(result.results)[:2000]
            positioning = content
            differentiators = content

    except Exception as e:
        logger.warning("[research] fetch_competitor_intel failed for %s: %s", competitor_domain, e)

    return {"positioning": positioning, "differentiators": differentiators}


# ---------------------------------------------------------------------------
# DeepLine enrichment (email waterfall + firmographic)
# ---------------------------------------------------------------------------


async def _deepline_execute(
    operation: str,
    payload: dict,
    deepline_key: str,
    deepline_url: str = "https://code.deepline.com",
    timeout: int = 60,
) -> dict:
    """Execute a DeepLine operation via HTTP API.

    Single endpoint: POST /api/v2/integrations/execute
    """
    async with httpx.AsyncClient(
        base_url=deepline_url.rstrip("/"),
        headers={
            "Authorization": f"Bearer {deepline_key}",
            "Content-Type": "application/json",
            "User-Agent": "clay-webhook-os/3.0",
        },
        timeout=timeout,
    ) as client:
        resp = await client.post(
            "/api/v2/integrations/execute",
            json={
                "provider": "deepline_native",
                "operation": operation,
                "payload": payload,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_deepline_email(
    first_name: str,
    last_name: str,
    domain: str,
    deepline_key: str,
    deepline_url: str = "https://code.deepline.com",
    deepline_timeout: int = 60,
) -> dict:
    """DeepLine email waterfall: leadmagic -> dropleads -> hunter -> native -> PDL.

    Returns {"email": "...", "email_status": "...", "provider": "..."}.
    """
    email = ""
    email_status = ""
    provider = ""

    try:
        result = await _deepline_execute(
            operation="cost_aware_first_name_and_domain_to_email_waterfall",
            payload={
                "first_name": first_name,
                "last_name": last_name,
                "domain": domain,
            },
            deepline_key=deepline_key,
            deepline_url=deepline_url,
            timeout=deepline_timeout,
        )
        data = result.get("data", {})
        # Extract email — providers return it at different paths
        email = data.get("email", "")
        if not email:
            emails_list = data.get("emails", [])
            if isinstance(emails_list, list) and emails_list:
                first_entry = emails_list[0]
                email = first_entry.get("address", "") if isinstance(first_entry, dict) else str(first_entry)
        email_status = data.get("email_status", data.get("status", ""))
        provider = result.get("meta", {}).get("provider", "deepline")

    except Exception as e:
        logger.warning("[deepline] Email waterfall failed for %s@%s: %s", first_name, domain, e)

    return {"email": email, "email_status": email_status, "provider": provider}


async def fetch_deepline_company(
    domain: str,
    deepline_key: str,
    deepline_url: str = "https://code.deepline.com",
    deepline_timeout: int = 30,
) -> dict:
    """DeepLine company enrichment: firmographic data (size, revenue, tech stack).

    Returns {"company_size": "...", "revenue_range": "...", "tech_stack": [...], "industry": "..."}.
    """
    company_size = ""
    revenue_range = ""
    tech_stack: list = []
    industry = ""

    try:
        result = await _deepline_execute(
            operation="deepline_native_enrich_company",
            payload={"domain": domain},
            deepline_key=deepline_key,
            deepline_url=deepline_url,
            timeout=deepline_timeout,
        )
        data = result.get("data", {})
        # Company data may be nested under output.company or flat in data
        company = data.get("output", {}).get("company", data)

        company_size = str(company.get("employee_count", company.get("headcount", "")))
        revenue_range = company.get("revenue_range", company.get("revenue", ""))
        industry = company.get("industry", "")

        raw_tech = company.get("technologies", company.get("tech_stack", []))
        if isinstance(raw_tech, list):
            tech_stack = [
                t.get("name", str(t)) if isinstance(t, dict) else str(t)
                for t in raw_tech
            ]

    except Exception as e:
        logger.warning("[deepline] Company enrichment failed for %s: %s", domain, e)

    return {
        "company_size": company_size,
        "revenue_range": revenue_range,
        "tech_stack": tech_stack,
        "industry": industry,
    }
