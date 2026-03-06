import type { JobStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  RotateCcw,
  Skull,
} from "lucide-react";

const CONFIG: Record<JobStatus, { style: string; icon: typeof Clock }> = {
  queued: {
    style: "bg-clay-700 text-clay-300 border-clay-600",
    icon: Clock,
  },
  processing: {
    style: "bg-kiln-mustard/15 text-kiln-mustard border-kiln-mustard/30",
    icon: Loader2,
  },
  completed: {
    style: "bg-kiln-teal/15 text-kiln-teal border-kiln-teal/30",
    icon: CheckCircle,
  },
  failed: {
    style: "bg-kiln-coral/15 text-kiln-coral border-kiln-coral/30",
    icon: XCircle,
  },
  retrying: {
    style: "bg-kiln-mustard/25 text-kiln-mustard border-kiln-mustard/50 font-semibold",
    icon: RotateCcw,
  },
  dead_letter: {
    style: "bg-kiln-coral/25 text-kiln-coral border-kiln-coral/50 font-semibold",
    icon: Skull,
  },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const config = CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={config.style}>
      <Icon className={`h-3 w-3 mr-1 ${status === "processing" ? "animate-spin" : ""}`} />
      {status === "dead_letter" ? "dead letter" : status}
    </Badge>
  );
}
