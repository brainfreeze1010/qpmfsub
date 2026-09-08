"""Pydantic v2 models for banking / bank statement operations."""

from typing import Optional
from pydantic import BaseModel


class BankAccountResponse(BaseModel):
    id: str
    scheme_id: str
    scheme_name: str
    bank_name: str
    account_no: str
    branch: str
    ifsc: str
    account_type: str


class BankEntryResponse(BaseModel):
    id: str
    date: str                    # YYYY-MM-DD
    description: str
    ref_no: str
    debit: float
    credit: float
    balance: float
    is_matched: bool


class BankStatementResponse(BaseModel):
    id: str
    bank_account_id: str
    scheme_name: str
    from_date: str
    to_date: str
    uploaded_at: str
    uploaded_by: str
    entries: list[BankEntryResponse] = []


class BankStatementUploadResponse(BaseModel):
    statement_id: str
    entries_count: int
    message: str


class FetchStatementRequest(BaseModel):
    from_date: str    # YYYY-MM-DD
    to_date: str      # YYYY-MM-DD
