"""Email/password authentication, password reset, and OAuth 2.0 login."""
from datetime import datetime, timedelta, timezone
import logging
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_one_time_token,
    decode_token,
    hash_one_time_token,
    hash_password,
    verify_password,
)
from app.models.clinic import Clinic, Subscription
from app.models.user import PasswordResetToken, User, UserPreference
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UserPreferencesIn,
    UserPreferencesOut,
    UserOut,
)
from app.services.email_service import send_password_reset

router = APIRouter()
bearer = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)

PROVIDERS = {
    "google": {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "userinfo": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
    },
    "github": {
        "authorize": "https://github.com/login/oauth/authorize",
        "token": "https://github.com/login/oauth/access_token",
        "userinfo": "https://api.github.com/user",
        "scope": "read:user user:email",
    },
}


def user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        clinic_id=user.clinic_id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        oauth_provider=user.oauth_provider,
    )


def auth_response(user: User) -> AuthResponse:
    return AuthResponse(access_token=create_access_token(str(user.id)), user=user_out(user))


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(401, "Authentication required")
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise ValueError("Wrong token type")
        user = db.get(User, int(payload["sub"]))
    except (JWTError, KeyError, TypeError, ValueError):
        raise HTTPException(401, "Invalid or expired access token")
    if not user or not user.is_active:
        raise HTTPException(401, "Account is unavailable")
    return user


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "An account with this email already exists")

    clinic = Clinic(name=payload.clinic_name)
    db.add(clinic)
    db.flush()
    plan_code = (
        "enterprise"
        if "Enterprise" in payload.plan
        else "solo"
        if "Solo" in payload.plan
        else "pro"
    )
    db.add(Subscription(clinic_id=clinic.id, plan=plan_code, active=True))
    user = User(
        clinic_id=clinic.id,
        full_name=payload.full_name,
        email=email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    return auth_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user_out(user)


@router.get("/preferences", response_model=UserPreferencesOut)
def get_preferences(
    user: User = Depends(current_user), db: Session = Depends(get_db)
):
    row = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if not row:
        return UserPreferencesOut(
            notifications={
                "telegram": False,
                "banners": False,
                "sms": False,
                "digest": False,
            },
            agents={},
        )
    return UserPreferencesOut(
        notifications=row.notifications or {},
        agents=row.agents or {},
    )


@router.patch("/preferences", response_model=UserPreferencesOut)
def update_preferences(
    payload: UserPreferencesIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    row = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if not row:
        row = UserPreference(user_id=user.id)
        db.add(row)
    allowed_notifications = {"telegram", "banners", "sms", "digest"}
    row.notifications = {
        key: bool(payload.notifications.get(key, False))
        for key in allowed_notifications
    }
    row.agents = {key: bool(value) for key, value in payload.agents.items()}
    db.commit()
    db.refresh(row)
    return UserPreferencesOut(
        notifications=row.notifications,
        agents=row.agents,
    )


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    delivery = "accepted" if settings.SMTP_HOST else "development"
    if user:
        raw_token, token_hash = create_one_time_token()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            )
        )
        db.commit()
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
        try:
            if not send_password_reset(user.email, reset_url):
                delivery = "development"
        except Exception:
            # Do not reveal whether the submitted address belongs to an account.
            logger.exception("Password reset email delivery failed")
    return {
        "message": "If an account exists, password reset instructions have been sent.",
        "delivery": delivery,
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    row = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == hash_one_time_token(payload.token),
            PasswordResetToken.used_at.is_(None),
        )
        .first()
    )
    now = datetime.now(timezone.utc)
    if not row:
        raise HTTPException(400, "Reset link is invalid or has already been used")
    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise HTTPException(400, "Reset link has expired")
    user = db.get(User, row.user_id)
    if not user:
        raise HTTPException(400, "Reset link is invalid")
    user.password_hash = hash_password(payload.password)
    row.used_at = now
    db.commit()
    return {"message": "Password updated successfully."}


def provider_credentials(provider: str) -> tuple[str, str]:
    if provider == "google":
        values = settings.GOOGLE_CLIENT_ID, settings.GOOGLE_CLIENT_SECRET
    elif provider == "github":
        values = settings.GITHUB_CLIENT_ID, settings.GITHUB_CLIENT_SECRET
    else:
        raise HTTPException(404, "Unknown OAuth provider")
    if not all(values):
        raise HTTPException(503, f"{provider.title()} login is not configured")
    return values


@router.get("/oauth/{provider}/start")
def oauth_start(provider: str, request: Request):
    client_id, _ = provider_credentials(provider)
    config = PROVIDERS[provider]
    state = create_access_token(
        provider, expires_delta=timedelta(minutes=10), token_type="oauth_state"
    )
    redirect_uri = (
        f"{settings.PUBLIC_API_URL.rstrip('/')}"
        f"{settings.API_V1_PREFIX}/auth/oauth/{provider}/callback"
    )
    query = urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": config["scope"],
            "state": state,
        }
    )
    response = RedirectResponse(f"{config['authorize']}?{query}")
    response.set_cookie(
        "physiovision_oauth_state",
        state,
        max_age=600,
        httponly=True,
        secure=request.url.scheme == "https",
        samesite="lax",
    )
    return response


@router.get("/oauth/{provider}/callback", name="oauth_callback")
def oauth_callback(
    provider: str, request: Request, code: str, state: str, db: Session = Depends(get_db)
):
    client_id, client_secret = provider_credentials(provider)
    if request.cookies.get("physiovision_oauth_state") != state:
        raise HTTPException(400, "OAuth state cookie is missing or does not match")
    try:
        state_payload = decode_token(state)
        if state_payload.get("type") != "oauth_state" or state_payload.get("sub") != provider:
            raise ValueError
    except (JWTError, ValueError):
        raise HTTPException(400, "Invalid OAuth state")

    config = PROVIDERS[provider]
    redirect_uri = (
        f"{settings.PUBLIC_API_URL.rstrip('/')}"
        f"{settings.API_V1_PREFIX}/auth/oauth/{provider}/callback"
    )
    try:
        with httpx.Client(timeout=15) as client:
            token_response = client.post(
                config["token"],
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
            )
            token_response.raise_for_status()
            access_token = token_response.json().get("access_token")
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            }
            profile_response = client.get(config["userinfo"], headers=headers)
            profile_response.raise_for_status()
            profile = profile_response.json()
            if provider == "github":
                emails = client.get("https://api.github.com/user/emails", headers=headers)
                emails.raise_for_status()
                verified_emails = [item for item in emails.json() if item.get("verified")]
                profile["email"] = next(
                    (
                        item["email"]
                        for item in verified_emails
                        if item.get("primary")
                    ),
                    verified_emails[0]["email"] if verified_emails else None,
                )
    except httpx.HTTPError as error:
        raise HTTPException(502, "OAuth provider request failed") from error

    email = (profile.get("email") or "").lower()
    subject = str(profile.get("sub") or profile.get("id") or "")
    if provider == "google" and profile.get("email_verified") is not True:
        raise HTTPException(400, "Google did not return a verified email")
    if not email or not subject:
        raise HTTPException(400, "The provider did not return a verified email")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        display_name = profile.get("name") or profile.get("login") or email.split("@")[0]
        clinic = Clinic(name=f"{display_name}'s Clinic")
        db.add(clinic)
        db.flush()
        db.add(Subscription(clinic_id=clinic.id, plan="solo", active=True))
        user = User(
            clinic_id=clinic.id,
            full_name=display_name,
            email=email,
            oauth_provider=provider,
            oauth_subject=subject,
        )
        db.add(user)
    elif not user.oauth_provider:
        user.oauth_provider = provider
        user.oauth_subject = subject
    db.commit()
    db.refresh(user)
    app_token = create_access_token(str(user.id))
    response = RedirectResponse(
        f"{settings.FRONTEND_URL}/auth/callback?{urlencode({'token': app_token})}"
    )
    response.delete_cookie("physiovision_oauth_state")
    return response
