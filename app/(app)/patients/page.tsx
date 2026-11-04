"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Stack, Typography, Chip, Button, TextField, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Snackbar, Alert, Paper, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { ChevronRight, DeleteOutline, Search, PersonAdd, RestartAlt } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import EChart from "@/components/charts/EChart";
import { lineOption } from "@/components/charts/chartOptions";
import { DEMO_PATIENTS_KEY, patients } from "@/lib/mockData";
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
  Low: "#15803D", Moderate: "#B45309", High: "#B91C1C", Critical: "#B91C1C",
};

export default function PatientsPage() {
  const router = useRouter();
  const [demoRecords, setDemoRecords] = usePersistentState(DEMO_PATIENTS_KEY, patients);
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

  const deletePatient = async () => {
    if (!selected || !window.confirm(`Delete ${selected.name}? This cannot be undone.`)) return;
    if (mode === "live") {
      try {
        await api(`/patients/${selected.id}`, { method: "DELETE" });
        setLiveRecords((current) => current.filter((patient) => patient.id !== selected.id));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not delete the patient.");
        return;
      }
    } else {
      setDemoRecords((current) => current.filter((patient) => patient.id !== selected.id));
    }
    setSelected(null);
    setMessage(`${selected.name} was deleted.`);
  };

  const riskChip = (risk: string) => (
    <Chip size="small" label={risk} variant="outlined"
      sx={{ color: riskColor[risk] || "text.secondary", borderColor: (riskColor[risk] || "#94A3B8") + "55" }} />
  );

  const openPatient = (p: PatientRecord) => {
    if (mode === "live") router.push(`/patients/${p.id}`);
    else setSelected(p);
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "flex-end" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Patients</Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
            {records.length} {records.length === 1 ? "patient" : "patients"} · {mode === "demo" ? "demo dataset" : "your clinic"}
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            size="small"
            placeholder="Search name, MRN or diagnosis"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            sx={{ minWidth: 280 }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><Search fontSize="small" sx={{ color: "text.secondary" }} /></InputAdornment>) }}
          />
          {mode === "demo" && (
            <Button variant="outlined" startIcon={<RestartAlt />} onClick={() => { setDemoRecords(patients); setMessage("Demo patient data was reset."); }}>
              Reset demo data
            </Button>
          )}
          <Button disabled={loading} variant="contained" startIcon={<PersonAdd />} onClick={() => setAddOpen(true)}>Add patient</Button>
        </Stack>
      </Stack>

      <Paper sx={{ overflow: "hidden" }}>
        {loading && records.length === 0 ? (
          <Box sx={{ py: 8, display: "grid", placeItems: "center" }}><CircularProgress size={28} /></Box>
        ) : visible.length === 0 ? (
          <Box sx={{ py: 6, px: 3, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 600 }}>{query ? `No patients match “${query}”.` : "No patients yet"}</Typography>
            {!query && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Add a patient, then upload the sessions their device records.
              </Typography>
            )}
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Patient</TableCell>
                <TableCell>Diagnosis</TableCell>
                <TableCell>Age</TableCell>
                <TableCell>Risk tier</TableCell>
                {mode === "demo" && <TableCell align="right">Score</TableCell>}
                {mode === "demo" && <TableCell align="right">Adherence</TableCell>}
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((p) => (
                <TableRow key={p.id} hover onClick={() => openPatient(p)} sx={{ cursor: "pointer", "& td": { py: 1.5 } }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.mrn}</Typography>
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{p.diagnosis}</TableCell>
                  <TableCell>{p.age || "—"}</TableCell>
                  <TableCell>{riskChip(p.risk)}</TableCell>
                  {mode === "demo" && <TableCell align="right">{p.score}</TableCell>}
                  {mode === "demo" && <TableCell align="right">{p.adherence}%</TableCell>}
                  <TableCell align="right"><ChevronRight fontSize="small" sx={{ color: "text.disabled" }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add patient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
            <TextField label="MRN" value={form.mrn} onChange={(e) => setForm({ ...form, mrn: e.target.value })} required />
            <TextField label="Age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} inputProps={{ min: 0, max: 120 }} />
            <TextField label="Diagnosis" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
            <TextField select label="Risk tier" value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })}>
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
              <Typography color="text.secondary">{selected.mrn} · {selected.age} years · {selected.diagnosis}</Typography>
              <Stack direction="row" spacing={1}>{riskChip(selected.risk)}<Chip size="small" label={`Score ${selected.score}`} /></Stack>
              <EChart height={180} option={lineOption(["W1", "W2", "W3", "W4", "W5", "W6"], [{ name: "ROM (demo)", data: selected.trend, color: "#0F766E" }])} />
              <Alert severity="info" variant="outlined">Demo record. Session history and reports are available for patients in your clinic’s database.</Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="error" startIcon={<DeleteOutline />} onClick={deletePatient}>Delete</Button>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage("")}>
        <Alert severity={message.includes("required") || message.includes("exists") || message.includes("cannot") || message.includes("Could not") ? "error" : "success"} onClose={() => setMessage("")}>{message}</Alert>
      </Snackbar>
    </Box>
  );
}
