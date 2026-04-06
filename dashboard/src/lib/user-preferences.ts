/**
 * Centralized user preference helpers.
 * All keys prefixed with `kiln_` to match existing convention.
 */

export type UserPersona = "rep" | "power";

const KEYS = {
  persona: "kiln_user_persona",
  onboardingCompleted: "kiln_onboarding_completed",
  onboardingChecklist: "kiln_onboarding_checklist",
} as const;

// ── Persona ──────────────────────────────────────────────

export function getPersona(): UserPersona {
  if (typeof window === "undefined") return "rep";
  return (localStorage.getItem(KEYS.persona) as UserPersona) || "rep";
}

export function setPersona(persona: UserPersona) {
  localStorage.setItem(KEYS.persona, persona);
  // Dispatch storage event so other components can react
  window.dispatchEvent(new Event("kiln-preferences-changed"));
}

// ── Onboarding ───────────────────────────────────────────

export function isOnboardingCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEYS.onboardingCompleted) === "true";
}

export function completeOnboarding() {
  localStorage.setItem(KEYS.onboardingCompleted, "true");
  window.dispatchEvent(new Event("kiln-preferences-changed"));
}

// ── Onboarding Checklist ─────────────────────────────────

export interface OnboardingChecklist {
  uploadedCsv: boolean;
  ranEnrichment: boolean;
  exportedResults: boolean;
}

const DEFAULT_CHECKLIST: OnboardingChecklist = {
  uploadedCsv: false,
  ranEnrichment: false,
  exportedResults: false,
};

export function getChecklist(): OnboardingChecklist {
  if (typeof window === "undefined") return DEFAULT_CHECKLIST;
  try {
    const raw = localStorage.getItem(KEYS.onboardingChecklist);
    return raw ? { ...DEFAULT_CHECKLIST, ...JSON.parse(raw) } : DEFAULT_CHECKLIST;
  } catch {
    return DEFAULT_CHECKLIST;
  }
}

export function updateChecklist(updates: Partial<OnboardingChecklist>) {
  const current = getChecklist();
  localStorage.setItem(
    KEYS.onboardingChecklist,
    JSON.stringify({ ...current, ...updates })
  );
  window.dispatchEvent(new Event("kiln-preferences-changed"));
}

// ── Hook helper ──────────────────────────────────────────

/**
 * Subscribe to preference changes. Returns unsubscribe function.
 * Usage: useEffect(() => onPreferencesChanged(callback), [])
 */
export function onPreferencesChanged(callback: () => void): () => void {
  window.addEventListener("kiln-preferences-changed", callback);
  return () => window.removeEventListener("kiln-preferences-changed", callback);
}
