# ====== STAGE 1: NEXT.JS STATIC EXPORT ======
FROM node:20-alpine AS frontend-builder
WORKDIR /workspace

# Install dependencies correctly
COPY frontend/package*.json ./frontend/
WORKDIR /workspace/frontend
RUN npm ci

# Copy and build frontend
COPY frontend/. ./
# Building the Next.js app will generate static files in out/
RUN npm run build

# ====== STAGE 2: FASTAPI BACKEND ======
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PDM_PEP582=1

# Install pdm
RUN pip install pdm

# Copy backend dependencies setup
COPY backend/pyproject.toml backend/pdm.lock* ./backend/
WORKDIR /app/backend
RUN pdm config python.use_venv false && pdm sync -p .

# Copy backend code
COPY backend/. ./

# Copy statically exported frontend files to the backend for serving
COPY --from=frontend-builder /workspace/frontend/out ./static

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data

# Run uvicorn server
CMD ["pdm", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
