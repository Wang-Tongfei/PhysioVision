"use client";

import { useEffect, useState } from "react";
import { Box, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import EChart from "@/components/charts/EChart";
import SectionCard from "@/components/common/SectionCard";
import { ShowChart, BarChart } from "@mui/icons-material";
import { lineOption, barOption } from "@/components/charts/chartOptions";
import { recoveryTrend, clinicAnalytics } from "@/lib/mockData";
import { useDataMode } from "@/lib/dataMode";
import { api } from "@/lib/api";

export default function HistoricalTrends() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));
  const { mode } = useDataMode();
  const [liveTrend, setLiveTrend] = useState<{
    dates: string[];
    quality: number[];
    rom: number[];
    risk: number[];
  } | null>(null);

  useEffect(() => {
    if (mode !== "live") return;
    api<{ dates: string[]; quality: number[]; rom: number[]; risk: number[] }>(
      "/analytics/clinic/trend"
    ).then(setLiveTrend).catch(() => setLiveTrend(null));
  }, [mode]);

  if (mode === "live") {
    return (
      <SectionCard title="Recovery Trends" subtitle="Database sessions" icon={<ShowChart />}>
        {liveTrend?.dates.length ? (
          <EChart
            height={isSm ? 220 : 260}
            option={lineOption(
              liveTrend.dates,
              [
                { name: "ROM (°)", data: liveTrend.rom, color: "#22d3ee" },
                { name: "Quality", data: liveTrend.quality, color: "#f5b73b" },
                { name: "Risk", data: liveTrend.risk, color: "#ef5b5b" },
              ],
              { area: true }
            )}
          />
        ) : (
          <Typography color="text.secondary">Complete a monitored patient session to create the first real recovery trend.</Typography>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Recovery Trends" subtitle="Last 7 sessions" icon={<ShowChart />}>
      <Stack spacing={3}>
        <Box>
          <EChart
            height={isSm ? 220 : 260}
            option={lineOption(
              recoveryTrend.dates,
              [
                { name: "ROM (°)", data: recoveryTrend.rom, color: "#22d3ee" },
                { name: "Quality", data: recoveryTrend.quality, color: "#f5b73b" },
                { name: "Adherence %", data: recoveryTrend.adherence, color: "#a78bfa" },
              ],
              { area: true }
            )}
          />
        </Box>
        <Box>
          <Stack direction="row" spacing={1.25} alignItems="center" mb={1}>
            <BarChart sx={{ fontSize: 18, color: "#22d3ee" }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Clinic Analytics — Sessions by Category
            </Typography>
          </Stack>
          <EChart
            height={isSm ? 200 : 220}
            option={barOption(clinicAnalytics.categories, clinicAnalytics.sessions)}
          />
        </Box>
      </Stack>
    </SectionCard>
  );
}
