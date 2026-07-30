"use client";

import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, FormControlLabel, Grid, Snackbar,
  Stack, Switch, TextField, Typography,
} from "@mui/material";
import { CloudDone, IntegrationInstructions, Save } from "@mui/icons-material";
import SectionCard from "@/components/common/SectionCard";
import { usePersistentState } from "@/lib/usePersistentState";
import { api } from "@/lib/api";
import { useDataMode } from "@/lib/dataMode";

const defaultAgents = {
  "Movement Analysis": true,
  "Risk Assessment": true,
  "Rehab Coach": true,
  "Therapist Assistant": true,
  "SOAP Report": true,
  Analytics: true,
} as Record<string, boolean>;

const demoPreferences = {
  notifications: { telegram: true, banners: true, sms: false, digest: true },
  agents: defaultAgents,
};

const realPreferences = {
  notifications: { telegram: false, banners: false, sms: false, digest: false },
  agents: defaultAgents,
};

const demoSettings = {
  clinicName: "Orchard Rehab",
  timezone: "Asia/Singapore",
  plan: "Pro",
  fhirEndpoint: "https://fhir.orchardhealth.sg",
  hl7Endpoint: "",
  ...demoPreferences,
};

const emptySettings = {
  clinicName: "",
  timezone: "Asia/Hong_Kong",
  plan: "",
  fhirEndpoint: "",
  hl7Endpoint: "",
  ...realPreferences,
};

type SettingsState = typeof demoSettings;
type ClinicProfile = {
  id: number;
  name: string;
  timezone: string;
  fhir_endpoint?: string | null;
  hl7_endpoint?: string | null;
};
type Subscription = { plan: string };
type UserPreferences = {
  notifications: SettingsState["notifications"];
  agents: Record<string, boolean>;
};

const formatPlan = (plan: string) =>
  plan ? `${plan.charAt(0).toUpperCase()}${plan.slice(1)}` : "Not assigned";

export default function SettingsPage() {
  const { mode, ready: modeReady } = useDataMode();
  const [savedDemo, setSavedDemo, demoReady] = usePersistentState(
    "physiovision.settings",
    demoSettings
  );
  const [draft, setDraft] = useState<SettingsState>(emptySettings);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!modeReady) return;
    if (mode === "demo") {
      if (!demoReady) return;
      setDraft(savedDemo);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      api<ClinicProfile>("/clinic/profile"),
      api<Subscription>("/clinic/subscription"),
      api<UserPreferences>("/auth/preferences"),
    ])
      .then(([clinic, subscription, preferences]) => {
        setDraft({
          ...emptySettings,
          clinicName: clinic.name,
          timezone: clinic.timezone,
          plan: formatPlan(subscription.plan),
          fhirEndpoint: clinic.fhir_endpoint || "",
          hl7Endpoint: clinic.hl7_endpoint || "",
          notifications: {
            ...realPreferences.notifications,
            ...preferences.notifications,
          },
          agents: {
            ...defaultAgents,
            ...preferences.agents,
          },
        });
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Could not load clinic settings.");
      })
      .finally(() => setLoading(false));
  }, [demoReady, mode, modeReady, savedDemo]);

  const save = async () => {
    if (!draft.clinicName.trim() || !draft.timezone.trim()) {
      setMessage("Clinic name and timezone are required.");
      return;
    }
    if (draft.fhirEndpoint && !/^https?:\/\//i.test(draft.fhirEndpoint)) {
      setMessage("FHIR endpoint must start with http:// or https://.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "demo") {
        setSavedDemo(draft);
      } else {
        const [clinic, preferences] = await Promise.all([
          api<ClinicProfile>("/clinic/profile", {
            method: "PATCH",
            body: JSON.stringify({
              name: draft.clinicName,
              timezone: draft.timezone,
              fhir_endpoint: draft.fhirEndpoint || null,
              hl7_endpoint: draft.hl7Endpoint || null,
            }),
          }),
          api<UserPreferences>("/auth/preferences", {
            method: "PATCH",
            body: JSON.stringify({
              notifications: draft.notifications,
              agents: draft.agents,
            }),
          }),
        ]);
        setDraft((current) => ({
          ...current,
          clinicName: clinic.name,
          timezone: clinic.timezone,
          fhirEndpoint: clinic.fhir_endpoint || "",
          hl7Endpoint: clinic.hl7_endpoint || "",
          notifications: preferences.notifications,
          agents: {
            ...defaultAgents,
            ...preferences.agents,
          },
        }));
      }
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save clinic settings.");
    } finally {
      setLoading(false);
    }
  };

  const toggleNotification = (key: keyof typeof draft.notifications) =>
    setDraft({
      ...draft,
      notifications: {
        ...draft.notifications,
        [key]: !draft.notifications[key],
      },
    });

  const integrationRows = [
    {
      name: "FHIR R4",
      description: "Exchange DocumentReference resources",
      configured: Boolean(draft.fhirEndpoint),
    },
    {
      name: "HL7 v2",
      description: "ADT / ORU lab feeds",
      configured: Boolean(draft.hl7Endpoint),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2} mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
          Settings & Clinic Management
        </Typography>
        <Button disabled={loading} variant="contained" startIcon={<Save />} onClick={save} sx={{ alignSelf: { xs: "stretch", sm: "center" }, flexShrink: 0 }}>
          Save Changes
        </Button>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={6}>
          <Stack spacing={2.5}>
            <SectionCard title="Clinic Profile" subtitle={`${draft.clinicName || "Unnamed clinic"} · ${draft.timezone}`}>
              <Stack spacing={1.5}>
                <TextField disabled={loading} size="small" label="Clinic Name" value={draft.clinicName} onChange={(e) => setDraft({ ...draft, clinicName: e.target.value })} sx={fieldSx} />
                <TextField disabled={loading} size="small" label="Timezone" value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} sx={fieldSx} />
                <TextField size="small" label="Subscription Plan" value={draft.plan} InputProps={{ readOnly: true }} sx={fieldSx} />
                <Box>
                  <Chip
                    icon={<CloudDone />}
                    label={mode === "demo" ? "Demo profile" : "Database Sync: Active"}
                    sx={{ bgcolor: "rgba(16,217,126,0.12)", color: "#10d97e", border: "1px solid rgba(16,217,126,0.3)" }}
                  />
                </Box>
              </Stack>
            </SectionCard>

            <SectionCard title="Integrations" subtitle="Hospital EMR connectivity">
              <Stack spacing={1.5}>
                {integrationRows.map(({ name, description, configured }) => (
                  <Stack key={name} direction="row" alignItems="center" spacing={1}>
                    <IntegrationInstructions sx={{ color: configured ? "#22d3ee" : "text.secondary" }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>{description}</Typography>
                    </Box>
                    <Chip
                      label={configured ? "Configured" : "Not configured"}
                      size="small"
                      sx={{
                        bgcolor: configured ? "rgba(16,217,126,0.12)" : "rgba(148,163,184,0.12)",
                        color: configured ? "#10d97e" : "text.secondary",
                      }}
                    />
                  </Stack>
                ))}
                <TextField
                  disabled={loading}
                  size="small"
                  label="FHIR Endpoint"
                  placeholder="Not configured"
                  value={draft.fhirEndpoint}
                  onChange={(e) => setDraft({ ...draft, fhirEndpoint: e.target.value })}
                  sx={fieldSx}
                />
              </Stack>
            </SectionCard>

            <SectionCard title="Edge Fleet" subtitle="Raspberry Pi nodes">
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {(mode === "demo" ? ["pi-cam-01", "pi-cam-02", "pi-cam-03", "pi-cam-04"] : []).map((node) => (
                  <Chip key={node} label={`${node} · online`} size="small" sx={{ bgcolor: "rgba(16,217,126,0.12)", color: "#10d97e" }} />
                ))}
                {mode === "live" && <Typography color="text.secondary">No edge nodes registered.</Typography>}
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
        <Alert severity={message === "Settings saved." ? "success" : "error"} onClose={() => setMessage("")}>
          {message}
        </Alert>
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
