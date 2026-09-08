"""
Banking router.

Endpoints:
    GET  /banking/accounts                         — list all bank accounts
    GET  /banking/accounts/{id}                    — get one account
    GET  /banking/accounts/{id}/statements         — list statements for account (no entries)
    GET  /banking/statements/{stmt_id}             — get statement with entries
    POST /banking/accounts/{id}/upload-statement   — upload CSV bank statement
    POST /banking/accounts/{id}/fetch-statement    — simulate fetching statement via API
"""

import csv
import io
import random
import uuid
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from data.store import (
    BANK_ACCOUNTS,
    BANK_STATEMENTS,
    USERS,
    get_bank_account_by_id,
    get_statements_for_account,
)
from models.banking import (
    BankAccountResponse,
    BankEntryResponse,
    BankStatementResponse,
    BankStatementUploadResponse,
    FetchStatementRequest,
)
from services.auth_service import get_current_user_dep, require_role

router = APIRouter()

_HO_ROLES = {"ho_admin", "ho_maker", "ho_checker"}


def _ba_to_response(ba: dict) -> BankAccountResponse:
    return BankAccountResponse(
        id=ba["id"],
        scheme_id=ba["scheme_id"],
        scheme_name=ba.get("scheme_name", ""),
        bank_name=ba.get("bank_name", ""),
        account_no=ba["account_no"],
        branch=ba.get("branch", ""),
        ifsc=ba["ifsc"],
        account_type=ba.get("account_type", "Current"),
    )


def _stmt_to_response(stmt: dict, include_entries: bool = True) -> BankStatementResponse:
    entries = []
    if include_entries:
        for e in stmt.get("entries", []):
            entries.append(
                BankEntryResponse(
                    id=e["id"],
                    date=e["date"],
                    description=e.get("description", ""),
                    ref_no=e.get("ref_no", ""),
                    debit=e.get("debit", 0.0),
                    credit=e.get("credit", 0.0),
                    balance=e.get("balance", 0.0),
                    is_matched=e.get("is_matched", False),
                )
            )
    return BankStatementResponse(
        id=stmt["id"],
        bank_account_id=stmt["bank_account_id"],
        scheme_name=stmt.get("scheme_name", ""),
        from_date=stmt["from_date"],
        to_date=stmt["to_date"],
        uploaded_at=stmt["uploaded_at"],
        uploaded_by=stmt["uploaded_by"],
        entries=entries,
    )


# ---------------------------------------------------------------------------
# GET /banking/accounts
# ---------------------------------------------------------------------------
@router.get(
    "/banking/accounts",
    response_model=list[BankAccountResponse],
    summary="List all bank collection accounts",
    status_code=status.HTTP_200_OK,
)
def list_bank_accounts(
    current_user: dict = Depends(require_role("ho_admin", "ho_maker", "ho_checker")),
):
    return [_ba_to_response(ba) for ba in BANK_ACCOUNTS]


# ---------------------------------------------------------------------------
# GET /banking/accounts/{id}
# ---------------------------------------------------------------------------
@router.get(
    "/banking/accounts/{ba_id}",
    response_model=BankAccountResponse,
    summary="Get a bank account by ID",
    status_code=status.HTTP_200_OK,
)
def get_bank_account(
    ba_id: str,
    current_user: dict = Depends(require_role("ho_admin", "ho_maker", "ho_checker")),
):
    ba = get_bank_account_by_id(ba_id)
    if not ba:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bank account {ba_id} not found.",
        )
    return _ba_to_response(ba)


# ---------------------------------------------------------------------------
# GET /banking/accounts/{id}/statements  (no entries)
# ---------------------------------------------------------------------------
@router.get(
    "/banking/accounts/{ba_id}/statements",
    response_model=list[BankStatementResponse],
    summary="List bank statements for an account (without entries)",
    status_code=status.HTTP_200_OK,
)
def list_statements(
    ba_id: str,
    current_user: dict = Depends(require_role("ho_admin", "ho_maker", "ho_checker")),
):
    ba = get_bank_account_by_id(ba_id)
    if not ba:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bank account {ba_id} not found.",
        )
    stmts = get_statements_for_account(ba_id)
    return [_stmt_to_response(s, include_entries=False) for s in stmts]


# ---------------------------------------------------------------------------
# GET /banking/statements/{stmt_id}  (with entries)
# ---------------------------------------------------------------------------
@router.get(
    "/banking/statements/{stmt_id}",
    response_model=BankStatementResponse,
    summary="Get a bank statement with all entries",
    status_code=status.HTTP_200_OK,
)
def get_statement(
    stmt_id: str,
    current_user: dict = Depends(require_role("ho_admin", "ho_maker", "ho_checker")),
):
    stmt = next((s for s in BANK_STATEMENTS if s["id"] == stmt_id), None)
    if not stmt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bank statement {stmt_id} not found.",
        )
    return _stmt_to_response(stmt, include_entries=True)


# ---------------------------------------------------------------------------
# POST /banking/accounts/{id}/upload-statement
# ---------------------------------------------------------------------------
@router.post(
    "/banking/accounts/{ba_id}/upload-statement",
    response_model=BankStatementUploadResponse,
    summary="Upload a CSV bank statement",
    status_code=status.HTTP_201_CREATED,
)
async def upload_statement(
    ba_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role("ho_admin", "ho_maker")),
):
    """
    Accept a CSV file with columns: date,description,ref_no,debit,credit,balance
    Parse rows, generate bank entry IDs, and store as a new BankStatement.
    """
    ba = get_bank_account_by_id(ba_id)
    if not ba:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bank account {ba_id} not found.",
        )

    if file.content_type not in ("text/csv", "text/plain", "application/octet-stream", "application/vnd.ms-excel"):
        # Be lenient — just try to parse
        pass

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")  # handle BOM
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    entries: list[dict] = []
    min_date: Optional[str] = None
    max_date: Optional[str] = None
    balance = 0.0

    for row in reader:
        entry_id = f"be-{uuid.uuid4().hex[:8]}"
        row_date = (row.get("date") or "").strip()
        row_desc = (row.get("description") or "").strip()
        row_ref = (row.get("ref_no") or "").strip()

        try:
            debit = float((row.get("debit") or "0").replace(",", "").strip() or "0")
        except ValueError:
            debit = 0.0
        try:
            credit = float((row.get("credit") or "0").replace(",", "").strip() or "0")
        except ValueError:
            credit = 0.0
        try:
            bal = float((row.get("balance") or "0").replace(",", "").strip() or "0")
        except ValueError:
            bal = balance + credit - debit

        balance = bal

        if row_date:
            if min_date is None or row_date < min_date:
                min_date = row_date
            if max_date is None or row_date > max_date:
                max_date = row_date

        entries.append({
            "id": entry_id,
            "date": row_date,
            "description": row_desc,
            "ref_no": row_ref,
            "debit": debit,
            "credit": credit,
            "balance": bal,
            "is_matched": False,
        })

    if not entries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file appears to be empty or has no parseable rows.",
        )

    stmt_id = f"stmt-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.utcnow().isoformat()

    new_stmt = {
        "id": stmt_id,
        "bank_account_id": ba_id,
        "scheme_name": ba.get("scheme_name", ""),
        "from_date": min_date or now_iso[:10],
        "to_date": max_date or now_iso[:10],
        "uploaded_at": now_iso,
        "uploaded_by": current_user["id"],
        "entries": entries,
    }
    BANK_STATEMENTS.append(new_stmt)

    return BankStatementUploadResponse(
        statement_id=stmt_id,
        entries_count=len(entries),
        message=f"Statement uploaded successfully. {len(entries)} entries imported.",
    )


# ---------------------------------------------------------------------------
# POST /banking/accounts/{id}/fetch-statement  (simulated API fetch)
# ---------------------------------------------------------------------------
@router.post(
    "/banking/accounts/{ba_id}/fetch-statement",
    response_model=BankStatementUploadResponse,
    summary="Simulate fetching a bank statement via API for a date range",
    status_code=status.HTTP_201_CREATED,
)
def fetch_statement(
    ba_id: str,
    payload: FetchStatementRequest,
    current_user: dict = Depends(require_role("ho_admin", "ho_maker")),
):
    """
    Simulate calling a bank API to fetch a statement.
    Generates 20 mock debit/credit entries spread across the date range.
    """
    ba = get_bank_account_by_id(ba_id)
    if not ba:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bank account {ba_id} not found.",
        )

    try:
        from_dt = date.fromisoformat(payload.from_date)
        to_dt = date.fromisoformat(payload.to_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD.",
        )

    if from_dt > to_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="from_date must not be after to_date.",
        )

    delta_days = (to_dt - from_dt).days + 1
    entries: list[dict] = []
    balance = 1_000_000.0

    # Descriptions pool
    _credit_descs = [
        "NEFT CR-{ref}-Investor",
        "RTGS CR-{ref}-Corp Invest",
        "CHEQUE CR-{ref}-SIP Payment",
        "IMPS CR-{ref}-Mobile SIP",
        "FUND_TRANSFER CR-{ref}-Treasury",
    ]
    _debit_descs = [
        "Bank Charges",
        "Redemption Payout-{ref}",
        "Processing Fee",
        "NEFT Charge",
    ]

    rng = random.Random(ba_id + payload.from_date)  # deterministic for same inputs

    num_entries = 20
    for i in range(num_entries):
        day_offset = rng.randint(0, delta_days - 1)
        entry_date = from_dt + timedelta(days=day_offset)
        entry_id = f"be-{uuid.uuid4().hex[:8]}"
        ref = uuid.uuid4().hex[:12].upper()

        is_credit = rng.random() > 0.25  # 75% credits, 25% debits
        if is_credit:
            amount = round(rng.uniform(5000, 500000), 2)
            credit = amount
            debit = 0.0
            desc_tmpl = rng.choice(_credit_descs)
        else:
            amount = round(rng.uniform(100, 5000), 2)
            credit = 0.0
            debit = amount
            desc_tmpl = rng.choice(_debit_descs)

        balance += credit - debit
        balance = round(balance, 2)

        desc = desc_tmpl.format(ref=ref[:12])
        entries.append({
            "id": entry_id,
            "date": entry_date.isoformat(),
            "description": desc,
            "ref_no": ref,
            "debit": debit,
            "credit": credit,
            "balance": balance,
            "is_matched": False,
        })

    # Sort by date
    entries.sort(key=lambda e: e["date"])

    stmt_id = f"stmt-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.utcnow().isoformat()

    new_stmt = {
        "id": stmt_id,
        "bank_account_id": ba_id,
        "scheme_name": ba.get("scheme_name", ""),
        "from_date": payload.from_date,
        "to_date": payload.to_date,
        "uploaded_at": now_iso,
        "uploaded_by": current_user["id"],
        "entries": entries,
    }
    BANK_STATEMENTS.append(new_stmt)

    return BankStatementUploadResponse(
        statement_id=stmt_id,
        entries_count=len(entries),
        message=(
            f"Statement fetched (simulated) for {ba.get('scheme_name', ba_id)} "
            f"from {payload.from_date} to {payload.to_date}. "
            f"{len(entries)} entries generated."
        ),
    )
