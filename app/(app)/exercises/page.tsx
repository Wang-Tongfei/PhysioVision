"use client";

import { Box, Grid, Stack, Typography, Chip, Button } from "@mui/material";
import { FitnessCenter, PlayCircle, Assignment, Add } from "@mui/icons-material";
import SectionCard from "@/components/common/SectionCard";

const exercises = [
  { name: "Knee Flexion AROM", protocol: "ACL Rehab", sets: "3×12", focus: "Mobility", color: "#22d3ee" },
  { name: "Single-Leg Balance", protocol: "Ankle Sprain", sets: "3×30s", focus: "Proprioception", color: "#10d97e" },
  { name: "Hip Bridge", protocol: "Low Back", sets: "3×15", focus: "Strength", color: "#f5b73b" },
  { name: "Shoulder ER", protocol: "Rotator Cuff", sets: "3×12", focus: "Stability", color: "#a78bfa" },
  { name: "Heel Raises", protocol: "Achilles", sets: "3×15", focus: "Strength", color: "#3b82f6" },
  { name: "Step-Ups", protocol: "Knee OA", sets: "3×10", focus: "Function", color: "#22d3ee" },
];

export default function ExercisesPage() {
  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            Exercise Library
          </Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
            {exercises.length} protocols · prescribed & tracked via pose AI
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />}>New Exercise</Button>
      </Stack>

      <Grid container spacing={2.5}>
        {exercises.map((e) => (
          <Grid item xs={12} sm={6} lg={4} key={e.name}>
            <SectionCard
              title={e.name}
              subtitle={e.protocol}
              icon={<FitnessCenter sx={{ fontSize: 20 }} />}
              action={<Chip label={e.focus} size="small" sx={{ bgcolor: e.color + "22", color: e.color, fontWeight: 700, border: `1px solid ${e.color}40` }} />}
            >
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                <Box
                  sx={{
                    width: 56, height: 56, borderRadius: 2,
                    background: `${e.color}1a`, border: `1px solid ${e.color}40`, color: e.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <FitnessCenter sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>Prescription</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{e.sets}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button fullWidth variant="outlined" startIcon={<PlayCircle />} sx={{ borderColor: "rgba(34,211,238,0.35)", color: "#22d3ee" }}>
                  Demo
                </Button>
                <Button fullWidth variant="contained" startIcon={<Assignment />}>
                  Prescribe
                </Button>
              </Stack>
            </SectionCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
