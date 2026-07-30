"use client";

import React from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  Container,
  Button,
  Stack,
  useTheme,
} from "@mui/material";
import {
  MonitorHeart,
  Psychology,
  Timeline,
  Groups,
  Security,
  ArrowForward,
  PlayCircle,
  CheckCircle,
  AutoGraph,
  HealthAndSafety,
} from "@mui/icons-material";

const features = [
  {
    icon: <Psychology sx={{ fontSize: 32 }} />,
    title: "6-AI-Agent Engine",
    desc: "Movement analysis, risk prediction, coaching, SOAP notes, and analytics — coordinated by LangGraph.",
  },
  {
    icon: <MonitorHeart sx={{ fontSize: 32 }} />,
    title: "Real-Time Monitoring",
    desc: "Multi-patient live pose tracking at the edge via Raspberry Pi 5 with YOLO11 + MediaPipe.",
  },
  {
    icon: <Timeline sx={{ fontSize: 32 }} />,
    title: "Progress Trends",
    desc: "Joint-angle ROM, adherence, and rehab velocity visualized with interactive ECharts.",
  },
  {
    icon: <HealthAndSafety sx={{ fontSize: 32 }} />,
    title: "Risk Alerts",
    desc: "Compensatory-movement detection flags patients before setbacks occur.",
  },
  {
    icon: <Groups sx={{ fontSize: 32 }} />,
    title: "Clinic-Wide View",
    desc: "Cohort KPIs, therapist workload, and scheduling in one dashboard.",
  },
  {
    icon: <Security sx={{ fontSize: 32 }} />,
    title: "FHIR / HL7 Ready",
    desc: "Standards-based integration with your EHR and wearable data streams.",
  },
];

const stats = [
  { value: "94%", label: "Adherence Rate" },
  { value: "2.3×", label: "Faster Recovery" },
  { value: "6", label: "AI Agents" },
  { value: "24/7", label: "Monitoring" },
];

const testimonials = [
  {
    quote:
      "PhysioVision cut our documentation time in half and our patients actually do their exercises now.",
    name: "Dr. Sarah Kim",
    role: "Lead Physical Therapist",
  },
  {
    quote:
      "The risk alerts caught a compensation pattern we'd have missed for weeks. Game changer.",
    name: "James O.",
    role: "Sports Rehab Clinic Director",
  },
];

export default function LandingPage() {
  const theme = useTheme();

  return (
    <Box sx={{ position: "relative", overflow: "hidden" }}>
      {/* Glow blobs */}
      <Box
        className="glow-blob"
        sx={{ width: 500, height: 500, background: "rgba(34,211,238,0.35)", top: -150, left: -100 }}
      />
      <Box
        className="glow-blob"
        sx={{ width: 420, height: 420, background: "rgba(59,130,246,0.3)", top: 200, right: -120 }}
      />

      {/* ===== Navbar ===== */}
      <Box
        component="header"
        className="topbar"
        sx={{ position: "sticky", top: 0, zIndex: 100, px: { xs: 2, md: 6 }, py: 1.8 }}
      >
        <Container maxWidth="xl" sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 18px rgba(34,211,238,0.45)",
              }}
            >
              <MonitorHeart sx={{ color: "#04101f", fontSize: 22 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 22 }}>
              Physio<span style={{ color: "#22d3ee" }}>Vision</span>
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, gap: { md: 3, lg: 4 }, justifyContent: "center" }}>
            {[
              ["Platform", "#platform"],
              ["Features", "#features"],
              ["Pricing", "#pricing"],
              ["Docs", "#docs"],
            ].map(([label, href]) => (
              <Button key={label} component={Link} href={href} sx={{ color: "text.secondary", textTransform: "none", fontWeight: 600, fontSize: 15 }}>
                {label}
              </Button>
            ))}
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button
              component={Link}
              href="/login"
              variant="text"
              sx={{ color: "text.primary", textTransform: "none", fontWeight: 600, fontSize: 15 }}
            >
              Sign In
            </Button>
            <Button
              component={Link}
              href="/register"
              variant="contained"
              sx={{ py: 1, px: 2.5, fontSize: 15 }}
            >
              Get Started
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ===== Hero ===== */}
      <Container id="platform" maxWidth="xl" sx={{ position: "relative", zIndex: 1, pt: { xs: 6, md: 10 }, pb: { xs: 6, md: 10 }, scrollMarginTop: 80 }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box
            className="badge badge-info"
            sx={{ px: 2, py: 0.8, fontSize: 13 }}
          >
            <AutoGraph sx={{ fontSize: 16 }} /> AI-Powered Rehabilitation
          </Box>

          <Typography
            variant="h1"
            sx={{ fontSize: { xs: 42, md: 72 }, fontWeight: 800, lineHeight: 1.05, maxWidth: 980 }}
          >
            Real-time rehab intelligence for
            <Box component="span" className="text-gradient">
              {" "}every patient
            </Box>
          </Typography>

          <Typography
            variant="h6"
            sx={{ color: "text.secondary", fontWeight: 400, maxWidth: 680, fontSize: { xs: 17, md: 21 } }}
          >
            PhysioVision combines edge pose-tracking, 6 coordinating AI agents, and
            therapist-grade reporting — so clinics deliver personalized care at scale.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
            <Button
              component={Link}
              href="/register"
              variant="contained"
              sx={{ py: 1.5, px: 4, fontSize: 16 }}
            >
              Start Free Trial <ArrowForward />
            </Button>
            <Button
              component={Link}
              href="/login"
              className="btn-ghost"
              sx={{ py: 1.5, px: 4, fontSize: 16 }}
            >
              <PlayCircle sx={{ mr: 1 }} /> Watch Demo
            </Button>
          </Stack>

          {/* Stats */}
          <Stack
            direction="row"
            flexWrap="wrap"
            justifyContent="center"
            spacing={{ xs: 3, md: 6 }}
            sx={{ mt: 4, gap: 2 }}
          >
            {stats.map((s) => (
              <Box key={s.label} sx={{ textAlign: "center" }}>
                <Typography
                  variant="h3"
                  className="text-gradient"
                  sx={{ fontWeight: 800, fontSize: { xs: 28, md: 36 } }}
                >
                  {s.value}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>

        {/* Hero mockup */}
        <Box
          className="glass-card"
          sx={{
            mt: { xs: 9, md: 11 },
            p: { xs: 2, md: 3 },
            position: "relative",
            overflow: "hidden",
            maxWidth: { xs: "100%", md: 980 },
            mx: "auto",
          }}
        >
          <Box
            className="bg-grid"
            sx={{
              borderRadius: 3,
              p: 3,
              background:
                "radial-gradient(ellipse at 70% 20%, rgba(34,211,238,0.15), transparent 60%), rgba(4,16,31,0.5)",
              border: "1px solid rgba(34,211,238,0.15)",
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
              <Box sx={{ flex: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Live Session — Knee Rehab</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                  Rep 8 / 12 • Depth 112° • Asymmetry 3%
                </Typography>
                <Box
                  className="glass-card-compact"
                  sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}
                >
                  <Box
                    className="pulse-dot"
                    sx={{ width: 12, height: 12, borderRadius: "50%", background: "#10d97e" }}
                  />
                  <Typography variant="body2">Movement quality: Excellent</Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Box className="badge badge-success">Score 92</Box>
                </Box>
              </Box>
              <Stack spacing={2} sx={{ flex: 1 }}>
                {[
                  { l: "ROM Improvement", v: "+18°", c: "#22d3ee" },
                  { l: "Pain Index", v: "-42%", c: "#10d97e" },
                  { l: "Risk Level", v: "Low", c: "#f5b73b" },
                ].map((m) => (
                  <Box key={m.l} className="glass-card-compact" sx={{ p: 1.5 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {m.l}
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: 22, color: m.c }}>
                      {m.v}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Container>

      {/* ===== Features ===== */}
      <Container id="features" maxWidth="lg" sx={{ pt: { xs: 3, md: 5 }, pb: { xs: 6, md: 10 }, scrollMarginTop: 80 }}>
        <Stack spacing={1.5} alignItems="center" textAlign="center" mb={6}>
          <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: 32, md: 46 } }}>
            Everything a modern clinic needs
          </Typography>
          <Typography sx={{ color: "text.secondary", maxWidth: 620, fontSize: { xs: 15, md: 17 } }}>
            From the treatment table to the executive summary — PhysioVision unifies
            movement science, AI, and clinical workflow.
          </Typography>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" },
            gap: 2.5,
          }}
        >
          {features.map((f, i) => (
            <Box key={i} className="glass-card" sx={{ p: 3 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(59,130,246,0.12))",
                  border: "1px solid rgba(34,211,238,0.3)",
                  color: "#22d3ee",
                  mb: 2,
                }}
              >
                {f.icon}
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 17, mb: 0.8 }}>{f.title}</Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 15 }}>
                {f.desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>

      {/* ===== Testimonials ===== */}
      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 8 }, pb: { xs: 2, md: 3 } }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          {testimonials.map((t, i) => (
            <Box key={i} className="glass-card" sx={{ p: 4 }}>
              <Typography sx={{ fontSize: 19, fontWeight: 500, fontStyle: "italic", mb: 3 }}>
                {"\u201c"}{t.quote}{"\u201d"}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#0891b2,#22d3ee)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    color: "#04101f",
                  }}
                >
                  {t.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{t.name}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {t.role}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>

      {/* ===== CTA ===== */}
      <Container id="pricing" maxWidth="md" sx={{ py: { xs: 2, md: 3 }, scrollMarginTop: 80 }}>
        <Box
          className="glass-card"
          sx={{
            p: { xs: 4, md: 6 },
            textAlign: "center",
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.2), transparent 70%), rgba(11,30,51,0.6)",
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: 28, md: 40 } }}>
            Start monitoring patients in minutes
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 3, fontSize: { xs: 16, md: 18 } }}>
            No credit card required. Connect your first session in under 5 minutes.
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              component={Link}
              href="/register"
              variant="contained"
              sx={{ py: 1.5, px: 4 }}
            >
              Create Free Account <ArrowForward />
            </Button>
            <Button
              component={Link}
              href="/login"
              className="btn-ghost"
              sx={{ py: 1.5, px: 4 }}
            >
              I already have an account
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="center" mt={3} flexWrap="wrap">
            {["HIPAA-aware", "SOC 2 ready", "Open API"].map((b) => (
              <Box key={b} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CheckCircle sx={{ fontSize: 16, color: "#10d97e" }} />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {b}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Container>

      {/* ===== Footer ===== */}
      <Box
        id="docs"
        component="footer"
        sx={{
          borderTop: "1px solid rgba(34,211,238,0.15)",
          py: 4,
          px: { xs: 2, md: 6 },
          mt: 4,
        }}
      >
        <Container maxWidth="xl">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MonitorHeart sx={{ color: "#04101f", fontSize: 18 }} />
              </Box>
              <Typography sx={{ fontWeight: 800 }}>
                Physio<span style={{ color: "#22d3ee" }}>Vision</span>
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              © {new Date().getFullYear()} PhysioVision. All rights reserved.
            </Typography>
            <Stack id="terms" direction="row" spacing={3}>
              {["Privacy", "Terms", "Contact"].map((t) => (
                <Typography id={t === "Privacy" ? "privacy" : undefined} key={t} variant="caption" sx={{ color: "text.secondary", cursor: "pointer" }}>
                  {t}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
