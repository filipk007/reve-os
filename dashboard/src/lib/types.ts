export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "retrying"
  | "dead_letter";

export interface Job {
  id: string;
  skill: string;
  row_id: string | null;
  status: JobStatus;
  duration_ms: number;
  error: string | null;
  result: Record<string, unknown> | null;
  created_at: number;
  completed_at: number | null;
  retry_count?: number;
  priority?: "high" | "normal" | "low";
}

export interface JobListItem {
  id: string;
  skill: string;
  row_id: string | null;
  status: JobStatus;
  duration_ms: number;
  created_at: number;
  retry_count?: number;
  priority?: "high" | "normal" | "low";
}

export interface Stats {
  total_processed: number;
  total_completed: number;
  total_failed: number;
  total_retrying: number;
  total_dead_letter: number;
  active_workers: number;
  queue_depth: number;
  avg_duration_ms: number;
  success_rate: number;
  cache_entries: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  jobs_by_priority: { high: number; normal: number; low: number };
}

export interface HealthResponse {
  status: string;
  engine: string;
  timestamp: string;
  workers_available: number;
  workers_max: number;
  queue_pending: number;
  queue_total: number;
  skills_loaded: string[];
  cache_entries: number;
}

export interface BatchResponse {
  batch_id: string;
  total_rows: number;
  job_ids?: string[];
  scheduled_at?: string;
  status?: string;
}

export interface ScheduledBatch {
  id: string;
  skill: string;
  total_rows: number;
  scheduled_at: number;
  created_at: number;
  status: "scheduled" | "enqueued" | "cancelled";
  job_ids: string[];
}

export interface WebhookResponse {
  [key: string]: unknown;
  _meta?: {
    skill: string;
    model: string;
    duration_ms: number;
    cached: boolean;
  };
  error?: boolean;
  error_message?: string;
}
