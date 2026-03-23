"""Email bridge — parses inbound emails and routes them to portal comments.

Supports SendGrid Inbound Parse webhook format. Maps reply-to addresses
like reply+{slug}+{update_id}@{domain} back to the correct portal update.
"""

import logging
import re

logger = logging.getLogger("clay-webhook-os")


def parse_reply_address(to_address: str) -> tuple[str, str] | None:
    """Extract (slug, update_id) from a reply-to address.

    Expected format: reply+{slug}+{update_id}@domain
    Returns None if the address doesn't match the expected pattern.
    """
    # Handle "Name <email>" format
    match = re.search(r"<([^>]+)>", to_address)
    email = match.group(1) if match else to_address.strip()

    local = email.split("@")[0] if "@" in email else email
    parts = local.split("+")
    if len(parts) != 3 or parts[0] != "reply":
        return None

    slug = parts[1]
    update_id = parts[2]
    if not slug or not update_id:
        return None

    return slug, update_id


def strip_quoted_content(body: str) -> str:
    """Strip quoted reply content from an email body.

    Removes:
    - Lines starting with > (quoted text)
    - "On {date}, {name} wrote:" lines and everything after
    - Common email client signatures
    """
    lines = body.split("\n")
    clean_lines = []

    for line in lines:
        stripped = line.strip()

        # Stop at "On ... wrote:" patterns
        if re.match(r"^On .+ wrote:$", stripped):
            break

        # Stop at "---------- Forwarded message" patterns
        if stripped.startswith("---------- Forwarded"):
            break

        # Stop at Gmail's separator
        if stripped == "--":
            break

        # Skip quoted lines
        if stripped.startswith(">"):
            continue

        clean_lines.append(line)

    result = "\n".join(clean_lines).strip()
    return result


def extract_sender_name(from_field: str) -> str:
    """Extract a display name from a From header.

    Handles: "Jane Doe <jane@example.com>" -> "Jane Doe"
    Falls back to local part of email if no name.
    """
    match = re.match(r"^(.+?)\s*<", from_field)
    if match:
        name = match.group(1).strip().strip('"').strip("'")
        if name:
            return name

    # Fallback: use local part of email
    email_match = re.search(r"([^<\s]+)@", from_field)
    if email_match:
        return email_match.group(1)

    return "Email Reply"


def extract_sender_email(from_field: str) -> str:
    """Extract the email address from a From header."""
    match = re.search(r"<([^>]+)>", from_field)
    if match:
        return match.group(1).strip().lower()

    # Bare email
    email_match = re.search(r"[\w.+-]+@[\w.-]+", from_field)
    if email_match:
        return email_match.group(0).lower()

    return ""


def verify_sender(sender_email: str, slug: str, portal_store) -> bool:
    """Check if the sender is authorized to post to this portal.

    Currently checks against the portal's notification_emails list.
    """
    if not sender_email:
        return False

    meta = portal_store.get_meta(slug)
    allowed = [e.lower() for e in meta.get("notification_emails", [])]

    return sender_email.lower() in allowed
