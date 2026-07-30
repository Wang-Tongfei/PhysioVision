"use client";

import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, Grid, MenuItem, Snackbar, Stack, TextField,
  Typography,
} from "@mui/material";
import { AutoAwesome, Download, NoteAdd, SyncProblem, VerifiedUser, Warning } from "@mui/icons-material";
import SectionCard from "@/components/common/SectionCard";
import GaugeRing from "@/components/common/GaugeRing";
import { aiRecommendation, alerts as mockAlerts, patients, reports as seedReports } from "@/lib/mockData";
import { usePersistentState } from "@/lib/usePersistentState";
import { api } from "@/lib/api";
import { useDataMode } from "@/lib/dataMode";

const severityColor: Record<string, string> = { critical: "#ef5b5b", warning: "#f5b73b", info: "#22d3ee" };
const DEFAULT_RECORDER = "Dr. Sarah Kim, PT";

interface SoapReport {
  id: number;
  patient: string;
  date: string;
  type: string;
  quality: number;
  risk: string;
  plan: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  visitDateTime?: string;
  author?: string;
  signature?: string;
  authenticated?: boolean;
  authenticatedAt?: string;
}

interface ApiReport {
  id: number;
  patient_id: number;
  title?: string;
  soap: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    visit_datetime?: string;
    author?: string;
    signature?: string;
    authenticated_at?: string;
  };
  generated_by?: string;
  created_at?: string;
}

interface DisplayAlert {
  id: number;
  patient: string;
  severity: "critical" | "warning" | "info";
  type: string;
  msg: string;
}

interface TherapistDecision {
  available: boolean;
  session_id?: number;
  patient_name?: string;
  movement_quality_score?: number;
  risk_score?: number;
  summary?: string;
  suggested_plan?: string;
  needs_review?: boolean;
}

const localDateTime = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

const newSoapForm = () => ({
  patient: patients[0].name,
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  visitDateTime: localDateTime(),
  author: DEFAULT_RECORDER,
  signature: DEFAULT_RECORDER,
  certified: false,
});

const initialReports: SoapReport[] = seedReports.map((report) => ({
  ...report,
  visitDateTime: `${report.date}T09:00`,
  author: DEFAULT_RECORDER,
  signature: DEFAULT_RECORDER,
  authenticated: true,
  authenticatedAt: `${report.date}T09:05:00`,
}));

export default function ReportsPage() {
  const [demoReports, setDemoReports] = usePersistentState<SoapReport[]>("physiovision.reports", initialReports);
  const [liveReports, setLiveReports] = useState<SoapReport[]>([]);
  const [patientChoices, setPatientChoices] = useState(patients);
  const [liveAlerts, setLiveAlerts] = useState<DisplayAlert[]>([]);
  const [assistant, setAssistant] = useState<TherapistDecision | null>(null);
  const { mode } = useDataMode();
  const reports = mode === "demo" ? demoReports : liveReports;
  const updateReports = (updater: (current: SoapReport[]) => SoapReport[]) => {
    if (mode === "demo") setDemoReports(updater);
    else setLiveReports(updater);
  };
  const [soapOpen, setSoapOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [soap, setSoap] = useState(newSoapForm);
  const [autoPatient, setAutoPatient] = useState(patients[0].name);
  const [signing, setSigning] = useState<SoapReport | null>(null);
  const [signer, setSigner] = useState(DEFAULT_RECORDER);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (mode === "demo") {
      setPatientChoices(patients);
      return;
    }
    Promise.all([
      api<Array<{ id: number; full_name: string; mrn: string; risk_tier: string }>>("/patients"),
      api<ApiReport[]>("/reports"),
      api<Array<{
        id: number;
        patient_id?: number;
        severity: "critical" | "warning" | "info";
        type?: string;
        message: string;
      }>>("/alerts?unack=true"),
      api<TherapistDecision>("/analytics/clinic/assistant"),
    ])
      .then(([patientRows, reportRows, alertRows, assistantRow]) => {
        const choices = patientRows.map((patient) => ({
          id: patient.id,
          name: patient.full_name,
          mrn: patient.mrn,
          age: 0,
          diagnosis: "Database record",
          risk: `${patient.risk_tier.charAt(0).toUpperCase()}${patient.risk_tier.slice(1)}`,
          score: 0,
          adherence: 0,
          last: "Database",
          trend: [0, 0, 0, 0, 0, 0],
        }));
        setPatientChoices(choices);
        const names = new Map(choices.map((patient) => [patient.id, patient.name]));
        setLiveAlerts(alertRows.map((alert) => ({
          id: alert.id,
          patient: names.get(alert.patient_id ?? -1) || "Patient",
          severity: alert.severity,
          type: alert.type || "Risk",
          msg: alert.message,
        })));
        setAssistant(assistantRow);
        setLiveReports(reportRows.map((report) => ({
          id: report.id,
          patient: names.get(report.patient_id) || `Patient ${report.patient_id}`,
          date: (report.soap.visit_datetime || report.created_at || "").slice(0, 10),
          type: report.generated_by === "therapist" ? "Manual" : "SOAP Auto",
          quality: 0,
          risk: "Unknown",
          plan: report.soap.plan || "",
          subjective: report.soap.subjective,
          objective: report.soap.objective,
          assessment: report.soap.assessment,
          visitDateTime: report.soap.visit_datetime,
          author: report.soap.author,
          signature: report.soap.signature,
          authenticated: Boolean(report.soap.authenticated_at),
          authenticatedAt: report.soap.authenticated_at,
        })));
        if (choices[0]) {
          setSoap((current) => ({ ...current, patient: choices[0].name }));
          setAutoPatient(choices[0].name);
        }
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load real reports."));
  }, [mode]);

  const createSoap = async () => {
    if (!soap.subjective.trim() || !soap.objective.trim() || !soap.assessment.trim() || !soap.plan.trim()) {
      setMessage("Complete all SOAP sections before saving.");
      return;
    }
    if (!soap.visitDateTime || !soap.author.trim() || !soap.signature.trim()) {
      setMessage("Visit time, recorder identity and signature are required.");
      return;
    }
    if (!soap.certified) {
      setMessage("Authenticate the note before saving.");
      return;
    }
    const patient = patientChoices.find((item) => item.name === soap.patient);
    if (!patient) {
      setMessage("Add a patient before saving a SOAP note.");
      return;
    }
    let savedId = Math.max(0, ...reports.map((item) => item.id)) + 1;
    if (mode === "live") {
      try {
        const saved = await api<ApiReport>("/reports/soap", {
          method: "POST",
          body: JSON.stringify({
            patient_id: patient.id,
            subjective: soap.subjective,
            objective: soap.objective,
            assessment: soap.assessment,
            plan: soap.plan,
            visit_datetime: new Date(soap.visitDateTime).toISOString(),
            author: soap.author,
            signature: soap.signature,
            authenticated_at: new Date().toISOString(),
          }),
        });
        savedId = saved.id;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save the SOAP note.");
        return;
      }
    }
    updateReports((current) => [{
      id: savedId,
      patient: soap.patient,
      date: soap.visitDateTime.slice(0, 10),
      type: "Manual",
      quality: patient.score,
      risk: patient.risk,
      plan: soap.plan.trim(),
      subjective: soap.subjective.trim(),
      objective: soap.objective.trim(),
      assessment: soap.assessment.trim(),
      visitDateTime: soap.visitDateTime,
      author: soap.author.trim(),
      signature: soap.signature.trim(),
      authenticated: true,
      authenticatedAt: new Date().toISOString(),
    }, ...current]);
    setSoapOpen(false);
    setSoap({ ...newSoapForm(), patient: patientChoices[0]?.name || "" });
    setMessage("SOAP note saved and authenticated.");
  };

  const generateReport = () => {
    const patient = patientChoices.find((item) => item.name === autoPatient)!;
    updateReports((current) => [{
      id: Math.max(0, ...current.map((item) => item.id)) + 1,
      patient: patient.name,
      date: new Date().toISOString().slice(0, 10),
      type: "SOAP Auto",
      quality: patient.score,
      risk: patient.risk,
      plan: patient.risk === "High" ? "Reduce load and schedule therapist review." : "Continue protocol and progress when movement quality remains stable.",
      subjective: "AI-generated draft; patient-reported status requires therapist review.",
      objective: `Movement quality ${patient.score}/100; adherence ${patient.adherence}%.`,
      assessment: `${patient.risk} risk based on the latest available movement data.`,
      visitDateTime: localDateTime(),
      author: "PhysioVision SOAP Agent",
      authenticated: false,
    }, ...current]);
    setAutoOpen(false);
    setMessage(`Auto report generated for ${patient.name}.`);
  };

  const authenticateReport = () => {
    if (!signing || !signer.trim()) {
      setMessage("Recorder identity and signature are required.");
      return;
    }
    const signedAt = new Date().toISOString();
    updateReports((current) => current.map((report) =>
      report.id === signing.id
        ? {
            ...report,
            author: signer.trim(),
            signature: signer.trim(),
            authenticated: true,
            authenticatedAt: signedAt,
          }
        : report
    ));
    setSigning(null);
    setMessage("SOAP note signed and authenticated.");
  };

  const downloadFhir = (report: SoapReport) => {
    const resource = {
      resourceType: "DocumentReference",
      id: `physiovision-report-${report.id}`,
      status: "current",
      type: { text: report.type },
      subject: { display: report.patient },
      date: report.visitDateTime
        ? new Date(report.visitDateTime).toISOString()
        : `${report.date}T00:00:00Z`,
      author: report.author ? [{ display: report.author }] : [],
      description: `Movement quality ${report.quality}; ${report.risk} risk. Plan: ${report.plan}`,
      authenticator: report.authenticated
        ? {
            display: report.signature,
            authenticatedAt: report.authenticatedAt,
          }
        : undefined,
      content: [{ attachment: { contentType: "application/json", title: "PhysioVision SOAP Report" } }],
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(resource, null, 2)], { type: "application/fhir+json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `report-${report.id}-fhir.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("FHIR document downloaded.");
  };

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>AI Reports & SOAP Notes</Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5 }}>Generated by SOAP Agent + therapist entries · {mode === "demo" ? "demo dataset" : "database records"}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button disabled={patientChoices.length === 0} variant="outlined" startIcon={<NoteAdd />} onClick={() => setSoapOpen(true)} sx={{ borderColor: "rgba(34,211,238,0.35)", color: "#22d3ee" }}>New SOAP</Button>
          <Button disabled={mode === "live"} variant="contained" startIcon={<AutoAwesome />} onClick={() => setAutoOpen(true)}>Generate Auto Report</Button>
        </Stack>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <SectionCard title="Generated Reports" subtitle={`${reports.length} SOAP Agent + therapist entries`}>
            <Stack spacing={1.5}>
              {reports.length === 0 && (
                <Typography color="text.secondary">
                  No reports yet. Complete a patient session or create the first SOAP note.
                </Typography>
              )}
              {reports.map((report) => (
                <Box key={report.id} className="glass-card-compact" sx={{ p: 1.5 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{report.patient}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {(report.visitDateTime ?? report.date).replace("T", " ")} · {report.type}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        Recorder: {report.author ?? "Not recorded"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        {report.authenticated
                          ? `Signed by ${report.signature ?? report.author} · ${(report.authenticatedAt ?? "").replace("T", " ").slice(0, 19)}`
                          : "Signature: pending therapist authentication"}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        icon={report.authenticated ? <VerifiedUser /> : undefined}
                        label={report.authenticated ? "Authenticated" : "Unsigned draft"}
                        size="small"
                        sx={{
                          bgcolor: report.authenticated ? "rgba(16,217,126,0.12)" : "rgba(245,183,59,0.12)",
                          color: report.authenticated ? "#10d97e" : "#f5b73b",
                        }}
                      />
                      <Chip label={`Q ${report.quality}`} size="small" sx={{ bgcolor: "rgba(34,211,238,0.12)", color: "#22d3ee" }} />
                      <Chip label={report.risk} size="small" sx={{ bgcolor: severityColor[report.risk === "High" ? "critical" : "warning"] + "22", color: severityColor[report.risk === "High" ? "critical" : "warning"] }} />
                      {!report.authenticated && (
                        <Button size="small" onClick={() => { setSigner(DEFAULT_RECORDER); setSigning(report); }}>
                          Sign
                        </Button>
                      )}
                      <Button size="small" startIcon={<Download />} onClick={() => downloadFhir(report)} sx={{ color: "#22d3ee" }}>FHIR</Button>
                    </Stack>
                  </Stack>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>Plan: {report.plan}</Typography>
                </Box>
              ))}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={2.5}>
            <SectionCard title="Therapist Assistant" subtitle="Decision summary">
              {mode === "demo" ? (
                <>
                  <Stack direction="row" justifyContent="space-around" sx={{ mb: 1 }}>
                    <GaugeRing value={aiRecommendation.riskScore} size={96} thickness={8} label="Risk" color="#f5b73b" />
                    <GaugeRing value={aiRecommendation.movementScore} size={96} thickness={8} label="Quality" color="#22d3ee" />
                  </Stack>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>{aiRecommendation.recommendation}</Typography>
                </>
              ) : assistant?.available ? (
                <>
                  <Stack direction="row" justifyContent="space-around" sx={{ mb: 1 }}>
                    <GaugeRing value={assistant.risk_score ?? 0} size={96} thickness={8} label="Risk" color={(assistant.risk_score ?? 0) >= 66 ? "#ef5b5b" : "#f5b73b"} />
                    <GaugeRing value={assistant.movement_quality_score ?? 0} size={96} thickness={8} label="Quality" color="#22d3ee" />
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{assistant.patient_name}</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>{assistant.summary}</Typography>
                  <Typography variant="body2" sx={{ color: "#22d3ee", mt: 1 }}>{assistant.suggested_plan}</Typography>
                </>
              ) : (
                <Typography color="text.secondary">
                  No clinical recommendation yet. Complete a patient session to generate a decision summary.
                </Typography>
              )}
            </SectionCard>
            <SectionCard title="Active Alerts" subtitle="Risk Agent outputs">
              <Stack spacing={1}>
                {(mode === "demo" ? mockAlerts : liveAlerts).length === 0 && (
                  <Typography color="text.secondary">
                    No active alerts. Warnings will appear after risk or compensation is detected.
                  </Typography>
                )}
                {(mode === "demo" ? mockAlerts : liveAlerts).map((alert) => (
                  <Box key={alert.id} className="glass-card-compact" sx={{ p: 1.2, borderLeft: `3px solid ${severityColor[alert.severity]}` }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {alert.severity === "critical" ? <Warning sx={{ color: severityColor[alert.severity], fontSize: 16 }} /> : <SyncProblem sx={{ color: severityColor[alert.severity], fontSize: 16 }} />}
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{alert.patient}</Typography>
                      <Chip label={alert.type} size="small" sx={{ ml: "auto", height: 18, fontSize: 10, bgcolor: severityColor[alert.severity] + "22", color: severityColor[alert.severity] }} />
                    </Stack>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>{alert.msg}</Typography>
                  </Box>
                ))}
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={soapOpen} onClose={() => setSoapOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New SOAP note</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField select label="Patient" value={soap.patient} onChange={(e) => setSoap({ ...soap, patient: e.target.value })}>
              {patientChoices.map((patient) => <MenuItem key={patient.id} value={patient.name}>{patient.name}</MenuItem>)}
            </TextField>
            <TextField
              type="datetime-local"
              label="Visit Date & Time"
              value={soap.visitDateTime}
              onChange={(e) => setSoap({ ...soap, visitDateTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Recorder Identity"
              value={soap.author}
              onChange={(e) => setSoap({ ...soap, author: e.target.value })}
              helperText="Full name and professional designation"
              required
            />
            {(["subjective", "objective", "assessment", "plan"] as const).map((field) => (
              <TextField key={field} label={field[0].toUpperCase() + field.slice(1)} multiline minRows={2} value={soap[field]} onChange={(e) => setSoap({ ...soap, [field]: e.target.value })} />
            ))}
            <TextField
              label="Electronic Signature"
              value={soap.signature}
              onChange={(e) => setSoap({ ...soap, signature: e.target.value })}
              helperText="Signing records your identity and authentication time."
              required
            />
            <FormControlLabel
              control={<Checkbox checked={soap.certified} onChange={(e) => setSoap({ ...soap, certified: e.target.checked })} />}
              label="I certify that this note is complete and accurate."
            />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setSoapOpen(false)}>Cancel</Button><Button variant="contained" onClick={createSoap}>Save SOAP</Button></DialogActions>
      </Dialog>

      <Dialog open={autoOpen} onClose={() => setAutoOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Generate auto report</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Completed patient session" value={autoPatient} onChange={(e) => setAutoPatient(e.target.value)} sx={{ mt: 1 }}>
            {patientChoices.map((patient) => <MenuItem key={patient.id} value={patient.name}>{patient.name} · score {patient.score}</MenuItem>)}
          </TextField>
          <Alert severity="info" sx={{ mt: 2 }}>A draft will be generated from the latest movement score, adherence and risk data.</Alert>
        </DialogContent>
        <DialogActions><Button onClick={() => setAutoOpen(false)}>Cancel</Button><Button variant="contained" onClick={generateReport}>Generate</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(signing)} onClose={() => setSigning(null)} fullWidth maxWidth="xs">
        <DialogTitle>Sign & authenticate SOAP note</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1, mb: 2 }}>
            Confirm that you reviewed this note and accept responsibility for its contents.
          </Alert>
          <TextField
            fullWidth
            label="Recorder Identity & Electronic Signature"
            value={signer}
            onChange={(e) => setSigner(e.target.value)}
            helperText="Full name and professional designation"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSigning(null)}>Cancel</Button>
          <Button variant="contained" startIcon={<VerifiedUser />} onClick={authenticateReport}>
            Sign & Authenticate
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage("")}>
        <Alert severity={message.includes("required") || message.includes("Complete") || message.includes("Authenticate") ? "error" : "success"} onClose={() => setMessage("")}>{message}</Alert>
      </Snackbar>
    </Box>
  );
}
