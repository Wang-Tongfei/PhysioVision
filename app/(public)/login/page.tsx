"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Divider,
  Checkbox,
  FormControlLabel,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  MonitorHeart,
  Mail,
  Lock,
  Google,
  GitHub,
} from "@mui/icons-material";
import {
  api,
  getRecentLogin,
  oauthUrl,
  saveRecentLogin,
  saveSession,
  Session,
} from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoEntry, setDemoEntry] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState<"success" | "error">("error");

  useEffect(() => {
    const isDemo =
      new URLSearchParams(window.location.search).get("demo") === "1";
    const isRelogin =
      new URLSearchParams(window.location.search).get("relogin") === "1";
    setDemoEntry(isDemo);
    if (isDemo) {
      setEmail("therapist@clinic.com");
      setPassword("demo1234");
    } else if (isRelogin) {
      const recentLogin = getRecentLogin();
      if (recentLogin) {
        setEmail(recentLogin.email);
        setPassword(recentLogin.password);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setMessage("Password must contain at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const session = await api<Session>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
        false
      );
      saveSession(session);
      saveRecentLogin(email, password);
      router.push("/dashboard");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async () => {
    setLoading(true);
    try {
      const result = await api<{ message: string; delivery: string }>(
        "/auth/forgot-password",
        { method: "POST", body: JSON.stringify({ email }) },
        false
      );
      setForgotOpen(false);
      setMessageType(result.delivery === "development" ? "error" : "success");
      setMessage(
        result.delivery === "development"
          ? "Reset link created, but SMTP is not configured. Check the API log for the local link."
          : result.message
      );
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Could not send reset instructions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left brand panel */}
      <Box
        sx={{
          flex: 1,
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          p: 4,
          position: "relative",
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(34,211,238,0.25), transparent 60%), linear-gradient(160deg, #06243e 0%, #04101f 100%)",
          borderRight: "1px solid rgba(34,211,238,0.15)",
        }}
      >
        <Box className="glow-blob" sx={{ width: 360, height: 360, background: "rgba(34,211,238,0.3)", top: -80, left: -60 }} />
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1, textDecoration: "none", color: "inherit" }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MonitorHeart sx={{ color: "#04101f", fontSize: 24 }} />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: 22 }}>
            Physio<span style={{ color: "#22d3ee" }}>Vision</span>
          </Typography>
        </Link>

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.15, mb: 2 }}>
            Welcome back to your
            <Box component="span" className="text-gradient">
              {" "}clinic cockpit
            </Box>
          </Typography>
          <Typography sx={{ color: "text.secondary", maxWidth: 420 }}>
            Sign in to monitor live sessions, review AI reports, and keep every
            patient on track — all from one intelligent dashboard.
          </Typography>
        </Box>

        <Box sx={{ position: "relative", zIndex: 1, display: "flex", gap: 1 }}>
          {["Live monitoring", "AI reports", "Risk alerts"].map((b) => (
            <Box key={b} className="badge badge-info">
              {b}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right form panel */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 2, md: 4 },
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Sign In
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 2 }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "#22d3ee", textDecoration: "none", fontWeight: 600 }}>
              Create one
            </Link>
          </Typography>

          <form onSubmit={handleSubmit}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              Email
            </Typography>
            <TextField
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@clinic.com"
              margin="dense"
              sx={{
                mb: 1.5,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "rgba(34,211,238,0.25)" },
                  "&:hover fieldset": { borderColor: "rgba(34,211,238,0.5)" },
                  "&.Mui-focused fieldset": { borderColor: "#22d3ee" },
                  background: "rgba(11,30,51,0.5)",
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Mail sx={{ color: "text.secondary", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              Password
            </Typography>
            <TextField
              fullWidth
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              margin="dense"
              sx={{
                mb: 1,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "rgba(34,211,238,0.25)" },
                  "&:hover fieldset": { borderColor: "rgba(34,211,238,0.5)" },
                  "&.Mui-focused fieldset": { borderColor: "#22d3ee" },
                  background: "rgba(11,30,51,0.5)",
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: "text.secondary", fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPw((s) => !s)} edge="end">
                      {showPw ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <FormControlLabel
                control={<Checkbox size="small" sx={{ color: "#22d3ee" }} defaultChecked />}
                label={<Typography variant="caption" sx={{ color: "text.secondary" }}>Remember me</Typography>}
              />
              <Button variant="text" size="small" onClick={() => setForgotOpen(true)} sx={{ color: "#22d3ee", textTransform: "none", fontSize: 13, fontWeight: 600 }}>
                Forgot password?
              </Button>
            </Box>

            <Button disabled={loading} type="submit" variant="contained" sx={{ width: "100%", py: 1.4, fontSize: 15 }}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <Divider sx={{ my: 2, color: "text.secondary" }}>or continue with</Divider>

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              fullWidth
              className="btn-ghost"
              startIcon={<Google />}
              onClick={() => { window.location.href = oauthUrl("google"); }}
            >
              Google
            </Button>
            <Button
              fullWidth
              className="btn-ghost"
              startIcon={<GitHub />}
              onClick={() => { window.location.href = oauthUrl("github"); }}
            >
              GitHub
            </Button>
          </Box>

          {demoEntry && (
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 2, textAlign: "center" }}>
            Demo credentials are prefilled — just click Sign In.
          </Typography>
          )}
        </Box>
      </Box>

      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Reset password</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" mb={2}>We will send reset instructions to your work email.</Typography>
          <TextField fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotOpen(false)}>Cancel</Button>
          <Button disabled={loading} variant="contained" onClick={sendReset}>Send instructions</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage("")}>
        <Alert severity={messageType} onClose={() => setMessage("")}>{message}</Alert>
      </Snackbar>
    </Box>
  );
}
