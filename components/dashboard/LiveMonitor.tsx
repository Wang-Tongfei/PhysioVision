"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import {
  FiberManualRecord,
  MonitorHeart,
  Stop,
  UploadFile,
  Videocam,
} from "@mui/icons-material";
import SkeletonOverlay from "./SkeletonOverlay";
import { livePatients } from "@/lib/mockData";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const EXERCISES = [
  { value: "bicep_curl", label: "Bicep curl" },
  { value: "squat", label: "Squat" },
  { value: "plank", label: "Plank" },
  { value: "pushup", label: "Push-up" },
];

type MonitorPhase =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "completed"
  | "stopped"
  | "error";

interface MonitorStatus {
  job_id: string | null;
  phase: MonitorPhase;
  source: "camera" | "upload" | null;
  source_label: string | null;
  exercise: string | null;
  progress: number;
  target: number;
  unit: "reps" | "sec";
  form_status: string;
  form_ok: boolean;
  metric_label: string;
  metric_value: number | null;
  complete: boolean;
  error: string | null;
  has_frame: boolean;
  has_result_video: boolean;
}

const IDLE_STATUS: MonitorStatus = {
  job_id: null,
  phase: "idle",
  source: null,
  source_label: null,
  exercise: null,
  progress: 0,
  target: 0,
  unit: "reps",
  form_status: "Choose a source to begin",
  form_ok: true,
  metric_label: "",
  metric_value: null,
  complete: false,
  error: null,
  has_frame: false,
  has_result_video: false,
};

async function apiRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `Request failed (${response.status})`);
  }
  return response.json();
}

export default function LiveMonitor() {
  const uploadInput = useRef<HTMLInputElement>(null);
  const [exercise, setExercise] = useState("bicep_curl");
  const [status, setStatus] = useState<MonitorStatus>(IDLE_STATUS);
  const [busy, setBusy] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [streamKey, setStreamKey] = useState(0);

  const refreshStatus = useCallback(async () => {
    try {
      const next = (await apiRequest(
        "/sessions/monitor/status"
      )) as MonitorStatus;
      setStatus(next);
      setConnectionError(null);
    } catch {
      // The dashboard remains usable with its existing mock presentation when
      // the optional local vision service is not running.
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const timer = window.setInterval(refreshStatus, 750);
    return () => window.clearInterval(timer);
  }, [refreshStatus]);

  const startLive = async () => {
    setBusy(true);
    setConnectionError(null);
    try {
      const next = await apiRequest(
        `/sessions/monitor/live?exercise=${exercise}&camera_index=0`,
        { method: "POST" }
      );
      setStatus(next);
      setStreamKey((value) => value + 1);
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Could not start camera"
      );
    } finally {
      setBusy(false);
    }
  };

  const selectUpload = () => uploadInput.current?.click();

  const uploadVideo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setConnectionError(null);
    const form = new FormData();
    form.append("video", file);
    form.append("exercise", exercise);
    form.append("track_arm", "right");
    try {
      const next = await apiRequest("/sessions/monitor/upload", {
        method: "POST",
        body: form,
      });
      setStatus(next);
      setStreamKey((value) => value + 1);
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Could not upload video"
      );
    } finally {
      setBusy(false);
    }
  };

  const stopMonitor = async () => {
    setBusy(true);
    try {
      setStatus(await apiRequest("/sessions/monitor/stop", { method: "POST" }));
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Could not stop monitor"
      );
    } finally {
      setBusy(false);
    }
  };

  const active = ["starting", "running", "stopping"].includes(status.phase);
  const showStream = status.has_frame && !status.has_result_video;
  const showResult =
    status.source === "upload" &&
    status.has_result_video &&
    ["completed", "stopped"].includes(status.phase);
  const progressLabel =
    status.unit === "sec"
      ? `${status.progress.toFixed(1)} / ${status.target.toFixed(0)} SEC`
      : `${Math.floor(status.progress)} / ${Math.floor(status.target)} REPS`;

  return (
    <Box className="glass-card" sx={{ p: 2.5 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        gap={2}
        mb={2}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(59,130,246,0.1))",
              border: "1px solid rgba(34,211,238,0.3)",
              color: "#22d3ee",
            }}
          >
            <MonitorHeart sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
              Live Session Monitor
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {status.source_label ?? "Local vision station"}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <FormControl size="small" sx={{ minWidth: 135 }}>
            <Select
              value={exercise}
              onChange={(event) => setExercise(event.target.value)}
              disabled={active}
              aria-label="Exercise"
            >
              {EXERCISES.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="contained"
            startIcon={<Videocam />}
            onClick={startLive}
            disabled={busy || active}
          >
            Live Camera
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadFile />}
            onClick={selectUpload}
            disabled={busy || active}
          >
            Upload Video
          </Button>
          {active && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<Stop />}
              onClick={stopMonitor}
              disabled={busy}
            >
              Stop
            </Button>
          )}
          <input
            ref={uploadInput}
            type="file"
            hidden
            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,.mkv,.m4v"
            onChange={uploadVideo}
          />
        </Stack>
      </Stack>

      {connectionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {connectionError}. Make sure the FastAPI vision service is running.
        </Alert>
      )}

      <Box
        sx={{
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(34,211,238,0.12) 0%, rgba(6,21,38,0.9) 70%), linear-gradient(160deg, #0a2540 0%, #04101f 100%)",
          border: "1px solid rgba(34,211,238,0.2)",
          height: { xs: 280, md: 420 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showResult ? (
          <Box
            component="video"
            key={`result-${status.job_id}`}
            controls
            autoPlay
            muted
            src={`${API_BASE}/sessions/monitor/result?job=${status.job_id}`}
            sx={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : showStream ? (
          <Box
            component="img"
            key={`stream-${streamKey}`}
            src={`${API_BASE}/sessions/monitor/stream?job=${status.job_id ?? ""}`}
            alt="Live patient movement with pose overlay"
            sx={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <Box sx={{ width: "52%", height: "88%", opacity: 0.8 }}>
            <SkeletonOverlay color="#22d3ee" />
          </Box>
        )}

        {(busy || status.phase === "starting") && (
          <Stack
            alignItems="center"
            spacing={1}
            sx={{
              position: "absolute",
              inset: 0,
              justifyContent: "center",
              bgcolor: "rgba(4,16,31,0.72)",
            }}
          >
            <CircularProgress size={34} />
            <Typography variant="body2">Preparing vision model…</Typography>
          </Stack>
        )}

        <Chip
          icon={
            <FiberManualRecord
              sx={{
                color: active ? "#f87171 !important" : "#94a3b8 !important",
                fontSize: 12,
              }}
              className={active ? "pulse-dot" : undefined}
            />
          }
          label={
            active
              ? status.source === "upload"
                ? "ANALYZING VIDEO"
                : "LIVE · CAM-01"
              : status.phase.toUpperCase()
          }
          size="small"
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            bgcolor: "rgba(4,16,31,0.78)",
            color: active ? "#f87171" : "text.secondary",
            border: "1px solid rgba(148,163,184,0.3)",
            fontWeight: 700,
          }}
        />
      </Box>

      {status.has_frame && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={{ xs: 0.5, sm: 1 }}
          sx={{
            mt: 1.25,
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            bgcolor: "rgba(11,30,51,0.55)",
            color: status.form_ok ? "#10d97e" : "#f87171",
            fontFamily: "monospace",
            fontSize: 12,
            border: `1px solid ${
              status.form_ok
                ? "rgba(16,217,126,0.3)"
                : "rgba(248,113,113,0.4)"
            }`,
          }}
        >
          <Box component="span" sx={{ flexShrink: 0 }}>
            {progressLabel}
            {status.metric_value !== null &&
              ` · ${status.metric_label.toUpperCase()} ${status.metric_value}°`}
          </Box>
          <Box component="span" sx={{ color: "text.secondary" }}>
            {status.form_status}
          </Box>
        </Stack>
      )}

      {status.phase === "error" && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {status.error}
        </Alert>
      )}

      <Stack
        direction="row"
        spacing={1.5}
        sx={{ mt: 2, overflowX: "auto" }}
        className="scroll-y"
      >
        {livePatients.map((patient) => (
          <Box
            key={patient.id}
            sx={{
              minWidth: 155,
              flex: 1,
              borderRadius: "12px",
              p: 1.5,
              background: "rgba(11,30,51,0.55)",
              border: "1px solid rgba(34,211,238,0.18)",
              "&:hover": { borderColor: "rgba(34,211,238,0.45)" },
              transition: "border-color .2s ease",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <FiberManualRecord
                sx={{ fontSize: 10, color: patient.color }}
                className="pulse-dot"
              />
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, color: patient.color }}
              >
                {patient.station}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
              {patient.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {patient.exercise}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
