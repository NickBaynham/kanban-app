from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import engine, Base
from routers import api, chat
import os

# Create DB tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Kanban App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api", tags=["App"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])

# Serve static NextJS exports in docker container if static dir exists
if os.path.exists("static"):
    app.mount("/_next", StaticFiles(directory="static/_next"), name="next")
    
    # Catch all route for client-side routing
    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # Prevent API routes from being intercepted
        if full_path.startswith("api/"):
            return None
        # Serve exact file if it exists; check dir/index.html; fallback to root.
        file_path = os.path.join("static", full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        index_path = os.path.join(file_path.rstrip("/"), "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        return FileResponse("static/index.html")
