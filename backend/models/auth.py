"""Pydantic v2 models for authentication."""

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user_id: str
    username: str
    name: str
    role: str
    branch_code: str | None
    branch_name: str


class UserInfo(BaseModel):
    user_id: str
    username: str
    name: str
    role: str
    branch_code: str | None
    branch_name: str
