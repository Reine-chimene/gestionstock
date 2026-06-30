# Gestion de Stock — Conseil Regional de l'Ouest v2.0

Plateforme complete de gestion du patrimoine materiel du CRO.

## Fonctionnalites

| Module | Description |
|--------|-------------|
| **Materiel** | Inventaire, photos, QR codes, historique |
| **Affectations** | Beneficiaire, raison, signature numerique, bon PDF |
| **Maintenance** | Planification, alertes email |
| **Inventaire annuel** | Comptage, detection ecarts |
| **Rapports** | Par structure, exports PDF/Excel |
| **Equipe** | Inscription avec validation email |

## Demarrage avec Docker (recommande)

```bash
docker compose up --build
```

- **Frontend** : http://localhost:5181
- **API** : http://localhost:8000/docs
- **PostgreSQL** : localhost:5434

Compte demo : `admin@cro.cm` / `admin123`

## Emails de validation (production VPS)

Pour que **le client recoive le code sur son adresse email** (Gmail, Yahoo, etc.) :

1. Hostinger hPanel → **Emails** → creer `noreply@votredomaine.com`
2. Sur le VPS :
   ```bash
   cp backend/.env.example backend/.env
   nano backend/.env
   ```
3. Renseigner `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` et mettre `EMAIL_DEV_MODE=false`
4. Redemarrer : `docker compose up --build -d`
5. Verifier les logs : `docker logs cro_stock_api` doit afficher `EMAIL : envoi actif via smtp.hostinger.com`

Tant que `EMAIL_DEV_MODE=true`, aucun email n'est envoye au client (code visible uniquement dans les logs).

## Demarrage manuel

### 1. Base de donnees

```bash
docker compose up db -d
cd backend
cp .env.example .env
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

## Migrations Alembic

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1
```

## Design UI

Interface inspiree des kits Figma premium (dashboard admin moderne) :
- Ecran de connexion **split-screen** (panneau brand + formulaire)
- Cartes avec ombres douces et hover
- Barres de progression, badges colores
- Sidebar sombre avec sections et avatar
- Palette teal + or — identite institutionnelle CRO

## Stack

- Backend : Python, FastAPI, SQLAlchemy, PostgreSQL, Alembic
- Frontend : React, Vite, Tailwind CSS v4
- Export : ReportLab (PDF), OpenPyXL (Excel)
- QR : qrcode + Pillow
