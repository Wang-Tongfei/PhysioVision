"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Box } from "@mui/material";

// ECharts is client-only; disable SSR to avoid window reference errors.
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface EChartProps {
  option: Record<string, any>;
  height?: number | string;
  style?: React.CSSProperties;
}

export default function EChart({ option, height = 280, style }: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);

  const handleReady = (instance: any) => {
    chartRef.current = instance;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      try {
        const chart = chartRef.current;
        if (chart && chart.getDom && chart.getDom()) {
          chart.resize();
        }
      } catch {
        // ignore resize race on unmount
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Box ref={containerRef} sx={{ width: "100%", height, ...style }}>
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge
        autoResize={false}
        onChartReady={handleReady}
      />
    </Box>
  );
}
