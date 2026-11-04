"use client";

import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, FormControlLabel, Grid, Snackbar,
  Stack, Switch, TextField, Typography,
} from "@mui/material";
import { CloudDone, Save } from "@mui/icons-material";
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

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2} mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
          Settings
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
                    sx={{ bgcolor: "rgba(21,128,61,0.12)", color: "#15803D", border: "1px solid rgba(21,128,61,0.3)" }}
                  />
                </Box>
              </Stack>
            </SectionCard>


          </Stack>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Stack spacing={2.5}>
            <SectionCard title="Notifications" subtitle="Alert delivery channels">
              <Stack spacing={1}>
                {([
                  ["telegram", "Telegram alerts (fault clips and session summaries)"],
                  ["banners", "Dashboard banners"],
                ] as const).map(([key, label]) => (
                  <FormControlLabel key={key} control={<Switch checked={draft.notifications[key]} onChange={() => toggleNotification(key)} />} label={label} />
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
    "& fieldset": { borderColor: "rgba(15,118,110,0.25)" },
    "&:hover fieldset": { borderColor: "rgba(15,118,110,0.5)" },
    "&.Mui-focused fieldset": { borderColor: "#0F766E" },
    background: "#F8FAFC",
  },
};
