"use client";

import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, MenuItem, Snackbar, Stack, TextField, Typography,
} from "@mui/material";
import { Add, Assignment, FitnessCenter, PlayCircle } from "@mui/icons-material";
import SectionCard from "@/components/common/SectionCard";
import { patients } from "@/lib/mockData";
import { usePersistentState } from "@/lib/usePersistentState";
import { api } from "@/lib/api";
import { useDataMode } from "@/lib/dataMode";

const seedExercises = [
  { id: 1, name: "Knee Flexion AROM", protocol: "ACL Rehab", sets: 3, reps: 12, focus: "Mobility", color: "#f0b84b", instructions: "Slow controlled flexion through a pain-free range." },
  { id: 2, name: "Single-Leg Balance", protocol: "Ankle Sprain", sets: 3, reps: 30, focus: "Proprioception", color: "#e18a42", instructions: "Hold a stable single-leg stance for 30 seconds." },
  { id: 3, name: "Hip Bridge", protocol: "Low Back", sets: 3, reps: 15, focus: "Strength", color: "#c6a447", instructions: "Lift the pelvis while maintaining a neutral spine." },
  { id: 4, name: "Shoulder ER", protocol: "Rotator Cuff", sets: 3, reps: 12, focus: "Stability", color: "#d36f8b", instructions: "Keep the elbow tucked and rotate without trunk movement." },
  { id: 5, name: "Heel Raises", protocol: "Achilles", sets: 3, reps: 15, focus: "Strength", color: "#e36f5c", instructions: "Rise evenly through the forefoot, then lower slowly." },
  { id: 6, name: "Step-Ups", protocol: "Knee OA", sets: 3, reps: 10, focus: "Function", color: "#c76445", instructions: "Keep the knee aligned over the second toe." },
];

type ExerciseRecord = (typeof seedExercises)[number];
type ApiExercise = {
  id: number;
  code: string;
  name: string;
  category?: string | null;
  default_reps: number;
  default_sets: number;
  instructions?: string | null;
};
type PatientChoice = { id: number; name: string; mrn: string };

function exerciseFromApi(item: ApiExercise): ExerciseRecord {
  return {
    id: item.id,
    name: item.name,
    protocol: item.code,
    sets: item.default_sets,
    reps: item.default_reps,
    focus: item.category || "General",
    color: "#22d3ee",
    instructions: item.instructions || "Follow the therapist's prescribed technique.",
  };
}

export default function ExercisesPage() {
  const [demoExercises, setDemoExercises] = usePersistentState("physiovision.exercises", seedExercises);
  const [liveExercises, setLiveExercises] = useState<ExerciseRecord[]>([]);
  const [livePatients, setLivePatients] = useState<PatientChoice[]>([]);
  const { mode } = useDataMode();
  const exercises = mode === "demo" ? demoExercises : liveExercises;
  const patientChoices = mode === "demo" ? patients : livePatients;
  const [newOpen, setNewOpen] = useState(false);
  const [demo, setDemo] = useState<(typeof seedExercises)[number] | null>(null);
  const [prescribe, setPrescribe] = useState<(typeof seedExercises)[number] | null>(null);
  const [patientId, setPatientId] = useState(String(patients[0].id));
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", protocol: "", sets: "3", reps: "10", focus: "Strength", instructions: "" });
  useEffect(() => {
    if (mode !== "live") return;
    Promise.all([
      api<ApiExercise[]>("/exercises"),
      api<Array<{ id: number; full_name: string; mrn: string }>>("/patients"),
    ])
      .then(([exerciseItems, patientItems]) => {
        setLiveExercises(exerciseItems.map(exerciseFromApi));
        const choices = patientItems.map((item) => ({ id: item.id, name: item.full_name, mrn: item.mrn }));
        setLivePatients(choices);
        if (choices[0]) setPatientId(String(choices[0].id));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load real data."));
  }, [mode]);

  const createExercise = async () => {
    if (!form.name.trim() || !form.protocol.trim()) {
      setMessage("Exercise name and protocol are required.");
      return;
    }
    const next = {
      id: Math.max(0, ...exercises.map((item) => item.id)) + 1,
      name: form.name.trim(),
      protocol: form.protocol.trim(),
      sets: Math.max(1, Number(form.sets) || 1),
      reps: Math.max(1, Number(form.reps) || 1),
      focus: form.focus,
      instructions: form.instructions.trim() || "Follow the therapist's prescribed technique.",
      color: "#22d3ee",
    };
    if (mode === "live") {
      try {
        const created = await api<ApiExercise>("/exercises", {
          method: "POST",
          body: JSON.stringify({
            code: next.protocol.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
            name: next.name,
            category: next.focus,
            default_sets: next.sets,
            default_reps: next.reps,
            instructions: next.instructions,
          }),
        });
        setLiveExercises((current) => [...current, exerciseFromApi(created)]);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not create the exercise.");
        return;
      }
    } else {
      setDemoExercises((current) => [...current, next]);
    }
    setNewOpen(false);
    setForm({ name: "", protocol: "", sets: "3", reps: "10", focus: "Strength", instructions: "" });
    setMessage(`${next.name} was added to the library.`);
  };

  const savePrescription = async () => {
    if (!prescribe) return;
    const patient = patientChoices.find((item) => item.id === Number(patientId));
    if (!patient) {
      setMessage("Add a real patient before creating a prescription.");
      return;
    }
    if (mode === "live") {
      try {
        await api("/exercises/prescriptions", {
          method: "POST",
          body: JSON.stringify({
            patient_id: Number(patientId),
            exercise_id: prescribe.id,
            reps: prescribe.reps,
            sets: prescribe.sets,
            frequency_per_week: 3,
          }),
        });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save the prescription.");
        return;
      }
    } else {
      const saved = JSON.parse(localStorage.getItem("physiovision.prescriptions") || "[]");
      localStorage.setItem("physiovision.prescriptions", JSON.stringify([
        ...saved,
        { id: Date.now(), patientId: Number(patientId), exerciseId: prescribe.id, createdAt: new Date().toISOString() },
      ]));
    }
    setPrescribe(null);
    setMessage(`${prescribe.name} prescribed to ${patient?.name}.`);
  };

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>Exercise Library</Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5 }}>{exercises.length} protocols · {mode === "demo" ? "demo dataset" : "database records"}</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setNewOpen(true)}>New Exercise</Button>
      </Stack>

      <Grid container spacing={2.5}>
        {exercises.map((exercise) => (
          <Grid item xs={12} sm={6} lg={4} key={exercise.id}>
            <SectionCard
              title={exercise.name}
              subtitle={exercise.protocol}
              icon={<FitnessCenter sx={{ fontSize: 20 }} />}
              action={<Chip label={exercise.focus} size="small" sx={{ bgcolor: exercise.color + "22", color: exercise.color, fontWeight: 700, border: `1px solid ${exercise.color}40` }} />}
            >
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: 2, background: `${exercise.color}1a`, border: `1px solid ${exercise.color}40`, color: exercise.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FitnessCenter sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>Prescription</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{exercise.sets} × {exercise.reps}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button fullWidth variant="outlined" startIcon={<PlayCircle />} onClick={() => setDemo(exercise)} sx={{ borderColor: "rgba(34,211,238,0.35)", color: "#22d3ee" }}>Demo</Button>
                <Button fullWidth variant="contained" startIcon={<Assignment />} onClick={() => setPrescribe(exercise)}>Prescribe</Button>
              </Stack>
            </SectionCard>
          </Grid>
        ))}
      </Grid>

      <Dialog open={newOpen} onClose={() => setNewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New exercise</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Exercise name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
            <TextField label="Protocol" value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })} required />
            <Stack direction="row" spacing={2}>
              <TextField fullWidth type="number" label="Sets" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} inputProps={{ min: 1 }} />
              <TextField fullWidth type="number" label="Reps / seconds" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} inputProps={{ min: 1 }} />
            </Stack>
            <TextField select label="Focus" value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })}>
              {["Mobility", "Strength", "Stability", "Proprioception", "Function"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
            <TextField multiline minRows={3} label="Instructions" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setNewOpen(false)}>Cancel</Button><Button variant="contained" onClick={createExercise}>Create</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(demo)} onClose={() => setDemo(null)} fullWidth maxWidth="sm">
        <DialogTitle>{demo?.name} demo</DialogTitle>
        <DialogContent>
          <Box sx={{ height: 220, borderRadius: 2, bgcolor: "rgba(34,211,238,.08)", display: "grid", placeItems: "center", mb: 2 }}>
            <FitnessCenter sx={{ fontSize: 82, color: demo?.color }} />
          </Box>
          <Typography>{demo?.instructions}</Typography>
          <Typography color="text.secondary" mt={1}>Prescription: {demo?.sets} sets × {demo?.reps} reps/seconds</Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setDemo(null)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(prescribe)} onClose={() => setPrescribe(null)} fullWidth maxWidth="xs">
        <DialogTitle>Prescribe {prescribe?.name}</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Patient" value={patientId} onChange={(e) => setPatientId(e.target.value)} sx={{ mt: 1 }}>
            {patientChoices.map((patient) => <MenuItem key={patient.id} value={String(patient.id)}>{patient.name} · {patient.mrn}</MenuItem>)}
          </TextField>
          <Typography color="text.secondary" mt={2}>{prescribe?.sets} sets × {prescribe?.reps} reps/seconds</Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setPrescribe(null)}>Cancel</Button><Button variant="contained" onClick={savePrescription}>Prescribe</Button></DialogActions>
      </Dialog>

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage("")}>
        <Alert severity={message.includes("required") ? "error" : "success"} onClose={() => setMessage("")}>{message}</Alert>
      </Snackbar>
    </Box>
  );
}
