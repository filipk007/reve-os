"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export function FlowConnector({
  onInsert,
  index,
}: {
  onInsert: (atIndex: number) => void;
  index: number;
}) {
  return (
    <div className="relative flex justify-center py-1 group">
      {/* Vertical line */}
      <motion.div
        className="w-0.5 h-8 bg-clay-700 group-hover:bg-kiln-teal/50 transition-colors"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.2 }}
      />
      {/* Insert button */}
      <motion.button
        onClick={() => onInsert(index)}
        className="absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-clay-800 border border-clay-700 flex items-center justify-center text-clay-200 hover:bg-kiln-teal hover:text-clay-950 hover:border-kiln-teal opacity-0 group-hover:opacity-100 transition-all duration-150 z-10"
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="h-3 w-3" />
      </motion.button>
    </div>
  );
}
