"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { api, saveSession, SessionUser } from "@/lib/api";

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("The sign-in provider did not return an access token.");
      return;
    }
    localStorage.setItem(
      "physiovision.session",
      JSON.stringify({ access_token: token, token_type: "bearer", user: null })
    );
    api<SessionUser>("/auth/me")
      .then((user) => {
        saveSession({ access_token: token, token_type: "bearer", user });
        router.replace("/dashboard");
      })
      .catch((reason) => {
        localStorage.removeItem("physiovision.session");
        setError(reason instanceof Error ? reason.message : "Social sign-in failed.");
      });
  }, [params, router]);

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}>
      <Box sx={{ textAlign: "center" }}>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <CircularProgress />
            <Typography mt={2}>Completing secure sign-in…</Typography>
          </>
        )}
      </Box>
    </Box>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><CircularProgress /></Box>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
