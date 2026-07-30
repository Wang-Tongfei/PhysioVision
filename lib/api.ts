export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export type SessionUser = {
  id: number;
  clinic_id: number;
  full_name: string;
  email: string;
  role: string;
  oauth_provider?: string | null;
};

export type Session = {
  access_token: string;
  token_type: string;
  user: SessionUser;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem("physiovision.session");
    return value ? (JSON.parse(value) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  window.localStorage.setItem("physiovision.session", JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem("physiovision.session");
}

const RECENT_LOGIN_KEY = "physiovision.recentLogin";

export function saveRecentLogin(email: string, password: string) {
  window.sessionStorage.setItem(
    RECENT_LOGIN_KEY,
    JSON.stringify({ email, password })
  );
}

export function getRecentLogin(): { email: string; password: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(RECENT_LOGIN_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true
): Promise<T> {
  const session = getSession();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authenticated && session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof payload?.detail === "string"
        ? payload.detail
        : "The server could not complete the request.";
    throw new ApiError(detail, response.status);
  }
  return payload as T;
}

export function oauthUrl(provider: "google" | "github") {
  return `${API_BASE}/auth/oauth/${provider}/start`;
}
