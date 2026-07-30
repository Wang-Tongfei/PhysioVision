"use client";

import { Box, Typography, Stack } from "@mui/material";
import GaugeRing from "@/components/common/GaugeRing";
import SectionCard from "@/components/common/SectionCard";
import { Route, Straighten } from "@mui/icons-material";
import { jointAngles } from "@/lib/mockData";

export default function JointAnglePanel() {
  return (
    <SectionCard
      title="Joint Angle Tracking"
      subtitle="Real-time ROM vs target"
      icon={<Route />}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-around">
        {jointAngles.map((j) => {
          const pct = Math.min(100, Math.round((j.value / j.target) * 100));
          return (
            <Box key={j.name} sx={{ textAlign: "center" }}>
              <GaugeRing
                value={pct}
                size={96}
                thickness={9}
                label={j.name}
                caption={`${j.value}° / ${j.target}°`}
                color={pct >= 85 ? "#22d3ee" : pct >= 60 ? "#f5b73b" : "#ef5b5b"}
              />
            </Box>
          );
        })}
      </Stack>
    </SectionCard>
  );
}
