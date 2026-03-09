// ─── Email Lab Templates & Types ───

export interface EmailLabTemplate {
  id: string;
  name: string;
  description: string;
  signalType: string;
  data: Record<string, unknown>;
}

export type EmailLabSkill = "email-gen" | "follow-up" | "sequence-writer";

export const EMAIL_LAB_SKILLS: { value: EmailLabSkill; label: string }[] = [
  { value: "email-gen", label: "Email Gen" },
  { value: "follow-up", label: "Follow-Up" },
  { value: "sequence-writer", label: "Sequence Writer" },
];

export interface EmailLabRun {
  id: string;
  templateId: string | null;
  skill: EmailLabSkill;
  model: string;
  variantId: string | null;
  data: Record<string, unknown>;
  instructions: string;
  result: Record<string, unknown>;
  durationMs: number;
  timestamp: number;
}

export const EMAIL_LAB_TEMPLATES: EmailLabTemplate[] = [
  {
    id: "company-expansion",
    name: "Company Expansion",
    description: "SaaS co opening new office, hiring signal",
    signalType: "expansion",
    data: {
      first_name: "Marcus",
      last_name: "Rivera",
      title: "VP of Engineering",
      company_name: "Datadog",
      industry: "Observability / SaaS",
      signal_type: "expansion",
      signal_detail:
        "Opening new Austin office, hiring 80+ engineers. Posted 12 video-related ML roles in the last 30 days.",
      client_slug: "twelve-labs",
    },
  },
  {
    id: "funding-round",
    name: "Funding Round",
    description: "Series C startup in growth phase",
    signalType: "funding",
    data: {
      first_name: "Priya",
      last_name: "Sharma",
      title: "CTO",
      company_name: "Runway",
      industry: "AI Video / Creative Tools",
      signal_type: "funding",
      signal_detail:
        "Series C — $141M led by Spark Capital. Valued at $1.5B. Expanding enterprise video generation platform.",
      client_slug: "twelve-labs",
    },
  },
  {
    id: "tech-stack-change",
    name: "Tech Stack Change",
    description: "Company migrating infrastructure",
    signalType: "technology",
    data: {
      first_name: "Jordan",
      last_name: "Lee",
      title: "Head of Platform",
      company_name: "Loom",
      industry: "Video Communication / SaaS",
      signal_type: "technology",
      signal_detail:
        "Migrating from legacy transcription pipeline to AI-native architecture. Job posts mention multimodal search capabilities.",
      client_slug: "twelve-labs",
    },
  },
  {
    id: "leadership-change",
    name: "Leadership Change",
    description: "New VP Sales joining from competitor",
    signalType: "leadership",
    data: {
      first_name: "Diana",
      last_name: "Chen",
      title: "VP of Sales",
      company_name: "Synthesia",
      industry: "AI Video / Enterprise",
      signal_type: "leadership",
      signal_detail:
        "Joined from Clarifai as new VP Sales. Previously led enterprise deals for computer vision products. Known advocate of API-first platforms.",
      client_slug: "twelve-labs",
    },
  },
  {
    id: "competitor-displacement",
    name: "Competitor Displacement",
    description: "Using competitor product, G2 complaints",
    signalType: "competitive",
    data: {
      first_name: "Alex",
      last_name: "Petrov",
      title: "Director of Product",
      company_name: "Vimeo",
      industry: "Video Platform / SaaS",
      signal_type: "competitive",
      signal_detail:
        'Currently using Google Video AI. Recent G2 reviews from their team mention "accuracy issues with niche content" and "slow indexing at scale." Contract renewal in Q3.',
      client_slug: "twelve-labs",
    },
  },
];

export const STORAGE_KEY = "email-lab-history";
export const CUSTOM_TEMPLATES_KEY = "email-lab-custom-templates";
export const MAX_HISTORY = 25;

// ─── Instruction Presets (Feature 2) ───

export interface InstructionPreset {
  label: string;
  text: string;
}

export const INSTRUCTION_PRESETS: InstructionPreset[] = [
  { label: "Shorter", text: "Keep under 80 words. Be concise and punchy." },
  { label: "More Casual", text: "Use a casual, conversational tone. No corporate speak." },
  { label: "Question Opener", text: "Open with a thought-provoking question related to their signal." },
  { label: "Add Urgency", text: "Add a time-sensitive element or urgency to the CTA." },
  { label: "Pain-Focused", text: "Lead with the pain point their signal reveals. Agitate before offering the solution." },
  { label: "Social Proof", text: "Include a brief social proof reference (similar companies, results achieved)." },
];

// ─── Custom Templates (Feature 4) ───

export interface CustomEmailLabTemplate extends EmailLabTemplate {
  isCustom: true;
  createdAt: number;
}
