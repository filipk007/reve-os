"""Parity tests for the Context Rack system.

These tests verify that the rack pipeline produces IDENTICAL output to the
existing build_prompt() function. This is the safety net — if parity holds,
we can confidently swap callers to the rack without changing behavior.

Test strategy:
    1. Build prompt via the old path (load_context_files + build_prompt)
    2. Build prompt via the new path (rack.assemble)
    3. Assert they're identical

We test with real skills from the skills/ directory to catch any
formatting differences in production-like conditions.
"""

import pytest

from app.core.context_assembler import build_prompt
from app.core.context_providers import build_default_slots
from app.core.context_rack import ContextRack, RackContext
from app.core.skill_loader import list_skills, load_context_files, load_skill, load_skill_config

# ── Helpers ──────────────────────────────────────────────────────────────────


def _build_old_prompt(skill_name: str, data: dict, output_format: str = "json") -> str:
    """Build prompt using the OLD path (current production behavior)."""
    skill_content = load_skill(skill_name)
    assert skill_content is not None, f"Skill '{skill_name}' not found"

    context_files = load_context_files(skill_content, data, skill_name=skill_name)

    return build_prompt(
        skill_content,
        context_files,
        data,
        instructions=None,
        output_format=output_format,
    )


async def _build_rack_prompt(skill_name: str, data: dict, output_format: str = "json") -> str:
    """Build prompt using the NEW rack path."""
    skill_content = load_skill(skill_name)
    assert skill_content is not None, f"Skill '{skill_name}' not found"

    skill_config = load_skill_config(skill_name)
    rack = ContextRack(slots=build_default_slots())

    ctx = RackContext.from_request(
        skill_name=skill_name,
        skill_content=skill_content,
        skill_config=skill_config,
        data=data,
        output_format=output_format,
    )

    prompt, manifest = await rack.assemble(ctx)
    return prompt


# ── Test Data ────────────────────────────────────────────────────────────────


SAMPLE_DATA_MINIMAL = {
    "company_name": "Acme Corp",
    "first_name": "Jane",
    "last_name": "Doe",
    "title": "VP of Sales",
    "email": "jane@acme.com",
}

SAMPLE_DATA_RICH = {
    "company_name": "TechStartup Inc",
    "first_name": "John",
    "last_name": "Smith",
    "title": "CTO",
    "email": "john@techstartup.io",
    "company_domain": "techstartup.io",
    "industry": "saas",
    "client_slug": "twelve-labs",
    "signal_type": "funding",
    "linkedin_url": "https://linkedin.com/in/johnsmith",
    "company_description": "AI-powered video understanding platform",
}


# ── Parity Tests ─────────────────────────────────────────────────────────────


class TestRackParity:
    """Verify rack produces identical output to build_prompt for every skill."""

    def _get_available_skills(self) -> list[str]:
        """Return skills that exist and are loadable."""
        all_skills = list_skills()
        loadable = []
        for name in all_skills:
            if load_skill(name) is not None:
                loadable.append(name)
        return loadable

    @pytest.mark.asyncio
    async def test_parity_minimal_data(self):
        """Rack output == build_prompt output with minimal data (no client, no signals)."""
        skills = self._get_available_skills()
        assert len(skills) > 0, "No skills found in skills/ directory"

        failures = []
        for skill_name in skills:
            old = _build_old_prompt(skill_name, SAMPLE_DATA_MINIMAL)
            new = await _build_rack_prompt(skill_name, SAMPLE_DATA_MINIMAL)

            if old != new:
                # Find first difference for debugging
                for i, (a, b) in enumerate(zip(old, new)):
                    if a != b:
                        failures.append(
                            f"{skill_name}: first diff at char {i} "
                            f"(old='{old[max(0,i-20):i+20]}' vs new='{new[max(0,i-20):i+20]}')"
                        )
                        break
                else:
                    # One is longer than the other
                    failures.append(
                        f"{skill_name}: length mismatch (old={len(old)}, new={len(new)})"
                    )

        assert not failures, "Parity failures:\n" + "\n".join(failures)

    @pytest.mark.asyncio
    async def test_parity_rich_data(self):
        """Rack output == build_prompt output with rich data (client, signals, industry)."""
        skills = self._get_available_skills()

        failures = []
        for skill_name in skills:
            old = _build_old_prompt(skill_name, SAMPLE_DATA_RICH)
            new = await _build_rack_prompt(skill_name, SAMPLE_DATA_RICH)

            if old != new:
                for i, (a, b) in enumerate(zip(old, new)):
                    if a != b:
                        failures.append(
                            f"{skill_name}: first diff at char {i} "
                            f"(old='{old[max(0,i-20):i+20]}' vs new='{new[max(0,i-20):i+20]}')"
                        )
                        break
                else:
                    failures.append(
                        f"{skill_name}: length mismatch (old={len(old)}, new={len(new)})"
                    )

        assert not failures, "Parity failures:\n" + "\n".join(failures)

    @pytest.mark.asyncio
    async def test_parity_markdown_format(self):
        """Rack output matches for non-JSON output formats."""
        skills = self._get_available_skills()
        if not skills:
            pytest.skip("No skills available")

        skill_name = skills[0]
        for fmt in ["markdown", "html", "text"]:
            old = _build_old_prompt(skill_name, SAMPLE_DATA_MINIMAL, output_format=fmt)
            new = await _build_rack_prompt(skill_name, SAMPLE_DATA_MINIMAL, output_format=fmt)
            assert old == new, f"{skill_name} format={fmt}: outputs differ"

    @pytest.mark.asyncio
    async def test_parity_with_instructions(self):
        """Rack handles campaign instructions identically."""
        skills = self._get_available_skills()
        if not skills:
            pytest.skip("No skills available")

        skill_name = skills[0]
        instructions = "Focus on ROI messaging. Keep emails under 100 words."

        # Old path
        skill_content = load_skill(skill_name)
        context_files = load_context_files(skill_content, SAMPLE_DATA_MINIMAL, skill_name=skill_name)
        old = build_prompt(
            skill_content, context_files, SAMPLE_DATA_MINIMAL,
            instructions=instructions,
        )

        # New path
        skill_config = load_skill_config(skill_name)
        rack = ContextRack(slots=build_default_slots())
        ctx = RackContext.from_request(
            skill_name=skill_name,
            skill_content=skill_content,
            skill_config=skill_config,
            data=SAMPLE_DATA_MINIMAL,
            instructions=instructions,
        )
        new, _ = await rack.assemble(ctx)

        assert old == new, f"{skill_name} with instructions: outputs differ"


# ── Rack-Specific Tests ─────────────────────────────────────────────────────


class TestRackBehavior:
    """Test rack-specific features (slot ordering, disabling, manifest)."""

    @pytest.mark.asyncio
    async def test_slot_ordering(self):
        """Slots execute in order of their `order` attribute."""
        slots = build_default_slots()
        orders = [s.order for s in slots]
        assert orders == sorted(orders), "Slots should be in ascending order"

    @pytest.mark.asyncio
    async def test_manifest_structure(self):
        """Rack returns a manifest describing what each slot produced."""
        skills = list_skills()
        if not skills:
            pytest.skip("No skills available")

        skill_name = skills[0]
        skill_content = load_skill(skill_name)
        skill_config = load_skill_config(skill_name)

        rack = ContextRack(slots=build_default_slots())
        ctx = RackContext.from_request(
            skill_name=skill_name,
            skill_content=skill_content,
            skill_config=skill_config,
            data=SAMPLE_DATA_MINIMAL,
        )

        _, manifest = await rack.assemble(ctx)

        assert len(manifest) > 0, "Manifest should have entries"
        for entry in manifest:
            assert "slot" in entry
            assert "items" in entry
            assert "tokens" in entry
            assert isinstance(entry["items"], int)
            assert isinstance(entry["tokens"], int)

    @pytest.mark.asyncio
    async def test_disabled_slot_skipped(self):
        """Disabled slots don't contribute to the prompt."""
        skills = list_skills()
        if not skills:
            pytest.skip("No skills available")

        skill_name = skills[0]
        skill_content = load_skill(skill_name)
        skill_config = load_skill_config(skill_name)

        # Build with all slots enabled
        rack_full = ContextRack(slots=build_default_slots())
        ctx_full = RackContext.from_request(
            skill_name=skill_name,
            skill_content=skill_content,
            skill_config=skill_config,
            data=SAMPLE_DATA_MINIMAL,
        )
        prompt_full, _ = await rack_full.assemble(ctx_full)

        # Build with reminder slot disabled
        slots = build_default_slots()
        for s in slots:
            if s.name == "reminder":
                s.enabled = False
        rack_partial = ContextRack(slots=slots)
        ctx_partial = RackContext.from_request(
            skill_name=skill_name,
            skill_content=skill_content,
            skill_config=skill_config,
            data=SAMPLE_DATA_MINIMAL,
        )
        prompt_partial, _ = await rack_partial.assemble(ctx_partial)

        # Full prompt should be longer (it has the reminder)
        assert len(prompt_full) > len(prompt_partial)
        assert "Return ONLY the JSON" in prompt_full
        assert "Return ONLY the JSON" not in prompt_partial

    @pytest.mark.asyncio
    async def test_deduplication(self):
        """Same context file isn't loaded twice across slots."""
        skills = list_skills()
        if not skills:
            pytest.skip("No skills available")

        skill_name = skills[0]
        skill_content = load_skill(skill_name)
        skill_config = load_skill_config(skill_name)

        rack = ContextRack(slots=build_default_slots())
        ctx = RackContext.from_request(
            skill_name=skill_name,
            skill_content=skill_content,
            skill_config=skill_config,
            data=SAMPLE_DATA_MINIMAL,
        )
        await rack.assemble(ctx)

        # Check no duplicate paths in pieces (excluding empty-path inline pieces)
        paths = [p.path for p in ctx.pieces if p.path]
        assert len(paths) == len(set(paths)), f"Duplicate paths found: {paths}"
