import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.routers import affectations, alerts, auth, dashboard, destockage, exports, historique, inventaires, lieux, maintenance, materiels, reports
from app.services.alert_service import run_scheduled_alerts
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


async def _alert_scheduler():
    interval = max(1, settings.alert_check_interval_hours) * 3600
    await asyncio.sleep(60)  # laisser l'API demarrer
    while True:
        try:
            result = await run_scheduled_alerts()
            if result["maintenance_alertes"] or result["stock_alertes"]:
                print(f"ALERTES : {result}")
        except Exception as exc:
            print(f"Erreur scheduler alertes : {exc}")
        await asyncio.sleep(interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_upload_dirs()
    seed_admin()
    if email_dev_fallback():
        print("EMAIL : mode dev (codes dans les logs Docker)")
    elif smtp_configured():
        print(f"EMAIL : envoi actif via {settings.smtp_host}")
    print(f"ALERTES : verification toutes les {settings.alert_check_interval_hours}h")
    scheduler_task = asyncio.create_task(_alert_scheduler())
    yield
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Gestion de Stock - Conseil Regional de l'Ouest",
    description="Plateforme de gestion du materiel et des affectations du CRO",
    version="2.1.0",
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
app.include_router(historique.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "API Gestion de Stock - Conseil Regional de l'Ouest", "docs": "/docs", "version": "2.1.0"}
