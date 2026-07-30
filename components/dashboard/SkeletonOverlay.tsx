"use client";

import { Box } from "@mui/material";

// Simplified 2D stick-figure pose skeleton mirroring MediaPipe output.
const POINTS: Record<string, [number, number]> = {
  head: [50, 12],
  shoulderL: [38, 30], shoulderR: [62, 30],
  elbowL: [32, 48], elbowR: [68, 48],
  wristL: [28, 64], wristR: [72, 64],
  hipL: [42, 56], hipR: [58, 56],
  kneeL: [40, 78], kneeR: [60, 78],
  ankleL: [38, 96], ankleR: [62, 96],
};

const BONES: [string, string][] = [
  ["head", "shoulderL"], ["head", "shoulderR"],
  ["shoulderL", "shoulderR"], ["shoulderL", "elbowL"], ["elbowL", "wristL"],
  ["shoulderR", "elbowR"], ["elbowR", "wristR"],
  ["shoulderL", "hipL"], ["shoulderR", "hipR"], ["hipL", "hipR"],
  ["hipL", "kneeL"], ["kneeL", "ankleL"],
  ["hipR", "kneeR"], ["kneeR", "ankleR"],
];

export default function SkeletonOverlay({ color = "#00bcd4" }: { color?: string }) {
  return (
    <svg viewBox="0 0 100 110" style={{ width: "100%", height: "100%" }}>
      {BONES.map(([a, b], i) => (
        <line
          key={i}
          x1={POINTS[a][0]} y1={POINTS[a][1]}
          x2={POINTS[b][0]} y2={POINTS[b][1]}
          stroke={color} strokeWidth={2.4} strokeLinecap="round"
          opacity={0.9}
        />
      ))}
      {Object.entries(POINTS).map(([k, [x, y]]) => (
        <circle key={k} cx={x} cy={y} r={k === "head" ? 5 : 2.6} fill="#fff" stroke={color} strokeWidth={1.4} />
      ))}
    </svg>
  );
}
