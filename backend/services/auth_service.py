"""Authentication service: login, logout, current-user resolution."""

import uuid
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from data.store import USERS, SESSIONS, get_user_by_username

# ---------------------------------------------------------------------------
# Bearer token extractor
# ---------------------------------------------------------------------------
_bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Core auth functions
# ---------------------------------------------------------------------------

def login(username: str, password: str) -> Optional[dict]:
    """
    Validate credentials and return a session dict, or None on failure.
    Returned dict contains: token, id, username, name, role, branch_code, branch_name.
    """
    user = get_user_by_username(username)
    if not user or user["password"] != password:
        return None
    token = str(uuid.uuid4())
    SESSIONS[token] = user["id"]
    return {
        "token": token,
        "user_id": user["id"],
        "username": user["username"],
        "name": user["name"],
        "role": user["role"],
        "branch_code": user["branch_code"],
        "branch_name": user["branch_name"],
    }


def get_current_user(token: str) -> Optional[dict]:
    """Return the user dict for a given bearer token, or None."""
    user_id = SESSIONS.get(token)
    if not user_id:
        return None
    return USERS.get(user_id)


def logout(token: str) -> None:
    """Invalidate a session token."""
    SESSIONS.pop(token, None)


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

def get_current_user_dep(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> dict:
    """
    FastAPI dependency that extracts the Bearer token from the Authorization header
    and returns the authenticated user dict.
    Raises HTTP 401 if the token is missing or invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = get_current_user(credentials.credentials)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_role(*roles: str):
    """
    FastAPI dependency factory that restricts access to users with specified roles.

    Usage:
        @router.get("/admin-only")
        def admin_only(user: dict = Depends(require_role("ho_admin", "ho_maker"))):
            ...
    """
    def _check_role(user: dict = Depends(get_current_user_dep)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(roles)}.",
            )
        return user

    return _check_role
