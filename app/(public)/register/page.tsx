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

const plans = [
  "Solo Therapist",
  "Clinic (5-20 therapists)",
  "Enterprise / Hospital",
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    clinic: "",
    password: "",
    confirm: "",
    plan: "Clinic (5-20 therapists)",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  const benefits = [
    "14-day free trial, no card required",
    "Unlimited patients & sessions",
    "AI SOAP notes & risk alerts",
    "FHIR / HL7 EHR integration",
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
            "radial-gradient(ellipse at 70% 30%, rgba(59,130,246,0.25), transparent 60%), linear-gradient(160deg, #06243e 0%, #04101f 100%)",
          borderRight: "1px solid rgba(34,211,238,0.15)",
        }}
      >
        <Box className="glow-blob" sx={{ width: 360, height: 360, background: "rgba(59,130,246,0.3)", bottom: -80, right: -60 }} />
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
            Build a smarter
            <Box component="span" className="text-gradient">
              {" "}rehab clinic
            </Box>
          </Typography>
          <Stack spacing={1.5} mt={2}>
            {benefits.map((b) => (
              <Box key={b} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <CheckCircle sx={{ color: "#10d97e", fontSize: 22 }} />
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
            <Link href="/login" style={{ color: "#22d3ee", textDecoration: "none", fontWeight: 600 }}>
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
                        <IconButton onClick={() => setShowPw((s) => !s)} edge="end"><Visibility sx={{ fontSize: 20 }} /></IconButton>
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
                        <IconButton onClick={() => setShowPw2((s) => !s)} edge="end"><VisibilityOff sx={{ fontSize: 20 }} /></IconButton>
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
              control={<Checkbox size="small" sx={{ color: "#22d3ee" }} defaultChecked />}
              label={
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  I agree to the <Link href="#" style={{ color: "#22d3ee" }}>Terms</Link> &{" "}
                  <Link href="#" style={{ color: "#22d3ee" }}>Privacy Policy</Link>
                </Typography>
              }
            />

            <Button type="submit" variant="contained" sx={{ width: "100%", py: 1.4, fontSize: 15, mt: 1 }}>
              Create Account
            </Button>
          </form>

          <Divider sx={{ my: 2, color: "text.secondary" }}>or sign up with</Divider>

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button fullWidth className="btn-ghost" startIcon={<Google />} onClick={() => router.push("/dashboard")}>
              Google
            </Button>
            <Button fullWidth className="btn-ghost" startIcon={<GitHub />} onClick={() => router.push("/dashboard")}>
              GitHub
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const iconSx = { color: "text.secondary", fontSize: 20 };
const fieldSx = {
  mb: 0.5,
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "rgba(34,211,238,0.25)" },
    "&:hover fieldset": { borderColor: "rgba(34,211,238,0.5)" },
    "&.Mui-focused fieldset": { borderColor: "#22d3ee" },
    background: "rgba(11,30,51,0.5)",
  },
};
