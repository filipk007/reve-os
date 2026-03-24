"use client";

import { useState } from "react";
import { Copy, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface EmailOutputProps {
  result: Record<string, unknown>;
}

export function EmailOutput({ result }: EmailOutputProps) {
  const [copied, setCopied] = useState(false);

  const subject = String(result.subject || "");
  const body = String(result.body || result.email_body || "");
  const tone = result.tone as string | undefined;
  const cta = result.cta as string | undefined;
  const confidence =
    typeof result.confidence_score === "number"
      ? result.confidence_score
      : null;

  const handleCopy = () => {
    const text = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Email copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Subject line */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="h-4 w-4 text-kiln-teal shrink-0" />
          <h4 className="text-sm font-semibold text-clay-100 truncate">
            {subject}
          </h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-clay-300 hover:text-clay-100 shrink-0"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Badges */}
      {(tone || confidence !== null) && (
        <div className="flex items-center gap-2">
          {tone && (
            <Badge
              variant="outline"
              className="text-[10px] border-clay-600 text-clay-300"
            >
              {tone}
            </Badge>
          )}
          {confidence !== null && (
            <Badge
              variant="outline"
              className={`text-[10px] border-clay-600 ${
                confidence >= 0.7
                  ? "text-emerald-400 border-emerald-400/30"
                  : confidence >= 0.4
                    ? "text-amber-400 border-amber-400/30"
                    : "text-red-400 border-red-400/30"
              }`}
            >
              {Math.round(confidence * 100)}% confidence
            </Badge>
          )}
        </div>
      )}

      {/* Email body */}
      <div className="rounded-lg bg-clay-900/50 border border-clay-700 p-4">
        <div className="text-sm text-clay-100 whitespace-pre-wrap leading-relaxed">
          {body}
        </div>
      </div>

      {/* CTA highlight */}
      {cta && (
        <div className="text-xs text-clay-300">
          <span className="font-medium text-clay-200">CTA:</span> {cta}
        </div>
      )}

      {/* Extra fields */}
      <ExtraFields
        result={result}
        exclude={[
          "subject",
          "body",
          "email_body",
          "tone",
          "cta",
          "confidence_score",
        ]}
      />
    </div>
  );
}

function ExtraFields({
  result,
  exclude,
}: {
  result: Record<string, unknown>;
  exclude: string[];
}) {
  const excludeSet = new Set(exclude.map((k) => k.toLowerCase()));
  const extra = Object.entries(result).filter(
    ([k]) => !excludeSet.has(k.toLowerCase()) && !k.startsWith("_")
  );

  if (extra.length === 0) return null;

  return (
    <div className="border-t border-clay-700 pt-3 space-y-2">
      {extra.map(([key, value]) => (
        <div key={key} className="flex items-start gap-2 text-xs">
          <span className="font-mono text-clay-300 shrink-0">{key}:</span>
          <span className="text-clay-200 break-words">
            {typeof value === "object"
              ? JSON.stringify(value)
              : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
