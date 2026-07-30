// Shared ECharts option builders (dark navy + teal theme).

const AXIS = "rgba(141,181,204,0.8)";
const SPLIT = "rgba(34,211,238,0.08)";

export const baseGrid = { left: 44, right: 20, top: 30, bottom: 30 };

export function lineOption(
  categories: string[],
  series: { name: string; data: number[]; color: string }[],
  opts: { area?: boolean } = {}
) {
  return {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "#04101f", borderColor: "rgba(34,211,238,0.3)", textStyle: { color: "#e6f4ff" } },
    legend: { textStyle: { color: AXIS }, top: 0, right: 0 },
    grid: baseGrid,
    xAxis: {
      type: "category",
      data: categories,
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: { color: AXIS },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisLabel: { color: AXIS },
      splitLine: { lineStyle: { color: SPLIT } },
    },
    series: series.map((s) => ({
      name: s.name,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      data: s.data,
      lineStyle: { width: 3, color: s.color },
      itemStyle: { color: s.color },
      areaStyle: opts.area
        ? {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: s.color + "55" },
                { offset: 1, color: s.color + "00" },
              ],
            },
          }
        : undefined,
    })),
  };
}

export function barOption(categories: string[], data: number[], color = "#22d3ee") {
  return {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "#04101f", borderColor: "rgba(34,211,238,0.3)", textStyle: { color: "#e6f4ff" } },
    grid: { left: 44, right: 16, top: 20, bottom: 28 },
    xAxis: {
      type: "category",
      data: categories,
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: { color: AXIS, interval: 0, fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: AXIS },
      splitLine: { lineStyle: { color: SPLIT } },
    },
    series: [
      {
        type: "bar",
        data,
        barWidth: "46%",
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "#4dd0e1" },
              { offset: 1, color: "#0097a7" },
            ],
          },
        },
      },
    ],
  };
}

export function donutOption(
  data: { name: string; value: number; color: string }[]
) {
  return {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", backgroundColor: "#04101f", borderColor: "rgba(34,211,238,0.3)", textStyle: { color: "#e6f4ff" } },
    legend: { bottom: 0, textStyle: { color: AXIS } },
    series: [
      {
        type: "pie",
        radius: ["58%", "78%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: false,
        label: { show: false },
        data: data.map((d) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: d.color },
        })),
      },
    ],
  };
}
