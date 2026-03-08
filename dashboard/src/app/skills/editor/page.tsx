"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SkillIDE } from "@/components/editor/skill-ide";

function EditorInner() {
  const searchParams = useSearchParams();
  const skill = searchParams.get("skill") || undefined;
  const variant = searchParams.get("variant") || undefined;

  return (
    <SkillIDE initialSkill={skill} initialVariant={variant} />
  );
}

export default function SkillEditorPage() {
  return (
    <div className="h-screen flex flex-col">
      <Suspense>
        <EditorInner />
      </Suspense>
    </div>
  );
}
