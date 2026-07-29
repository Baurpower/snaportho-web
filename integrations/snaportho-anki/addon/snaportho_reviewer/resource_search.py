"""Trusted resource search helpers for the Anki Browse surface."""
from __future__ import annotations

import re
import html
from urllib.parse import parse_qs, urlparse

CONTRACT = "snaportho-resource-search.v1"
SAFE_ID = re.compile(r"^[A-Za-z0-9._:-]{1,200}$")
PREFIX = re.compile(r"^(?:ob|qid|orthobullets)\s*:\s*(.+)$", re.IGNORECASE)
PATH_ID = re.compile(
    r"(?:questions?|testview|qid)[/_-]+([A-Za-z0-9._:-]+)",
    re.IGNORECASE,
)
DISPLAY_ID = re.compile(r"^(OBQ\d{2})[.-](\d+)$", re.IGNORECASE)


def normalize_orthobullets_id(value: str) -> str:
    candidate = (value or "").strip()
    match = DISPLAY_ID.fullmatch(candidate)
    return f"{match.group(1).upper()}-{match.group(2)}" if match else candidate


def parse_orthobullets_id(value: str) -> str | None:
    """Normalize a raw ID, supported prefix, or Orthobullets URL."""
    candidate = (value or "").strip()
    if not candidate:
        return None
    prefixed = PREFIX.match(candidate)
    if prefixed:
        candidate = prefixed.group(1).strip()
    if candidate.startswith(("http://", "https://")):
        parsed = urlparse(candidate)
        if "orthobullets.com" not in parsed.netloc.lower():
            return None
        params = parse_qs(parsed.query)
        for key in ("qid", "questionId", "question_id", "id"):
            found = params.get(key)
            if found and SAFE_ID.fullmatch(found[0]):
                return normalize_orthobullets_id(found[0])
        match = PATH_ID.search(parsed.path)
        return (
            normalize_orthobullets_id(match.group(1))
            if match and SAFE_ID.fullmatch(match.group(1))
            else None
        )
    return normalize_orthobullets_id(candidate) if SAFE_ID.fullmatch(candidate) else None


def request_payload(
    native_id: str,
    limit: int = 12,
    concept: str = "",
    summary: str = "",
    keywords=None,
    query_kind: str = "question",
    sections=None,
) -> dict:
    query = {
        "kind": "topic_page" if query_kind == "topic_page" else "external_question",
        "provider": "orthobullets",
        "nativeId": native_id,
    }
    if concept.strip():
        query["testedConcept"] = concept.strip()
    if summary.strip():
        query["conceptSummary"] = summary.strip()
    clean_keywords = [str(value).strip() for value in (keywords or []) if 3 <= len(str(value).strip()) <= 80][:24]
    if clean_keywords:
        query["searchKeywords"] = clean_keywords
    clean_sections = []
    if query_kind == "topic_page":
        for section in sections or []:
            if not isinstance(section, dict):
                continue
            concepts = [
                str(value).strip()
                for value in section.get("concepts") or []
                if 2 <= len(str(value).strip()) <= 80
            ][:12]
            heading = str(section.get("heading") or "").strip()
            section_id = str(section.get("id") or "").strip()
            if not heading or not section_id or not concepts:
                continue
            clean_sections.append({
                "id": section_id[:80],
                "heading": heading[:240],
                "concepts": concepts,
                "priority": max(1, min(int(section.get("priority") or 3), 5)),
            })
        query["sections"] = clean_sections[:30]
    return {
        "contractVersion": CONTRACT,
        "query": query,
        "scopes": ["direct", "latest_deck_concept"] if concept.strip() else ["direct"],
        "limit": max(1, min(int(limit), 50)),
    }


def resolve_local_results(gateway, results: list[dict]) -> dict:
    """Resolve canonical results without trusting native card-id hints."""
    resolved_ids = []
    dispositions = []
    for result in results:
        matches = gateway.cards_by_guid_ordinal(
            result.get("noteGuid"), result.get("cardOrdinal")
        )
        if not matches:
            status = "missing"
        elif len(matches) > 1:
            status = "ambiguous"
        else:
            expected_hash = result.get("contentHash")
            local_hash = gateway.content_hash(matches[0]) if expected_hash else None
            status = (
                "version_mismatch"
                if expected_hash and local_hash != expected_hash
                else "available"
            )
            resolved_ids.append(matches[0].id)
        dispositions.append(
            {
                "canonicalCardId": result.get("canonicalCardId"),
                "status": status,
                "nativeCardIds": [card.id for card in matches],
            }
        )
    return {"cardIds": resolved_ids, "dispositions": dispositions}


def anki_card_query(card_ids: list[int]) -> str:
    return " OR ".join(f"cid:{int(card_id)}" for card_id in sorted(set(card_ids)))

def apply_browser_query(browser, query: str) -> None:
    """Use public Browser methods when available, with a conservative UI fallback."""
    if hasattr(browser, "search_for"):
        browser.search_for(query)
        return
    search_edit = getattr(getattr(browser, "form", None), "searchEdit", None)
    if search_edit is None:
        raise RuntimeError("browser_search_unavailable")
    editor = search_edit.lineEdit() if hasattr(search_edit, "lineEdit") else search_edit
    editor.setText(query)
    if hasattr(browser, "onSearchActivated"):
        browser.onSearchActivated()
    elif hasattr(browser, "search"):
        browser.search()
    else:
        raise RuntimeError("browser_search_unavailable")

def install_browser_search_surface(browser, on_search=None):
    """Install a persistent, visible SnapOrtho toolbar and menu in Browse."""
    if getattr(browser, "_snaportho_search_surface", False):
        return
    from aqt.qt import QAction, QLabel, QToolBar, qconnect

    browser._snaportho_search_surface = True
    menu = browser.menuBar().addMenu("SnapOrtho")
    search_action = QAction("Advanced Orthobullets Search…", browser)
    if on_search:
        qconnect(search_action.triggered, lambda: on_search(browser))
    menu.addAction(search_action)
    status_action = QAction("Status: Ready", browser)
    status_action.setEnabled(False)
    menu.addAction(status_action)

    toolbar = QToolBar("SnapOrtho Search", browser)
    toolbar.setObjectName("snaportho_search_toolbar")
    toolbar.addAction(search_action)
    status_label = QLabel("  SnapOrtho ready · paste an OBQ ID or send from Chrome  ")
    toolbar.addWidget(status_label)
    browser.addToolBar(toolbar)
    browser._snaportho_search_status_action = status_action
    browser._snaportho_search_status_label = status_label


def set_browser_search_status(browser, native_id: str, concept: str, count: int, tier: str):
    tier_label = "reviewed links" if tier == "direct_reviewed" else "latest-deck matches"
    short_concept = html.unescape(re.sub(r"<[^>]+>", " ", concept or "")).strip()
    if len(short_concept) > 70:
        short_concept = short_concept[:67] + "…"
    text = f"SnapOrtho · {native_id} · {count} {tier_label}"
    if short_concept:
        text += f" · {short_concept}"
    label = getattr(browser, "_snaportho_search_status_label", None)
    if label is not None:
        label.setText(f"  {text}  ")
        label.setToolTip(text)
    action = getattr(browser, "_snaportho_search_status_action", None)
    if action is not None:
        action.setText(f"Status: {text}")


def open_browse_with_card_ids(mw, card_ids: list[int], search_context: dict | None = None):
    """Open/focus Browse and apply the exact local card query."""
    query = anki_card_query(card_ids)
    if not query:
        return None
    from aqt import dialogs
    browser = dialogs.open("Browser", mw)
    install_browser_search_surface(browser)
    apply_browser_query(browser, query)
    if search_context:
        set_browser_search_status(
            browser,
            search_context.get("nativeId") or "Orthobullets",
            search_context.get("concept") or "",
            len(set(card_ids)),
            search_context.get("tier") or "local_concept_candidate",
        )
    try:
        browser.activateWindow()
        browser.raise_()
    except Exception:
        pass
    return browser


def result_summary(body: dict, local: dict) -> str:
    resolution = body.get("resolution") or {}
    status = resolution.get("status")
    native_id = resolution.get("nativeId") or ""
    if status == "not_registered":
        return f"Orthobullets #{native_id} is not registered in SnapOrtho yet."
    if status == "unmapped":
        return f"Orthobullets #{native_id} has no approved concept mapping yet."
    results = body.get("results") or []
    available = len(local.get("cardIds") or [])
    missing = sum(1 for row in local.get("dispositions") or [] if row["status"] == "missing")
    ambiguous = sum(1 for row in local.get("dispositions") or [] if row["status"] == "ambiguous")
    drifted = sum(
        1 for row in local.get("dispositions") or [] if row["status"] == "version_mismatch"
    )
    concepts = ", ".join(
        entity.get("label", "")
        for entity in resolution.get("canonicalEntities") or []
        if entity.get("label")
    )
    lines = [
        f"Orthobullets #{native_id}",
        concepts or "Approved concept mapping found",
        "",
        f"{len(results)} reviewed card match(es); {available} available locally.",
    ]
    if missing:
        lines.append(f"{missing} matching card(s) are not installed locally.")
    if ambiguous:
        lines.append(f"{ambiguous} card identity match(es) are ambiguous locally.")
    if drifted:
        lines.append(f"{drifted} local card(s) differ from the current canonical version.")
    if not results:
        lines.append("No approved card mappings exist yet; reviewer discovery is required.")
    return "\n".join(lines)
