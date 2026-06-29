from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.routers import affectations, auth, dashboard, destockage, exports, inventaires, lieux, maintenance, materiels, reports
from app.services.email_service import email_dev_fallback, smtp_configured
from app.services.storage_service import ensure_upload_dirs
from app.utils.auth import hash_password


def seed_admin():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@cro.cm").first()
        if not admin:
            admin = User(
                email="admin@cro.cm",
                nom="Administrateur",
                prenom="CRO",
                hashed_password=hash_password("admin123"),
                role=UserRole.ADMIN,
                service="Direction Generale",
                is_active=True,
                is_verified=True,
            )
            db.add(admin)
            db.commit()
            print("Compte admin cree : admin@cro.cm / admin123")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_upload_dirs()
    seed_admin()
    if email_dev_fallback():
        print("EMAIL : mode dev (codes dans les logs Docker)")
    elif smtp_configured():
        print(f"EMAIL : envoi actif via {settings.smtp_host} → boite du client")
    yield


app = FastAPI(
    title="Gestion de Stock - Conseil Regional de l'Ouest",
    description="Plateforme de gestion du materiel et des affectations du CRO",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5181",
        "http://127.0.0.1:5181",
        settings.frontend_url.rstrip("/"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_path = Path(settings.upload_dir)
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(lieux.router, prefix="/api")
app.include_router(materiels.router, prefix="/api")
app.include_router(affectations.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(exports.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")
app.include_router(inventaires.router, prefix="/api")
app.include_router(destockage.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "API Gestion de Stock - Conseil Regional de l'Ouest", "docs": "/docs", "version": "2.0.0"}
