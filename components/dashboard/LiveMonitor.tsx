"use client";

import { Box, Typography, Stack, Chip, useTheme } from "@mui/material";
import { FiberManualRecord, Videocam, MonitorHeart } from "@mui/icons-material";
import SkeletonOverlay from "./SkeletonOverlay";
import { livePatients } from "@/lib/mockData";

export default function LiveMonitor() {
  const theme = useTheme();
  return (
    <Box className="glass-card" sx={{ p: 2.5 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1.25} alignItems="center">
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
            <MonitorHeart sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
              Live Session Monitor
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Knee Rehab Protocol · Station 3
            </Typography>
          </Box>
        </Stack>
        <Chip
          icon={<FiberManualRecord sx={{ color: "#f87171 !important", fontSize: 12 }} className="pulse-dot" />}
          label="LIVE · CAM-01"
          size="small"
          sx={{
            bgcolor: "rgba(239,91,91,0.12)",
            color: "#ef5b5b",
            border: "1px solid rgba(239,91,91,0.35)",
            fontWeight: 700,
          }}
        />
      </Stack>

      {/* Video stage */}
      <Box
        sx={{
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(34,211,238,0.12) 0%, rgba(6,21,38,0.9) 70%), linear-gradient(160deg, #0a2540 0%, #04101f 100%)",
          border: "1px solid rgba(34,211,238,0.2)",
          height: 340,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <Box sx={{ width: "55%", height: "90%", opacity: 0.95 }}>
          <SkeletonOverlay color={theme.palette.primary.main} />
        </Box>
        <Box
          sx={{
            position: "absolute",
            bottom: 12,
            left: 12,
            px: 1.5,
            py: 0.5,
            borderRadius: 1.5,
            bgcolor: "rgba(34,211,238,0.15)",
            color: "primary.main",
            fontFamily: "monospace",
            fontSize: 12,
            border: "1px solid rgba(34,211,238,0.3)",
          }}
        >
          REPS 5 · ROM 95° · Q 86%
        </Box>
        <Box
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            px: 1.5,
            py: 0.5,
            borderRadius: 1.5,
            bgcolor: "rgba(4,16,31,0.6)",
            color: "text.secondary",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            fontSize: 12,
            border: "1px solid rgba(34,211,238,0.2)",
          }}
        >
          <Videocam sx={{ fontSize: 16, color: "#22d3ee" }} /> HD 1080p
        </Box>
      </Box>

      {/* Patient rail */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 2, overflowX: "auto" }} className="scroll-y">
        {livePatients.map((p) => (
          <Box
            key={p.id}
            sx={{
              minWidth: 155,
              flex: 1,
              borderRadius: "12px",
              p: 1.5,
              background: "rgba(11,30,51,0.55)",
              border: "1px solid rgba(34,211,238,0.18)",
              "&:hover": { borderColor: "rgba(34,211,238,0.45)" },
              transition: "border-color .2s ease",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <FiberManualRecord sx={{ fontSize: 10, color: p.color }} className="pulse-dot" />
              <Typography variant="body2" sx={{ fontWeight: 700, color: p.color }}>
                {p.station}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>{p.name}</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {p.exercise}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
