"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
} from "@mui/material";
import {
  People,
  MonitorHeart,
  Warning,
  HealthAndSafety,
} from "@mui/icons-material";
import SectionCard from "@/components/common/SectionCard";
import MetricCard from "@/components/common/MetricCard";
import LiveMonitor from "@/components/dashboard/LiveMonitor";
import JointAnglePanel from "@/components/dashboard/JointAnglePanel";
import RightPanel from "@/components/dashboard/RightPanel";
import HistoricalTrends from "@/components/dashboard/HistoricalTrends";
import PatientCards from "@/components/dashboard/PatientCards";
import { api, getSession } from "@/lib/api";
import { useDataMode } from "@/lib/dataMode";

export default function DashboardPage() {
  const { mode } = useDataMode();
  const [displayName, setDisplayName] = useState("Therapist");
  const [kpi, setKpi] = useState({
    active_patients: 6,
    sessions_today: 6,
    active_sessions: 4,
    avg_quality: 92,
    alert_rate: 0.03,
  });

  useEffect(() => {
    setDisplayName(getSession()?.user?.full_name || "Therapist");
  }, []);

  useEffect(() => {
    if (mode === "demo") {
      setKpi({ active_patients: 6, sessions_today: 6, active_sessions: 4, avg_quality: 92, alert_rate: 0.03 });
      return;
    }
    api<typeof kpi>("/analytics/clinic/kpi").then((result) => setKpi({
      ...result,
      active_sessions: result.active_sessions ?? 0,
    })).catch(() => {
      setKpi({ active_patients: 0, sessions_today: 0, active_sessions: 0, avg_quality: 0, alert_rate: 0 });
    });
  }, [mode]);

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      {/* Page header */}
      <Box mb={3}>
        <Typography variant="h4">Welcome back, {displayName}</Typography>
        <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
          {mode === "demo" ? "Demo account · sample data" : "Live monitoring and today's activity"}
        </Typography>
      </Box>

      {/* Top metric cards (no trend deltas: the API does not provide period comparisons) */}
      <Grid container spacing={2} mb={2.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Patients" value={String(kpi.active_patients)} icon={<People fontSize="small" />}
            subtitle={mode === "demo" ? "demo records" : "in your clinic"} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Sessions today" value={String(kpi.sessions_today)} icon={<MonitorHeart fontSize="small" />}
            subtitle="uploaded or monitored" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Average quality" value={`${Math.round(kpi.avg_quality)}`} icon={<HealthAndSafety fontSize="small" />}
            subtitle="movement quality score, 0-100" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Alert rate" value={`${Math.round(kpi.alert_rate * 100)}%`} icon={<Warning fontSize="small" />}
            color="#B45309" subtitle="sessions with an alert" />
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
