"use client";

import { Box, Typography, Stack } from "@mui/material";
import { ReactNode } from "react";

interface GaugeRingProps {
  value: number; // 0-100
  size?: number;
  thickness?: number;
  label?: string;
  caption?: string;
  color?: string;
  icon?: ReactNode;
}

export default function GaugeRing({
  value,
  size = 120,
  thickness = 10,
  label,
  caption,
  color = "#00bcd4",
  icon,
}: GaugeRingProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const gradientId = `gauge-${label?.replace(/\s/g, "") ?? "x"}`;

  return (
    <Stack alignItems="center" spacing={1}>
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor="#4dd0e1" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={thickness}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1s ease",
              filter: `drop-shadow(0 0 6px ${color}88)`,
            }}
          />
        </svg>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon && <Box sx={{ color, mb: 0.3 }}>{icon}</Box>}
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>
            {value}
            <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
              %
            </Typography>
          </Typography>
        </Box>
      </Box>
      {label && (
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
          {label}
        </Typography>
      )}
      {caption && (
        <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>
          {caption}
        </Typography>
      )}
    </Stack>
  );
}
