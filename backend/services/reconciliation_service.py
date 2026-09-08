"""
Reconciliation matching engine and workflow service.

Matching algorithm
------------------
For each PURCHASE transaction in the requested period / scheme:
1. Try to find an EXACT match in the bank statement entries:
   - Same credit amount (within 0.01 tolerance)
   - Same date (±0 days)
   - UTR/ref_no match when both are present
2. If not exact, try APPROXIMATE:
   - Amount within 0.5% tolerance
   - Date within 3 days
   OR partial UTR match (one contains the other)
3. If neither → NIL

Bank entries already consumed in a prior RECONCILED run are excluded.
"""

import uuid
from datetime import date, datetime, timedelta
from typing import Optional

from data.store import (
    TRANSACTIONS,
    BANK_STATEMENTS,
    BANK_ACCOUNTS,
    RECONCILIATION_RUNS,
    RECONCILIATION_MATCHES,
    NOTIFICATIONS,
    AUDIT_LOG,
    USERS,
    get_bank_entry_by_id,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _today_str() -> str:
    return datetime.utcnow().isoformat()


def _parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    try:
        return date.fromisoformat(date_str)
    except ValueError:
        return None


def _amounts_exact(a: float, b: float) -> bool:
    return abs(a - b) <= 0.01


def _amounts_approx(a: float, b: float) -> bool:
    """Within 0.5% tolerance."""
    if a == 0 and b == 0:
        return True
    if a == 0 or b == 0:
        return False
    return abs(a - b) / max(a, b) <= 0.005


def _dates_within(d1: Optional[date], d2: Optional[date], days: int) -> bool:
    if d1 is None or d2 is None:
        return False
    return abs((d1 - d2).days) <= days


def _utr_match(utr1: Optional[str], utr2: Optional[str]) -> bool:
    """Exact UTR match (case-insensitive, stripped)."""
    if not utr1 or not utr2:
        return False
    return utr1.strip().upper() == utr2.strip().upper()


def _utr_partial(utr1: Optional[str], utr2: Optional[str]) -> bool:
    """Partial UTR match: one value contains the other."""
    if not utr1 or not utr2:
        return False
    u1 = utr1.strip().upper()
    u2 = utr2.strip().upper()
    return u1 in u2 or u2 in u1


def _get_used_entry_ids() -> set[str]:
    """Return bank entry IDs already consumed in RECONCILED matches."""
    used: set[str] = set()
    for match in RECONCILIATION_MATCHES:
        if match["final_status"] == "RECONCILED":
            for eid in match.get("bank_entry_ids", []):
                used.add(eid)
    return used


def _get_entries_for_scheme_in_period(
    scheme_id: Optional[str], period_from: date, period_to: date
) -> list[dict]:
    """
    Collect bank statement credit entries for the given scheme(s) and period.
    If scheme_id is None, return entries for all schemes.
    """
    target_ba_ids: set[str] = set()
    for ba in BANK_ACCOUNTS:
        if scheme_id is None or ba["scheme_id"] == scheme_id:
            target_ba_ids.add(ba["id"])

    entries: list[dict] = []
    for stmt in BANK_STATEMENTS:
        if stmt["bank_account_id"] not in target_ba_ids:
            continue
        stmt_from = _parse_date(stmt["from_date"])
        stmt_to = _parse_date(stmt["to_date"])
        # Include statement if it overlaps with period
        if stmt_from and stmt_to:
            if stmt_to < period_from or stmt_from > period_to:
                continue
        for entry in stmt.get("entries", []):
            if entry.get("credit", 0) <= 0:
                continue   # only credit entries are relevant
            entry_date = _parse_date(entry["date"])
            if entry_date and period_from <= entry_date <= period_to:
                entries.append(entry)
    return entries


def _get_purchase_transactions_in_period(
    scheme_id: Optional[str], period_from: date, period_to: date
) -> list[dict]:
    """Return PURCHASE transactions within period, optionally filtered by scheme."""
    result: list[dict] = []
    for txn in TRANSACTIONS:
        if "PURCHASE" not in txn.get("transaction_types", []):
            continue
        if scheme_id and txn.get("scheme_id") != scheme_id:
            continue
        txn_date = _parse_date(txn.get("purchase_transaction_date"))
        if txn_date and period_from <= txn_date <= period_to:
            result.append(txn)
    return result


def _notify_ho_makers(message: str, run_id: str) -> None:
    """Create a notification for all ho_maker users."""
    for user in USERS.values():
        if user["role"] == "ho_maker":
            NOTIFICATIONS.append({
                "id": f"notif-{uuid.uuid4().hex[:8]}",
                "recipient_user_id": user["id"],
                "message": message,
                "is_read": False,
                "created_at": _today_str(),
                "related_run_id": run_id,
                "related_match_id": None,
            })


def _notify_ho_checkers(message: str, run_id: str, match_id: str) -> None:
    """Create a notification for all ho_checker users."""
    for user in USERS.values():
        if user["role"] == "ho_checker":
            NOTIFICATIONS.append({
                "id": f"notif-{uuid.uuid4().hex[:8]}",
                "recipient_user_id": user["id"],
                "message": message,
                "is_read": False,
                "created_at": _today_str(),
                "related_run_id": run_id,
                "related_match_id": match_id,
            })


def _append_audit(
    user_id: str,
    user_name: str,
    action: str,
    resource_type: str,
    resource_id: str,
    details: str,
) -> None:
    AUDIT_LOG.append({
        "id": f"al-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "user_name": user_name,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details,
        "timestamp": _today_str(),
    })


def _recompute_run_stats(run_id: str) -> None:
    """Recompute aggregate counts on a run from its current matches."""
    run = next((r for r in RECONCILIATION_RUNS if r["id"] == run_id), None)
    if not run:
        return

    matches = [m for m in RECONCILIATION_MATCHES if m["run_id"] == run_id]
    run["total"] = len(matches)
    run["exact_count"] = sum(1 for m in matches if m["match_type"] == "EXACT")
    run["approx_count"] = sum(1 for m in matches if m["match_type"] == "APPROXIMATE")
    run["nil_count"] = sum(1 for m in matches if m["match_type"] == "NIL")
    run["manual_count"] = sum(1 for m in matches if m["match_type"] == "MANUAL")
    run["reconciled_count"] = sum(1 for m in matches if m["final_status"] == "RECONCILED")

    # Update run status
    pending = sum(1 for m in matches if m["final_status"] == "PENDING")
    if pending == 0 and len(matches) > 0:
        run["status"] = "COMPLETED"
    else:
        run["status"] = "IN_PROGRESS"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_reconciliation(
    period_from_str: str,
    period_to_str: str,
    scheme_id: Optional[str],
    created_by_id: str,
) -> dict:
    """
    Execute a reconciliation run.

    Steps:
    1. Filter PURCHASE transactions in the period / scheme.
    2. Collect bank statement credit entries for the period.
    3. Match each transaction: EXACT → APPROXIMATE → NIL.
    4. Persist the run + matches.
    5. Notify ho_maker users.
    """
    period_from = _parse_date(period_from_str)
    period_to = _parse_date(period_to_str)
    if not period_from or not period_to:
        raise ValueError(f"Invalid period dates: {period_from_str} – {period_to_str}")

    creator = USERS.get(created_by_id, {})
    creator_name = creator.get("name", "Unknown")

    # Resolve scheme name
    scheme_name: Optional[str] = None
    if scheme_id:
        from data.store import SCHEMES
        sch = next((s for s in SCHEMES if s["id"] == scheme_id), None)
        if sch:
            scheme_name = sch["name"]

    purchase_txns = _get_purchase_transactions_in_period(scheme_id, period_from, period_to)
    bank_entries = _get_entries_for_scheme_in_period(scheme_id, period_from, period_to)
    used_entry_ids = _get_used_entry_ids()

    # Only consider entries not already reconciled
    available_entries = [e for e in bank_entries if e["id"] not in used_entry_ids]

    run_id = f"rr-{uuid.uuid4().hex[:8]}"
    new_matches: list[dict] = []
    assigned_entry_ids: set[str] = set()   # entries used in this run

    for txn in purchase_txns:
        txn_amount = txn.get("purchase_amount") or 0.0
        txn_date = _parse_date(txn.get("purchase_transaction_date"))
        txn_utr = txn.get("purchase_cheque_utr_no") or ""

        # ── Try EXACT match ────────────────────────────────────────────────
        exact_entry = None
        for entry in available_entries:
            if entry["id"] in assigned_entry_ids:
                continue
            entry_credit = entry.get("credit", 0.0)
            entry_date = _parse_date(entry["date"])
            entry_ref = entry.get("ref_no", "")

            amount_ok = _amounts_exact(txn_amount, entry_credit)
            date_ok = _dates_within(txn_date, entry_date, 0)
            utr_ok = _utr_match(txn_utr, entry_ref) if txn_utr else True

            if amount_ok and date_ok and utr_ok:
                exact_entry = entry
                break

        if exact_entry:
            assigned_entry_ids.add(exact_entry["id"])
            match_rec = {
                "id": f"rm-{uuid.uuid4().hex[:8]}",
                "run_id": run_id,
                "transaction_id": txn["id"],
                "bank_entry_ids": [exact_entry["id"]],
                "match_type": "EXACT",
                "maker_action": "PENDING",
                "maker_user_id": None,
                "maker_user_name": None,
                "maker_at": None,
                "maker_remarks": None,
                "checker_action": "PENDING",
                "checker_user_id": None,
                "checker_user_name": None,
                "checker_at": None,
                "checker_remarks": None,
                "final_status": "PENDING",
            }
            new_matches.append(match_rec)
            continue

        # ── Try APPROXIMATE match ──────────────────────────────────────────
        approx_entry = None
        for entry in available_entries:
            if entry["id"] in assigned_entry_ids:
                continue
            entry_credit = entry.get("credit", 0.0)
            entry_date = _parse_date(entry["date"])
            entry_ref = entry.get("ref_no", "")

            amount_approx = _amounts_approx(txn_amount, entry_credit)
            date_within_3 = _dates_within(txn_date, entry_date, 3)
            partial_utr = _utr_partial(txn_utr, entry_ref) if txn_utr else False

            if (amount_approx and date_within_3) or partial_utr:
                approx_entry = entry
                break

        if approx_entry:
            assigned_entry_ids.add(approx_entry["id"])
            match_rec = {
                "id": f"rm-{uuid.uuid4().hex[:8]}",
                "run_id": run_id,
                "transaction_id": txn["id"],
                "bank_entry_ids": [approx_entry["id"]],
                "match_type": "APPROXIMATE",
                "maker_action": "PENDING",
                "maker_user_id": None,
                "maker_user_name": None,
                "maker_at": None,
                "maker_remarks": None,
                "checker_action": "PENDING",
                "checker_user_id": None,
                "checker_user_name": None,
                "checker_at": None,
                "checker_remarks": None,
                "final_status": "PENDING",
            }
            new_matches.append(match_rec)
            continue

        # ── NIL — no match found ───────────────────────────────────────────
        match_rec = {
            "id": f"rm-{uuid.uuid4().hex[:8]}",
            "run_id": run_id,
            "transaction_id": txn["id"],
            "bank_entry_ids": [],
            "match_type": "NIL",
            "maker_action": "PENDING",
            "maker_user_id": None,
            "maker_user_name": None,
            "maker_at": None,
            "maker_remarks": None,
            "checker_action": "PENDING",
            "checker_user_id": None,
            "checker_user_name": None,
            "checker_at": None,
            "checker_remarks": None,
            "final_status": "PENDING",
        }
        new_matches.append(match_rec)

    # Persist matches
    RECONCILIATION_MATCHES.extend(new_matches)

    total = len(new_matches)
    exact_count = sum(1 for m in new_matches if m["match_type"] == "EXACT")
    approx_count = sum(1 for m in new_matches if m["match_type"] == "APPROXIMATE")
    nil_count = sum(1 for m in new_matches if m["match_type"] == "NIL")
    manual_count = 0
    reconciled_count = 0

    run = {
        "id": run_id,
        "period_from": period_from_str,
        "period_to": period_to_str,
        "scheme_id": scheme_id,
        "scheme_name": scheme_name,
        "status": "IN_PROGRESS" if total > 0 else "COMPLETED",
        "created_by": created_by_id,
        "created_at": _today_str(),
        "total": total,
        "exact_count": exact_count,
        "approx_count": approx_count,
        "nil_count": nil_count,
        "manual_count": manual_count,
        "reconciled_count": reconciled_count,
    }
    RECONCILIATION_RUNS.append(run)

    # Audit
    _append_audit(
        user_id=created_by_id,
        user_name=creator_name,
        action="CREATE_RECONCILIATION_RUN",
        resource_type="ReconciliationRun",
        resource_id=run_id,
        details=(
            f"Created reconciliation run for scheme={scheme_id or 'ALL'}, "
            f"period {period_from_str} to {period_to_str}. "
            f"Results: {total} transactions — {exact_count} exact, "
            f"{approx_count} approximate, {nil_count} nil."
        ),
    )

    # Notify makers
    _notify_ho_makers(
        message=(
            f"Reconciliation run {run_id} for "
            f"{scheme_name or 'all schemes'} "
            f"({period_from_str} to {period_to_str}) is ready for review. "
            f"{total} match(es) found."
        ),
        run_id=run_id,
    )

    return run


def apply_maker_action(match_id: str, action: str, remarks: str, user_id: str) -> dict:
    """
    Record a maker action (APPROVED | FLAGGED) on a reconciliation match.
    On APPROVED, notify ho_checker users.
    """
    match = next((m for m in RECONCILIATION_MATCHES if m["id"] == match_id), None)
    if not match:
        raise ValueError(f"Match {match_id} not found.")

    if match["final_status"] in ("RECONCILED", "REJECTED"):
        raise ValueError(f"Match {match_id} is already finalised ({match['final_status']}).")

    user = USERS.get(user_id, {})
    user_name = user.get("name", "Unknown")

    match["maker_action"] = action
    match["maker_user_id"] = user_id
    match["maker_user_name"] = user_name
    match["maker_at"] = _today_str()
    match["maker_remarks"] = remarks

    if action == "FLAGGED":
        match["final_status"] = "FLAGGED"

    _append_audit(
        user_id=user_id,
        user_name=user_name,
        action=f"MAKER_{action}",
        resource_type="ReconciliationMatch",
        resource_id=match_id,
        details=f"Maker {action.lower()}d match {match_id}. Remarks: {remarks or 'None'}",
    )

    if action == "APPROVED":
        _notify_ho_checkers(
            message=f"Maker has approved match {match_id} ({match['match_type']}). Awaiting checker review.",
            run_id=match["run_id"],
            match_id=match_id,
        )

    _recompute_run_stats(match["run_id"])
    return match


def apply_checker_action(match_id: str, action: str, remarks: str, user_id: str) -> dict:
    """
    Record a checker action (APPROVED | REJECTED) on a reconciliation match.
    If APPROVED + maker already approved → final_status=RECONCILED and transaction status=RECONCILED.
    If REJECTED → final_status=REJECTED.
    """
    match = next((m for m in RECONCILIATION_MATCHES if m["id"] == match_id), None)
    if not match:
        raise ValueError(f"Match {match_id} not found.")

    if match["final_status"] in ("RECONCILED", "REJECTED"):
        raise ValueError(f"Match {match_id} is already finalised ({match['final_status']}).")

    user = USERS.get(user_id, {})
    user_name = user.get("name", "Unknown")

    match["checker_action"] = action
    match["checker_user_id"] = user_id
    match["checker_user_name"] = user_name
    match["checker_at"] = _today_str()
    match["checker_remarks"] = remarks

    if action == "APPROVED" and match["maker_action"] == "APPROVED":
        match["final_status"] = "RECONCILED"
        # Update transaction status
        for txn in TRANSACTIONS:
            if txn["id"] == match["transaction_id"]:
                txn["status"] = "RECONCILED"
                break
        # Mark bank entries as matched
        for eid in match["bank_entry_ids"]:
            entry = get_bank_entry_by_id(eid)
            if entry:
                entry["is_matched"] = True
    elif action == "REJECTED":
        match["final_status"] = "REJECTED"

    _append_audit(
        user_id=user_id,
        user_name=user_name,
        action=f"CHECKER_{action}",
        resource_type="ReconciliationMatch",
        resource_id=match_id,
        details=(
            f"Checker {action.lower()}d match {match_id}. "
            f"Final status: {match['final_status']}. Remarks: {remarks or 'None'}"
        ),
    )

    _recompute_run_stats(match["run_id"])
    return match


def apply_manual_map(
    run_id: str,
    transaction_id: str,
    bank_entry_ids: list[str],
    user_id: str,
) -> dict:
    """
    Create or update a MANUAL match record for a transaction in a run.
    Resets maker/checker to PENDING so the normal approval workflow continues.
    """
    user = USERS.get(user_id, {})
    user_name = user.get("name", "Unknown")

    # Check if a match already exists for this transaction in this run
    existing = next(
        (
            m
            for m in RECONCILIATION_MATCHES
            if m["run_id"] == run_id and m["transaction_id"] == transaction_id
        ),
        None,
    )

    if existing:
        # Update existing
        existing["bank_entry_ids"] = bank_entry_ids
        existing["match_type"] = "MANUAL"
        existing["maker_action"] = "PENDING"
        existing["maker_user_id"] = None
        existing["maker_user_name"] = None
        existing["maker_at"] = None
        existing["maker_remarks"] = None
        existing["checker_action"] = "PENDING"
        existing["checker_user_id"] = None
        existing["checker_user_name"] = None
        existing["checker_at"] = None
        existing["checker_remarks"] = None
        existing["final_status"] = "PENDING"
        match = existing
    else:
        match = {
            "id": f"rm-{uuid.uuid4().hex[:8]}",
            "run_id": run_id,
            "transaction_id": transaction_id,
            "bank_entry_ids": bank_entry_ids,
            "match_type": "MANUAL",
            "maker_action": "PENDING",
            "maker_user_id": None,
            "maker_user_name": None,
            "maker_at": None,
            "maker_remarks": None,
            "checker_action": "PENDING",
            "checker_user_id": None,
            "checker_user_name": None,
            "checker_at": None,
            "checker_remarks": None,
            "final_status": "PENDING",
        }
        RECONCILIATION_MATCHES.append(match)

    _append_audit(
        user_id=user_id,
        user_name=user_name,
        action="MANUAL_MAP",
        resource_type="ReconciliationMatch",
        resource_id=match["id"],
        details=(
            f"Manual mapping set for txn {transaction_id} in run {run_id}. "
            f"Bank entries: {bank_entry_ids}"
        ),
    )

    _recompute_run_stats(run_id)
    return match
