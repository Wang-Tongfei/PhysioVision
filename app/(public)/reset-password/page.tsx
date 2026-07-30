"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { api } from "@/lib/api";

function ResetPasswordContent() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8 || password !== confirm) {
      setMessage("Use at least 8 characters and make both passwords match.");
      return;
    }
    setLoading(true);
    try {
      const result = await api<{ message: string }>(
        "/auth/reset-password",
        {
          method: "POST",
          body: JSON.stringify({ token: params.get("token") || "", password }),
        },
        false
      );
      setSuccess(true);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}>
      <Box sx={{ width: "100%", maxWidth: 420 }}>
        <Typography variant="h4" fontWeight={800} mb={1}>Choose a new password</Typography>
        <Typography color="text.secondary" mb={3}>This reset link can be used once and expires after 30 minutes.</Typography>
        <Stack component="form" spacing={2} onSubmit={submit}>
          <TextField type="password" label="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <TextField type="password" label="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button disabled={loading || success} type="submit" variant="contained">{loading ? "Updating…" : "Update password"}</Button>
          {message && <Alert severity={success ? "success" : "error"}>{message}</Alert>}
          {success && <Button component={Link} href="/login">Return to sign in</Button>}
        </Stack>
      </Box>
    </Box>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Loading…</Box>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
