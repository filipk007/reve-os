"use client";

import { motion } from "framer-motion";
import { Workflow } from "lucide-react";

export function FlowEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border-2 border-dashed border-clay-800 p-12 text-center"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Faded connector illustration */}
        <div className="flex flex-col items-center gap-1 opacity-30">
          <div className="h-10 w-48 rounded-lg border border-clay-700 bg-clay-900" />
          <div className="w-0.5 h-4 bg-clay-700" />
          <div className="h-3 w-3 rounded-full border border-clay-700" />
          <div className="w-0.5 h-4 bg-clay-700" />
          <div className="h-10 w-48 rounded-lg border border-clay-700 bg-clay-900" />
        </div>
        <div className="mt-2">
          <Workflow className="h-6 w-6 text-clay-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-clay-400">
            Start building your pipeline
          </p>
          <p className="text-xs text-clay-600 mt-1">
            Drag skills from the palette or use the dropdown below to add steps.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
