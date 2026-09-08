"""
MF Subscription Reconciliation — FastAPI application entry point.

Run with:
    cd backend
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import auth, banking, reconciliation, transactions

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="MF Subscription Reconciliation",
    description=(
        "Demo backend for reconciling mutual fund subscription slips "
        "against bank collection account statements."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS — wide open for demo
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static file serving for uploaded slip images
# ---------------------------------------------------------------------------
_UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(_UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_UPLOADS_DIR), name="uploads")

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(transactions.router, prefix="/api", tags=["Transactions"])
app.include_router(banking.router, prefix="/api", tags=["Banking"])
app.include_router(reconciliation.router, prefix="/api", tags=["Reconciliation"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health", tags=["Health"])
def health_check():
    """Simple health probe — returns {"status": "ok"}."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Startup / Shutdown events
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    """Ensure uploads directory exists on startup."""
    os.makedirs(_UPLOADS_DIR, exist_ok=True)
