from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=128)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    clinic_name: str = Field(min_length=2, max_length=128)
    plan: str = "Clinic (5-20 therapists)"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    id: int
    clinic_id: int
    full_name: str
    email: EmailStr
    role: str
    oauth_provider: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserPreferencesIn(BaseModel):
    notifications: dict[str, bool]
    agents: dict[str, bool] = Field(default_factory=dict)


class UserPreferencesOut(UserPreferencesIn):
    pass
