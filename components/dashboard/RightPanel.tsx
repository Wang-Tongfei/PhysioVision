"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Stack, Chip, LinearProgress } from "@mui/material";
import GaugeRing from "@/components/common/GaugeRing";
import SectionCard from "@/components/common/SectionCard";
import { Shield, Speed, BatteryAlert, SyncProblem, AutoAwesome } from "@mui/icons-material";
import { aiRecommendation } from "@/lib/mockData";
import { useDataMode } from "@/lib/dataMode";
import { api } from "@/lib/api";

function MetricRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const num = parseInt(value);
  const showBar = !isNaN(num);
  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `${color}1a`,
          border: `1px solid ${color}40`,
          color,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
        {showBar && (
          <LinearProgress
            variant="determinate"
            value={num}
            sx={{
              height: 6,
              borderRadius: 3,
              mt: 0.5,
              backgroundColor: "rgba(34,211,238,0.08)",
              "& .MuiLinearProgress-bar": { backgroundColor: color, borderRadius: 3 },
            }}
          />
        )}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 38, textAlign: "right", color }}>{value}</Typography>
    </Stack>
  );
}

export default function RightPanel() {
  const { mode } = useDataMode();
  const [live, setLive] = useState<{
    phase: string;
    risk_score: number | null;
    risk_tier: string | null;
    movement_quality_score: number | null;
    fatigue_index: number | null;
    compensation_detected: boolean;
    therapist_summary: { summary: string; suggested_plan: string } | null;
  } | null>(null);

  useEffect(() => {
    if (mode !== "live") return;
    const load = () => api<typeof live>("/sessions/monitor/status")
      .then(setLive)
      .catch(() => setLive(null));
    load();
    const timer = window.setInterval(load, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);

  if (mode === "live") {
    if (live?.risk_score !== null && live?.risk_score !== undefined) {
      const color = live.risk_score < 33 ? "#10d97e" : live.risk_score < 66 ? "#f5b73b" : "#ef5b5b";
      return (
        <Stack spacing={2.5}>
          <SectionCard title="Risk Assessment" subtitle="Explainable session score" icon={<Shield />}>
            <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
              <GaugeRing value={live.risk_score} size={128} thickness={11} label="Risk Level" caption={live.risk_tier ?? "Unknown"} color={color} icon={<Shield />} />
            </Box>
            <MetricRow icon={<Speed />} label="Movement Score" value={`${live.movement_quality_score ?? 0}%`} color="#22d3ee" />
            <Box sx={{ height: 12 }} />
            <MetricRow icon={<BatteryAlert />} label="Fatigue" value={`${live.fatigue_index ?? 0}%`} color="#f5b73b" />
          </SectionCard>
          {live.therapist_summary && (
            <SectionCard title="Therapist Assistant" subtitle="Rule-based decision support" icon={<AutoAwesome />}>
              <Typography variant="body2" color="text.secondary">{live.therapist_summary.summary}</Typography>
              <Typography variant="body2" sx={{ mt: 1, color: "#22d3ee" }}>{live.therapist_summary.suggested_plan}</Typography>
            </SectionCard>
          )}
        </Stack>
      );
    }
    return (
      <SectionCard title="Risk Assessment" subtitle="Real AI evaluation" icon={<Shield />}>
        <Typography color="text.secondary">Complete a monitored session to generate a real risk assessment and recommendation. Demo recommendations are hidden in Real data mode.</Typography>
      </SectionCard>
    );
  }
  const r = aiRecommendation;
  const riskColor = r.riskScore < 33 ? "#10d97e" : r.riskScore < 66 ? "#f5b73b" : "#ef5b5b";

  return (
    <Stack spacing={2.5}>
      <SectionCard title="Risk Assessment" subtitle="Live AI evaluation" icon={<Shield />}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
          <GaugeRing
            value={r.riskScore}
            size={128}
            thickness={11}
            label="Risk Level"
            caption={r.riskScore < 33 ? "Low" : r.riskScore < 66 ? "Moderate" : "High"}
            color={riskColor}
            icon={<Shield />}
          />
        </Box>

        <Box mt={1}>
          <MetricRow icon={<Speed />} label="Movement Score" value={`${r.movementScore}%`} color="#22d3ee" />
          <Box sx={{ height: 12 }} />
          <MetricRow icon={<BatteryAlert />} label="Fatigue" value={`${r.fatigue}%`} color="#f5b73b" />
          <Box sx={{ height: 12 }} />
          <MetricRow
            icon={<SyncProblem />}
            label="Compensation"
            value={r.compensation ? "Yes" : "No"}
            color={r.compensation ? "#ef5b5b" : "#10d97e"}
          />
        </Box>
      </SectionCard>

      <SectionCard title="AI Recommendation" icon={<AutoAwesome />}>
        <Box
          sx={{
            borderRadius: "14px",
            p: 2,
            background: "linear-gradient(135deg, rgba(34,211,238,0.1), rgba(59,130,246,0.06))",
            border: "1px solid rgba(34,211,238,0.25)",
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5, lineHeight: 1.6 }}>
            {r.recommendation}
          </Typography>
          <Stack spacing={0.8}>
            {r.tips.map((t, i) => (
              <Typography
                key={i}
                variant="caption"
                sx={{ color: "text.secondary", display: "flex", gap: 0.8, alignItems: "flex-start" }}
              >
                <Box component="span" sx={{ color: "#22d3ee", fontWeight: 800 }}>▸</Box> {t}
              </Typography>
            ))}
          </Stack>
        </Box>
      </SectionCard>
    </Stack>
  );
}
