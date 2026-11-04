"use client";

import Link from "next/link";
import { Box, Button, Chip, Container, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import {
  ArrowForward,
  CloudUploadOutlined,
  FactCheckOutlined,
  InsightsOutlined,
  VideocamOutlined,
} from "@mui/icons-material";
import { Brand } from "@/components/layout/DashboardLayout";
import { tokens } from "@/app/theme";

const steps = [
  {
    icon: <VideocamOutlined />,
    title: "Record at home",
    text: "The patient exercises in front of an ordinary webcam. The open-source PhysioSight engine tracks the body on their own device and checks every repetition against the prescribed movement.",
  },
  {
    icon: <CloudUploadOutlined />,
    title: "Upload a session",
    text: "Each set becomes one Session file: every attempt, whether it counted, why not, and the joint angles reached. No video and no identity leave the device.",
  },
  {
    icon: <InsightsOutlined />,
    title: "Review progress",
    text: "You see range of motion over time, repetitions counted versus attempted, recurring faults and per-repetition detail, and can draft a SOAP note from any session.",
  },
];

const measures = [
  ["Repetitions with reasons", "Valid, invalid or aborted, with fault codes such as “not deep enough”, “moved too fast” or “upper arm drifted”."],
  ["Peak flexion per repetition", "Joint angles from body keypoints, recorded per side, compared with the exercise target."],
  ["Within-set velocity loss", "How much repetitions slow down across a set, a common fatigue indicator in resistance training."],
  ["Data quality", "Share of frames with reliable tracking, and whether the camera view suits the angle being measured."],
];

const exercises = ["Squat", "Bicep curl", "Push-up", "Plank", "Shoulder flexion"];

function SampleSession() {
  const rows = [
    ["1", "valid", "97°", "—"],
    ["2", "valid", "95°", "—"],
    ["3", "invalid", "74°", "Not deep enough"],
    ["4", "valid", "96°", "—"],
  ];
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="subtitle2">Squat · 3 of 4 counted</Typography>
        <Typography variant="caption" color="text.secondary">example data</Typography>
      </Stack>
      <Box component="table" sx={{ width: "100%", mt: 1.5, borderCollapse: "collapse", fontSize: 13,
        "& th": { textAlign: "left", color: "text.secondary", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", pb: 1 },
        "& td": { py: 1, borderTop: `1px solid ${tokens.line}` } }}>
        <thead><tr><th>#</th><th>Outcome</th><th>Peak knee flexion</th><th>Fault</th></tr></thead>
        <tbody>
          {rows.map(([i, outcome, angle, fault]) => (
            <tr key={i}>
              <td>{i}</td>
              <td><Chip size="small" variant="outlined" color={outcome === "valid" ? "success" : "warning"} label={outcome} /></td>
              <td>{angle}</td>
              <td style={{ color: fault === "—" ? tokens.muted : tokens.ink }}>{fault}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Paper>
  );
}

export default function HomePage() {
  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Box component="header" sx={{ borderBottom: `1px solid ${tokens.line}`, bgcolor: "background.paper" }}>
        <Container maxWidth="lg" sx={{ height: 64, display: "flex", alignItems: "center", gap: 3 }}>
          <Brand />
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={3} sx={{ display: { xs: "none", md: "flex" }, "& a": { color: "text.secondary", textDecoration: "none", fontSize: 14, fontWeight: 500 } }}>
            <a href="#how">How it works</a>
            <a href="#measures">What it measures</a>
            <a href="#limits">Limitations</a>
          </Stack>
          <Button component={Link} href="/login" variant="outlined">Sign in</Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="overline" sx={{ color: "primary.main" }}>Home rehabilitation, measured</Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: "2.2rem", md: "3rem" }, mt: 1, lineHeight: 1.1 }}>
              See every repetition, not just the count.
            </Typography>
            <Typography sx={{ color: "text.secondary", mt: 2.5, fontSize: 17, maxWidth: 520 }}>
              PhysioVision is a therapist workspace for exercises patients do at home with a single camera.
              Each set arrives as a structured session, so you can tell how the movement went and how it is changing.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 4 }}>
              <Button component={Link} href="/register" variant="contained" size="large" endIcon={<ArrowForward />}>Create an account</Button>
              <Button component={Link} href="/login" variant="outlined" size="large">Open the demo</Button>
            </Stack>
            <Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 2 }}>
              A research and demonstration tool. Not a medical device.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <SampleSession />
          </Grid>
        </Grid>
      </Container>

      <Box id="how" sx={{ bgcolor: "background.paper", borderTop: `1px solid ${tokens.line}`, borderBottom: `1px solid ${tokens.line}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
          <Typography variant="h4">How it works</Typography>
          <Grid container spacing={4} sx={{ mt: 1 }}>
            {steps.map((s, i) => (
              <Grid item xs={12} md={4} key={s.title}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(15,118,110,0.08)", color: "primary.main", display: "grid", placeItems: "center" }}>{s.icon}</Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>Step {i + 1}</Typography>
                </Stack>
                <Typography variant="h6" sx={{ mt: 2 }}>{s.title}</Typography>
                <Typography sx={{ color: "text.secondary", mt: 1 }}>{s.text}</Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container id="measures" maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Grid container spacing={6}>
          <Grid item xs={12} md={4}>
            <Typography variant="h4">What it measures</Typography>
            <Typography sx={{ color: "text.secondary", mt: 1.5 }}>
              Exercises are defined as specifications in the engine, so a new exercise does not require new code. Currently:
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }} useFlexGap>
              {exercises.map((e) => <Chip key={e} label={e} variant="outlined" />)}
            </Stack>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper>
              {measures.map(([title, text], i) => (
                <Box key={title}>
                  {i > 0 && <Divider />}
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.5, sm: 3 }} sx={{ p: 2.5 }}>
                    <Box sx={{ minWidth: 220, display: "flex", gap: 1, alignItems: "center" }}>
                      <FactCheckOutlined fontSize="small" sx={{ color: "primary.main" }} />
                      <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
                    </Box>
                    <Typography sx={{ color: "text.secondary" }}>{text}</Typography>
                  </Stack>
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Box id="limits" sx={{ bgcolor: "background.paper", borderTop: `1px solid ${tokens.line}` }}>
        <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
          <Typography variant="h4">Limitations</Typography>
          <Stack component="ul" spacing={1.5} sx={{ mt: 2, pl: 2.5, color: "text.secondary", "& li": { pl: 0.5 } }}>
            <li>Angles come from a single 2D camera. They are projections that depend on where the camera stands, and are estimates rather than goniometer readings.</li>
            <li>
              The analysis has not been validated against a reference system in patients. In a published comparison of a webcam pose model with optical
              motion capture in healthy adults, agreement was good for some shoulder motions but poor for shoulder and elbow flexion (Wang et al., PLOS ONE, 2023).
            </li>
            <li>Thresholds are engineering defaults and should be calibrated for each patient and protocol.</li>
            <li>PhysioVision supports exercise review and documentation. It does not diagnose and is not a medical device.</li>
          </Stack>
        </Container>
      </Box>

      <Box component="footer" sx={{ borderTop: `1px solid ${tokens.line}` }}>
        <Container maxWidth="lg" sx={{ py: 3, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
          <Brand />
          <Stack direction="row" spacing={2.5} sx={{ "& a": { color: "text.secondary", fontSize: 14, textDecoration: "none" } }}>
            <a href="https://github.com/Wang-Tongfei/PhysioSight" target="_blank" rel="noreferrer">PhysioSight engine</a>
            <a href="https://github.com/Wang-Tongfei/PhysioVision" target="_blank" rel="noreferrer">PhysioVision source</a>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
