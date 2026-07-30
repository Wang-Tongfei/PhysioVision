"use client";

import { Box, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import EChart from "@/components/charts/EChart";
import SectionCard from "@/components/common/SectionCard";
import { ShowChart, BarChart } from "@mui/icons-material";
import { lineOption, barOption } from "@/components/charts/chartOptions";
import { recoveryTrend, clinicAnalytics } from "@/lib/mockData";
import { useDataMode } from "@/lib/dataMode";

export default function HistoricalTrends() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));
  const { mode } = useDataMode();
  if (mode === "live") {
    return (
      <SectionCard title="Recovery Trends" subtitle="Database sessions" icon={<ShowChart />}>
        <Typography color="text.secondary">Recovery charts will appear after real rehabilitation sessions have been recorded. Demo trends are hidden in Real data mode.</Typography>
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
