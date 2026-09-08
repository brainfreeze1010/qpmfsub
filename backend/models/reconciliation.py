"""Pydantic v2 models for reconciliation operations."""

from typing import Optional
from pydantic import BaseModel


class ReconciliationMatchResponse(BaseModel):
    id: str
    run_id: str
    transaction_id: str
    bank_entry_ids: list[str]
    match_type: str          # EXACT | APPROXIMATE | NIL | MANUAL

    maker_action: str        # PENDING | APPROVED | FLAGGED
    maker_user_id: Optional[str] = None
    maker_user_name: Optional[str] = None
    maker_at: Optional[str] = None
    maker_remarks: Optional[str] = None

    checker_action: str      # PENDING | APPROVED | REJECTED
    checker_user_id: Optional[str] = None
    checker_user_name: Optional[str] = None
    checker_at: Optional[str] = None
    checker_remarks: Optional[str] = None

    final_status: str        # PENDING | RECONCILED | REJECTED | FLAGGED


class ReconciliationMatchEnriched(ReconciliationMatchResponse):
    """Match response enriched with full transaction and bank entry details."""
    transaction: Optional[dict] = None
    bank_entries: list[dict] = []


class ReconciliationRunResponse(BaseModel):
    id: str
    period_from: str
    period_to: str
    scheme_id: Optional[str] = None
    scheme_name: Optional[str] = None
    status: str
    created_by: str
    created_at: str
    total: int
    exact_count: int
    approx_count: int
    nil_count: int
    manual_count: int
    reconciled_count: int


class RunReconciliationRequest(BaseModel):
    period_from: str       # YYYY-MM-DD
    period_to: str         # YYYY-MM-DD
    scheme_id: Optional[str] = None


class MakerActionRequest(BaseModel):
    action: str            # APPROVED | FLAGGED
    remarks: str = ""


class CheckerActionRequest(BaseModel):
    action: str            # APPROVED | REJECTED
    remarks: str = ""


class ManualMapRequest(BaseModel):
    transaction_id: str
    bank_entry_ids: list[str]
    run_id: str
