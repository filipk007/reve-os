"""Shared entity identification utilities.

Used by MemoryStore (file-based entity memory) and EnrichmentCache
(Supabase-backed enrichment cache) to extract consistent entity keys
from webhook request data.
"""

import re


def slugify(value: str) -> str:
    """Convert a string to a URL-safe slug."""
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def extract_entity_key(data: dict) -> tuple[str, str] | None:
    """Extract the primary entity identifier from request data.

    Returns (entity_type, entity_id) or None if no entity can be identified.

    Priority:
    1. Company domain (company_domain, domain, website) → ("company", slugified-domain)
    2. Contact email (email, contact_email, person_email) → ("contact", slugified-email)
    3. Company name (company_name, company) → ("company", slugified-name)
    """
    # Company-level keys (prefer domain)
    for key in ("company_domain", "domain", "website"):
        val = data.get(key)
        if val and isinstance(val, str):
            # Normalize domain: strip protocol, www, trailing slash
            domain = re.sub(r"^https?://", "", val).strip("/")
            domain = re.sub(r"^www\.", "", domain)
            return ("company", slugify(domain))

    # Contact-level keys
    for key in ("email", "contact_email", "person_email"):
        val = data.get(key)
        if val and isinstance(val, str):
            return ("contact", slugify(val))

    # Company name as fallback
    for key in ("company_name", "company"):
        val = data.get(key)
        if val and isinstance(val, str):
            return ("company", slugify(val))

    return None
