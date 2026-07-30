"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Grid, Stack, Typography, Chip, Avatar, Button, TextField, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Snackbar, Alert } from "@mui/material";
import { Search, PersonAdd, EmojiEvents, LocalHospital, People } from "@mui/icons-material";
import SectionCard from "@/components/common/SectionCard";
import EChart from "@/components/charts/EChart";
import { lineOption } from "@/components/charts/chartOptions";
import { patients } from "@/lib/mockData";
import { usePersistentState } from "@/lib/usePersistentState";
import { api } from "@/lib/api";
import { useDataMode } from "@/lib/dataMode";

type PatientRecord = (typeof patients)[number];
type ApiPatient = {
  id: number;
  mrn: string;
  full_name: string;
  date_of_birth?: string | null;
  diagnosis?: string | null;
  risk_tier: string;
};

function fromApi(patient: ApiPatient): PatientRecord {
  const birth = patient.date_of_birth ? new Date(patient.date_of_birth) : null;
  const age = birth ? Math.max(0, new Date().getFullYear() - birth.getUTCFullYear()) : 0;
  return {
    id: patient.id,
    name: patient.full_name,
    mrn: patient.mrn,
    age,
    diagnosis: patient.diagnosis || "Assessment pending",
    risk: `${patient.risk_tier.charAt(0).toUpperCase()}${patient.risk_tier.slice(1)}`,
    score: 0,
    adherence: 0,
    last: "No sessions",
    trend: [0, 0, 0, 0, 0, 0],
  };
}

const riskColor: Record<string, string> = {
  Low: "#10d97e", Moderate: "#f5b73b", High: "#ef5b5b",
};

export default function PatientsPage() {
  const [demoRecords, setDemoRecords] = usePersistentState("physiovision.patients", patients);
  const [liveRecords, setLiveRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { mode } = useDataMode();
  const records = mode === "demo" ? demoRecords : liveRecords;
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<(typeof patients)[number] | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", mrn: "", age: "40", diagnosis: "", risk: "Low" });
  useEffect(() => {
    if (mode !== "live") return;
    setLoading(true);
    api<ApiPatient[]>("/patients")
      .then((items) => setLiveRecords(items.map(fromApi)))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load real patient data."))
      .finally(() => setLoading(false));
  }, [mode]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? records.filter((p) => `${p.name} ${p.mrn} ${p.diagnosis}`.toLowerCase().includes(needle))
      : records;
  }, [query, records]);

  const addPatient = async () => {
    if (!form.name.trim() || !form.mrn.trim()) {
      setMessage("Name and MRN are required.");
      return;
    }
    if (records.some((p) => p.mrn.toLowerCase() === form.mrn.trim().toLowerCase())) {
      setMessage("This MRN already exists.");
      return;
    }
    const next = {
      id: Math.max(0, ...records.map((p) => p.id)) + 1,
      name: form.name.trim(),
      mrn: form.mrn.trim(),
      age: Number(form.age) || 0,
      diagnosis: form.diagnosis.trim() || "Assessment pending",
      risk: form.risk,
      score: 0,
      adherence: 0,
      last: "New",
      trend: [0, 0, 0, 0, 0, 0],
    };
    if (mode === "live") {
      setLoading(true);
      try {
        const birthYear = new Date().getFullYear() - next.age;
        const created = await api<ApiPatient>("/patients", {
          method: "POST",
          body: JSON.stringify({
            mrn: next.mrn,
            full_name: next.name,
            date_of_birth: `${birthYear}-01-01`,
            diagnosis: next.diagnosis,
            risk_tier: next.risk.toLowerCase(),
          }),
        });
        setLiveRecords((current) => [fromApi(created), ...current]);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save the patient.");
        setLoading(false);
        return;
      }
      setLoading(false);
    } else {
      setDemoRecords((current) => [next, ...current]);
    }
    setAddOpen(false);
    setForm({ name: "", mrn: "", age: "40", diagnosis: "", risk: "Low" });
    setMessage(`${next.name} was added.`);
  };

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            Patients
          </Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
            {records.length} active patients under your care · {mode === "demo" ? "demo dataset" : "database records"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Search patient / MRN"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "rgba(34,211,238,0.25)" },
                "&:hover fieldset": { borderColor: "rgba(34,211,238,0.5)" },
                "&.Mui-focused fieldset": { borderColor: "#22d3ee" },
                background: "rgba(11,30,51,0.5)",
              },
            }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><Search fontSize="small" sx={{ color: "text.secondary" }} /></InputAdornment>) }}
          />
          <Button disabled={loading} variant="contained" startIcon={<PersonAdd />} onClick={() => setAddOpen(true)}>Add Patient</Button>
        </Stack>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <Grid container spacing={2.5}>
            {loading && records.length === 0 && (
              <Grid item xs={12}><Box sx={{ py: 8, display: "grid", placeItems: "center" }}><CircularProgress /></Box></Grid>
            )}
            {visible.map((p) => (
              <Grid item xs={12} md={6} key={p.id}>
                <Box onClick={() => setSelected(p)} sx={{ cursor: "pointer" }}>
                  <SectionCard
                    title={p.name}
                    subtitle={p.mrn}
                    icon={<People sx={{ fontSize: 20 }} />}
                    action={<Chip label={p.risk} size="small" sx={{ bgcolor: riskColor[p.risk] + "22", color: riskColor[p.risk], fontWeight: 700, border: `1px solid ${riskColor[p.risk]}40` }} />}
                  >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: "linear-gradient(135deg,#0891b2,#22d3ee)",
                        width: 48, height: 48, color: "#04101f", fontWeight: 800,
                      }}
                    >
                      {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>{p.diagnosis}</Typography>
                      <Stack direction="row" spacing={3} sx={{ mt: 0.5 }}>
                        <Box><Typography variant="h6" sx={{ fontWeight: 800, color: "#22d3ee" }}>{p.score}</Typography><Typography variant="caption" sx={{ color: "text.secondary" }}>Score</Typography></Box>
                        <Box><Typography variant="h6" sx={{ fontWeight: 800 }}>{p.adherence}%</Typography><Typography variant="caption" sx={{ color: "text.secondary" }}>Adherence</Typography></Box>
                        <Box><Typography variant="h6" sx={{ fontWeight: 800 }}>{p.age}</Typography><Typography variant="caption" sx={{ color: "text.secondary" }}>Age</Typography></Box>
                      </Stack>
                    </Box>
                  </Stack>
                  <Box sx={{ mt: 1.5 }}>
                    <EChart height={120} option={lineOption(["W1","W2","W3","W4","W5","W6"], [{ name: "ROM", data: p.trend, color: riskColor[p.risk] }])} />
                  </Box>
                  </SectionCard>
                </Box>
              </Grid>
            ))}
            {visible.length === 0 && (
              <Grid item xs={12}>
                <Alert severity="info">
                  {query
                    ? `No patients match “${query}”.`
                    : mode === "live"
                    ? "No real patient records yet. Add the first patient or switch to Demo."
                    : "No demo patients."}
                </Alert>
              </Grid>
            )}
          </Grid>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={2.5}>
            <SectionCard title="Reward Badges" subtitle="Gamification & engagement" icon={<EmojiEvents />}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {["Consistency", "ROM Milestone", "Form Master", "10 Sessions", "Early Bird"].map((b) => (
                  <Chip key={b} icon={<EmojiEvents />} label={b} sx={{ bgcolor: "rgba(34,211,238,0.12)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)" }} />
                ))}
              </Stack>
            </SectionCard>
            <SectionCard title="Avatar Mode" subtitle="Privacy-preserving patient view" icon={<LocalHospital />}>
              <Box
                sx={{
                  height: 200,
                  borderRadius: 2,
                  background: "radial-gradient(ellipse at 50% 30%, rgba(34,211,238,0.12) 0%, rgba(6,21,38,0.9) 70%), linear-gradient(160deg, #0a2540 0%, #04101f 100%)",
                  border: "1px solid rgba(34,211,238,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>3D Avatar reconstruction preview</Typography>
              </Box>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add patient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
            <TextField label="MRN" value={form.mrn} onChange={(e) => setForm({ ...form, mrn: e.target.value })} required />
            <TextField label="Age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} inputProps={{ min: 0, max: 120 }} />
            <TextField label="Diagnosis" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
            <TextField select label="Risk" value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })}>
              {["Low", "Moderate", "High"].map((risk) => <MenuItem key={risk} value={risk}>{risk}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addPatient}>Add patient</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>{selected?.name}</DialogTitle>
        <DialogContent>
          {selected && (
            <Stack spacing={1.5}>
              <Typography color="text.secondary">{selected.mrn} · {selected.age} years old</Typography>
              <Typography>{selected.diagnosis}</Typography>
              <Stack direction="row" spacing={1}>
                <Chip label={`${selected.risk} risk`} sx={{ color: riskColor[selected.risk] }} />
                <Chip label={`Score ${selected.score}`} />
                <Chip label={`${selected.adherence}% adherence`} />
              </Stack>
              <EChart height={180} option={lineOption(["W1","W2","W3","W4","W5","W6"], [{ name: "ROM", data: selected.trend, color: riskColor[selected.risk] }])} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
          <Button variant="contained" onClick={() => { setSelected(null); setMessage("Patient record opened for review."); }}>Review record</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage("")}>
        <Alert severity={message.includes("required") || message.includes("exists") ? "error" : "success"} onClose={() => setMessage("")}>{message}</Alert>
      </Snackbar>
    </Box>
  );
}
