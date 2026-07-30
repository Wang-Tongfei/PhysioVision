"use client";

import { Box, Grid, Stack, Typography, Chip, Avatar, Button, TextField, InputAdornment } from "@mui/material";
import { Search, PersonAdd, EmojiEvents, LocalHospital, People } from "@mui/icons-material";
import SectionCard from "@/components/common/SectionCard";
import EChart from "@/components/charts/EChart";
import { lineOption } from "@/components/charts/chartOptions";
import { patients } from "@/lib/mockData";

const riskColor: Record<string, string> = {
  Low: "#10d97e", Moderate: "#f5b73b", High: "#ef5b5b",
};

export default function PatientsPage() {
  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            Patients
          </Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
            {patients.length} active patients under your care
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Search patient / MRN"
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
          <Button variant="contained" startIcon={<PersonAdd />}>Add Patient</Button>
        </Stack>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <Grid container spacing={2.5}>
            {patients.map((p) => (
              <Grid item xs={12} md={6} key={p.id}>
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
              </Grid>
            ))}
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
    </Box>
  );
}
