"""Thin async research fetchers — no class, no cache, no dedup.

Called directly from webhook/job_queue when a research skill is invoked.
Uses Parallel.ai for web search and content extraction,
Sumble for structured company/people enrichment.
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
