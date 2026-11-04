"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { Close, DescriptionOutlined, UploadFile } from "@mui/icons-material";
import EChart from "@/components/charts/EChart";
import { api } from "@/lib/api";
import { useDataMode } from "@/lib/dataMode";
import {
  EngineSession,
  Progress,
  StoredSession,
  exerciseLabel,
  faultLabel,
  fmt,
  formatDate,
} from "@/lib/sessions";
import { tokens } from "@/app/theme";

type Patient = {
  id: number;
  mrn: string;
  full_name: string;
  date_of_birth?: string | null;
  diagnosis?: string | null;
  risk_tier: string;
};

const outcomeColor = { valid: "success", invalid: "warning", aborted: "default" } as const;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Paper sx={{ p: 2, height: "100%" }}>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: 26, fontWeight: 650, letterSpacing: "-0.02em", mt: 0.5 }}>{value}</Typography>
      {hint && <Typography variant="caption" sx={{ color: "text.secondary" }}>{hint}</Typography>}
    </Paper>
  );
}

function axisBase() {
  return {
    grid: { left: 40, right: 16, top: 28, bottom: 28 },
    tooltip: { trigger: "axis", backgroundColor: "#fff", borderColor: tokens.line, textStyle: { color: tokens.ink } },
    xAxis: { type: "category", axisLine: { lineStyle: { color: tokens.line } }, axisLabel: { color: "#64748B" }, axisTick: { show: false } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#EEF2F6" } }, axisLabel: { color: "#64748B" } },
    legend: { top: 0, right: 0, textStyle: { color: "#64748B" }, itemWidth: 12, itemHeight: 8 },
  };
}

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const patientId = Number(params.id);
  const { mode } = useDataMode();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [exercise, setExercise] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{ text: string; severity: "success" | "error" | "info" } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [openSession, setOpenSession] = useState<StoredSession | null>(null);
  const [detail, setDetail] = useState<EngineSession | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, pr] = await Promise.all([
        api<Patient>(`/patients/${patientId}`),
        api<StoredSession[]>(`/patients/${patientId}/sessions?limit=200`),
        api<Progress>(`/patients/${patientId}/progress`),
      ]);
      setPatient(p);
      setSessions(s);
      setProgress(pr);
      setExercise((current) => current ?? pr.exercises[0]?.exercise ?? null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the patient.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (mode === "live") load();
    else setLoading(false);
  }, [mode, load]);

  useEffect(() => {
    if (!openSession) return;
    setDetail(null);
    api<EngineSession>(`/sessions/${openSession.id}/analysis`).then(setDetail).catch(() => setDetail(null));
  }, [openSession]);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    const problems: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const body = await file.text();
        JSON.parse(body);
        await api(`/patients/${patientId}/sessions`, { method: "POST", body });
        ok += 1;
      } catch (e) {
        problems.push(`${file.name}: ${e instanceof Error ? e.message : "not a valid Session file"}`);
      }
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
    setMessage({
      text: [ok ? `${ok} session${ok === 1 ? "" : "s"} uploaded.` : "", ...problems].filter(Boolean).join(" "),
      severity: problems.length ? (ok ? "info" : "error") : "success",
    });
    if (ok) load();
  };

  const generateReport = async (session: StoredSession) => {
    try {
      await api(`/reports/${session.id}/generate`, { method: "POST" });
      setMessage({ text: "SOAP draft created. Review and sign it on the Reports page.", severity: "success" });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Could not create the report.", severity: "error" });
    }
  };

  const series = useMemo(
    () => progress?.exercises.find((e) => e.exercise === exercise) ?? null,
    [progress, exercise],
  );

  const charts = useMemo(() => {
    if (!series) return null;
    const dates = series.sessions.map((s) => formatDate(s.date, false));
    const target = series.sessions.find((s) => s.rom_target_deg != null)?.rom_target_deg ?? null;
    const base = axisBase();
    return {
      rom: {
        ...base,
        xAxis: { ...base.xAxis, data: dates },
        yAxis: { ...base.yAxis, name: "deg", nameTextStyle: { color: "#64748B" } },
        series: [{
          name: "Peak flexion", type: "line", data: series.sessions.map((s) => s.rom_achieved_deg),
          symbol: "circle", symbolSize: 7, lineStyle: { width: 2, color: tokens.teal }, itemStyle: { color: tokens.teal },
          markLine: target == null ? undefined : {
            symbol: "none", silent: true, lineStyle: { color: tokens.muted, type: "dashed" },
            label: { formatter: `target ${target}°`, color: "#64748B", position: "insideEndTop" }, data: [{ yAxis: target }],
          },
        }],
      },
      reps: {
        ...base,
        xAxis: { ...base.xAxis, data: dates },
        series: [
          { name: "Valid", type: "bar", stack: "r", barMaxWidth: 22, itemStyle: { color: tokens.teal }, data: series.sessions.map((s) => s.achieved) },
          { name: "Not counted", type: "bar", stack: "r", barMaxWidth: 22, itemStyle: { color: "#CBD5E1" },
            data: series.sessions.map((s) => (s.attempts != null && s.achieved != null ? Math.max(0, s.attempts - s.achieved) : null)) },
        ],
      },
      fatigue: {
        ...base,
        xAxis: { ...base.xAxis, data: dates },
        yAxis: { ...base.yAxis, max: 100, name: "%", nameTextStyle: { color: "#64748B" } },
        series: [{
          name: "Velocity loss", type: "line", connectNulls: false, data: series.sessions.map((s) => s.fatigue_index),
          symbol: "circle", symbolSize: 7, lineStyle: { width: 2, color: tokens.amber }, itemStyle: { color: tokens.amber },
        }],
      },
    };
  }, [series]);

  if (mode === "demo") {
    return (
      <Box>
        <Breadcrumbs sx={{ mb: 2 }}><Link href="/patients">Patients</Link><Typography>Demo record</Typography></Breadcrumbs>
        <Alert severity="info">Session history and reports need a real account. The demo account uses sample data only.</Alert>
      </Box>
    );
  }
  if (loading && !patient) return <Box sx={{ py: 10, display: "grid", placeItems: "center" }}><CircularProgress size={28} /></Box>;
  if (error && !patient) return <Alert severity="error">{error}</Alert>;
  if (!patient) return null;

  const latest = sessions[0];
  const age = patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getUTCFullYear() : null;

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1.5, "& a": { color: "text.secondary", textDecoration: "none" } }}>
        <Link href="/patients">Patients</Link>
        <Typography color="text.primary" sx={{ fontSize: 14 }}>{patient.full_name}</Typography>
      </Breadcrumbs>

      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4">{patient.full_name}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75, color: "text.secondary", flexWrap: "wrap" }} useFlexGap>
            <Typography variant="body2">{patient.mrn}</Typography>
            {age != null && <Typography variant="body2">· {age} years</Typography>}
            {patient.diagnosis && <Typography variant="body2">· {patient.diagnosis}</Typography>}
            <Chip size="small" variant="outlined" label={`${patient.risk_tier} risk`} sx={{ textTransform: "capitalize" }} />
          </Stack>
        </Box>
        <Box>
          <input ref={fileInput} type="file" accept="application/json,.json" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
          <Button variant="contained" startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadFile />}
            disabled={uploading} onClick={() => fileInput.current?.click()}>
            Upload sessions
          </Button>
        </Box>
      </Stack>

      {sessions.length === 0 ? (
        <Paper sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h6">No sessions yet</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 640 }}>
            The patient records exercises with the PhysioSight engine on their own device. Each exercise set produces a Session file
            with every repetition, its faults and joint angles. Upload those files here.
          </Typography>
          <Box component="pre" sx={{ mt: 2.5, p: 2, bgcolor: tokens.subtle, borderRadius: 2, fontSize: 13, overflowX: "auto", border: `1px solid ${tokens.line}` }}>
{`pip install "physiosight[mediapipe] @ git+https://github.com/Wang-Tongfei/PhysioSight@v0.1.0"
physiosight run -e squat --sessions-dir sessions/       # live, one file per set
physiosight analyze squat.npz -e squat -o session.json  # or offline from a recording`}
          </Box>
          <Button sx={{ mt: 2.5 }} variant="outlined" startIcon={<UploadFile />} onClick={() => fileInput.current?.click()}>Choose Session files</Button>
        </Paper>
      ) : (
        <>
          <Grid container spacing={2} mb={2.5}>
            <Grid item xs={6} md={3}><Stat label="Sessions" value={String(sessions.length)} hint={`last ${formatDate(latest?.started_at, false)}`} /></Grid>
            <Grid item xs={6} md={3}><Stat label="Last session" value={`${latest?.achieved ?? 0} / ${latest?.attempts ?? 0}`} hint={`valid / attempted · ${exerciseLabel(latest?.exercise)}`} /></Grid>
            <Grid item xs={6} md={3}><Stat label="Peak flexion" value={fmt(latest?.rom_achieved_deg, 0, "°")} hint={latest?.rom_target_deg ? `target ${latest.rom_target_deg}°` : undefined} /></Grid>
            <Grid item xs={6} md={3}><Stat label="Velocity loss" value={fmt(latest?.fatigue_index, 0, "%")} hint="within the last set; — if under 4 valid reps" /></Grid>
          </Grid>

          {progress && progress.exercises.length > 0 && (
            <Paper sx={{ mb: 2.5 }}>
              <Tabs value={exercise ?? false} onChange={(_, v) => setExercise(v)} sx={{ px: 2, borderBottom: `1px solid ${tokens.line}` }}>
                {progress.exercises.map((e) => <Tab key={e.exercise} value={e.exercise} label={`${exerciseLabel(e.exercise)} (${e.sessions.length})`} />)}
              </Tabs>
              {charts && series && (
                <Grid container>
                  <Grid item xs={12} md={4} sx={{ p: 2, borderRight: { md: `1px solid ${tokens.line}` } }}>
                    <Typography variant="subtitle2">Peak flexion per session</Typography>
                    <EChart height={210} option={charts.rom} />
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ p: 2, borderRight: { md: `1px solid ${tokens.line}` } }}>
                    <Typography variant="subtitle2">Repetitions</Typography>
                    <EChart height={210} option={charts.reps} />
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ p: 2 }}>
                    <Typography variant="subtitle2">Within-set velocity loss</Typography>
                    <EChart height={210} option={charts.fatigue} />
                  </Grid>
                  <Grid item xs={12} sx={{ px: 2, pb: 2 }}>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>Faults across all sessions</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }} useFlexGap>
                      {Object.keys(series.fault_totals).length === 0
                        ? <Typography variant="body2" color="text.secondary">None recorded</Typography>
                        : Object.entries(series.fault_totals).sort((a, b) => b[1] - a[1]).map(([code, n]) => (
                          <Chip key={code} size="small" variant="outlined" label={`${faultLabel(code)} · ${n}`} />
                        ))}
                    </Stack>
                  </Grid>
                </Grid>
              )}
            </Paper>
          )}

          <Paper sx={{ overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${tokens.line}` }}>
              <Typography variant="subtitle2">Session history</Typography>
            </Box>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Exercise</TableCell>
                    <TableCell align="right">Valid / attempts</TableCell>
                    <TableCell align="right">Peak flexion</TableCell>
                    <TableCell align="right">Quality</TableCell>
                    <TableCell align="right">Velocity loss</TableCell>
                    <TableCell>Faults</TableCell>
                    <TableCell>Source</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((s) => {
                    const faults = Object.entries(s.fault_counts);
                    return (
                      <TableRow key={s.id} hover sx={{ cursor: s.has_analysis ? "pointer" : "default" }} onClick={() => s.has_analysis && setOpenSession(s)}>
                        <TableCell>{formatDate(s.started_at)}</TableCell>
                        <TableCell>{exerciseLabel(s.exercise)}</TableCell>
                        <TableCell align="right">{s.achieved ?? "—"} / {s.attempts ?? "—"}</TableCell>
                        <TableCell align="right">{fmt(s.rom_achieved_deg, 0, "°")}</TableCell>
                        <TableCell align="right">{fmt(s.movement_quality_score)}</TableCell>
                        <TableCell align="right">{fmt(s.fatigue_index, 0, "%")}</TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          {faults.length === 0 ? <Typography variant="body2" color="text.secondary">—</Typography> : (
                            <Tooltip title={faults.map(([c, n]) => `${faultLabel(c)} × ${n}`).join(", ")}>
                              <Typography variant="body2" noWrap>{faults.map(([c, n]) => `${faultLabel(c)} ×${n}`).join(", ")}</Typography>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", textTransform: "capitalize" }}>{(s.source || "").replace("local-monitor", "clinic monitor")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </>
      )}

      <Drawer anchor="right" open={Boolean(openSession)} onClose={() => setOpenSession(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 560 }, p: 3 } }}>
        {openSession && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6">{exerciseLabel(openSession.exercise)}</Typography>
                <Typography variant="body2" color="text.secondary">{formatDate(openSession.started_at)}</Typography>
              </Box>
              <IconButton onClick={() => setOpenSession(null)} aria-label="Close"><Close /></IconButton>
            </Stack>
            {!detail ? (
              <Box sx={{ py: 6, display: "grid", placeItems: "center" }}><CircularProgress size={24} /></Box>
            ) : (
              <>
                <Grid container spacing={1.5} sx={{ mt: 1 }}>
                  <Grid item xs={4}><Stat label="Valid" value={`${detail.summary.achieved}/${detail.summary.target}`} /></Grid>
                  <Grid item xs={4}><Stat label="Duration" value={`${Math.round(detail.summary.duration_s)} s`} /></Grid>
                  <Grid item xs={4}><Stat label="Tracked" value={`${Math.round(100 * detail.tracking.frames_reliable / Math.max(1, detail.tracking.frames_total))}%`} /></Grid>
                </Grid>

                {detail.exercise_kind === "repetition" ? (
                  <Table size="small" sx={{ mt: 2 }}>
                    <TableHead>
                      <TableRow><TableCell>#</TableCell><TableCell>Outcome</TableCell><TableCell align="right">Time</TableCell><TableCell>Peak angles</TableCell><TableCell>Faults</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.reps.map((r) => (
                        <TableRow key={r.index}>
                          <TableCell>{r.index}</TableCell>
                          <TableCell><Chip size="small" variant="outlined" color={outcomeColor[r.outcome]} label={r.outcome} /></TableCell>
                          <TableCell align="right">{(r.ended_at_s - r.started_at_s).toFixed(1)} s</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {Object.entries(r.angles).map(([name, a]) => (
                              <Box key={name}>{name.replaceAll("_", " ")}: {a.max_deg.toFixed(0)}°</Box>
                            ))}
                            {r.view_ok === false && <Typography variant="caption" color="warning.main">camera view unsuitable for angles</Typography>}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{r.faults.length ? r.faults.map(faultLabel).join(", ") : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography sx={{ mt: 2 }} color="text.secondary">
                    Hold: {detail.summary.achieved.toFixed(1)} s credited in {detail.holds.length} segment{detail.holds.length === 1 ? "" : "s"}.
                  </Typography>
                )}

                <Typography variant="caption" component="div" color="text.secondary" sx={{ mt: 2 }}>
                  {detail.engine.name} {detail.engine.version} · {detail.engine.pose_backend} · spec {detail.engine.spec_id} v{detail.engine.spec_version}
                  {" · "}{detail.engine.angle_space === "image_2d" ? "2D image-plane angles" : "3D angles"}
                </Typography>
                <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                  Angles from a single camera are estimates and have not been validated against a reference system for this patient.
                </Alert>
                <Button sx={{ mt: 2 }} variant="outlined" startIcon={<DescriptionOutlined />} onClick={() => generateReport(openSession)}>
                  Create SOAP draft from this session
                </Button>
              </>
            )}
          </Box>
        )}
      </Drawer>

      <Snackbar open={Boolean(message)} autoHideDuration={5000} onClose={() => setMessage(null)}>
        {message ? <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert> : <span />}
      </Snackbar>
    </Box>
  );
}
