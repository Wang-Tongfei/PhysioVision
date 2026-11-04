// Types and labels for engine Sessions stored by the backend
// (see backend/app/services/session_records.py and the physiosight Session schema).

export type StoredSession = {
  id: number;
  engine_session_id: string | null;
  exercise: string | null;
  source: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  achieved: number | null;
  target: number | null;
  attempts: number | null;
  movement_quality_score: number | null;
  risk_score: number | null;
  fatigue_index: number | null;
  rom_achieved_deg: number | null;
  rom_target_deg: number | null;
  compensation_detected: boolean;
  fault_counts: Record<string, number>;
  has_analysis: boolean;
};

export type ProgressPoint = {
  id: number;
  date: string | null;
  achieved: number | null;
  attempts: number | null;
  target: number | null;
  rom_achieved_deg: number | null;
  rom_target_deg: number | null;
  movement_quality_score: number | null;
  fatigue_index: number | null;
  fault_counts: Record<string, number>;
};

export type Progress = {
  patient_id: number;
  exercises: { exercise: string; sessions: ProgressPoint[]; fault_totals: Record<string, number> }[];
};

export type EngineRep = {
  index: number;
  started_at_s: number;
  ended_at_s: number;
  outcome: "valid" | "invalid" | "aborted";
  reached_target: boolean;
  faults: string[];
  angles: Record<string, { min_deg: number; max_deg: number }>;
  view_ok: boolean | null;
};

export type EngineSession = {
  session_id: string;
  exercise_id: string;
  exercise_kind: "repetition" | "hold";
  side: string;
  created_at: string;
  source: { kind: string; width?: number | null; height?: number | null; effective_fps?: number | null };
  engine: { name: string; version: string; pose_backend: string; spec_id: string; spec_version: string; angle_space: string; params: Record<string, number> };
  tracking: { frames_total: number; frames_with_pose: number; frames_reliable: number; tracking_lost_events: number; frames_view_ok?: number | null };
  summary: { target: number; achieved: number; attempts: number; completed: boolean; duration_s: number };
  reps: EngineRep[];
  holds: { started_at_s: number; ended_at_s: number }[];
  faults: { t_s: number; code: string; rep_index?: number | null }[];
};

export const EXERCISE_LABELS: Record<string, string> = {
  bicep_curl: "Bicep curl",
  squat: "Squat",
  pushup: "Push-up",
  plank: "Plank",
  shoulder_flexion: "Shoulder flexion",
};

// English texts from the engine's locale file (physiosight/i18n/en.yaml)
export const FAULT_LABELS: Record<string, string> = {
  movement_too_fast: "Moved too fast",
  partial_curl: "Partial curl",
  upper_arm_drift: "Upper arm drifted from the torso",
  shallow_squat: "Squat not deep enough",
  uneven_squat: "Knees moved unevenly",
  shallow_pushup: "Push-up not deep enough",
  pushup_body_alignment: "Body not in line (push-up)",
  plank_body_alignment: "Body not in line (plank)",
  insufficient_range: "Prescribed range not reached",
  elbow_bent: "Elbow bent",
  tracking_lost: "Tracking lost",
  session_ended: "Session ended mid-repetition",
};

export const exerciseLabel = (id?: string | null) => (id ? EXERCISE_LABELS[id] || id.replaceAll("_", " ") : "Unknown");
export const faultLabel = (code: string) => FAULT_LABELS[code] || code.replaceAll("_", " ");

export function formatDate(value?: string | null, withTime = true) {
  if (!value) return "—";
  const d = new Date(value);
  return withTime
    ? d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const fmt = (value: number | null | undefined, digits = 0, unit = "") =>
  value === null || value === undefined ? "—" : `${value.toFixed(digits)}${unit}`;
