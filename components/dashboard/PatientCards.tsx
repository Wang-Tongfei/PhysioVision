"use client";

import { Box, Typography, Stack, Chip, LinearProgress, Avatar } from "@mui/material";
import { Person, ChevronRight } from "@mui/icons-material";
import SectionCard from "@/components/common/SectionCard";
import { patients } from "@/lib/mockData";
import { useRouter } from "next/navigation";

const riskColor: Record<string, string> = {
  Low: "#10d97e", Moderate: "#f5b73b", High: "#ef5b5b",
};

export default function PatientCards() {
  const router = useRouter();
  return (
    <SectionCard title="Active Patients" subtitle={`${patients.length} in treatment`} icon={<Person />}>
      <Stack spacing={1.5}>
        {patients.map((p) => (
          <Box
            key={p.id}
            onClick={() => router.push(`/patients?patient=${p.id}`)}
            sx={{
              borderRadius: "12px",
              p: 1.5,
              background: "rgba(11,30,51,0.5)",
              border: "1px solid rgba(34,211,238,0.15)",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              cursor: "pointer",
              transition: "border-color .2s ease, background .2s ease",
              "&:hover": {
                borderColor: "rgba(34,211,238,0.45)",
                background: "rgba(11,30,51,0.75)",
              },
            }}
          >
            <Avatar
              sx={{
                bgcolor: "linear-gradient(135deg,#0891b2,#22d3ee)",
                width: 42,
                height: 42,
                color: "#04101f",
                fontWeight: 800,
              }}
            >
              {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                <Chip
                  label={p.risk}
                  size="small"
                  sx={{ height: 18, fontSize: 11, fontWeight: 700, bgcolor: riskColor[p.risk] + "22", color: riskColor[p.risk], border: `1px solid ${riskColor[p.risk]}40` }}
                />
              </Stack>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p.diagnosis}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={p.score}
                sx={{
                  height: 5,
                  borderRadius: 3,
                  mt: 0.5,
                  backgroundColor: "rgba(34,211,238,0.08)",
                  "& .MuiLinearProgress-bar": { backgroundColor: "#22d3ee", borderRadius: 3 },
                }}
              />
            </Box>
            <Box sx={{ textAlign: "right", minWidth: 44 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#22d3ee" }}>{p.score}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{p.last}</Typography>
            </Box>
            <ChevronRight sx={{ color: "text.secondary", fontSize: 20 }} />
          </Box>
        ))}
      </Stack>
    </SectionCard>
  );
}
