"use client";

import React, { useState } from "react";
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
  MenuItem,
  Stack,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  MonitorHeart,
  Mail,
  Lock,
  Person,
  Business,
  Google,
  GitHub,
  CheckCircle,
} from "@mui/icons-material";
import { api, oauthUrl, saveRecentLogin, saveSession, Session } from "@/lib/api";

const plans = [
  "Solo Therapist",
  "Clinic (5-20 therapists)",
  "Enterprise / Hospital",
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    clinic: "",
    password: "",
    confirm: "",
    plan: "Clinic (5-20 therapists)",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.clinic.trim()) {
      setMessage("Name and clinic are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setMessage("Enter a valid work email.");
      return;
    }
    if (form.password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setMessage("Accept the Terms and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    try {
      const session = await api<Session>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            full_name: form.name,
            email: form.email,
            clinic_name: form.clinic,
            password: form.password,
            plan: form.plan,
          }),
        },
        false
      );
      saveSession(session);
      saveRecentLogin(form.email, form.password);
      router.push("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Account creation failed.");
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    "Patients, session uploads and progress trends",
    "Per-repetition results from the PhysioSight engine",
    "SOAP note drafts & rule-based alerts",
    "Research and demonstration tool, not a medical device",
  ];

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", position: "relative", overflow: "hidden" }}>
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
            "#EAF3F2",
          borderRight: "1px solid rgba(15,118,110,0.15)",
        }}
      >
        <Box className="glow-blob" sx={{ width: 360, height: 360, background: "rgba(79,70,229,0.3)", bottom: -80, right: -60 }} />
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1, textDecoration: "none", color: "inherit" }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: "#0F766E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MonitorHeart sx={{ color: "#FFFFFF", fontSize: 24 }} />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: 22 }}>
            Physio<span style={{ color: "#0F766E" }}>Vision</span>
          </Typography>
        </Link>

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.15, mb: 2 }}>
            Create your clinic workspace
          </Typography>
          <Stack spacing={1.5} mt={2}>
            {benefits.map((b) => (
              <Box key={b} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <CheckCircle sx={{ color: "#15803D", fontSize: 22 }} />
                <Typography sx={{ color: "text.secondary" }}>{b}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Trusted by 200+ clinics worldwide
          </Typography>
        </Box>
      </Box>

      {/* Right form panel */}
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 3, md: 6 } }}>
        <Box sx={{ width: "100%", maxWidth: 440 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Create your account
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 1.5 }}>
            Already registered?{" "}
            <Link href="/login" style={{ color: "#0F766E", textDecoration: "none", fontWeight: 600 }}>
              Sign in
            </Link>
          </Typography>

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>Full Name</Typography>
                <TextField
                  fullWidth
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Dr. Sarah Kim"
                  margin="dense"
                  sx={fieldSx}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={iconSx} /></InputAdornment> }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>Clinic Name</Typography>
                <TextField
                  fullWidth
                  value={form.clinic}
                  onChange={(e) => set("clinic", e.target.value)}
                  placeholder="Northside Rehab"
                  margin="dense"
                  sx={fieldSx}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Business sx={iconSx} /></InputAdornment> }}
                />
              </Box>
            </Box>

            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>Work Email</Typography>
            <TextField
              fullWidth
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@clinic.com"
              margin="dense"
              sx={{ ...fieldSx, mb: 0.75 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Mail sx={iconSx} /></InputAdornment> }}
            />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>Password</Typography>
                <TextField
                  fullWidth
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="••••••••"
                  margin="dense"
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Lock sx={iconSx} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPw((s) => !s)} edge="end">{showPw ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}</IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>Confirm</Typography>
                <TextField
                  fullWidth
                  type={showPw2 ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  placeholder="••••••••"
                  margin="dense"
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Lock sx={iconSx} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPw2((s) => !s)} edge="end">{showPw2 ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}</IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Box>

            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>Plan</Typography>
            <TextField
              select
              fullWidth
              value={form.plan}
              onChange={(e) => set("plan", e.target.value)}
              margin="dense"
              sx={{ ...fieldSx, mb: 2 }}
            >
              {plans.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </TextField>

            <FormControlLabel
              control={<Checkbox size="small" sx={{ color: "#0F766E" }} checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />}
              label={
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  I agree to the <Link href="/#terms" style={{ color: "#0F766E" }}>Terms</Link> &{" "}
                  <Link href="/#privacy" style={{ color: "#0F766E" }}>Privacy Policy</Link>
                </Typography>
              }
            />

            <Button disabled={loading} type="submit" variant="contained" sx={{ width: "100%", py: 1.4, fontSize: 15, mt: 1 }}>
              {loading ? "Creating account…" : "Create Account"}
            </Button>
          </form>

          <Divider sx={{ my: 2, color: "text.secondary" }}>or sign up with</Divider>

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button fullWidth className="btn-ghost" startIcon={<Google />} onClick={() => { window.location.href = oauthUrl("google"); }}>
              Google
            </Button>
            <Button fullWidth className="btn-ghost" startIcon={<GitHub />} onClick={() => { window.location.href = oauthUrl("github"); }}>
              GitHub
            </Button>
          </Box>
        </Box>
      </Box>
      <Snackbar open={Boolean(message)} autoHideDuration={3500} onClose={() => setMessage("")}>
        <Alert severity="error" onClose={() => setMessage("")}>{message}</Alert>
      </Snackbar>
    </Box>
  );
}

const iconSx = { color: "text.secondary", fontSize: 20 };
const fieldSx = {
  mb: 0.5,
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "rgba(15,118,110,0.25)" },
    "&:hover fieldset": { borderColor: "rgba(15,118,110,0.5)" },
    "&.Mui-focused fieldset": { borderColor: "#0F766E" },
    background: "#F8FAFC",
  },
};
