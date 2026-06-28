from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import (
    ResendCode,
    SetPassword,
    Token,
    UserInvite,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
    VerifyCode,
)
from app.services.email_service import create_verification_code, send_verification_email, verify_code
from app.utils.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    require_roles,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: Annotated[Session, Depends(get_db)]):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est deja utilise.")

    user = User(
        email=data.email,
        nom=data.nom,
        prenom=data.prenom,
        hashed_password=hash_password(data.password),
        service=data.service,
        telephone=data.telephone,
        is_active=False,
        is_verified=False,
    )
    db.add(user)
    db.commit()

    code = create_verification_code(db, data.email, "register")
    await send_verification_email(data.email, code, "register", f"{data.prenom} {data.nom}")

    return {
        "message": "Inscription enregistree. Verifiez votre email pour le code de validation.",
        "email": data.email,
    }


@router.post("/verify")
async def verify_account(data: VerifyCode, db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if user.is_verified:
        return {"message": "Compte deja valide. Vous pouvez vous connecter."}

    if not verify_code(db, data.email, data.code, "register"):
        if not verify_code(db, data.email, data.code, "invite"):
            raise HTTPException(status_code=400, detail="Code invalide ou expire.")

    user.is_verified = True
    user.is_active = True
    db.commit()

    return {"message": "Compte valide avec succes ! Vous pouvez vous connecter."}


@router.post("/set-password")
async def set_password(data: SetPassword, db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if not verify_code(db, data.email, data.code, "invite"):
        raise HTTPException(status_code=400, detail="Code invalide ou expire.")

    user.hashed_password = hash_password(data.password)
    user.is_verified = True
    user.is_active = True
    db.commit()

    return {"message": "Mot de passe defini. Vous pouvez vous connecter."}


@router.post("/resend-code")
async def resend_code(data: ResendCode, db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if user.is_verified and user.is_active:
        raise HTTPException(status_code=400, detail="Compte deja actif.")

    purpose = "invite" if verify_password("temporal123!", user.hashed_password) else "register"

    code = create_verification_code(db, data.email, purpose)
    await send_verification_email(data.email, code, purpose, f"{user.prenom} {user.nom}")

    return {"message": "Nouveau code envoye par email."}


@router.post("/login", response_model=Token)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")

    if not user.is_verified or not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Compte non valide. Verifiez votre email avec le code recu.",
        )

    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user


@router.post("/invite", status_code=status.HTTP_201_CREATED)
async def invite_user(
    data: UserInvite,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est deja utilise.")

    try:
        role = UserRole(data.role)
    except ValueError:
        role = UserRole.LECTEUR

    if current_user.role == UserRole.GESTIONNAIRE and role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas creer un administrateur.")

    user = User(
        email=data.email,
        nom=data.nom,
        prenom=data.prenom,
        hashed_password=hash_password("temporal123!"),
        role=role,
        service=data.service,
        telephone=data.telephone,
        is_active=False,
        is_verified=False,
    )
    db.add(user)
    db.commit()

    code = create_verification_code(db, data.email, "invite")
    await send_verification_email(data.email, code, "invite", f"{data.prenom} {data.nom}")

    return {
        "message": f"Invitation envoyee a {data.email}. Le membre doit valider avec le code recu.",
        "email": data.email,
    }


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    return db.query(User).order_by(User.nom).all()


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    update_data = data.model_dump(exclude_unset=True)
    if "role" in update_data:
        update_data["role"] = UserRole(update_data["role"])

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user
