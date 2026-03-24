"use client";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { FunctionInput } from "@/lib/types";

interface QuickRunFormProps {
  functionInputs: FunctionInput[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
}

export function QuickRunForm({
  functionInputs,
  values,
  onChange,
  disabled,
}: QuickRunFormProps) {
  return (
    <div className="space-y-4">
      {functionInputs.map((inp) => (
        <div key={inp.name}>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-xs font-medium text-clay-200">
              {inp.name}
            </label>
            {inp.required && (
              <Badge
                variant="outline"
                className="text-[9px] border-kiln-teal/30 text-kiln-teal py-0 px-1"
              >
                required
              </Badge>
            )}
            <span className="text-[10px] text-clay-300 ml-auto">{inp.type}</span>
          </div>

          {inp.description && (
            <p className="text-[11px] text-clay-300 mb-1.5">{inp.description}</p>
          )}

          {inp.type === "boolean" ? (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={values[inp.name] === "true"}
                onCheckedChange={(checked) =>
                  onChange(inp.name, checked ? "true" : "false")
                }
                disabled={disabled}
                className="h-4 w-4"
              />
              <span className="text-xs text-clay-300">
                {values[inp.name] === "true" ? "Yes" : "No"}
              </span>
            </div>
          ) : (
            <Input
              type={inp.type === "number" ? "number" : inp.type === "email" ? "email" : inp.type === "url" ? "url" : "text"}
              value={values[inp.name] || ""}
              onChange={(e) => onChange(inp.name, e.target.value)}
              placeholder={`Enter ${inp.name}...`}
              disabled={disabled}
              className="bg-clay-900 border-clay-600 text-clay-100 placeholder:text-clay-300"
            />
          )}
        </div>
      ))}
    </div>
  );
}
