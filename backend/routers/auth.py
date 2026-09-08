"""Auth router: login, logout, current user."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models.auth import LoginRequest, LoginResponse, UserInfo
from services.auth_service import login, logout, get_current_user_dep

router = APIRouter()

_bearer = HTTPBearer(auto_error=False)


@router.post(
    "/auth/login",
    response_model=LoginResponse,
    summary="Login with username and password",
    status_code=status.HTTP_200_OK,
)
def auth_login(payload: LoginRequest):
    """Validate credentials and return a session token."""
    result = login(payload.username, payload.password)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )
    return result


@router.post(
    "/auth/logout",
    summary="Logout and invalidate the current session token",
    status_code=status.HTTP_200_OK,
)
def auth_logout(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    current_user: dict = Depends(get_current_user_dep),
):
    """Invalidate the bearer token in the Authorization header."""
    if credentials:
        logout(credentials.credentials)
    return {"message": "Logged out successfully."}


@router.get(
    "/auth/me",
    response_model=UserInfo,
    summary="Get current authenticated user info",
    status_code=status.HTTP_200_OK,
)
def auth_me(current_user: dict = Depends(get_current_user_dep)):
    """Return profile information of the authenticated user."""
    return UserInfo(
        user_id=current_user["id"],
        username=current_user["username"],
        name=current_user["name"],
        role=current_user["role"],
        branch_code=current_user.get("branch_code"),
        branch_name=current_user["branch_name"],
    )
