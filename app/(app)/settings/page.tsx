"use client";

import { Box, Grid, Stack, Typography, Switch, TextField, Button, Chip, FormControlLabel } from "@mui/material";
import { Save, CloudDone, IntegrationInstructions, Notifications } from "@mui/icons-material";
import SectionCard from "@/components/common/SectionCard";

export default function SettingsPage() {
  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 3 }}>
        Settings & Clinic Management
      </Typography>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={6}>
          <Stack spacing={2.5}>
            <SectionCard title="Clinic Profile" subtitle="Orchard Rehab · Singapore">
              <Stack spacing={1.5}>
                <TextField size="small" label="Clinic Name" defaultValue="Orchard Rehab" sx={fieldSx} />
                <TextField size="small" label="Timezone" defaultValue="Asia/Singapore" sx={fieldSx} />
                <TextField size="small" label="Subscription Plan" value="Pro" InputProps={{ readOnly: true }} sx={fieldSx} />
                <Box><Chip icon={<CloudDone />} label="Cloud Sync: Active" sx={{ bgcolor: "rgba(16,217,126,0.12)", color: "#10d97e", border: "1px solid rgba(16,217,126,0.3)" }} /></Box>
              </Stack>
            </SectionCard>

            <SectionCard title="Integrations" subtitle="Hospital EMR connectivity">
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IntegrationInstructions sx={{ color: "#22d3ee" }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>FHIR R4</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Exchange DocumentReference resources</Typography>
                  </Box>
                  <Chip label="Connected" size="small" sx={{ bgcolor: "rgba(16,217,126,0.12)", color: "#10d97e" }} />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IntegrationInstructions sx={{ color: "#22d3ee" }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>HL7 v2</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>ADT / ORU lab feeds</Typography>
                  </Box>
                  <Chip label="Connected" size="small" sx={{ bgcolor: "rgba(16,217,126,0.12)", color: "#10d97e" }} />
                </Stack>
                <TextField size="small" label="FHIR Endpoint" defaultValue="https://fhir.orchardhealth.sg" sx={fieldSx} />
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Stack spacing={2.5}>
            <SectionCard title="Notifications" subtitle="Alert delivery channels">
              <Stack spacing={1}>
                <FormControlLabel control={<Switch defaultChecked sx={{ color: "#22d3ee" }} />} label="Telegram alerts (Risk Agent)" />
                <FormControlLabel control={<Switch defaultChecked sx={{ color: "#22d3ee" }} />} label="Dashboard banners" />
                <FormControlLabel control={<Switch sx={{ color: "#22d3ee" }} />} label="SMS to therapist on critical" />
                <FormControlLabel control={<Switch defaultChecked sx={{ color: "#22d3ee" }} />} label="Weekly progress digest" />
              </Stack>
            </SectionCard>

            <SectionCard title="AI Agents" subtitle="Enable / disable agent pipeline">
              <Stack spacing={1}>
                {["Movement Analysis", "Risk Assessment", "Rehab Coach", "Therapist Assistant", "SOAP Report", "Analytics"].map((a) => (
                  <FormControlLabel key={a} control={<Switch defaultChecked sx={{ color: "#22d3ee" }} />} label={a} />
                ))}
              </Stack>
            </SectionCard>

            <SectionCard title="Edge Fleet" subtitle="Raspberry Pi nodes">
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {["pi-cam-01", "pi-cam-02", "pi-cam-03", "pi-cam-04"].map((n) => (
                  <Chip key={n} label={`${n} · online`} size="small" sx={{ bgcolor: "rgba(16,217,126,0.12)", color: "#10d97e" }} />
                ))}
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" startIcon={<Save />}>Save Changes</Button>
      </Box>
    </Box>
  );
}

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "rgba(34,211,238,0.25)" },
    "&:hover fieldset": { borderColor: "rgba(34,211,238,0.5)" },
    "&.Mui-focused fieldset": { borderColor: "#22d3ee" },
    background: "rgba(11,30,51,0.5)",
  },
};
