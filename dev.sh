#!/usr/bin/env bash
#
# dev.sh — quick rebuild/redeploy for AquaBase during local development
#
# Save this file ANYWHERE outside the aquabase/ project folder
# (e.g. one level up, next to the aquabase/ directory) and run it
# from there. It assumes the project lives in a sibling or child
# folder called "aquabase" — override with --dir if not.
#
# Usage:
#   ./dev.sh              # rebuild + restart everything (most common)
#   ./dev.sh backend       # rebuild + restart only the backend
#   ./dev.sh frontend       # rebuild + restart only the frontend
#   ./dev.sh logs           # tail logs for all services
#   ./dev.sh logs backend    # tail logs for one service
#   ./dev.sh migrate "msg"    # generate a new alembic migration
#   ./dev.sh upgrade           # apply pending alembic migrations
#   ./dev.sh shell backend       # open a shell in a running container
#   ./dev.sh psql                 # open a psql shell on the db
#   ./dev.sh reset                 # nuke everything incl. the db volume
#   ./dev.sh --dir ../my-aquabase backend   # point at a different folder
#
set -euo pipefail

PROJECT_DIR="aquabase"
ACTION="${1:-all}"
shift || true

# Allow --dir override anywhere in the args
ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      PROJECT_DIR="$2"
      shift 2
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ ! -f "$PROJECT_DIR/docker-compose.yml" ]]; then
  echo "Could not find $PROJECT_DIR/docker-compose.yml"
  echo "Run this script from the folder containing your aquabase/ project,"
  echo "or pass --dir /path/to/aquabase"
  exit 1
fi

cd "$PROJECT_DIR"

compose() {
  docker compose "$@"
}

case "$ACTION" in
  all)
    echo "==> Rebuilding and restarting all services"
    compose down
    compose up --build -d
    echo "==> All services started. Run './dev.sh logs' to tail output."
    ;;

  backend)
    echo "==> Rebuilding backend only"
    compose stop backend
    compose build backend
    compose up -d backend
    compose logs -f backend
    ;;

  frontend)
    echo "==> Rebuilding frontend only"
    compose stop frontend
    compose build frontend
    compose up -d frontend
    compose logs -f frontend
    ;;

  logs)
    compose logs -f "${ARGS[@]:-}"
    ;;

  migrate)
    MSG="${ARGS[0]:-}"
    if [[ -z "$MSG" ]]; then
      echo "Usage: ./dev.sh migrate \"description of change\""
      exit 1
    fi
    echo "==> Generating migration: $MSG"
    compose exec backend alembic revision --autogenerate -m "$MSG"
    echo "==> Migration file written to backend/alembic/versions/"
    echo "    Review it before running './dev.sh upgrade'"
    ;;

  upgrade)
    echo "==> Applying pending migrations"
    compose exec backend alembic upgrade head
    ;;

  downgrade)
    echo "==> Rolling back one migration"
    compose exec backend alembic downgrade -1
    ;;

  shell)
    SERVICE="${ARGS[0]:-backend}"
    echo "==> Opening shell in $SERVICE"
    compose exec "$SERVICE" sh
    ;;

  psql)
    echo "==> Opening psql shell"
    # shellcheck disable=SC2016
    compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
    ;;

  reset)
    echo "==> WARNING: this will delete the database volume and all data"
    read -r -p "Type 'yes' to confirm: " CONFIRM
    if [[ "$CONFIRM" == "yes" ]]; then
      compose down -v
      compose up --build -d
      echo "==> All services started. Run './dev.sh logs' to tail output."
    else
      echo "Aborted."
    fi
    ;;

  stop)
    echo "==> Stopping all services"
    compose down
    ;;

  status)
    compose ps
    ;;

  *)
    echo "Unknown action: $ACTION"
    echo ""
    echo "Usage: ./dev.sh [all|backend|frontend|logs|migrate|upgrade|downgrade|shell|psql|reset|stop|status] [args] [--dir path]"
    exit 1
    ;;
esac
