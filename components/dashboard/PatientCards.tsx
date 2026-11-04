"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Chip, List, ListItemButton, Typography } from "@mui/material";
import { ChevronRight, PeopleOutline } from "@mui/icons-material";
import SectionCard from "@/components/common/SectionCard";
import { patients } from "@/lib/mockData";
import { api } from "@/lib/api";
import { useDataMode } from "@/lib/dataMode";
import { StoredSession, exerciseLabel, formatDate } from "@/lib/sessions";

const riskColor: Record<string, string> = { Low: "#15803D", Moderate: "#B45309", High: "#B91C1C", Critical: "#B91C1C" };

type Row = { id: number; name: string; diagnosis: string; risk: string; last: string };

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

export default function PatientCards() {
  const router = useRouter();
  const { mode } = useDataMode();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (mode === "demo") {
      setRows(patients.map((p) => ({ id: p.id, name: p.name, diagnosis: p.diagnosis, risk: p.risk, last: `${p.last} · demo` })));
      return;
    }
    let cancelled = false;
    api<Array<{ id: number; full_name: string; diagnosis?: string; risk_tier: string }>>("/patients")
      .then(async (items) => {
        const recent = await Promise.all(
          items.slice(0, 6).map((p) => api<StoredSession[]>(`/patients/${p.id}/sessions?limit=1`).then((s) => s[0]).catch(() => undefined)),
        );
        if (cancelled) return;
        setRows(items.slice(0, 6).map((p, i) => {
          const s = recent[i];
          return {
            id: p.id,
            name: p.full_name,
            diagnosis: p.diagnosis || "Assessment pending",
            risk: capital(p.risk_tier),
            last: s ? `${exerciseLabel(s.exercise)} ${s.achieved ?? 0}/${s.attempts ?? 0} · ${formatDate(s.started_at, false)}` : "No sessions yet",
          };
        }));
      })
      .catch(() => setRows([]));
    return () => { cancelled = true; };
  }, [mode]);

  return (
    <SectionCard title="Patients" subtitle="Latest session per patient" icon={<PeopleOutline fontSize="small" />}>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No patients yet.</Typography>
      ) : (
        <List disablePadding>
          {rows.map((p) => (
            <ListItemButton
              key={p.id}
              onClick={() => router.push(mode === "live" ? `/patients/${p.id}` : "/patients")}
              sx={{ px: 1, py: 1, alignItems: "flex-start" }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>{p.name}</Typography>
                  <Chip size="small" variant="outlined" label={p.risk}
                    sx={{ color: riskColor[p.risk] || "text.secondary", borderColor: (riskColor[p.risk] || "#94A3B8") + "55" }} />
                </Box>
                <Typography noWrap variant="caption" component="div" color="text.secondary">{p.diagnosis}</Typography>
                <Typography noWrap variant="caption" component="div" sx={{ color: "text.primary", mt: 0.25 }}>{p.last}</Typography>
              </Box>
              <ChevronRight fontSize="small" sx={{ color: "text.disabled", mt: 0.5 }} />
            </ListItemButton>
          ))}
        </List>
      )}
    </SectionCard>
  );
}
