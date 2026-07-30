"use client";

import React from "react";
import { Box, Typography, Stack, Chip } from "@mui/material";
import { ArrowUpward, ArrowDownward } from "@mui/icons-material";

interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down";
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

export default function MetricCard({
  title,
  value,
  delta,
  trend = "up",
  icon,
  color = "#22d3ee",
  subtitle,
}: MetricCardProps) {
  const up = trend === "up";
  const deltaColor = up ? "#10d97e" : "#ef5b5b";

  return (
    <Box className="glass-card" sx={{ p: 2.5, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, lineHeight: 1 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${color}22, ${color}11)`,
            border: `1px solid ${color}55`,
            color: color,
          }}
        >
          {icon}
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" mt={1.5}>
        {delta && (
          <Chip
            icon={up ? <ArrowUpward sx={{ fontSize: 14, color: deltaColor }} /> : <ArrowDownward sx={{ fontSize: 14, color: deltaColor }} />}
            label={delta}
            sx={{
              background: `${deltaColor}15`,
              color: deltaColor,
              border: `1px solid ${deltaColor}40`,
              fontWeight: 700,
              height: 24,
              "& .MuiChip-icon": { ml: 0.5 },
            }}
          />
        )}
        {subtitle && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {subtitle}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
