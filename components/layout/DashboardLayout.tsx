"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  DashboardOutlined,
  DescriptionOutlined,
  FitnessCenterOutlined,
  Logout,
  Menu as MenuIcon,
  MonitorHeart,
  NotificationsOutlined,
  PeopleOutline,
  Search,
  SettingsOutlined,
} from "@mui/icons-material";
import { api, clearSession, getSession, SessionUser } from "@/lib/api";
import { DataModeProvider, useDataMode } from "@/lib/dataMode";
import { tokens } from "@/app/theme";

const navItems = [
  { text: "Dashboard", icon: <DashboardOutlined fontSize="small" />, href: "/dashboard" },
  { text: "Patients", icon: <PeopleOutline fontSize="small" />, href: "/patients" },
  { text: "Exercises", icon: <FitnessCenterOutlined fontSize="small" />, href: "/exercises" },
  { text: "Reports", icon: <DescriptionOutlined fontSize="small" />, href: "/reports" },
  { text: "Settings", icon: <SettingsOutlined fontSize="small" />, href: "/settings" },
];

const DRAWER_WIDTH = 232;

type AlertItem = { id: number; severity: string; message: string; patient_id?: number | null; created_at?: string | null };

const DEMO_ALERTS: AlertItem[] = [
  { id: -1, severity: "critical", message: "Sample alert: compensation detected during squats.", patient_id: null },
  { id: -2, severity: "warning", message: "Sample alert: repetitions slowed markedly within the set.", patient_id: null },
];

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box
        sx={{
          width: 30, height: 30, borderRadius: 1.5, bgcolor: "primary.main",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <MonitorHeart sx={{ color: "#fff", fontSize: 18 }} />
      </Box>
      {!compact && (
        <Typography sx={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>PhysioVision</Typography>
      )}
    </Box>
  );
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function SidebarContent({ onLogout, onNavigate, user }: { onLogout: () => void; onNavigate?: () => void; user: SessionUser | null }) {
  const pathname = usePathname();
  const { mode } = useDataMode();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", px: 1.5, py: 2 }}>
      <Box sx={{ px: 1, mb: 3 }}>
        <Brand />
      </Box>

      <List sx={{ flexGrow: 1, p: 0 }}>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <ListItemButton
              key={item.text}
              component={Link}
              href={item.href}
              onClick={onNavigate}
              selected={active}
              sx={{ mb: 0.25, py: 0.9, color: active ? "primary.dark" : "text.secondary" }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: active ? 600 : 500, fontSize: 14 }} />
            </ListItemButton>
          );
        })}
      </List>

      {mode === "demo" && (
        <Box sx={{ mx: 1, mb: 1.5, p: 1.25, borderRadius: 2, bgcolor: tokens.subtle }}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>Demo mode</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Sample data for the demo account. Register an account to use real data.
          </Typography>
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1, py: 1, borderTop: `1px solid ${tokens.line}`, pt: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: tokens.subtle, color: "text.primary", fontSize: 13, fontWeight: 600 }}>
          {initials(user?.full_name || "User")}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{user?.full_name || "Signed in"}</Typography>
          <Typography noWrap variant="caption" sx={{ color: "text.secondary", textTransform: "capitalize" }}>
            {user?.role?.replaceAll("_", " ") || ""}
          </Typography>
        </Box>
        <Tooltip title="Sign out">
          <IconButton size="small" onClick={onLogout} sx={{ color: "text.secondary" }}>
            <Logout fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { mode } = useDataMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    const session = getSession();
    if (!session?.access_token) {
      router.replace("/login");
      return;
    }
    setUser(session.user);
  }, [router]);

  useEffect(() => {
    if (mode === "demo") {
      setAlerts(DEMO_ALERTS);
      return;
    }
    const load = () => api<AlertItem[]>("/alerts?unack=true").then(setAlerts).catch(() => setAlerts([]));
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [mode]);

  const handleLogout = () => {
    clearSession();
    router.push("/login?relogin=1");
  };

  const section = navItems.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.text || "PhysioVision";
  const drawerPaper = { width: DRAWER_WIDTH, boxSizing: "border-box" as const, bgcolor: "background.paper", borderRight: `1px solid ${tokens.line}` };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer variant="permanent" open sx={{ width: DRAWER_WIDTH, flexShrink: 0, display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": drawerPaper }}>
        <SidebarContent onLogout={handleLogout} user={user} />
      </Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": drawerPaper }}
      >
        <SidebarContent onLogout={handleLogout} user={user} onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Box className="topbar" sx={{ display: "flex", alignItems: "center", gap: 1.5, px: { xs: 2, md: 4 }, height: 56 }}>
          <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: "none" } }} aria-label="Open navigation">
            <MenuIcon />
          </IconButton>
          <Typography sx={{ fontWeight: 600, fontSize: 14, color: "text.secondary", flexGrow: 1 }}>{section}</Typography>

          <Button
            onClick={() => setSearchOpen(true)}
            variant="outlined"
            startIcon={<Search fontSize="small" />}
            sx={{ display: { xs: "none", sm: "inline-flex" }, color: "text.secondary", fontWeight: 500, minWidth: 220, justifyContent: "flex-start" }}
          >
            Search
          </Button>
          <Tooltip title="Alerts">
            <IconButton onClick={() => setNotificationsOpen(true)} aria-label="Alerts">
              <Badge badgeContent={alerts.length} color="error" invisible={alerts.length === 0}>
                <NotificationsOutlined />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>

        <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 }, maxWidth: 1440, width: "100%", mx: "auto" }}>
          {children}
        </Box>
      </Box>

      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Go to</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            placeholder="Patients, exercises, reports…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
            sx={{ mt: 1, mb: 1 }}
          />
          <List>
            {[
              { label: "Patients", detail: "Records, sessions and progress", href: "/patients" },
              { label: "Exercises", detail: "Exercise library and prescriptions", href: "/exercises" },
              { label: "Reports", detail: "SOAP notes", href: "/reports" },
              { label: "Settings", detail: "Clinic profile and notifications", href: "/settings" },
            ].filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(search.toLowerCase())).map((item) => (
              <ListItemButton key={item.href} onClick={() => { setSearchOpen(false); setSearch(""); router.push(item.href); }}>
                <ListItemText primary={item.label} secondary={item.detail} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      <Dialog open={notificationsOpen} onClose={() => setNotificationsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Open alerts</DialogTitle>
        <DialogContent>
          {alerts.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>No open alerts.</Typography>
          ) : (
            <List>
              {alerts.map((alert) => (
                <ListItemButton
                  key={alert.id}
                  onClick={() => { setNotificationsOpen(false); if (alert.patient_id) router.push(`/patients/${alert.patient_id}`); }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip size="small" label={alert.severity} color={alert.severity === "critical" ? "error" : "warning"} variant="outlined" />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{alert.message}</Typography>
                      </Box>
                    }
                    secondary={alert.created_at ? new Date(alert.created_at).toLocaleString() : undefined}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setNotificationsOpen(false)}>Close</Button></DialogActions>
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
