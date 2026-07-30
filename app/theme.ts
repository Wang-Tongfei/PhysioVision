"use client";

import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    glass: { background: string; border: string };
    gradient: { cyan: string; blue: string; sun: string };
  }
  interface PaletteOptions {
    glass?: { background: string; border: string };
    gradient?: { cyan: string; blue: string; sun: string };
  }
}

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#22d3ee",          // cyan-400  更亮的青色
      light: "#67e8f9",
      dark: "#0891b2",
      contrastText: "#04101f",
    },
    secondary: {
      main: "#3b82f6",          // blue-500
      light: "#60a5fa",
      dark: "#1d4ed8",
    },
    success: { main: "#10d97e" }, // 鲜艳的绿色
    warning: { main: "#f5b73b" },
    error: { main: "#ef5b5b" },
    info: { main: "#22d3ee" },
    background: {
      default: "#04101f",       // 浅一点的深蓝
      paper: "rgba(11, 30, 51, 0.65)",  // 玻璃拟态
    },
    text: {
      primary: "#e6f4ff",
      secondary: "#8db5cc",
    },
    divider: "rgba(34, 211, 238, 0.15)",
    glass: {
      background: "rgba(11, 30, 51, 0.55)",
      border: "rgba(34, 211, 238, 0.25)",
    },
    gradient: {
      cyan: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
      blue: "linear-gradient(135deg, #1e40af 0%, #22d3ee 100%)",
      sun: "linear-gradient(135deg, #f5b73b 0%, #ef5b5b 100%)",
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.01em" },
    h4: { fontWeight: 700, letterSpacing: "-0.01em" },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
    body2: { lineHeight: 1.6 },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(34,211,238,0.18) 0%, transparent 60%)," +
            "radial-gradient(ellipse 50% 50% at 90% 50%, rgba(59,130,246,0.12) 0%, transparent 60%)," +
            "linear-gradient(180deg, #06243e 0%, #04101f 100%)",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        },
        "*::-webkit-scrollbar": { width: 8, height: 8 },
        "*::-webkit-scrollbar-thumb": {
          background: "rgba(34, 211, 238, 0.25)",
          borderRadius: 8,
        },
        "*::-webkit-scrollbar-track": { background: "transparent" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          background: "rgba(11, 30, 51, 0.55)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(34, 211, 238, 0.2)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 12,
          fontWeight: 600,
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
          boxShadow: "0 2px 10px rgba(34, 211, 238, 0.28)",
          color: "#04101f",
          fontWeight: 600,
          transition: "transform .2s ease, box-shadow .2s ease, background .2s ease",
          "&:hover": {
            background: "linear-gradient(135deg, #67e8f9 0%, #22d3ee 100%)",
            boxShadow: "0 3px 12px rgba(34, 211, 238, 0.22)",
            transform: "translateY(-1px)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: 6,
          backgroundColor: "rgba(34, 211, 238, 0.08)",
        },
        bar: { borderRadius: 6 },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: "rgba(34, 211, 238, 0.12)" } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: "rgba(4, 16, 31, 0.92)",
          border: "1px solid rgba(34, 211, 238, 0.3)",
          fontSize: 12,
        },
      },
    },
  },
});

export default theme;