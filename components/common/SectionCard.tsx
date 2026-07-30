"use client";

import React from "react";
import { Box, Typography, Stack, IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  sx?: object;
}

export default function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
  sx,
}: SectionCardProps) {
  return (
    <Box className="glass-card" sx={{ p: 2.5, ...sx }}>
      {(title || action) && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            {icon && (
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(59,130,246,0.1))",
                  border: "1px solid rgba(34,211,238,0.3)",
                  color: "#22d3ee",
                }}
              >
                {icon}
              </Box>
            )}
            <Box>
              {title && (
                <Typography sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Stack>
          {action}
        </Stack>
      )}
      {children}
    </Box>
  );
}
