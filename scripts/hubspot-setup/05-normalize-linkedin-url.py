#!/usr/bin/env python3
"""
05-normalize-linkedin-url.py
Pressure Test Item #3 — LinkedIn URL Normalization

Reusable normalization function for LinkedIn Company URLs.
Ensures consistent format across Clay and HubSpot to prevent
silent lookup failures from URL format mismatches.

Usage (standalone — normalize a CSV):
  python3 scripts/hubspot-setup/05-normalize-linkedin-url.py \
    --input scripts/hubspot-setup/output/child-companies.csv \
    --column linkedin_company_url

Usage (as importable module):
  from scripts.hubspot_setup.normalize import normalize_linkedin_url
  clean = normalize_linkedin_url("https://www.linkedin.com/company/nfl/about")
  # → "linkedin.com/company/nfl"

Normalization rules (from pressure-test.md §3):
  1. Lowercase everything
  2. Strip protocol (http/https)
  3. Strip www.
  4. Strip trailing slash
  5. Strip path segments after company slug (/about, /jobs, /posts, etc.)
  6. Flag numeric IDs (can't auto-resolve — store for manual mapping)
  7. Trim whitespace
"""

import csv
import re
import sys
import argparse
from urllib.parse import urlparse


# Known LinkedIn sub-paths that appear after the company slug
_LINKEDIN_SUB_PATHS = {
    "about", "jobs", "posts", "people", "insights", "life",
    "events", "videos", "mycompany", "admin",
}


def normalize_linkedin_url(url: str) -> str:
    """
    Normalize a LinkedIn company URL to canonical form.

    Returns:
        Normalized URL in format: linkedin.com/company/{slug}
        Empty string if input is empty or not a valid LinkedIn company URL.
    """
    if not url or not isinstance(url, str):
        return ""

    url = url.strip().lower()

    # Must contain linkedin.com/company/ to be valid
    if "linkedin.com/company/" not in url:
        return ""

    # Parse — add scheme if missing so urlparse works
    if not url.startswith("http"):
        url = "https://" + url

    parsed = urlparse(url)

    # Extract path segments after /company/
    path = parsed.path.strip("/")
    parts = path.split("/")

    # Find the slug — it's the segment right after "company"
    try:
        company_idx = parts.index("company")
    except ValueError:
        return ""

    if company_idx + 1 >= len(parts):
        return ""  # URL ends at /company/ with no slug

    slug = parts[company_idx + 1]

    if not slug:
        return ""

    # Build canonical form: linkedin.com/company/{slug}
    return f"linkedin.com/company/{slug}"


def is_numeric_id(url: str) -> bool:
    """Check if a normalized LinkedIn URL uses a numeric ID instead of a slug."""
    normalized = normalize_linkedin_url(url)
    if not normalized:
        return False
    slug = normalized.split("/")[-1]
    return slug.isdigit()


def normalize_csv(input_path: str, column: str, output_path: str | None = None):
    """
    Read a CSV, normalize the specified LinkedIn URL column, write output.
    Adds a `linkedin_url_normalized` column and a `linkedin_numeric_id` flag column.
    """
    if output_path is None:
        base = input_path.rsplit(".", 1)[0]
        output_path = f"{base}-normalized.csv"

    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if column not in reader.fieldnames:
            print(f"ERROR: Column '{column}' not found in CSV.")
            print(f"       Available columns: {', '.join(reader.fieldnames)}")
            sys.exit(1)

        rows = list(reader)

    # Add normalized columns
    output_fields = list(rows[0].keys()) if rows else []
    if "linkedin_url_normalized" not in output_fields:
        output_fields.append("linkedin_url_normalized")
    if "linkedin_numeric_id" not in output_fields:
        output_fields.append("linkedin_numeric_id")

    stats = {"total": 0, "normalized": 0, "empty": 0, "numeric": 0, "changed": 0}

    for row in rows:
        stats["total"] += 1
        original = row.get(column, "")
        normalized = normalize_linkedin_url(original)

        row["linkedin_url_normalized"] = normalized
        row["linkedin_numeric_id"] = "yes" if is_numeric_id(original) else ""

        if not normalized:
            stats["empty"] += 1
        else:
            stats["normalized"] += 1
            if is_numeric_id(original):
                stats["numeric"] += 1
            if normalized != original.strip().lower().rstrip("/"):
                stats["changed"] += 1

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=output_fields)
        writer.writeheader()
        writer.writerows(rows)

    print()
    print("=" * 60)
    print("  LinkedIn URL Normalization Complete")
    print(f"  Total rows:       {stats['total']}")
    print(f"  Normalized:       {stats['normalized']}")
    print(f"  Empty/invalid:    {stats['empty']}")
    print(f"  Numeric IDs:      {stats['numeric']} (need manual slug mapping)")
    print(f"  Changed by norm:  {stats['changed']}")
    print(f"  Output:           {output_path}")
    print("=" * 60)
    print()

    if stats["numeric"] > 0:
        print("  WARNING: Numeric LinkedIn IDs found. These may not match")
        print("  slug-based URLs in HubSpot. Resolve manually or store both")
        print("  formats in the Clay lookup table.")
        print()

    if stats["empty"] > 0:
        print(f"  ACTION: {stats['empty']} rows have no valid LinkedIn URL.")
        print("  These companies need Clay enrichment (Task 4.2b) or manual lookup.")
        print()


# ---- Self-test ----
def _self_test():
    """Verify normalization rules against known inputs."""
    cases = [
        ("https://www.linkedin.com/company/nfl/", "linkedin.com/company/nfl"),
        ("https://linkedin.com/company/nfl", "linkedin.com/company/nfl"),
        ("http://www.linkedin.com/company/nfl", "linkedin.com/company/nfl"),
        ("https://www.linkedin.com/company/nfl/about", "linkedin.com/company/nfl"),
        ("https://www.linkedin.com/company/12345/", "linkedin.com/company/12345"),
        ("https://www.linkedin.com/company/nfl-football", "linkedin.com/company/nfl-football"),
        ("HTTPS://WWW.LINKEDIN.COM/COMPANY/NFL/", "linkedin.com/company/nfl"),
        ("linkedin.com/company/nfl", "linkedin.com/company/nfl"),
        ("www.linkedin.com/company/nfl/jobs", "linkedin.com/company/nfl"),
        ("https://www.linkedin.com/company/nfl/posts?page=1", "linkedin.com/company/nfl"),
        ("", ""),
        ("not-a-url", ""),
        ("https://linkedin.com/in/johndoe", ""),  # personal profile, not company
        ("https://www.linkedin.com/company/", ""),  # no slug
    ]
    passed = 0
    failed = 0
    for input_url, expected in cases:
        result = normalize_linkedin_url(input_url)
        if result == expected:
            passed += 1
        else:
            failed += 1
            print(f"  FAIL: normalize({input_url!r})")
            print(f"        expected: {expected!r}")
            print(f"        got:      {result!r}")

    print(f"\n  Self-test: {passed}/{passed + failed} passed")
    if failed:
        sys.exit(1)
    print("  All normalization rules verified.\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Normalize LinkedIn company URLs in a CSV")
    parser.add_argument("--input", help="Path to input CSV file")
    parser.add_argument("--column", default="linkedin_company_url", help="Column name containing LinkedIn URLs")
    parser.add_argument("--output", help="Path to output CSV (default: input-normalized.csv)")
    parser.add_argument("--self-test", action="store_true", help="Run self-test against known inputs")
    args = parser.parse_args()

    if args.self_test:
        _self_test()
    elif args.input:
        normalize_csv(args.input, args.column, args.output)
    else:
        print("Usage:")
        print("  python3 05-normalize-linkedin-url.py --self-test")
        print("  python3 05-normalize-linkedin-url.py --input data.csv --column linkedin_company_url")
        sys.exit(1)
