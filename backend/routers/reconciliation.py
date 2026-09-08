"""
Reconciliation router.

Endpoints:
    GET  /reconciliation/runs                               — list runs
    POST /reconciliation/runs                               — trigger new run
    GET  /reconciliation/runs/{run_id}                      — get run summary
    GET  /reconciliation/runs/{run_id}/matches              — enriched match list
    POST /reconciliation/matches/{match_id}/maker-action    — maker approve/flag
    POST /reconciliation/matches/{match_id}/checker-action  — checker approve/reject
    POST /reconciliation/manual-map                         — create manual mapping
    GET  /reconciliation/notifications                      — current user's notifications
    POST /reconciliation/notifications/{notif_id}/read      — mark notification read
    GET  /reconciliation/audit-log                          — audit log (HO only)
"""

from fastapi import APIRouter, Depends, HTTPException, status

from data.store import (
    AUDIT_LOG,
    NOTIFICATIONS,
    RECONCILIATION_MATCHES,
    RECONCILIATION_RUNS,
    TRANSACTIONS,
    get_bank_entry_by_id,
    get_transaction_by_id,
)
from models.reconciliation import (
    CheckerActionRequest,
    MakerActionRequest,
    ManualMapRequest,
    ReconciliationMatchEnriched,
    ReconciliationMatchResponse,
    ReconciliationRunResponse,
    RunReconciliationRequest,
)
from services.auth_service import get_current_user_dep, require_role
from services.reconciliation_service import (
    apply_checker_action,
    apply_maker_action,
    apply_manual_map,
    run_reconciliation,
)

router = APIRouter()

_HO_ROLES = {"ho_admin", "ho_maker", "ho_checker"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run_to_response(run: dict) -> ReconciliationRunResponse:
    return ReconciliationRunResponse(
        id=run["id"],
        period_from=run["period_from"],
        period_to=run["period_to"],
        scheme_id=run.get("scheme_id"),
        scheme_name=run.get("scheme_name"),
        status=run["status"],
        created_by=run["created_by"],
        created_at=run["created_at"],
        total=run.get("total", 0),
        exact_count=run.get("exact_count", 0),
        approx_count=run.get("approx_count", 0),
        nil_count=run.get("nil_count", 0),
        manual_count=run.get("manual_count", 0),
        reconciled_count=run.get("reconciled_count", 0),
    )


def _match_to_response(match: dict) -> ReconciliationMatchResponse:
    return ReconciliationMatchResponse(
        id=match["id"],
        run_id=match["run_id"],
        transaction_id=match["transaction_id"],
        bank_entry_ids=match.get("bank_entry_ids", []),
        match_type=match["match_type"],
        maker_action=match["maker_action"],
        maker_user_id=match.get("maker_user_id"),
        maker_user_name=match.get("maker_user_name"),
        maker_at=match.get("maker_at"),
        maker_remarks=match.get("maker_remarks"),
        checker_action=match["checker_action"],
        checker_user_id=match.get("checker_user_id"),
        checker_user_name=match.get("checker_user_name"),
        checker_at=match.get("checker_at"),
        checker_remarks=match.get("checker_remarks"),
        final_status=match["final_status"],
    )


def _enrich_match(match: dict) -> dict:
    """Return a match dict enriched with transaction and bank_entries."""
    txn = get_transaction_by_id(match["transaction_id"])
    bank_entries = [
        get_bank_entry_by_id(eid)
        for eid in match.get("bank_entry_ids", [])
        if get_bank_entry_by_id(eid) is not None
    ]
    return {
        **match,
        "transaction": txn,
        "bank_entries": bank_entries,
    }


# ---------------------------------------------------------------------------
# GET /reconciliation/runs
# ---------------------------------------------------------------------------
@router.get(
    "/reconciliation/runs",
    response_model=list[ReconciliationRunResponse],
    summary="List all reconciliation runs",
    status_code=status.HTTP_200_OK,
)
def list_runs(
    current_user: dict = Depends(require_role("ho_admin", "ho_maker", "ho_checker")),
):
    return [_run_to_response(r) for r in reversed(RECONCILIATION_RUNS)]


# ---------------------------------------------------------------------------
# POST /reconciliation/runs
# ---------------------------------------------------------------------------
@router.post(
    "/reconciliation/runs",
    response_model=ReconciliationRunResponse,
    summary="Trigger a new reconciliation run",
    status_code=status.HTTP_201_CREATED,
)
def create_run(
    payload: RunReconciliationRequest,
    current_user: dict = Depends(require_role("ho_admin", "ho_maker")),
):
    """
    Run the matching engine for the given period and optional scheme.
    Returns the created run summary.
    """
    try:
        run = run_reconciliation(
            period_from_str=payload.period_from,
            period_to_str=payload.period_to,
            scheme_id=payload.scheme_id,
            created_by_id=current_user["id"],
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    return _run_to_response(run)


# ---------------------------------------------------------------------------
# GET /reconciliation/runs/{run_id}
# ---------------------------------------------------------------------------
@router.get(
    "/reconciliation/runs/{run_id}",
    response_model=ReconciliationRunResponse,
    summary="Get a reconciliation run by ID",
    status_code=status.HTTP_200_OK,
)
def get_run(
    run_id: str,
    current_user: dict = Depends(require_role("ho_admin", "ho_maker", "ho_checker")),
):
    run = next((r for r in RECONCILIATION_RUNS if r["id"] == run_id), None)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reconciliation run {run_id} not found.",
        )
    return _run_to_response(run)


# ---------------------------------------------------------------------------
# GET /reconciliation/runs/{run_id}/matches
# ---------------------------------------------------------------------------
@router.get(
    "/reconciliation/runs/{run_id}/matches",
    summary="Get enriched matches for a reconciliation run",
    status_code=status.HTTP_200_OK,
)
def get_run_matches(
    run_id: str,
    current_user: dict = Depends(require_role("ho_admin", "ho_maker", "ho_checker")),
):
    """
    Returns all matches for the run, each enriched with:
    - `transaction`: full transaction dict
    - `bank_entries`: list of matching bank entry dicts
    """
    run = next((r for r in RECONCILIATION_RUNS if r["id"] == run_id), None)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reconciliation run {run_id} not found.",
        )
    matches = [m for m in RECONCILIATION_MATCHES if m["run_id"] == run_id]
    return [_enrich_match(m) for m in matches]


# ---------------------------------------------------------------------------
# POST /reconciliation/matches/{match_id}/maker-action
# ---------------------------------------------------------------------------
@router.post(
    "/reconciliation/matches/{match_id}/maker-action",
    summary="Maker approves or flags a reconciliation match",
    status_code=status.HTTP_200_OK,
)
def maker_action(
    match_id: str,
    payload: MakerActionRequest,
    current_user: dict = Depends(require_role("ho_admin", "ho_maker")),
):
    if payload.action not in ("APPROVED", "FLAGGED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="action must be APPROVED or FLAGGED.",
        )
    try:
        match = apply_maker_action(
            match_id=match_id,
            action=payload.action,
            remarks=payload.remarks,
            user_id=current_user["id"],
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    return _enrich_match(match)


# ---------------------------------------------------------------------------
# POST /reconciliation/matches/{match_id}/checker-action
# ---------------------------------------------------------------------------
@router.post(
    "/reconciliation/matches/{match_id}/checker-action",
    summary="Checker approves or rejects a reconciliation match",
    status_code=status.HTTP_200_OK,
)
def checker_action(
    match_id: str,
    payload: CheckerActionRequest,
    current_user: dict = Depends(require_role("ho_admin", "ho_checker")),
):
    if payload.action not in ("APPROVED", "REJECTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="action must be APPROVED or REJECTED.",
        )
    try:
        match = apply_checker_action(
            match_id=match_id,
            action=payload.action,
            remarks=payload.remarks,
            user_id=current_user["id"],
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    return _enrich_match(match)


# ---------------------------------------------------------------------------
# POST /reconciliation/manual-map
# ---------------------------------------------------------------------------
@router.post(
    "/reconciliation/manual-map",
    summary="Manually map a transaction to bank entries",
    status_code=status.HTTP_201_CREATED,
)
def manual_map(
    payload: ManualMapRequest,
    current_user: dict = Depends(require_role("ho_admin", "ho_maker")),
):
    # Validate transaction exists
    txn = get_transaction_by_id(payload.transaction_id)
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {payload.transaction_id} not found.",
        )
    # Validate run exists
    run = next((r for r in RECONCILIATION_RUNS if r["id"] == payload.run_id), None)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reconciliation run {payload.run_id} not found.",
        )
    # Validate bank entries exist
    for eid in payload.bank_entry_ids:
        entry = get_bank_entry_by_id(eid)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bank entry {eid} not found.",
            )

    match = apply_manual_map(
        run_id=payload.run_id,
        transaction_id=payload.transaction_id,
        bank_entry_ids=payload.bank_entry_ids,
        user_id=current_user["id"],
    )
    return _enrich_match(match)


# ---------------------------------------------------------------------------
# GET /reconciliation/notifications
# ---------------------------------------------------------------------------
@router.get(
    "/reconciliation/notifications",
    summary="Get notifications for the current user",
    status_code=status.HTTP_200_OK,
)
def get_notifications(
    current_user: dict = Depends(get_current_user_dep),
):
    """Return notifications for the current user, unread ones first."""
    user_id = current_user["id"]
    user_notifs = [n for n in NOTIFICATIONS if n["recipient_user_id"] == user_id]
    # Sort: unread first, then by created_at descending
    user_notifs.sort(key=lambda n: (n["is_read"], n["created_at"]), reverse=False)
    # unread=False (0) sorts before read=True (1), so unread comes first
    # created_at descending within each group
    unread = sorted(
        [n for n in user_notifs if not n["is_read"]],
        key=lambda n: n["created_at"],
        reverse=True,
    )
    read = sorted(
        [n for n in user_notifs if n["is_read"]],
        key=lambda n: n["created_at"],
        reverse=True,
    )
    return unread + read


# ---------------------------------------------------------------------------
# POST /reconciliation/notifications/{notif_id}/read
# ---------------------------------------------------------------------------
@router.post(
    "/reconciliation/notifications/{notif_id}/read",
    summary="Mark a notification as read",
    status_code=status.HTTP_200_OK,
)
def mark_notification_read(
    notif_id: str,
    current_user: dict = Depends(get_current_user_dep),
):
    notif = next((n for n in NOTIFICATIONS if n["id"] == notif_id), None)
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification {notif_id} not found.",
        )
    if notif["recipient_user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only mark your own notifications as read.",
        )
    notif["is_read"] = True
    return notif


# ---------------------------------------------------------------------------
# GET /reconciliation/audit-log
# ---------------------------------------------------------------------------
@router.get(
    "/reconciliation/audit-log",
    summary="View the audit log (HO roles only)",
    status_code=status.HTTP_200_OK,
)
def get_audit_log(
    current_user: dict = Depends(require_role("ho_admin", "ho_maker", "ho_checker")),
):
    """Return audit log entries in reverse chronological order."""
    return sorted(AUDIT_LOG, key=lambda e: e["timestamp"], reverse=True)
