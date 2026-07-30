"use client";

import { useState } from "react";
import {
  Alert, Box, Button, Chip, FormControlLabel, Grid, Snackbar,
  Stack, Switch, TextField, Typography,
} from "@mui/material";
import { CloudDone, IntegrationInstructions, Save } from "@mui/icons-material";
import SectionCard from "@/components/common/SectionCard";
import { usePersistentState } from "@/lib/usePersistentState";

const initialSettings = {
  clinicName: "Orchard Rehab",
  timezone: "Asia/Singapore",
  plan: "Pro",
  fhirEndpoint: "https://fhir.orchardhealth.sg",
  notifications: { telegram: true, banners: true, sms: false, digest: true },
  agents: {
    "Movement Analysis": true, "Risk Assessment": true, "Rehab Coach": true,
    "Therapist Assistant": true, "SOAP Report": true, Analytics: true,
  } as Record<string, boolean>,
};

export default function SettingsPage() {
  const [saved, setSaved] = usePersistentState("physiovision.settings", initialSettings);
  const [draft, setDraft] = useState(saved);
  const [hydratedKey, setHydratedKey] = useState("");
  const [message, setMessage] = useState("");
  const savedKey = JSON.stringify(saved);
  if (hydratedKey !== savedKey) {
    setHydratedKey(savedKey);
    setDraft(saved);
  }

  const save = () => {
    if (!draft.clinicName.trim() || !draft.timezone.trim()) {
      setMessage("Clinic name and timezone are required.");
      return;
    }
    if (draft.fhirEndpoint && !/^https?:\/\//i.test(draft.fhirEndpoint)) {
      setMessage("FHIR endpoint must start with http:// or https://.");
      return;
    }
    setSaved(draft);
    setMessage("Settings saved.");
  };

  const toggleNotification = (key: keyof typeof draft.notifications) =>
    setDraft({ ...draft, notifications: { ...draft.notifications, [key]: !draft.notifications[key] } });

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2} mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>Settings & Clinic Management</Typography>
        <Button variant="contained" startIcon={<Save />} onClick={save} sx={{ alignSelf: { xs: "stretch", sm: "center" }, flexShrink: 0 }}>Save Changes</Button>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={6}>
          <Stack spacing={2.5}>
            <SectionCard title="Clinic Profile" subtitle={`${draft.clinicName} · ${draft.timezone}`}>
              <Stack spacing={1.5}>
                <TextField size="small" label="Clinic Name" value={draft.clinicName} onChange={(e) => setDraft({ ...draft, clinicName: e.target.value })} sx={fieldSx} />
                <TextField size="small" label="Timezone" value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} sx={fieldSx} />
                <TextField size="small" label="Subscription Plan" value={draft.plan} InputProps={{ readOnly: true }} sx={fieldSx} />
                <Box><Chip icon={<CloudDone />} label="Local Sync: Active" sx={{ bgcolor: "rgba(16,217,126,0.12)", color: "#10d97e", border: "1px solid rgba(16,217,126,0.3)" }} /></Box>
              </Stack>
            </SectionCard>

            <SectionCard title="Integrations" subtitle="Hospital EMR connectivity">
              <Stack spacing={1.5}>
                {[
                  ["FHIR R4", "Exchange DocumentReference resources"],
                  ["HL7 v2", "ADT / ORU lab feeds"],
                ].map(([name, description]) => (
                  <Stack key={name} direction="row" alignItems="center" spacing={1}>
                    <IntegrationInstructions sx={{ color: "#22d3ee" }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>{description}</Typography>
                    </Box>
                    <Chip label="Configured" size="small" sx={{ bgcolor: "rgba(16,217,126,0.12)", color: "#10d97e" }} />
                  </Stack>
                ))}
                <TextField size="small" label="FHIR Endpoint" value={draft.fhirEndpoint} onChange={(e) => setDraft({ ...draft, fhirEndpoint: e.target.value })} sx={fieldSx} />
              </Stack>
            </SectionCard>

            <SectionCard title="Edge Fleet" subtitle="Raspberry Pi nodes">
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {["pi-cam-01", "pi-cam-02", "pi-cam-03", "pi-cam-04"].map((node) => (
                  <Chip key={node} label={`${node} · online`} size="small" sx={{ bgcolor: "rgba(16,217,126,0.12)", color: "#10d97e" }} />
                ))}
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Stack spacing={2.5}>
            <SectionCard title="Notifications" subtitle="Alert delivery channels">
              <Stack spacing={1}>
                {([
                  ["telegram", "Telegram alerts (Risk Agent)"],
                  ["banners", "Dashboard banners"],
                  ["sms", "SMS to therapist on critical"],
                  ["digest", "Weekly progress digest"],
                ] as const).map(([key, label]) => (
                  <FormControlLabel key={key} control={<Switch checked={draft.notifications[key]} onChange={() => toggleNotification(key)} />} label={label} />
                ))}
              </Stack>
            </SectionCard>

            <SectionCard title="AI Agents" subtitle="Enable / disable agent pipeline">
              <Stack spacing={1}>
                {Object.entries(draft.agents).map(([name, enabled]) => (
                  <FormControlLabel
                    key={name}
                    control={<Switch checked={enabled} onChange={() => setDraft({ ...draft, agents: { ...draft.agents, [name]: !enabled } })} />}
                    label={name}
                  />
                ))}
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage("")}>
        <Alert severity={message === "Settings saved." ? "success" : "error"} onClose={() => setMessage("")}>{message}</Alert>
      </Snackbar>
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
