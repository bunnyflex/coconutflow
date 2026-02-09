"""
AgnoFlow API — FastAPI application entry point.

Run with:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.flows import router as flows_router
from app.api.upload import router as upload_router
from app.api.websocket import router as websocket_router
from app.api.credentials import router as credentials_router

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AgnoFlow API",
    description="Backend API for CoconutFlow — a visual AI agent builder powered by the Agno SDK.",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS Middleware (allow all origins for development; restrict in production)
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Lock down for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(flows_router)
app.include_router(upload_router)
app.include_router(websocket_router)
app.include_router(credentials_router)

# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------


@app.get("/", tags=["health"])
async def health_check() -> dict:
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "AgnoFlow API",
        "version": "0.1.0",
    }
