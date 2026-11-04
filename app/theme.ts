"use client";

import { createTheme, alpha } from "@mui/material/styles";

/*
 * PhysioVision design tokens.
 *
 * A light, clinical interface: neutral surfaces, one teal accent, thin borders
 * instead of shadows and glass. Status colours are reserved for meaning
 * (good / attention / problem), never for decoration.
 */
export const tokens = {
  teal: "#0F766E",
  tealLight: "#14B8A6",
  tealDark: "#115E59",
  indigo: "#4F46E5",
  amber: "#B45309",
  red: "#B91C1C",
  green: "#15803D",
  ink: "#0F172A",
  inkSoft: "#475569",
  muted: "#94A3B8",
  line: "#E2E8F0",
  surface: "#FFFFFF",
  canvas: "#F6F7F9",
  subtle: "#F1F5F9",
};

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
    mode: "light",
    primary: { main: tokens.teal, light: tokens.tealLight, dark: tokens.tealDark, contrastText: "#FFFFFF" },
    secondary: { main: tokens.indigo },
    success: { main: tokens.green },
    warning: { main: tokens.amber },
    error: { main: tokens.red },
    info: { main: tokens.indigo },
    background: { default: tokens.canvas, paper: tokens.surface },
    text: { primary: tokens.ink, secondary: tokens.inkSoft, disabled: tokens.muted },
    divider: tokens.line,
    // kept for components that still read these keys
    glass: { background: tokens.surface, border: tokens.line },
    gradient: { cyan: tokens.teal, blue: tokens.teal, sun: tokens.amber },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.025em" },
    h2: { fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontWeight: 650, letterSpacing: "-0.02em", fontSize: "2.1rem" },
    h4: { fontWeight: 650, letterSpacing: "-0.015em", fontSize: "1.65rem" },
    h5: { fontWeight: 600, fontSize: "1.2rem" },
    h6: { fontWeight: 600, fontSize: "1rem" },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
    body2: { lineHeight: 1.6 },
    overline: { fontWeight: 600, letterSpacing: "0.08em" },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: tokens.canvas },
        "*::-webkit-scrollbar": { width: 8, height: 8 },
        "*::-webkit-scrollbar-thumb": { background: "#CBD5E1", borderRadius: 8 },
        "*::-webkit-scrollbar-track": { background: "transparent" },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none", border: `1px solid ${tokens.line}` },
      },
    },
    MuiAppBar: { styleOverrides: { root: { border: "none" } } },
    MuiDrawer: { styleOverrides: { paper: { border: "none" } } },
    MuiMenu: { styleOverrides: { paper: { boxShadow: "0 8px 24px rgba(15,23,42,0.08)" } } },
    MuiPopover: { styleOverrides: { paper: { boxShadow: "0 8px 24px rgba(15,23,42,0.08)" } } },
    MuiDialog: { styleOverrides: { paper: { boxShadow: "0 24px 48px rgba(15,23,42,0.16)" } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, paddingInline: 14 },
        outlined: { borderColor: tokens.line, color: tokens.ink, "&:hover": { borderColor: "#CBD5E1", background: tokens.subtle } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6 },
        sizeSmall: { height: 22, fontSize: 12 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { background: tokens.surface, "& fieldset": { borderColor: tokens.line } },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: tokens.line },
        head: { color: tokens.inkSoft, fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 6, borderRadius: 6, backgroundColor: tokens.subtle },
        bar: { borderRadius: 6 },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: tokens.line } } },
    MuiTooltip: {
      styleOverrides: { tooltip: { background: tokens.ink, fontSize: 12, fontWeight: 500 } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "&.Mui-selected": { background: alpha(tokens.teal, 0.08), color: tokens.tealDark },
          "&.Mui-selected:hover": { background: alpha(tokens.teal, 0.12) },
        },
      },
    },
  },
});

export default theme;
