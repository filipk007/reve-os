"use client";

import { useState, useEffect } from "react";
import type { ClientProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";

export interface ClientEditorPayload {
  slug: string;
  name: string;
  who_they_are: string;
  what_they_sell: string;
  value_proposition: string;
  tone_preferences: string;
  social_proof: string;
  market_feedback: string;
  target_icp: string;
  competitive_landscape: string;
}

interface ClientEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientProfile | null; // null = create mode
  saving: boolean;
  onSave: (data: ClientEditorPayload) => void;
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1">
      <label className="text-xs font-medium text-clay-200 block">{children}</label>
      {hint && <p className="text-[10px] text-clay-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="bg-clay-800 border-clay-700 text-clay-100 placeholder:text-clay-300"
      />
    </div>
  );
}

function Section({
  label,
  hint,
  value,
  onChange,
  rows,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows || 5}
        className="resize-y bg-clay-800 border-clay-700 text-clay-100"
      />
    </div>
  );
}

export function ClientEditor({
  open,
  onOpenChange,
  client,
  saving,
  onSave,
}: ClientEditorProps) {
  const isEdit = client !== null;
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [whoTheyAre, setWhoTheyAre] = useState("");
  const [whatTheySell, setWhatTheySell] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [tonePreferences, setTonePreferences] = useState("");
  const [socialProof, setSocialProof] = useState("");
  const [marketFeedback, setMarketFeedback] = useState("");
  const [targetIcp, setTargetIcp] = useState("");
  const [competitiveLandscape, setCompetitiveLandscape] = useState("");

  useEffect(() => {
    if (client) {
      setSlug(client.slug);
      setName(client.name);
      setWhoTheyAre(client.who_they_are || "");
      setWhatTheySell(client.what_they_sell || "");
      setValueProposition(client.value_proposition || "");
      setTonePreferences(client.tone_preferences || "");
      setSocialProof(client.social_proof || "");
      setMarketFeedback(client.market_feedback || "");
      setTargetIcp(client.target_icp || "");
      setCompetitiveLandscape(client.competitive_landscape || "");
    } else {
      setSlug("");
      setName("");
      setWhoTheyAre("");
      setWhatTheySell("");
      setValueProposition("");
      setTonePreferences("");
      setSocialProof("");
      setMarketFeedback("");
      setTargetIcp("");
      setCompetitiveLandscape("");
    }
  }, [client, open]);

  const autoSlug = (n: string) =>
    n
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      slug: slug || autoSlug(name),
      name,
      who_they_are: whoTheyAre,
      what_they_sell: whatTheySell,
      value_proposition: valueProposition,
      tone_preferences: tonePreferences,
      social_proof: socialProof,
      market_feedback: marketFeedback,
      target_icp: targetIcp,
      competitive_landscape: competitiveLandscape,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl bg-clay-950 border-clay-500 overflow-y-auto"
      >
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="text-clay-100">
            {isEdit ? `Edit ${client.name}` : "New Client Profile"}
          </SheetTitle>
          <SheetDescription className="text-clay-200">
            {isEdit
              ? "Update the client profile. Loads into email-gen prompts per the v2 schema."
              : "Create a new client profile. Fields map directly to ## sections in profile.md."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
          {/* Identity */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-clay-300 border-b border-clay-500 pb-1">
              Identity
            </h4>
            <Field
              label="Client Name"
              value={name}
              onChange={(v) => {
                setName(v);
                if (!isEdit) setSlug(autoSlug(v));
              }}
              placeholder="e.g. UBX — HubSpot Partner (Europe)"
            />
            <Field
              label="Slug"
              value={slug}
              onChange={setSlug}
              disabled={isEdit}
              placeholder="auto-generated-from-name"
            />
          </div>

          {/* Loaded for email-gen */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-clay-300 border-b border-clay-500 pb-1">
              Loaded for email-gen
            </h4>
            <Section
              label="Who They Are"
              hint="Company identity, founding premise. Not about the offer — about the entity behind it."
              value={whoTheyAre}
              onChange={setWhoTheyAre}
              rows={5}
            />
            <Section
              label="What They Sell"
              hint="Concrete offer, not buzzwords. Who the customer is and what outcome they pay for."
              value={whatTheySell}
              onChange={setWhatTheySell}
              rows={5}
            />
            <Section
              label="Value Proposition"
              hint="3-5 crisp bullets. Specific outcomes or mechanisms, not features."
              value={valueProposition}
              onChange={setValueProposition}
              rows={6}
            />
            <Section
              label="Tone Preferences"
              hint="Voice, formality, region, sentence length, forbidden phrases, required phrasing."
              value={tonePreferences}
              onChange={setTonePreferences}
              rows={8}
            />
            <Section
              label="Social Proof"
              hint="Proof point library. Angle skills cite these by customer name."
              value={socialProof}
              onChange={setSocialProof}
              rows={6}
            />
            <Section
              label="Market Feedback"
              hint="Append-only dated log. Auto-written by the transcript-feedback-loop skill — edit with care."
              value={marketFeedback}
              onChange={setMarketFeedback}
              rows={10}
            />
          </div>

          {/* Strategy-skill-only */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-clay-300 border-b border-clay-500 pb-1">
              Strategy skills only
              <span className="text-[10px] font-normal text-clay-400 ml-2">
                (not loaded for email-gen)
              </span>
            </h4>
            <Section
              label="Target ICP"
              hint="Firmographics, titles, trigger events. Used by account-researcher, meeting-prep, qualifier."
              value={targetIcp}
              onChange={setTargetIcp}
              rows={8}
            />
            <Section
              label="Competitive Landscape"
              hint="Direct and adjacent competitors, saturated claims, client's differentiators."
              value={competitiveLandscape}
              onChange={setCompetitiveLandscape}
              rows={8}
            />
          </div>

          <Button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light font-semibold"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Client"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
