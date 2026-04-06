import type { WorkflowTemplate } from "@/lib/types";

/**
 * Pre-built workflow templates for sales reps.
 * Each template creates a table with the right columns pre-configured.
 */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "find-emails",
    name: "Find Emails",
    description:
      "Upload a list of prospects with their name and company domain. We'll find their verified work email addresses.",
    category: "enrichment",
    icon: "Mail",
    expected_inputs: [
      { name: "first_name", description: "Contact's first name" },
      { name: "last_name", description: "Contact's last name" },
      { name: "domain", description: "Company website domain" },
    ],
    produced_outputs: [
      { name: "email", description: "Verified work email" },
      { name: "confidence", description: "Email confidence score" },
    ],
    columns: [
      {
        name: "Email",
        column_type: "enrichment",
        tool: "findymail",
        params: {
          first_name: "{{first_name}}",
          last_name: "{{last_name}}",
          domain: "{{domain}}",
        },
        output_key: "email",
      },
      {
        name: "Confidence",
        column_type: "enrichment",
        tool: "findymail",
        params: {
          first_name: "{{first_name}}",
          last_name: "{{last_name}}",
          domain: "{{domain}}",
        },
        output_key: "confidence",
      },
    ],
  },
  {
    id: "research-companies",
    name: "Research Companies",
    description:
      "Get a quick overview of any company — what they do, employee count, industry, and recent news.",
    category: "research",
    icon: "Building2",
    expected_inputs: [
      { name: "domain", description: "Company website domain" },
    ],
    produced_outputs: [
      { name: "summary", description: "What the company does" },
      { name: "employee_count", description: "Estimated employees" },
      { name: "industry", description: "Primary industry" },
    ],
    columns: [
      {
        name: "Company Summary",
        column_type: "ai",
        ai_prompt:
          "Research the company at {{domain}}. Return a JSON object with: summary (2-3 sentences about what they do), employee_count (estimated number or range), industry (primary industry), and headquarters (city, state if available).",
        ai_model: "sonnet",
      },
    ],
  },
  {
    id: "score-leads",
    name: "Score & Qualify Leads",
    description:
      "Score your prospect list based on company size, industry fit, and other signals. Get a fit score and reasoning.",
    category: "scoring",
    icon: "Target",
    expected_inputs: [
      { name: "company_name", description: "Company name" },
      { name: "domain", description: "Company website" },
      { name: "industry", description: "Company industry (optional)" },
    ],
    produced_outputs: [
      { name: "fit_score", description: "0-100 fit score" },
      { name: "reasoning", description: "Why this score" },
      { name: "tier", description: "A, B, or C tier" },
    ],
    columns: [
      {
        name: "Qualification",
        column_type: "ai",
        ai_prompt:
          'Analyze {{company_name}} ({{domain}}) as a potential prospect. Return a JSON object with: fit_score (0-100), tier ("A", "B", or "C"), reasoning (1-2 sentences explaining the score), and signals (array of positive/negative indicators you found).',
        ai_model: "sonnet",
      },
    ],
  },
  {
    id: "enrich-contacts",
    name: "Enrich Contacts",
    description:
      "Enrich your contact list with job titles, LinkedIn profiles, phone numbers, and company details.",
    category: "enrichment",
    icon: "Users",
    expected_inputs: [
      { name: "first_name", description: "Contact's first name" },
      { name: "last_name", description: "Contact's last name" },
      { name: "company_name", description: "Company name" },
    ],
    produced_outputs: [
      { name: "title", description: "Current job title" },
      { name: "linkedin_url", description: "LinkedIn profile URL" },
      { name: "phone", description: "Direct phone number" },
    ],
    columns: [
      {
        name: "Contact Info",
        column_type: "ai",
        ai_prompt:
          "Look up {{first_name}} {{last_name}} at {{company_name}}. Return a JSON object with: title (current job title), linkedin_url (LinkedIn profile URL if findable), location (city, state), and seniority_level (C-Suite, VP, Director, Manager, Individual Contributor).",
        ai_model: "sonnet",
      },
    ],
  },
];
