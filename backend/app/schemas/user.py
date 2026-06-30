from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    nom: str = Field(..., min_length=2, max_length=100)
    prenom: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6)
    service: str | None = None
    telephone: str | None = None


class UserInvite(BaseModel):
    email: EmailStr
    nom: str = Field(..., min_length=2, max_length=100)
    prenom: str = Field(..., min_length=2, max_length=100)
    role: str = "lecteur"
    password: str | None = Field(None, min_length=6)
    service: str | None = None
    telephone: str | None = None


class VerifyCode(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)


class SetPassword(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ResendCode(BaseModel):
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    nom: str
    prenom: str
    role: str
    service: str | None
    telephone: str | None
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    nom: str | None = None
    prenom: str | None = None
    service: str | None = None
    telephone: str | None = None
    role: str | None = None
    is_active: bool | None = None


class UserPasswordReset(BaseModel):
    password: str = Field(..., min_length=6)


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
