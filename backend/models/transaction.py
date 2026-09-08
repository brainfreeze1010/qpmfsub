"""Pydantic v2 models for mutual fund subscription transactions."""

from typing import Optional
from pydantic import BaseModel


class TransactionCreate(BaseModel):
    # ── Header ────────────────────────────────────────────────────────────
    broker_code_arn: str = ""
    sub_broker_arn: str = ""
    internal_sub_broker_code: str = ""
    euin: str = ""
    euin_declaration: bool = False
    ria_code_pmrn: str = ""
    ref_no: str = ""

    # ── Unitholder ────────────────────────────────────────────────────────
    salutation: str = "Mr."   # Mr. | Ms. | M/s.
    unitholder_name: str
    folio_no: str = ""
    pan: str

    # ── Scheme ────────────────────────────────────────────────────────────
    scheme_id: str
    scheme_name: str = ""
    plan: str = ""
    option: str = ""
    facility: str = ""
    frequency: str = ""

    # ── Transaction types ─────────────────────────────────────────────────
    transaction_types: list[str]   # PURCHASE | SWITCH | REDEMPTION

    # ── Section 3: Purchase ───────────────────────────────────────────────
    purchase_payment_mode: Optional[str] = None          # NEFT | RTGS | CHEQUE | FUND_TRANSFER | OTM
    purchase_amount: Optional[float] = None
    purchase_amount_words: Optional[str] = None
    purchase_cheque_utr_no: Optional[str] = None
    purchase_transaction_date: Optional[str] = None      # YYYY-MM-DD
    purchase_source_bank_ac: Optional[str] = None
    purchase_source_bank_name: Optional[str] = None
    purchase_source_branch: Optional[str] = None
    purchase_account_type: Optional[str] = None          # Savings | Current | NRE | NRO
    purchase_third_party_declaration: bool = False
    purchase_umrn: Optional[str] = None

    # ── Section 4: Switch ─────────────────────────────────────────────────
    switch_from_scheme: Optional[str] = None
    switch_to_scheme: Optional[str] = None
    switch_amount: Optional[float] = None
    switch_amount_words: Optional[str] = None
    switch_units: Optional[float] = None
    switch_all_units: bool = False

    # ── Section 5: Redemption ─────────────────────────────────────────────
    redemption_amount: Optional[float] = None
    redemption_amount_words: Optional[str] = None
    redemption_units: Optional[float] = None
    redemption_all_units: bool = False
    redemption_credit_to: Optional[str] = None           # DEFAULT | REGISTERED
    redemption_bank_name: Optional[str] = None
    redemption_bank_ac: Optional[str] = None


class BulkCreateRequest(BaseModel):
    rows: list[dict]


class TransactionResponse(TransactionCreate):
    id: str
    slip_no: str
    branch_code: str
    branch_name: str
    submitted_by_id: str
    submitted_by_name: str
    submitted_at: str
    status: str                          # SUBMITTED | RECONCILED | REJECTED
    slip_image_path: Optional[str] = None
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None
