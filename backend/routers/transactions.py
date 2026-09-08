"""
Transactions router.

Endpoints:
    GET    /transactions          — list with filters, pagination
    POST   /transactions          — create new transaction (branch user)
    GET    /transactions/stats    — aggregate stats
    GET    /transactions/export   — CSV export
    GET    /transactions/{id}     — single transaction
    POST   /transactions/{id}/upload-slip — upload slip image
"""

import csv
import io
import os
import uuid
from datetime import datetime
from typing import Optional

import aiofiles
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse

from data.store import (
    AUDIT_LOG,
    BANK_ACCOUNTS,
    BANK_STATEMENTS,
    RECONCILIATION_MATCHES,
    RECONCILIATION_RUNS,
    TRANSACTIONS,
    get_bank_account_by_id,
    get_bank_account_for_scheme,
    get_bank_entry_by_id,
    get_transaction_by_id,
)
from models.transaction import BulkCreateRequest, TransactionCreate, TransactionResponse
from services.auth_service import get_current_user_dep, require_role

router = APIRouter()

# Roles allowed to view all branches
_HO_ROLES = {"ho_admin", "ho_maker", "ho_checker"}


# ---------------------------------------------------------------------------
# Helper: dict → TransactionResponse (validates required fields are present)
# ---------------------------------------------------------------------------
def _txn_to_response(txn: dict) -> dict:
    """Return the raw dict; FastAPI serialises via response_model."""
    return txn


def _build_txn_filter(
    txn: dict,
    branch_code: Optional[str],
    scheme_id: Optional[str],
    txn_status: Optional[str],
    date_from: Optional[str],
    date_to: Optional[str],
    search: Optional[str],
) -> bool:
    if branch_code and txn.get("branch_code") != branch_code:
        return False
    if scheme_id and txn.get("scheme_id") != scheme_id:
        return False
    if txn_status and txn.get("status") != txn_status:
        return False
    if date_from:
        submitted = txn.get("submitted_at", "")
        if submitted < date_from:
            return False
    if date_to:
        submitted = txn.get("submitted_at", "")
        # Compare date part only
        if submitted[:10] > date_to:
            return False
    if search:
        s = search.lower()
        searchable = " ".join(
            str(txn.get(f, ""))
            for f in [
                "unitholder_name",
                "pan",
                "folio_no",
                "slip_no",
                "ref_no",
                "purchase_cheque_utr_no",
            ]
        ).lower()
        if s not in searchable:
            return False
    return True


# ---------------------------------------------------------------------------
# GET /transactions/stats  (must be declared before /{id} to avoid ambiguity)
# ---------------------------------------------------------------------------
@router.get(
    "/transactions/stats",
    summary="Aggregate transaction statistics",
    status_code=status.HTTP_200_OK,
)
def get_transaction_stats(current_user: dict = Depends(get_current_user_dep)):
    """Return counts grouped by status, branch, and scheme."""
    role = current_user["role"]
    branch_code = current_user.get("branch_code")

    if role in _HO_ROLES:
        visible_txns = TRANSACTIONS
    else:
        visible_txns = [t for t in TRANSACTIONS if t["branch_code"] == branch_code]

    by_status: dict[str, int] = {}
    by_branch: dict[str, int] = {}
    by_scheme: dict[str, int] = {}
    pending_reconciliation = 0

    for txn in visible_txns:
        s = txn.get("status", "UNKNOWN")
        by_status[s] = by_status.get(s, 0) + 1

        b = txn.get("branch_name", "Unknown")
        by_branch[b] = by_branch.get(b, 0) + 1

        sc = txn.get("scheme_name", "Unknown")
        by_scheme[sc] = by_scheme.get(sc, 0) + 1

        if s == "SUBMITTED" and "PURCHASE" in txn.get("transaction_types", []):
            pending_reconciliation += 1

    return {
        "total": len(visible_txns),
        "by_status": by_status,
        "by_branch": by_branch,
        "by_scheme": by_scheme,
        "pending_reconciliation": pending_reconciliation,
    }


# ---------------------------------------------------------------------------
# GET /transactions/export
# ---------------------------------------------------------------------------
@router.get(
    "/transactions/export",
    summary="Export filtered transactions as CSV",
    status_code=status.HTTP_200_OK,
)
def export_transactions(
    branch_code: Optional[str] = Query(None),
    scheme_id: Optional[str] = Query(None),
    txn_status: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_dep),
):
    """Stream a CSV of transactions matching the given filters."""
    role = current_user["role"]
    user_branch = current_user.get("branch_code")

    if role in _HO_ROLES:
        source = TRANSACTIONS
    else:
        source = [t for t in TRANSACTIONS if t["branch_code"] == user_branch]

    filtered = [
        t
        for t in source
        if _build_txn_filter(t, branch_code, scheme_id, txn_status, date_from, date_to, search)
    ]

    output = io.StringIO()
    fieldnames = [
        "id", "slip_no", "branch_code", "branch_name", "submitted_by_name",
        "submitted_at", "status", "unitholder_name", "pan", "folio_no",
        "scheme_name", "plan", "option", "transaction_types",
        "purchase_amount", "purchase_transaction_date", "purchase_payment_mode",
        "purchase_cheque_utr_no", "is_duplicate",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for t in filtered:
        row = {k: t.get(k, "") for k in fieldnames}
        row["transaction_types"] = "|".join(t.get("transaction_types", []))
        writer.writerow(row)

    output.seek(0)
    filename = f"transactions_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# POST /transactions/bulk
# ---------------------------------------------------------------------------
@router.post(
    "/transactions/bulk",
    summary="Bulk-create transactions from parsed Excel rows",
    status_code=status.HTTP_200_OK,
)
def bulk_create_transactions(
    payload: BulkCreateRequest,
    current_user: dict = Depends(get_current_user_dep),
):
    from data.store import SCHEMES, generate_slip_no

    results = []
    now_iso = datetime.utcnow().isoformat()

    for idx, row in enumerate(payload.rows):
        try:
            # Resolve scheme name → scheme_id
            scheme_name = (row.get("scheme_name") or "").strip()
            scheme_id = row.get("scheme_id", "").strip()
            if not scheme_id:
                match = next(
                    (s for s in SCHEMES if s["name"].lower() == scheme_name.lower()),
                    None,
                )
                if not match:
                    raise ValueError(f"Scheme '{scheme_name}' not found.")
                scheme_id = match["id"]
                scheme_name = match["name"]

            txn_id = f"txn-{uuid.uuid4().hex[:8]}"

            # Duplicate detection (purchase transactions)
            purchase_amount = row.get("purchase_amount")
            purchase_date = row.get("purchase_transaction_date")
            pan = row.get("pan", "")
            is_duplicate = False
            duplicate_of = None

            if purchase_amount and purchase_date:
                for existing in TRANSACTIONS:
                    if (
                        existing.get("pan") == pan
                        and existing.get("purchase_amount") == purchase_amount
                        and existing.get("purchase_transaction_date") == purchase_date
                    ):
                        is_duplicate = True
                        duplicate_of = existing["id"]
                        break

            txn_types = row.get("transaction_types") or []

            new_txn = {
                "id": txn_id,
                "slip_no": generate_slip_no(),
                "branch_code": current_user.get("branch_code") or "HO",
                "branch_name": current_user["branch_name"],
                "submitted_by_id": current_user["id"],
                "submitted_by_name": current_user["name"],
                "submitted_at": now_iso,
                "status": "SUBMITTED",
                "slip_image_path": None,
                "is_duplicate": is_duplicate,
                "duplicate_of": duplicate_of,
                # Header
                "broker_code_arn": row.get("broker_code_arn", ""),
                "sub_broker_arn": row.get("sub_broker_arn", ""),
                "internal_sub_broker_code": row.get("internal_sub_broker_code", ""),
                "euin": row.get("euin", ""),
                "euin_declaration": bool(row.get("euin_declaration", False)),
                "ria_code_pmrn": row.get("ria_code_pmrn", ""),
                "ref_no": row.get("ref_no", ""),
                # Unitholder
                "salutation": row.get("salutation", "Mr."),
                "unitholder_name": row.get("unitholder_name", ""),
                "folio_no": row.get("folio_no", ""),
                "pan": pan,
                # Scheme
                "scheme_id": scheme_id,
                "scheme_name": scheme_name,
                "plan": row.get("plan", ""),
                "option": row.get("option", ""),
                "facility": row.get("facility", ""),
                "frequency": row.get("frequency", ""),
                # Transaction types
                "transaction_types": txn_types,
                # Purchase
                "purchase_payment_mode": row.get("purchase_payment_mode"),
                "purchase_amount": float(purchase_amount) if purchase_amount else None,
                "purchase_amount_words": row.get("purchase_amount_words"),
                "purchase_cheque_utr_no": row.get("purchase_cheque_utr_no") or None,
                "purchase_transaction_date": purchase_date or None,
                "purchase_source_bank_ac": row.get("purchase_source_bank_ac") or None,
                "purchase_source_bank_name": row.get("purchase_source_bank_name") or None,
                "purchase_source_branch": row.get("purchase_source_branch") or None,
                "purchase_account_type": row.get("purchase_account_type") or None,
                "purchase_third_party_declaration": bool(row.get("purchase_third_party_declaration", False)),
                "purchase_umrn": row.get("purchase_umrn") or None,
                # Switch
                "switch_from_scheme": row.get("switch_from_scheme") or None,
                "switch_to_scheme": row.get("switch_to_scheme") or None,
                "switch_amount": float(row["switch_amount"]) if row.get("switch_amount") else None,
                "switch_amount_words": row.get("switch_amount_words"),
                "switch_units": float(row["switch_units"]) if row.get("switch_units") else None,
                "switch_all_units": bool(row.get("switch_all_units", False)),
                # Redemption
                "redemption_amount": float(row["redemption_amount"]) if row.get("redemption_amount") else None,
                "redemption_amount_words": row.get("redemption_amount_words"),
                "redemption_units": float(row["redemption_units"]) if row.get("redemption_units") else None,
                "redemption_all_units": bool(row.get("redemption_all_units", False)),
                "redemption_credit_to": row.get("redemption_credit_to") or None,
                "redemption_bank_name": row.get("redemption_bank_name") or None,
                "redemption_bank_ac": row.get("redemption_bank_ac") or None,
            }

            TRANSACTIONS.append(new_txn)
            AUDIT_LOG.append({
                "id": f"al-{uuid.uuid4().hex[:8]}",
                "user_id": current_user["id"],
                "user_name": current_user["name"],
                "action": "BULK_CREATE_TRANSACTION",
                "resource_type": "Transaction",
                "resource_id": txn_id,
                "details": f"Bulk upload: {new_txn['slip_no']} for {row.get('unitholder_name', '')}",
                "timestamp": now_iso,
            })

            results.append({"row_index": idx, "status": "success", "slip_no": new_txn["slip_no"], "id": txn_id})

        except Exception as exc:
            results.append({"row_index": idx, "status": "error", "message": str(exc)})

    succeeded = sum(1 for r in results if r["status"] == "success")
    failed = len(results) - succeeded

    return {"total": len(results), "succeeded": succeeded, "failed": failed, "results": results}


# ---------------------------------------------------------------------------
# GET /transactions
# ---------------------------------------------------------------------------
@router.get(
    "/transactions",
    summary="List transactions with optional filters and pagination",
    status_code=status.HTTP_200_OK,
)
def list_transactions(
    branch_code: Optional[str] = Query(None),
    scheme_id: Optional[str] = Query(None),
    txn_status: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    current_user: dict = Depends(get_current_user_dep),
):
    role = current_user["role"]
    user_branch = current_user.get("branch_code")

    # Branch users only see their own branch
    if role in _HO_ROLES:
        source = TRANSACTIONS
    else:
        source = [t for t in TRANSACTIONS if t["branch_code"] == user_branch]

    filtered = [
        t
        for t in source
        if _build_txn_filter(t, branch_code, scheme_id, txn_status, date_from, date_to, search)
    ]

    total = len(filtered)
    start = (page - 1) * page_size
    end = start + page_size
    page_data = filtered[start:end]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": page_data,
    }


# ---------------------------------------------------------------------------
# POST /transactions
# ---------------------------------------------------------------------------
@router.post(
    "/transactions",
    summary="Submit a new subscription transaction slip",
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    payload: TransactionCreate,
    current_user: dict = Depends(get_current_user_dep),
):
    """Branch user submits a new transaction. Runs duplicate detection."""
    txn_id = f"txn-{uuid.uuid4().hex[:8]}"

    # Duplicate detection: same PAN + purchase_amount + purchase_transaction_date
    is_duplicate = False
    duplicate_of: Optional[str] = None

    if payload.purchase_amount and payload.purchase_transaction_date:
        for existing in TRANSACTIONS:
            if (
                existing.get("pan") == payload.pan
                and existing.get("purchase_amount") == payload.purchase_amount
                and existing.get("purchase_transaction_date") == payload.purchase_transaction_date
                and existing["id"] != txn_id
            ):
                is_duplicate = True
                duplicate_of = existing["id"]
                break

    # Resolve scheme name if not provided
    scheme_name = payload.scheme_name
    if not scheme_name:
        from data.store import SCHEMES
        sch = next((s for s in SCHEMES if s["id"] == payload.scheme_id), None)
        if sch:
            scheme_name = sch["name"]

    from data.store import generate_slip_no

    now_iso = datetime.utcnow().isoformat()
    new_txn = {
        "id": txn_id,
        "slip_no": generate_slip_no(),
        "branch_code": current_user.get("branch_code") or "HO",
        "branch_name": current_user["branch_name"],
        "submitted_by_id": current_user["id"],
        "submitted_by_name": current_user["name"],
        "submitted_at": now_iso,
        "status": "SUBMITTED",
        "slip_image_path": None,
        "is_duplicate": is_duplicate,
        "duplicate_of": duplicate_of,
        **payload.model_dump(),
        "scheme_name": scheme_name,
    }

    TRANSACTIONS.append(new_txn)

    # Audit log
    AUDIT_LOG.append({
        "id": f"al-{uuid.uuid4().hex[:8]}",
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "action": "CREATE_TRANSACTION",
        "resource_type": "Transaction",
        "resource_id": txn_id,
        "details": (
            f"Transaction {new_txn['slip_no']} submitted by {current_user['name']} "
            f"from {current_user['branch_name']}. "
            f"Unitholder: {payload.unitholder_name}, PAN: {payload.pan}. "
            f"{'DUPLICATE of ' + duplicate_of if is_duplicate else 'Not a duplicate.'}"
        ),
        "timestamp": now_iso,
    })

    return new_txn


# ---------------------------------------------------------------------------
# GET /transactions/{id}
# ---------------------------------------------------------------------------
@router.get(
    "/transactions/{txn_id}",
    summary="Get a single transaction by ID",
    status_code=status.HTTP_200_OK,
)
def get_transaction(
    txn_id: str,
    current_user: dict = Depends(get_current_user_dep),
):
    txn = get_transaction_by_id(txn_id)
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {txn_id} not found.",
        )
    role = current_user["role"]
    user_branch = current_user.get("branch_code")
    if role not in _HO_ROLES and txn["branch_code"] != user_branch:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this transaction.",
        )
    return txn


# ---------------------------------------------------------------------------
# GET /transactions/{id}/bank-credit
# ---------------------------------------------------------------------------
@router.get(
    "/transactions/{txn_id}/bank-credit",
    summary="Get reconciled bank credit details for a transaction",
    status_code=status.HTTP_200_OK,
)
def get_transaction_bank_credit(
    txn_id: str,
    current_user: dict = Depends(get_current_user_dep),
):
    txn = get_transaction_by_id(txn_id)
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction {txn_id} not found.")

    role = current_user["role"]
    user_branch = current_user.get("branch_code")
    if role not in _HO_ROLES and txn["branch_code"] != user_branch:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if txn.get("status") != "RECONCILED":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction is not reconciled.")

    match = next(
        (m for m in RECONCILIATION_MATCHES
         if m["transaction_id"] == txn_id and m["final_status"] == "RECONCILED"),
        None,
    )
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No reconciliation match found.")

    # Collect bank entries and resolve bank account
    entries = []
    bank_account = None

    for eid in match.get("bank_entry_ids", []):
        entry = get_bank_entry_by_id(eid)
        if entry:
            entries.append(entry)
            if bank_account is None:
                for stmt in BANK_STATEMENTS:
                    if any(e["id"] == eid for e in stmt.get("entries", [])):
                        bank_account = get_bank_account_by_id(stmt["bank_account_id"])
                        break

    # Fallback: derive bank account from scheme if entries are gone
    if bank_account is None and txn.get("scheme_id"):
        bank_account = get_bank_account_for_scheme(txn["scheme_id"])

    run = next((r for r in RECONCILIATION_RUNS if r["id"] == match["run_id"]), None)

    return {
        "match_id": match["id"],
        "run_id": match["run_id"],
        "match_type": match["match_type"],
        "reconciled_at": match.get("checker_at"),
        "reconciled_by": match.get("checker_user_name"),
        "maker_name": match.get("maker_user_name"),
        "period_from": run["period_from"] if run else None,
        "period_to": run["period_to"] if run else None,
        "bank_account": bank_account,
        "entries": entries,
    }


# ---------------------------------------------------------------------------
# POST /transactions/{id}/upload-slip
# ---------------------------------------------------------------------------
@router.post(
    "/transactions/{txn_id}/upload-slip",
    summary="Upload a scanned slip image for a transaction",
    status_code=status.HTTP_200_OK,
)
async def upload_slip(
    txn_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_dep),
):
    txn = get_transaction_by_id(txn_id)
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {txn_id} not found.",
        )

    role = current_user["role"]
    user_branch = current_user.get("branch_code")
    if role not in _HO_ROLES and txn["branch_code"] != user_branch:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this transaction.",
        )

    # Validate file type
    allowed_types = {
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
    }
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Allowed: JPEG, PNG, GIF, WebP, PDF.",
        )

    # Save file
    upload_dir = os.path.join("uploads", txn_id)
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "slip")[1] or ".jpg"
    save_filename = f"slip{ext}"
    save_path = os.path.join(upload_dir, save_filename)

    async with aiofiles.open(save_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    # Update transaction
    relative_path = f"/uploads/{txn_id}/{save_filename}"
    txn["slip_image_path"] = relative_path

    # Audit log
    now_iso = datetime.utcnow().isoformat()
    AUDIT_LOG.append({
        "id": f"al-{uuid.uuid4().hex[:8]}",
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "action": "UPLOAD_SLIP",
        "resource_type": "Transaction",
        "resource_id": txn_id,
        "details": f"Slip image uploaded for transaction {txn_id}: {save_filename}",
        "timestamp": now_iso,
    })

    return {"slip_image_path": relative_path}
