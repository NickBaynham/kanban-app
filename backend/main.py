import os
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import engine, Base
from routers import api, chat

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))

# Create DB tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Kanban App")

# Auth is via Authorization: Bearer header (no cookies), so we don't need
# allow_credentials. Origins are restricted to the dev frontends; the
# production deployment serves the SPA from the same origin so CORS is moot.
_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api", tags=["App"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])


# Serve static NextJS exports in docker container if static dir exists
if os.path.exists("static"):
    if os.path.isdir("static/_next"):
        app.mount("/_next", StaticFiles(directory="static/_next"), name="next")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # API routes should already match earlier; if a request reaches here
        # under /api/* it's an unknown route — return 404 instead of 200/null.
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="Not Found")

        file_path = os.path.join("static", full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        index_path = os.path.join(file_path.rstrip("/"), "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        return FileResponse("static/index.html")
