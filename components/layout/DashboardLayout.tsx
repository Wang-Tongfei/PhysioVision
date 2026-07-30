"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  FitnessCenter as FitnessCenterIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  Menu as MenuIcon,
  MonitorHeart as MonitorHeartIcon,
  Logout as LogoutIcon,
  FiberManualRecord as LiveIcon,
} from "@mui/icons-material";
import { usePersistentState } from "@/lib/usePersistentState";
import { api, clearSession, getSession, SessionUser } from "@/lib/api";
import { DataModeProvider, useDataMode } from "@/lib/dataMode";

const navItems = [
  { text: "Dashboard", icon: <DashboardIcon />, href: "/dashboard" },
  { text: "Patients", icon: <PeopleIcon />, href: "/patients" },
  { text: "Exercises", icon: <FitnessCenterIcon />, href: "/exercises" },
  { text: "Reports", icon: <DescriptionIcon />, href: "/reports" },
  { text: "Settings", icon: <SettingsIcon />, href: "/settings" },
];

const DRAWER_WIDTH = 250;

function SidebarContent({ onLogout, onNavigate, user }: { onLogout: () => void; onNavigate?: () => void; user: SessionUser | null }) {
  const pathname = usePathname();
  const theme = useTheme();
  const { mode } = useDataMode();
  const [activeSessions, setActiveSessions] = useState(mode === "demo" ? 6 : 0);

  useEffect(() => {
    if (mode === "demo") {
      setActiveSessions(6);
      return;
    }
    const load = () =>
      api<{ active_sessions: number }>("/analytics/clinic/kpi")
        .then((result) => setActiveSessions(result.active_sessions ?? 0))
        .catch(() => setActiveSessions(0));
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, [mode]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 2 }}>
      {/* Logo */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3, px: 1 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 18px rgba(34,211,238,0.45)",
          }}
        >
          <MonitorHeartIcon sx={{ color: "#04101f", fontSize: 24 }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>
            Physio<span style={{ color: "#22d3ee" }}>Vision</span>
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            AI Rehab Assistant
          </Typography>
        </Box>
      </Box>

      {/* Live status */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1,
          mb: 2,
          borderRadius: 2,
          background: "rgba(16,217,126,0.08)",
          border: "1px solid rgba(16,217,126,0.25)",
        }}
      >
        <LiveIcon sx={{ color: "#10d97e", fontSize: 12 }} className="pulse-dot" />
        <Typography variant="caption" sx={{ color: "#10d97e", fontWeight: 700 }}>
          {activeSessions} {activeSessions === 1 ? "PATIENT" : "PATIENTS"} LIVE
        </Typography>
      </Box>

      {/* Nav */}
      <List sx={{ flexGrow: 1, p: 0 }}>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <ListItemButton
              key={item.text}
              component={Link}
              href={item.href}
              onClick={onNavigate}
              className={active ? "nav-link active" : "nav-link"}
              sx={{ mb: 0.5, borderRadius: 2, p: 0, "&:hover": { background: "transparent" } }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1.5,
                  py: 1.2,
                  width: "100%",
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, color: "inherit" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
              </Box>
            </ListItemButton>
          );
        })}
      </List>

      {/* User */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.5,
          borderRadius: 2,
          border: "1px solid rgba(34,211,238,0.18)",
          background: "rgba(11,30,51,0.5)",
        }}
      >
        <Avatar sx={{ width: 36, height: 36, background: "linear-gradient(135deg,#0891b2,#22d3ee)", fontSize: 14 }}>
          {(user?.full_name || "Demo User").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
            {user?.full_name || "Demo User"}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {user?.role?.replaceAll("_", " ") || "Demo mode"}
          </Typography>
        </Box>
        <Tooltip title="Sign out">
          <IconButton size="small" onClick={onLogout} sx={{ color: "text.secondary" }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notificationsRead, setNotificationsRead, notificationsReady] =
    usePersistentState("physiovision.notificationsRead", false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session?.access_token) {
      router.replace("/login");
      return;
    }
    setUser(session.user);
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push("/login?relogin=1");
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Desktop sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            background: "rgba(6, 20, 38, 0.85)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            borderRight: "1px solid rgba(34,211,238,0.15)",
            boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
          },
        }}
        open
      >
        <SidebarContent onLogout={handleLogout} user={user} />
      </Drawer>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            background: "rgba(6, 20, 38, 0.95)",
            backdropFilter: "blur(18px)",
            borderRight: "1px solid rgba(34,211,238,0.15)",
          },
        }}
      >
        <SidebarContent onLogout={handleLogout} user={user} onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <Box
          className="topbar"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: { xs: 2, md: 3 },
            py: 1.5,
          }}
        >
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: "none" }, color: "text.primary" }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
              {navItems.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.text || "PhysioVision"}
            </Typography>
          </Box>

          <Box
            onClick={() => setSearchOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => event.key === "Enter" && setSearchOpen(true)}
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.8,
              borderRadius: 2,
              background: "rgba(11,30,51,0.6)",
              border: "1px solid rgba(34,211,238,0.18)",
              minWidth: 220,
              cursor: "pointer",
            }}
          >
            <SearchIcon sx={{ color: "text.secondary", fontSize: 18 }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Search patients, exercises…
            </Typography>
          </Box>

          <Tooltip title="Notifications">
            <IconButton
              onClick={() => {
                setNotificationsRead(true);
                setNotificationsOpen(true);
              }}
              sx={{ color: "text.secondary" }}
            >
              <Badge
                badgeContent={notificationsRead ? 0 : 3}
                color="error"
                invisible={!notificationsReady || notificationsRead}
              >
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <IconButton
            onClick={handleLogout}
            sx={{
              color: "text.secondary",
              border: "1px solid rgba(34,211,238,0.2)",
              "&:hover": { color: "#22d3ee", borderColor: "rgba(34,211,238,0.5)" },
            }}
          >
            <LogoutIcon />
          </IconButton>
        </Box>

        {/* Page content */}
        <Box
          component="main"
          className="bg-grid"
          sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}
        >
          {children}
        </Box>
      </Box>

      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Search PhysioVision</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            placeholder="Search patients, exercises or modules"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            sx={{ mt: 1, mb: 2 }}
          />
          <List>
            {[
              { label: "Patients", detail: "Patient records and progress", href: "/patients" },
              { label: "Exercises", detail: "Exercise library and prescriptions", href: "/exercises" },
              { label: "Reports", detail: "SOAP notes and FHIR exports", href: "/reports" },
              { label: "Settings", detail: "Clinic, notifications and AI agents", href: "/settings" },
            ].filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(search.toLowerCase())).map((item) => (
              <ListItemButton key={item.href} onClick={() => { setSearchOpen(false); setSearch(""); router.push(item.href); }} sx={{ borderRadius: 2 }}>
                <ListItemText primary={item.label} secondary={item.detail} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions><Button onClick={() => setSearchOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={notificationsOpen} onClose={() => setNotificationsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Notifications</DialogTitle>
        <DialogContent>
          <List>
            {[
              ["Critical · Goh Hock Seng", "Pelvic compensation detected 2 minutes ago."],
              ["Warning · Chua Seow Ling", "Fatigue index exceeded 70%."],
              ["Report ready", "Siti Rahman's SOAP report is ready to review."],
            ].map(([title, detail]) => (
              <ListItemButton key={title} onClick={() => { setNotificationsOpen(false); router.push("/reports"); }} sx={{ borderRadius: 2 }}>
                <ListItemText primary={title} secondary={detail} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotificationsOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => { setNotificationsOpen(false); router.push("/reports"); }}>View reports</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataModeProvider>
      <DashboardShell>{children}</DashboardShell>
    </DataModeProvider>
  );
}
