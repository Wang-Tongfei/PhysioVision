"use client";

import React from "react";
import {
  Box,
  Grid,
  Typography,
  Stack,
  Chip,
  Avatar,
  LinearProgress,
  useTheme,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  People,
  MonitorHeart,
  Warning,
  HealthAndSafety,
  FiberManualRecord,
  ArrowUpward,
  ArrowDownward,
  Speed,
  AccessTime,
} from "@mui/icons-material";
import SectionCard from "@/components/common/SectionCard";
import MetricCard from "@/components/common/MetricCard";
import LiveMonitor from "@/components/dashboard/LiveMonitor";
import JointAnglePanel from "@/components/dashboard/JointAnglePanel";
import RightPanel from "@/components/dashboard/RightPanel";
import HistoricalTrends from "@/components/dashboard/HistoricalTrends";
import PatientCards from "@/components/dashboard/PatientCards";

export default function DashboardPage() {
  const theme = useTheme();

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      {/* Page header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            Good morning, Dr. Kim 👋
          </Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
            Here&apos;s your clinic&apos;s live rehabilitation overview
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip
            icon={<FiberManualRecord sx={{ fontSize: 12, color: "#10d97e !important" }} />}
            label="6 patients live"
            sx={{ background: "rgba(16,217,126,0.1)", border: "1px solid rgba(16,217,126,0.3)", color: "#10d97e", fontWeight: 700 }}
          />
          <Chip
            label="Today"
            variant="outlined"
            sx={{ borderColor: "rgba(34,211,238,0.4)", color: "#22d3ee", fontWeight: 600 }}
          />
        </Stack>
      </Stack>

      {/* Top metric cards */}
      <Grid container spacing={2.5} mb={2.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Active Patients"
            value="48"
            delta="+12%"
            trend="up"
            icon={<People sx={{ fontSize: 28 }} />}
            color="#22d3ee"
            subtitle="vs last week"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Live Sessions"
            value="6"
            delta="+2"
            trend="up"
            icon={<MonitorHeart sx={{ fontSize: 28 }} />}
            color="#10d97e"
            subtitle="now streaming"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Alerts"
            value="3"
            delta="-1"
            trend="down"
            icon={<Warning sx={{ fontSize: 28 }} />}
            color="#f5b73b"
            subtitle="needs attention"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Avg Adherence"
            value="92%"
            delta="+5%"
            trend="up"
            icon={<HealthAndSafety sx={{ fontSize: 28 }} />}
            color="#3b82f6"
            subtitle="this month"
          />
        </Grid>
      </Grid>

      {/* Main grid */}
      <Grid container spacing={2.5}>
        {/* Left & center column */}
        <Grid item xs={12} lg={8}>
          <LiveMonitor />
          <Box mt={2.5}>
            <JointAnglePanel />
          </Box>
          <Box mt={2.5}>
            <HistoricalTrends />
          </Box>
        </Grid>

        {/* Right column */}
        <Grid item xs={12} lg={4}>
          <RightPanel />
          <Box mt={2.5}>
            <PatientCards />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
