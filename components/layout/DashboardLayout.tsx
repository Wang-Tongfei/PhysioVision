"use client";

import React, { useState } from "react";
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

const navItems = [
  { text: "Dashboard", icon: <DashboardIcon />, href: "/dashboard" },
  { text: "Patients", icon: <PeopleIcon />, href: "/patients" },
  { text: "Exercises", icon: <FitnessCenterIcon />, href: "/exercises" },
  { text: "Reports", icon: <DescriptionIcon />, href: "/reports" },
  { text: "Settings", icon: <SettingsIcon />, href: "/settings" },
];

const DRAWER_WIDTH = 250;

function SidebarContent() {
  const pathname = usePathname();
  const theme = useTheme();

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
          6 PATIENTS LIVE
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
          DR
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
            Dr. Sarah Kim
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Lead Therapist
          </Typography>
        </Box>
        <Tooltip title="Sign out">
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    router.push("/login");
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
        <SidebarContent />
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
        <SidebarContent />
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
            }}
          >
            <SearchIcon sx={{ color: "text.secondary", fontSize: 18 }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Search patients, exercises…
            </Typography>
          </Box>

          <Tooltip title="Notifications">
            <IconButton sx={{ color: "text.secondary" }}>
              <Badge badgeContent={3} color="error">
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
    </Box>
  );
}
