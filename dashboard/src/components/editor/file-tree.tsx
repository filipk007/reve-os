"use client";

import { useState, useEffect } from "react";
import type { VariantDef } from "@/lib/types";
import { fetchSkills, fetchVariants, forkVariant } from "@/lib/api";
import { ChevronRight, ChevronDown, FileText, FolderOpen, Folder, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SkillNode {
  name: string;
  variants: VariantDef[];
  expanded: boolean;
  loading: boolean;
}

export function FileTree({
  onOpenVariant,
  activeTabId,
}: {
  onOpenVariant: (skill: string, variantId: string, label: string) => void;
  activeTabId: string | null;
}) {
  const [skills, setSkills] = useState<SkillNode[]>([]);

  useEffect(() => {
    fetchSkills()
      .then((res) =>
        setSkills(
          res.skills.map((s) => ({
            name: s,
            variants: [],
            expanded: false,
            loading: false,
          }))
        )
      )
      .catch(() => toast.error("Failed to load skills"));
  }, []);

  const toggleSkill = async (index: number) => {
    setSkills((prev) => {
      const next = [...prev];
      const node = { ...next[index] };
      node.expanded = !node.expanded;
      next[index] = node;
      return next;
    });

    const skill = skills[index];
    if (!skill.expanded && skill.variants.length === 0) {
      setSkills((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], loading: true };
        return next;
      });
      try {
        const res = await fetchVariants(skill.name);
        setSkills((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            variants: res.variants,
            loading: false,
            expanded: true,
          };
          return next;
        });
      } catch {
        setSkills((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], loading: false };
          return next;
        });
      }
    }
  };

  const handleFork = async (skillName: string, index: number) => {
    try {
      await forkVariant(skillName);
      toast.success("Variant forked");
      // Refresh variants
      const res = await fetchVariants(skillName);
      setSkills((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], variants: res.variants };
        return next;
      });
    } catch (e) {
      toast.error("Fork failed", { description: (e as Error).message });
    }
  };

  return (
    <div className="h-full overflow-y-auto py-2">
      <div className="px-3 mb-2">
        <p className="text-[10px] text-clay-600 uppercase tracking-wider font-medium">
          Skills
        </p>
      </div>
      {skills.map((skill, i) => (
        <div key={skill.name}>
          <button
            onClick={() => toggleSkill(i)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-clay-400 hover:text-clay-200 hover:bg-clay-800/50 transition-colors"
          >
            {skill.expanded ? (
              <>
                <ChevronDown className="h-3 w-3 shrink-0 text-clay-600" />
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-kiln-teal/70" />
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3 shrink-0 text-clay-600" />
                <Folder className="h-3.5 w-3.5 shrink-0 text-clay-500" />
              </>
            )}
            <span className="truncate">{skill.name}</span>
          </button>

          {skill.expanded && (
            <div className="ml-3">
              {/* Default variant */}
              <button
                onClick={() =>
                  onOpenVariant(skill.name, "default", "default")
                }
                className={`w-full flex items-center gap-1.5 px-3 py-1 text-xs transition-colors ${
                  activeTabId === `${skill.name}/default`
                    ? "text-kiln-teal bg-kiln-teal/5"
                    : "text-clay-500 hover:text-clay-300 hover:bg-clay-800/30"
                }`}
              >
                <FileText className="h-3 w-3 shrink-0" />
                <span>default</span>
              </button>

              {skill.loading && (
                <p className="px-3 py-1 text-[10px] text-clay-600">Loading...</p>
              )}

              {skill.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() =>
                    onOpenVariant(skill.name, v.id, v.label)
                  }
                  className={`w-full flex items-center gap-1.5 px-3 py-1 text-xs transition-colors ${
                    activeTabId === `${skill.name}/${v.id}`
                      ? "text-kiln-teal bg-kiln-teal/5"
                      : "text-clay-500 hover:text-clay-300 hover:bg-clay-800/30"
                  }`}
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{v.label}</span>
                </button>
              ))}

              {/* Fork button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFork(skill.name, i)}
                className="w-full justify-start px-3 py-1 h-auto text-[10px] text-clay-600 hover:text-kiln-teal"
              >
                <Copy className="h-2.5 w-2.5 mr-1" />
                Fork current
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
