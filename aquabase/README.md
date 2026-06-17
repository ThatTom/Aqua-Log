# Aqua Log

A self-hosted aquarium management app.

## Stack

- **Backend**: FastAPI + SQLAlchemy + Alembic (Python 3.12)
- **Database**: PostgreSQL 16
- **Species data**: YAML files (Git tracked, mounted as a volume)
- **Frontend**: React 18 + TypeScript + Vite + Recharts

## Getting started

### With Docker Compose (recommended)

```bash
# 1. Copy and edit the env file
cp .env.example .env

# 2. Build and start everything
docker compose up --build

# Frontend → http://localhost:3000
# API docs → http://localhost:8000/docs
```

### Local development (without Docker)

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL=postgresql://aquabase:changeme@localhost/aquabase
export SPECIES_DATA_PATH=../species-data

alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Adding species

Drop a new `.yaml` file into `species-data/fish/` or `species-data/plants/`.

Use the Latin name as the filename and `slug` field (e.g. `pterophyllum-scalare.yaml`).
Restart the backend (`docker compose restart backend`) to pick up changes.

## Database migrations

This project uses Alembic for all schema changes — **never** drop and recreate tables on a database with real data.

The first time you start the project, the `backend` container runs `alembic upgrade head` automatically, which applies the baseline migration (`alembic/versions/d6aaf1b26185_baseline_schema.py`) and creates every table.

### Making a schema change

1. Edit `app/models/models.py` (add a column, new table, etc).
2. Generate a migration:
   ```bash
   docker compose exec backend alembic revision --autogenerate -m "add health_notes to tank_fish"
   ```
3. **Open the generated file in `alembic/versions/` and read it.** Autogenerate is good but not perfect — it can miss server defaults, data backfills, or get column types slightly wrong on some changes. Fix anything that looks off before applying it.
4. Apply it:
   ```bash
   docker compose exec backend alembic upgrade head
   ```
5. Commit the migration file to git alongside the model change, in the same commit/PR.

### Rolling back

```bash
docker compose exec backend alembic downgrade -1
```

### Checking current state

```bash
docker compose exec backend alembic current   # what migration is the DB on
docker compose exec backend alembic history   # full migration history
```

### Rules of thumb

Never edit a migration file after it's been applied anywhere (including your own dev machine) — write a new one instead, even to fix a typo. Never rename or delete an applied migration. If a migration adds a non-nullable column to a table that may already have rows, give it a `server_default` or split it into two migrations (add nullable → backfill → make non-nullable).

## Project structure

```
aquabase/
├── docker-compose.yml
├── .env
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + lifespan
│   │   ├── database.py      # SQLAlchemy engine
│   │   ├── models/          # ORM models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routers/         # API endpoints
│   │   └── services/        # Species loader, alert checker
│   └── alembic/             # DB migrations
├── species-data/            # YAML files (source of truth)
│   ├── fish/
│   └── plants/
└── frontend/
    └── src/
        ├── api/             # Typed API client
        ├── hooks/           # Data-fetching hooks
        └── pages/           # Dashboard, TankDetail, SpeciesBrowser
```
