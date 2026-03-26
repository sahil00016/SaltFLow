# SaltFlow - Inventory and Dispatch Management System

A production-grade inventory and dispatch system for a salt trading business.

## Features

- **Batch Management**: Track salt batches by code, grade, arrival date, and quantity
- **Client Management**: Manage clients with outstanding balance tracking
- **Order Management**: Create and manage orders with automatic code generation
- **Smart Dispatch**: Allocates stock from oldest batches first (FIFO), with full transaction safety and row-level locking
- **Outstanding Tracking**: Track unpaid orders per client
- **Payment Management**: Mark orders as paid and auto-adjust client balances

---

## Running with Docker (Recommended)

### Prerequisites
- Docker Desktop or Docker + Docker Compose installed

### Steps

```bash
# Clone or navigate to the project directory
cd /path/to/SaltFLow

# Start all services (PostgreSQL, Backend, Frontend)
docker-compose up --build

# Services will be available at:
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000
# API Docs:  http://localhost:8000/docs
# DB:        localhost:5432
```

To stop:
```bash
docker-compose down

# To also remove database volume:
docker-compose down -v
```

---

## Running Locally (Without Docker)

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15 running locally

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate       # Linux/Mac
# OR
venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your DATABASE_URL

# Make sure PostgreSQL is running and the database exists:
# psql -U postgres -c "CREATE DATABASE saltflow;"
# psql -U postgres -c "CREATE USER saltflow WITH PASSWORD 'saltflow123';"
# psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE saltflow TO saltflow;"

# Run the backend server (tables are auto-created on startup)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be at: http://localhost:8000
Interactive API docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set the API URL (optional, defaults to http://localhost:8000/api)
export REACT_APP_API_URL=http://localhost:8000/api

# Start the frontend
npm start
```

Frontend will open at: http://localhost:3000

---

## API Endpoints

### Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/batches` | Create a new batch |
| GET | `/api/batches` | List all batches (use `?include_empty=true` to show empty) |
| GET | `/api/batches/{id}` | Get a single batch |
| DELETE | `/api/batches/{id}` | Delete empty batch |

### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/clients` | Create a new client |
| GET | `/api/clients` | List all clients |
| GET | `/api/clients/{id}` | Get a single client |
| GET | `/api/clients/{id}/outstanding` | Get outstanding balance and unpaid orders |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create a new order |
| GET | `/api/orders` | List all orders |
| GET | `/api/orders/{id}` | Get a single order |
| PATCH | `/api/orders/{id}/payment` | Update payment status (`paid`/`unpaid`) |
| PATCH | `/api/orders/{id}/cancel` | Cancel a pending/partial order |

### Dispatch
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/dispatch` | Dispatch an order (body: `{"order_id": 1}`) |

---

## Database Backups

### Quick reference

| Script | When to use |
|--------|-------------|
| `scripts/backup_db.sh` | Local PostgreSQL (no Docker) |
| `scripts/backup_db_docker.sh` | DB running inside Docker Compose |
| `scripts/restore_db.sh` | Restore from a backup file |

Backups are saved to `backups/backup_YYYY_MM_DD.sql`. Running the script twice on the same day is safe — it skips if a backup for today already exists.

---

### Run a backup manually

**If using Docker (default setup):**
```bash
./scripts/backup_db_docker.sh
```

**If running PostgreSQL locally:**
```bash
./scripts/backup_db.sh

# Override credentials if needed:
DB_HOST=myserver DB_PASSWORD=secret ./scripts/backup_db.sh
```

**Sample output:**
```
[2026-03-26 02:00:01] [saltflow-backup] Starting backup → /backups/backup_2026_03_26.sql
[2026-03-26 02:00:03] [saltflow-backup] SUCCESS: backup_2026_03_26.sql (4.2M)
```

---

### Schedule daily backups (cron)

```bash
# Open crontab
crontab -e
```

Add one of these lines (runs every day at 2:00 AM):

```cron
# Docker setup
0 2 * * * /home/sahilsonker/SaltFLow/scripts/backup_db_docker.sh >> /home/sahilsonker/SaltFLow/backups/backup.log 2>&1

# Local PostgreSQL setup
0 2 * * * /home/sahilsonker/SaltFLow/scripts/backup_db.sh >> /home/sahilsonker/SaltFLow/backups/backup.log 2>&1
```

Check the log anytime:
```bash
tail -50 backups/backup.log
```

---

### Restore from a backup

```bash
# Restore local DB from a specific backup file
./scripts/restore_db.sh backups/backup_2026_03_26.sql
```

The restore script asks for confirmation before overwriting any data.

---

### Retention

Backups older than **30 days** are automatically deleted each time the backup script runs successfully.

---

## Key Design Decisions

1. **FIFO Dispatch**: Stock is always allocated from the oldest batch first to minimize waste.
2. **Transaction Safety**: All dispatch operations use `SELECT FOR UPDATE` to prevent race conditions in concurrent environments.
3. **Auto-generated Codes**: Batch codes follow `B-YYYY-NNN` format and order codes follow `ORD-YYYY-NNN` format.
4. **Outstanding Balance**: Tracked in bag units (V1). When an order is dispatched and unpaid, the client's outstanding balance increases by the number of bags dispatched.
5. **Cancel Safety**: Cancelling an order with dispatch records automatically reverts stock back to the respective batches.

---

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy 2.0, PostgreSQL, Pydantic v2
- **Frontend**: React 18, React Router v6, Axios
- **Infrastructure**: Docker, Docker Compose
