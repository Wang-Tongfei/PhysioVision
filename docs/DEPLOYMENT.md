# PhysioVision authentication and deployment

## 1. Local development

From the repository root, run:

```powershell
.\start.bat
```

Open `http://localhost:3000/login`. The local demo account is:

```text
therapist@clinic.com
demo1234
```

The frontend runs at port 3000 and FastAPI at port 8000. `start.bat` enables
FastAPI auto-reload, so backend code changes no longer leave an old API process
serving stale routes.

## 2. Local environment file

Copy `backend/.env.example` to `backend/.env`. Never commit this file.

At minimum, replace `SECRET_KEY` with a long random value. Keep OAuth secrets,
SMTP passwords, and database credentials only in this backend file or in the
hosting provider's secret manager. Do not prefix secrets with `NEXT_PUBLIC_`.

## 3. Google OAuth

1. Open Google Cloud Console and select or create a project.
2. Configure Google Auth Platform branding/audience. While testing, add the
   accounts that are allowed to sign in as test users.
3. Create an OAuth client with application type **Web application**.
4. Add this local authorized redirect URI:

   `http://localhost:8000/api/v1/auth/oauth/google/callback`

5. Copy the client ID and client secret into:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

For production, add a second redirect URI using the public API domain, for
example:

`https://physiovision-api.onrender.com/api/v1/auth/oauth/google/callback`

The URI must match exactly, including scheme, port, path, and trailing slash.

## 4. GitHub OAuth

1. In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. For local development use:

```text
Homepage URL: http://localhost:3000
Authorization callback URL:
http://localhost:8000/api/v1/auth/oauth/github/callback
```

3. Copy the Client ID and generate a Client Secret:

```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

GitHub OAuth Apps accept one callback URL. Create a separate OAuth App for
production so local and production credentials remain isolated.

## 5. Password-reset email

### Recommended: Resend SMTP

1. Create a Resend account.
2. Add and verify a sending domain.
3. Create an API key.
4. Configure:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=re_xxxxxxxxx
SMTP_FROM_EMAIL=PhysioVision <no-reply@your-domain.com>
SMTP_USE_TLS=true
```

### Quick local test: Gmail SMTP

Enable Google two-step verification, create a 16-character App Password, then
configure:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-account@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM_EMAIL=your-account@gmail.com
SMTP_USE_TLS=true
```

Do not use the normal Google account password.

## 6. Recommended production layout

PhysioVision contains a Next.js frontend and a long-running Python/OpenCV
backend. Deploy them as separate services:

```text
Vercel (Next.js)
    |
    | NEXT_PUBLIC_API_URL
    v
Render (FastAPI / Docker)
    |
    v
PostgreSQL or a persistent SQLite disk
```

### Backend on Render

Create a Web Service from the repository and use:

```text
Root directory: backend
Runtime: Docker
Health check: /health
```

Set these environment variables in Render:

```env
SECRET_KEY=<long-random-production-secret>
FRONTEND_URL=https://your-frontend.vercel.app
PUBLIC_API_URL=https://your-api.onrender.com
CORS_ORIGINS=["https://your-frontend.vercel.app"]
DATABASE_URL=<database connection string>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=...
SMTP_USE_TLS=true
```

For a small single-instance deployment, attach a Render persistent disk and set:

```env
DATABASE_URL=sqlite:////var/data/physiovision.db
```

Mount the disk at `/var/data`. Without a persistent disk, SQLite data will be
lost on redeploy. For multi-instance or production use, use PostgreSQL instead.

### Frontend on Vercel

Import the same repository as a Next.js project and set:

```env
NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api/v1
```

Deploy the backend first, then the frontend. After the final URLs are known,
update `FRONTEND_URL`, `PUBLIC_API_URL`, `CORS_ORIGINS`, and both OAuth callback
URLs, then redeploy the backend.

## 7. Final verification

Verify in this order:

1. `GET https://your-api/health` returns `status: ok`.
2. Email/password login reaches the dashboard.
3. Register a new account, sign out, and sign back in.
4. Add a patient in **Real data** mode and reload the page.
5. Request a password reset and use the emailed link once.
6. Test Google and GitHub in separate private-browser sessions.

