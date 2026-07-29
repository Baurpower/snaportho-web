"""Reviewer side panel — master identity + fast enrichment (KG, OB, notes)."""
from __future__ import annotations

import re
import uuid

from .version import ADDON_VERSION

# Training level: MS4 through PGY5 (controlled tags for the published deck).
LEVEL_OPTIONS = [
    ("—", None),
    ("MS4", "SnapOrtho::Level::MS4"),
    ("PGY1", "SnapOrtho::Level::PGY1"),
    ("PGY2", "SnapOrtho::Level::PGY2"),
    ("PGY3", "SnapOrtho::Level::PGY3"),
    ("PGY4", "SnapOrtho::Level::PGY4"),
    ("PGY5", "SnapOrtho::Level::PGY5"),
    ("Fellow", "SnapOrtho::Level::Fellow"),
    ("Attending", "SnapOrtho::Level::Attending"),
]
# Importance / yield
IMPORTANCE_OPTIONS = [
    ("—", None),
    ("High", "SnapOrtho::Yield::High"),
    ("Moderate", "SnapOrtho::Yield::Moderate"),
    ("Low", "SnapOrtho::Yield::Low"),
]
LEVEL_PREFIX = "SnapOrtho::Level::"
YIELD_PREFIX = "SnapOrtho::Yield::"
OB_QID_PREFIX = "SnapOrtho::OB::QuestionId::"
OB_QID_TAG_RE = re.compile(r"^SnapOrtho::OB::QuestionId::([A-Za-z0-9._:-]+)$")
KG_MAPPING_ROLES = [
    "teaches",
    "tests",
    "explains",
    "demonstrates",
    "context_only",
    "broadly_related",
]


def side_panel_status(body: dict) -> str:
    """Pure status copy for the dock (unit-tested)."""
    if not body.get("found") and not body.get("identityResolved"):
        return (
            "Not in the master deck\n"
            "Use Full workspace to propose this as a missing card."
        )
    version = body.get("versionNumber")
    mappings = body.get("mappings") or []
    n = len(mappings)
    kg_line = f"{n} KG concept(s)" if n else "No KG links yet — add below"
    if body.get("contentMatches") is False and not body.get("styleMismatchLikely", True):
        return f"Master · v{version}\n{kg_line}\nLocal content may have diverged"
    return f"Master · v{version}\n{kg_line}"


def label_for_tag(options: list[tuple[str, str | None]], tags: list[str]) -> str:
    tag_set = set(tags or [])
    for label, tag in options:
        if tag and tag in tag_set:
            return label
    return options[0][0]


def tag_for_label(options: list[tuple[str, str | None]], label: str) -> str | None:
    for lab, tag in options:
        if lab == label:
            return tag
    return None


def parse_ob_question_id(tags: list[str]) -> str:
    for t in tags or []:
        m = OB_QID_TAG_RE.match(t)
        if m:
            return m.group(1)
    return ""


def build_ob_qid_tag(qid: str) -> str | None:
    q = (qid or "").strip()
    if not q:
        return None
    # Keep tags safe for the central-tag pattern
    safe = re.sub(r"[^A-Za-z0-9._:-]+", "-", q).strip("-")
    if not safe:
        return None
    return f"{OB_QID_PREFIX}{safe}"


def build_enrichment_tag_changes(
    existing_tags: list[str],
    *,
    level_label: str,
    importance_label: str,
    ob_question_id: str,
) -> dict:
    """Compute centralTagChanges for level, importance, and OB question id tags."""
    existing = set(existing_tags or [])
    desired = set()

    level_tag = tag_for_label(LEVEL_OPTIONS, level_label)
    if level_tag:
        desired.add(level_tag)
    imp_tag = tag_for_label(IMPORTANCE_OPTIONS, importance_label)
    if imp_tag:
        desired.add(imp_tag)
    qid_tag = build_ob_qid_tag(ob_question_id)
    if qid_tag:
        desired.add(qid_tag)

    # Only manage these controlled namespaces; leave other SnapOrtho tags alone
    managed_existing = {
        t
        for t in existing
        if t.startswith(LEVEL_PREFIX)
        or t.startswith(YIELD_PREFIX)
        or t.startswith(OB_QID_PREFIX)
    }
    add = sorted(desired - existing)
    remove = sorted(managed_existing - desired)
    return {"add": add, "remove": remove}


def build_enrichment_edited_fields(
    current_by_name: dict[str, str],
    *,
    orthobullets: str,
    orthobullets_link: str,
    rock: str,
    rock_link: str,
) -> list[dict]:
    """Build central editedFields for enrichment-only changes (pure / testable)."""
    updates = {
        "Orthobullets": orthobullets.strip(),
        "Orthobullets_Link": orthobullets_link.strip(),
        "ROCK": rock.strip(),
        "ROCK_Link": rock_link.strip(),
    }
    out = []
    for name, value in updates.items():
        prev = (current_by_name.get(name) or "").strip()
        if value == prev:
            continue
        if not value and not prev:
            continue
        out.append({"name": name, "value": value})
    return out


def build_enrichment_proposal_payload(
    resolution: dict,
    local_identity: dict,
    *,
    edited_fields: list[dict],
    mapping_changes: list[dict],
    notes: str,
    central_tag_changes: dict | None = None,
    source_surface: str = "reviewer_panel",
) -> dict:
    """Proposal body for dock submit (same contract as full workspace)."""
    base = None
    if resolution.get("found"):
        base = {
            "canonicalCardId": resolution["canonicalCardId"],
            "canonicalCardVersionId": resolution["canonicalCardVersionId"],
            "contentHash": resolution["contentHash"],
        }
    tags = central_tag_changes or {"add": [], "remove": []}
    return {
        "contractVersion": "snaportho-anki-reviewer.v1",
        "proposalKind": "edit_existing_card" if base else "create_missing_card",
        "sourceSurface": source_surface,
        "baseCard": base,
        "localIdentity": local_identity,
        "editedFields": edited_fields,
        "centralTagChanges": {
            "add": list(tags.get("add") or []),
            "remove": list(tags.get("remove") or []),
        },
        "proposedDeckPath": None,
        "mappingChanges": mapping_changes,
        "kgExpansionSuggestion": None,
        "notes": notes,
        "idempotencyKey": str(uuid.uuid4()),
        "clientVersion": ADDON_VERSION,
    }


class ReviewerSidePanel:
    """Right dock: resolve master identity + quick KG / Orthobullets / notes."""

    def __init__(self, mw, runtime):
        from aqt.qt import (
            QComboBox,
            QDockWidget,
            QFormLayout,
            QFrame,
            QHBoxLayout,
            QLabel,
            QLineEdit,
            QListWidget,
            QPlainTextEdit,
            QPushButton,
            QScrollArea,
            QSizePolicy,
            QToolButton,
            QVBoxLayout,
            QWidget,
            Qt,
        )

        self.runtime = runtime
        self.card = None
        self.resolution = None
        self.mapping_changes: list[dict] = []
        self.kg_drafts: list[dict] = []
        self.kg_checkboxes: list = []
        self.kg_role_combos: list = []
        self.kg_improvement: dict | None = None
        self.kg_suggestion_id: str | None = None
        self._gateway = None
        self._current_fields: dict[str, str] = {}
        self._current_tags: list[str] = []
        self._card_key = None

        self.dock = QDockWidget("SnapOrtho", mw)
        self.dock.setObjectName("snaportho_reviewer_side_panel")
        self.dock.setMinimumWidth(300)

        outer = QWidget()
        outer_layout = QVBoxLayout(outer)
        outer_layout.setContentsMargins(8, 8, 8, 8)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        body = QWidget()
        layout = QVBoxLayout(body)
        layout.setContentsMargins(2, 2, 4, 8)
        layout.setSpacing(10)

        self.state = QLabel("Open a card to inspect its master-deck state.")
        self.state.setWordWrap(True)
        self.state.setStyleSheet(
            "background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; "
            "padding: 9px; font-weight: 600; color: #0f172a;"
        )
        layout.addWidget(self.state)

        self.mappings_label = QLabel("")
        self.mappings_label.setWordWrap(True)
        self.mappings_label.setStyleSheet("color: #4b5563; font-size: 12px;")
        layout.addWidget(self.mappings_label)

        # ── Card classification: the two fastest, highest-frequency decisions ──
        layout.addWidget(self._section_label("Card classification"))
        classification_panel = QFrame()
        classification_panel.setObjectName("classificationPanel")
        classification_panel.setStyleSheet(
            "QFrame#classificationPanel { background: white; border: 1px solid #dbe3ec; "
            "border-radius: 8px; }"
            "QComboBox { min-height: 28px; padding: 0 8px; }"
        )
        classification_form = QFormLayout(classification_panel)
        classification_form.setContentsMargins(10, 9, 10, 9)
        classification_form.setSpacing(8)
        self.ob_level = QComboBox()
        self.ob_level.addItems([label for label, _ in LEVEL_OPTIONS])
        self.ob_level.setToolTip("Earliest training level expected to know this card")
        self.ob_importance = QComboBox()
        self.ob_importance.addItems([label for label, _ in IMPORTANCE_OPTIONS])
        self.ob_importance.setToolTip("Educational importance / exam yield")
        classification_form.addRow("Level", self.ob_level)
        classification_form.addRow("Importance", self.ob_importance)
        layout.addWidget(classification_panel)

        # ── KG: Suggest → accept / refine comment ─────────────────
        layout.addWidget(self._section_label("Knowledge graph"))
        self.kg_panel = QFrame()
        self.kg_panel.setObjectName("kgPanel")
        self.kg_panel.setStyleSheet(
            "QFrame#kgPanel { background: #f8fafc; border: 1px solid #dbe3ec; "
            "border-radius: 8px; }"
        )
        kg_layout = QVBoxLayout(self.kg_panel)
        kg_layout.setContentsMargins(10, 10, 10, 10)
        kg_layout.setSpacing(7)
        self.kg_hint = QLabel(
            "Card content is understood automatically. Ask SnapOrtho to check the "
            "knowledge graph and propose useful changes."
        )
        self.kg_hint.setWordWrap(True)
        self.kg_hint.setStyleSheet("font-size: 11px; color: #6b7280;")
        kg_layout.addWidget(self.kg_hint)

        self.suggest_btn = QPushButton("Suggest KG improvements")
        self.suggest_btn.clicked.connect(self._suggest_improvement)
        self.suggest_btn.setEnabled(False)
        self.suggest_btn.setStyleSheet(
            "QPushButton { background: #0369a1; color: white; border: none; "
            "border-radius: 6px; min-height: 30px; font-weight: 700; }"
            "QPushButton:disabled { background: #cbd5e1; }"
        )
        kg_layout.addWidget(self.suggest_btn)

        self.kg_evidence = QLabel("")
        self.kg_evidence.setWordWrap(True)
        self.kg_evidence.setVisible(False)
        self.kg_evidence.setStyleSheet(
            "background: white; border: 1px solid #e2e8f0; border-radius: 6px; "
            "padding: 7px; color: #334155; font-size: 11px;"
        )
        kg_layout.addWidget(self.kg_evidence)

        self.improvement_card = QFrame()
        self.improvement_card.setObjectName("improvementCard")
        self.improvement_card.setVisible(False)
        self.improvement_card.setStyleSheet(
            "QFrame#improvementCard { background: white; border: 1px solid #bae6fd; "
            "border-radius: 8px; }"
        )
        improvement_layout = QVBoxLayout(self.improvement_card)
        improvement_layout.setContentsMargins(10, 9, 10, 10)
        self.improvement_title = QLabel("")
        self.improvement_title.setWordWrap(True)
        self.improvement_title.setStyleSheet(
            "font-size: 13px; font-weight: 700; color: #0f172a;"
        )
        improvement_layout.addWidget(self.improvement_title)
        self.improvement_summary = QLabel("")
        self.improvement_summary.setWordWrap(True)
        self.improvement_summary.setStyleSheet("font-size: 12px; color: #334155;")
        improvement_layout.addWidget(self.improvement_summary)
        self.improvement_meta = QLabel("")
        self.improvement_meta.setWordWrap(True)
        self.improvement_meta.setStyleSheet("font-size: 10px; color: #64748b;")
        improvement_layout.addWidget(self.improvement_meta)
        decision_row = QHBoxLayout()
        self.accept_improvement_btn = QPushButton("Accept improvement")
        self.accept_improvement_btn.setObjectName("acceptImprovement")
        self.accept_improvement_btn.setStyleSheet(
            "QPushButton { background: #047857; color: white; border: none; "
            "border-radius: 6px; min-height: 30px; font-weight: 700; }"
        )
        self.accept_improvement_btn.clicked.connect(
            lambda: self._decide_improvement("accept")
        )
        self.review_improvement_btn = QPushButton("Review details")
        self.review_improvement_btn.clicked.connect(self._show_improvement_details)
        self.reject_improvement_btn = QPushButton("Not useful")
        self.reject_improvement_btn.clicked.connect(
            lambda: self._decide_improvement("not_useful")
        )
        decision_row.addWidget(self.accept_improvement_btn)
        decision_row.addWidget(self.review_improvement_btn)
        decision_row.addWidget(self.reject_improvement_btn)
        improvement_layout.addLayout(decision_row)
        kg_layout.addWidget(self.improvement_card)

        self.kg_draft_host = QWidget()
        self.kg_draft_layout = QVBoxLayout(self.kg_draft_host)
        self.kg_draft_layout.setContentsMargins(0, 0, 0, 0)
        self.kg_draft_layout.setSpacing(4)
        self.kg_draft_host.setVisible(False)
        kg_layout.addWidget(self.kg_draft_host)

        self.kg_gap_label = QLabel("")
        self.kg_gap_label.setWordWrap(True)
        self.kg_gap_label.setVisible(False)
        self.kg_gap_label.setStyleSheet(
            "background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; "
            "padding: 7px; color: #9a3412; font-size: 11px;"
        )
        kg_layout.addWidget(self.kg_gap_label)
        self.review_gaps_btn = QPushButton("Review ontology gaps…")
        self.review_gaps_btn.clicked.connect(self.open)
        self.review_gaps_btn.setVisible(False)
        kg_layout.addWidget(self.review_gaps_btn)

        self.kg_refine = QPlainTextEdit()
        self.kg_refine.setPlaceholderText(
            "Optional direction, e.g. “focus on mineral storage”"
        )
        self.kg_refine.setMaximumHeight(56)
        self.kg_refine.setVisible(False)
        kg_layout.addWidget(self.kg_refine)

        refine_row = QHBoxLayout()
        self.resuggest_btn = QPushButton("Re-suggest with comment")
        self.resuggest_btn.clicked.connect(self._resuggest_kg)
        self.resuggest_btn.setEnabled(False)
        self.confirm_kg_btn = QPushButton("Confirm selected")
        self.confirm_kg_btn.clicked.connect(self._confirm_kg)
        self.confirm_kg_btn.setEnabled(False)
        self.resuggest_btn.setText("Refine suggestions")
        self.resuggest_btn.setVisible(False)
        self.confirm_kg_btn.setVisible(False)
        refine_row.addWidget(self.resuggest_btn)
        refine_row.addWidget(self.confirm_kg_btn)
        kg_layout.addLayout(refine_row)

        self.mapping_summary = QLabel("")
        self.mapping_summary.setWordWrap(True)
        self.mapping_summary.setStyleSheet("font-size: 11px; color: #6b7280;")
        kg_layout.addWidget(self.mapping_summary)
        layout.addWidget(self.kg_panel)

        # ── Resources: supporting references, kept below KG ───────
        layout.addWidget(self._section_label("Resources"))
        self.ob_toggle = QToolButton()
        self.ob_toggle.setText("▸ Orthobullets")
        self.ob_toggle.setCheckable(True)
        self.ob_toggle.setChecked(False)
        self.ob_toggle.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextOnly)
        self.ob_toggle.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        self.ob_toggle.setStyleSheet(
            "QToolButton { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; "
            "text-transform: uppercase; color: #0369a1; text-align: left; border: none; "
            "padding: 6px 0; }"
        )
        self.ob_toggle.toggled.connect(self._on_ob_toggled)
        layout.addWidget(self.ob_toggle)

        self.ob_panel = QFrame()
        self.ob_panel.setObjectName("obPanel")
        self.ob_panel.setStyleSheet(
            "QFrame#obPanel { background: #f0f9ff; border: 1px solid #bae6fd; "
            "border-radius: 8px; }"
        )
        ob_layout = QVBoxLayout(self.ob_panel)
        ob_layout.setContentsMargins(8, 8, 8, 8)
        ob_form = QFormLayout()
        self.ob_qid = QLineEdit()
        self.ob_qid.setPlaceholderText("e.g. 3009 or topic/question id")
        self.ob_field = QPlainTextEdit()
        self.ob_field.setPlaceholderText("Curated bullets / teaching points…")
        self.ob_field.setMaximumHeight(72)
        self.ob_link = QLineEdit()
        self.ob_link.setPlaceholderText("https://www.orthobullets.com/…")
        ob_form.addRow("Question ID", self.ob_qid)
        ob_form.addRow("Content", self.ob_field)
        ob_form.addRow("Link", self.ob_link)
        ob_layout.addLayout(ob_form)
        self.ob_summary = QLabel("")
        self.ob_summary.setWordWrap(True)
        self.ob_summary.setStyleSheet("font-size: 11px; color: #0369a1;")
        ob_layout.addWidget(self.ob_summary)
        layout.addWidget(self.ob_panel)
        self.ob_panel.setVisible(False)

        # ── ROCK (always visible, compact) ────────────────────────
        rock_panel = QFrame()
        rock_panel.setObjectName("rockPanel")
        rock_panel.setStyleSheet(
            "QFrame#rockPanel { background: #f8fafc; border: 1px solid #e2e8f0; "
            "border-radius: 8px; }"
        )
        rock_form = QFormLayout(rock_panel)
        rock_form.setContentsMargins(9, 8, 9, 8)
        self.rock_field = QLineEdit()
        self.rock_field.setPlaceholderText("ROCK chapter / notes")
        self.rock_link = QLineEdit()
        self.rock_link.setPlaceholderText("ROCK URL (optional)")
        rock_form.addRow("ROCK", self.rock_field)
        rock_form.addRow("Link", self.rock_link)
        layout.addWidget(rock_panel)

        layout.addWidget(self._section_label("Submission"))
        self.notes = QPlainTextEdit()
        self.notes.setPlaceholderText("Optional note for this proposal…")
        self.notes.setMaximumHeight(64)
        layout.addWidget(self.notes)

        self.submit_btn = QPushButton("Submit enrichment")
        self.submit_btn.clicked.connect(self._submit)
        self.submit_btn.setEnabled(False)
        self.submit_btn.setStyleSheet(
            "QPushButton { background: #0369a1; color: white; border: none; "
            "border-radius: 6px; min-height: 32px; font-weight: 700; }"
            "QPushButton:disabled { background: #cbd5e1; }"
        )
        layout.addWidget(self.submit_btn)

        self.open_button = QPushButton("Full workspace…")
        self.open_button.clicked.connect(self.open)
        self.open_button.setEnabled(False)
        layout.addWidget(self.open_button)

        layout.addStretch(1)
        scroll.setWidget(body)
        outer_layout.addWidget(scroll)
        self.dock.setWidget(outer)
        mw.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.dock)
        self.dock.hide()

    def _on_ob_toggled(self, checked: bool):
        self.ob_panel.setVisible(checked)
        self.ob_toggle.setText("▾ Orthobullets" if checked else "▸ Orthobullets")
        self._refresh_ob_summary()

    def _refresh_ob_summary(self):
        """Collapsed one-line summary of OB fields so values stay visible when closed."""
        parts = []
        qid = self.ob_qid.text().strip()
        if qid:
            parts.append(f"QID {qid}")
        has_content = bool(self.ob_field.toPlainText().strip() or self.ob_link.text().strip())
        if has_content and not parts:
            parts.append("content set")
        if parts and not self.ob_toggle.isChecked():
            self.ob_summary.setText(" · ".join(parts))
            # summary lives inside panel — also mirror on toggle tooltip
            self.ob_toggle.setToolTip(" · ".join(parts))
        else:
            self.ob_toggle.setToolTip("Click to expand Orthobullets fields")
            if self.ob_toggle.isChecked():
                self.ob_summary.setText("Tag level / importance / QID when you submit.")
            else:
                self.ob_summary.setText("")

    @staticmethod
    def _section_label(text: str):
        from aqt.qt import QLabel

        lab = QLabel(text)
        lab.setStyleSheet(
            "font-size: 11px; font-weight: 700; letter-spacing: 0.04em; "
            "text-transform: uppercase; color: #0369a1; margin-top: 6px;"
        )
        return lab

    def update(self, card):
        # Anki emits both show-question and show-answer for the same card. Keep
        # accepted KG state and in-progress edits intact when Space reveals it.
        card_key = (card.note().guid, card.ord) if card else None
        if card_key is not None and card_key == self._card_key:
            return
        self._card_key = card_key
        self.card = card
        self.resolution = None
        self.mapping_changes = []
        self.kg_drafts = []
        self.kg_improvement = None
        self.kg_suggestion_id = None
        self._clear_kg_draft_ui()
        self._current_fields = {}
        self._current_tags = []
        self.mapping_summary.setText("")
        self.kg_evidence.setText("")
        self.kg_evidence.setVisible(False)
        self.improvement_card.setVisible(False)
        self.kg_gap_label.setText("")
        self.kg_gap_label.setVisible(False)
        self.review_gaps_btn.setVisible(False)
        self.kg_refine.setVisible(False)
        self.resuggest_btn.setVisible(False)
        self.confirm_kg_btn.setVisible(False)
        self.kg_refine.clear()
        self.suggest_btn.setEnabled(False)
        self.resuggest_btn.setEnabled(False)
        self.confirm_kg_btn.setEnabled(False)
        self.notes.clear()
        self.ob_qid.clear()
        self.ob_level.setCurrentIndex(0)
        self.ob_importance.setCurrentIndex(0)
        self.ob_field.clear()
        self.ob_link.clear()
        self.rock_field.clear()
        self.rock_link.clear()
        self.ob_toggle.setChecked(False)
        self.ob_panel.setVisible(False)
        self.ob_toggle.setText("▸ Orthobullets")
        self.submit_btn.setEnabled(False)

        if not card:
            self.dock.hide()
            self.open_button.setEnabled(False)
            return
        self.dock.show()
        self.open_button.setEnabled(True)
        self.state.setText("Resolving master card…")
        self.mappings_label.setText("")

        from .anki_runtime import CollectionGateway

        self._gateway = CollectionGateway(self.runtime.mw.col)
        fields, tags, _deck = self._gateway.editable(card)
        self._current_fields = {f["name"]: f["value"] for f in fields}
        self._current_tags = list(tags or [])

        # Prefill resources + structured tags
        self.ob_field.setPlainText(self._current_fields.get("Orthobullets", "")[:4000])
        self.ob_link.setText(self._current_fields.get("Orthobullets_Link", "")[:500])
        self.rock_field.setText(self._current_fields.get("ROCK", "")[:500])
        self.rock_link.setText(self._current_fields.get("ROCK_Link", "")[:500])
        self.ob_level.setCurrentText(label_for_tag(LEVEL_OPTIONS, self._current_tags))
        self.ob_importance.setCurrentText(label_for_tag(IMPORTANCE_OPTIONS, self._current_tags))
        self.ob_qid.setText(parse_ob_question_id(self._current_tags))
        # Auto-expand if any OB data already present
        has_ob = bool(
            self.ob_field.toPlainText().strip()
            or self.ob_link.text().strip()
            or self.ob_qid.text().strip()
        )
        if has_ob:
            self.ob_toggle.setChecked(True)
        self._refresh_ob_summary()

        identity = {
            "noteGuid": card.note().guid,
            "cardOrdinal": card.ord,
            "contentHash": self._gateway.content_hash(card),
        }

        def done(future):
            if self._card_key != card_key:
                return
            try:
                _, body = future.result()
                self.resolution = body
                self.state.setText(side_panel_status(body))
                self._render_mappings(body)
                hints = body.get("resourceHints") or {}
                if not self.ob_field.toPlainText().strip() and hints.get("Orthobullets"):
                    self.ob_field.setPlainText(str(hints["Orthobullets"])[:4000])
                if not self.ob_link.text().strip() and hints.get("Orthobullets_Link"):
                    self.ob_link.setText(str(hints["Orthobullets_Link"])[:500])
                if not self.rock_field.text().strip() and hints.get("ROCK"):
                    self.rock_field.setText(str(hints["ROCK"])[:500])
                if not self.rock_link.text().strip() and hints.get("ROCK_Link"):
                    self.rock_link.setText(str(hints["ROCK_Link"])[:500])
                # Prefer server central tags for level/importance when local empty
                server_tags = body.get("centralTags") or []
                if self.ob_level.currentText() == "—" and server_tags:
                    self.ob_level.setCurrentText(label_for_tag(LEVEL_OPTIONS, server_tags))
                if self.ob_importance.currentText() == "—" and server_tags:
                    self.ob_importance.setCurrentText(
                        label_for_tag(IMPORTANCE_OPTIONS, server_tags)
                    )
                if not self.ob_qid.text().strip() and server_tags:
                    self.ob_qid.setText(parse_ob_question_id(server_tags))
                self._refresh_ob_summary()
                ready = bool(body.get("found") or body.get("identityResolved"))
                self.submit_btn.setEnabled(ready)
                self.suggest_btn.setEnabled(ready)
                self.resuggest_btn.setEnabled(ready)
                if ready and body.get("found"):
                    self._analyze_kg_background()
            except Exception as error:
                from .errors import describe, headline

                self.state.setText(f"{headline(error)}\n{describe(error)}")
                self.submit_btn.setEnabled(False)
                self.suggest_btn.setEnabled(False)
                self.resuggest_btn.setEnabled(False)
                self.confirm_kg_btn.setEnabled(False)

        self.runtime.background(
            lambda: self.runtime.api.resolve_workspace_card(identity), done
        )

    def _render_mappings(self, body: dict):
        maps = body.get("mappings") or []
        if not maps:
            self.mappings_label.setText("Linked concepts: none yet")
            return
        lines = [
            f"• {m.get('label') or m.get('canonicalEntityId')} ({m.get('entityType') or 'entity'})"
            for m in maps[:8]
        ]
        more = f"\n… +{len(maps) - 8} more" if len(maps) > 8 else ""
        self.mappings_label.setText("Linked concepts:\n" + "\n".join(lines) + more)

    def _clear_kg_draft_ui(self):
        while self.kg_draft_layout.count():
            item = self.kg_draft_layout.takeAt(0)
            w = item.widget()
            if w is not None:
                w.deleteLater()
        self.kg_checkboxes = []
        self.kg_role_combos = []

    def _render_kg_drafts(self, suggestions: list[dict]):
        from aqt.qt import QCheckBox, QComboBox, QHBoxLayout, QLabel, QWidget

        self._clear_kg_draft_ui()
        self.kg_drafts = list(suggestions or [])
        if not self.kg_drafts:
            from aqt.qt import QLabel

            empty = QLabel("No drafts. Try a refine comment and Re-suggest.")
            empty.setWordWrap(True)
            empty.setStyleSheet("font-size: 11px; color: #6b7280;")
            self.kg_draft_layout.addWidget(empty)
            self.confirm_kg_btn.setEnabled(False)
            self.kg_refine.setVisible(True)
            self.resuggest_btn.setVisible(True)
            return
        for s in self.kg_drafts:
            kind = s.get("kind") or "link_existing"
            if kind == "link_existing":
                text = f"Link “{s.get('label') or s.get('canonicalEntityId')}” ({s.get('entityType') or 'entity'})"
            elif kind == "new_entity":
                text = f"New entity “{s.get('preferredLabel')}” ({s.get('entityTypeProposed') or 'concept'})"
            elif kind == "new_alias":
                text = f"New alias “{s.get('preferredLabel')}”"
            elif kind == "no_mapping":
                text = "Record that no governed concept matches"
            else:
                text = str(kind)
            cb = QCheckBox(text)
            cb.setChecked(bool(s.get("defaultSelected")))
            cb.setStyleSheet("font-size: 12px;")
            row = QWidget()
            row_layout = QHBoxLayout(row)
            row_layout.setContentsMargins(0, 0, 0, 0)
            row_layout.addWidget(cb, 1)
            role_combo = None
            if kind == "link_existing":
                role_combo = QComboBox()
                role_combo.addItems(KG_MAPPING_ROLES)
                role_combo.setCurrentText(s.get("mappingRole") or "teaches")
                role_combo.setToolTip("How this card relates to the concept")
                row_layout.addWidget(role_combo)
            elif kind == "no_mapping":
                detail = QLabel("No live KG change")
                detail.setStyleSheet("font-size: 10px; color: #6b7280;")
                row_layout.addWidget(detail)
            self.kg_draft_layout.addWidget(row)
            self.kg_checkboxes.append(cb)
            self.kg_role_combos.append(role_combo)
        self.confirm_kg_btn.setEnabled(True)
        self.kg_refine.setVisible(True)
        self.resuggest_btn.setVisible(True)
        self.confirm_kg_btn.setVisible(True)
        self.mapping_summary.setText(
            "Review the result, adjust its relationship if needed, then confirm."
        )

    def _render_kg_evidence(self, evidence: dict):
        stem = (evidence or {}).get("stem") or ""
        answers = (evidence or {}).get("answerConcepts") or []
        if not stem and not answers:
            self.kg_evidence.setVisible(False)
            return
        summary = "Card understood"
        if answers:
            summary += f" · {len(answers)} answer concept(s)"
        self.kg_evidence.setText(f"✓ {summary}")
        details = []
        if stem:
            details.append(f"Focus: {stem}")
        if answers:
            details.append("Answers: " + "; ".join(str(answer) for answer in answers[:8]))
        self.kg_evidence.setToolTip("\n".join(details))
        self.kg_evidence.setVisible(True)

    def _render_kg_gaps(self, gaps: list[dict]):
        phrases = [str(g.get("phrase") or "").strip() for g in (gaps or [])]
        phrases = [phrase for phrase in phrases if phrase]
        if not phrases:
            self.kg_gap_label.setVisible(False)
            self.review_gaps_btn.setVisible(False)
            return
        self.kg_gap_label.setText(
            "Possible ontology gaps\n• " + "\n• ".join(phrases[:8])
        )
        self.kg_gap_label.setVisible(True)
        self.review_gaps_btn.setVisible(True)

    def _analyze_kg_background(self):
        if not self.card or not self.resolution or not self.resolution.get("found"):
            return
        payload = {
            "contractVersion": "snaportho-anki-kg-analyze.v1",
            "localIdentity": self._local_identity(),
            "clientVersion": ADDON_VERSION,
        }
        self.kg_evidence.setText("Understanding card…")
        self.kg_evidence.setVisible(True)
        identity = (
            payload["localIdentity"]["noteGuid"],
            payload["localIdentity"]["cardOrdinal"],
        )

        def done(future):
            if not self.card:
                return
            current = (self.card.note().guid, self.card.ord)
            if current != identity:
                return
            try:
                _, body = future.result()
                self._render_kg_evidence(body.get("cardEvidence") or {})
            except Exception:
                # Background understanding must never interrupt review.
                self.kg_evidence.setText("Card analysis will run with KG suggestions")
                self.kg_evidence.setVisible(True)

        self.runtime.background(lambda: self.runtime.api.kg_analyze(payload), done)

    def _suggest_kg(self):
        self._run_kg_draft(refine=False)

    def _suggest_improvement(self):
        if not self.card or not self.resolution or not self.resolution.get("found"):
            self.mapping_summary.setText("This card must resolve to the master deck first.")
            return
        key = str(uuid.uuid4())
        payload = {
            "contractVersion": "snaportho-anki-kg-improvement-request.v1",
            "localIdentity": self._local_identity(),
            "idempotencyKey": key,
            "clientVersion": ADDON_VERSION,
        }
        self.suggest_btn.setEnabled(False)
        self.suggest_btn.setText("Building a safe graph improvement…")
        self.improvement_card.setVisible(False)
        self.mapping_summary.setText(
            "Comparing this card with existing entities, claims, aliases, and mappings…"
        )

        def done(future):
            self.suggest_btn.setEnabled(True)
            self.suggest_btn.setText("Suggest KG improvements")
            try:
                _, body = future.result()
                self.kg_suggestion_id = body.get("suggestionId")
                self.kg_improvement = body.get("improvement") or {}
                self._render_improvement(self.kg_improvement)
            except Exception as error:
                from .errors import describe, headline

                self.mapping_summary.setText(f"{headline(error)} — {describe(error)}")

        self.runtime.background(
            lambda: self.runtime.api.kg_suggest_improvement(payload, key), done
        )

    def _render_improvement(self, improvement: dict):
        self.improvement_title.setText(
            improvement.get("title") or "Suggested knowledge-graph improvement"
        )
        self.improvement_summary.setText(
            improvement.get("summary") or "No safe graph change was found."
        )
        operations = improvement.get("operations") or []
        tier_labels = {
            "streamlined": "Existing mapping review",
            "clinical_review": "Clinical review required",
            "ontology_review": "Ontology review required",
        }
        tier = tier_labels.get(
            improvement.get("reviewTier"), "Independent review required"
        )
        self.improvement_meta.setText(
            f"{len(operations)} proposed graph change(s) · {tier} · "
            "nothing changes the live graph yet"
        )
        can_submit = bool(improvement.get("canSubmit"))
        self.accept_improvement_btn.setEnabled(can_submit)
        self.review_improvement_btn.setEnabled(bool(operations))
        self.improvement_card.setVisible(True)
        next_layer = improvement.get("nextRequiredLayer") or {}
        if next_layer:
            self.mapping_summary.setText(
                f"Hierarchy first · {next_layer.get('reason') or 'Resolve the parent chain before adding leaf facts.'} "
                "Open Full workspace to search for the subject and its governed parent."
            )
        else:
            self.mapping_summary.setText(
                "Check the plain-language recommendation. Open details only if you want "
                "to inspect individual graph changes and safety checks."
            )

    def _show_improvement_details(self):
        if not self.kg_improvement:
            return
        from aqt.qt import (
            QDialog,
            QFrame,
            QHBoxLayout,
            QLabel,
            QPushButton,
            QScrollArea,
            Qt,
            QVBoxLayout,
            QWidget,
        )

        dialog = QDialog(self.dock)
        dialog.setWindowTitle("Knowledge graph improvement details")
        dialog.resize(720, 620)
        dialog.setMinimumSize(620, 500)
        dialog.setStyleSheet(
            "QDialog { background: #f8fafc; }"
            "QLabel#detailTitle { font-size: 19px; font-weight: 700; color: #0f172a; }"
            "QLabel#detailSubtitle { color: #64748b; font-size: 12px; }"
            "QLabel#sectionHeading { font-size: 12px; font-weight: 700; "
            "color: #0369a1; margin-top: 8px; }"
            "QFrame#operationCard, QFrame#gateCard { background: white; "
            "border: 1px solid #e2e8f0; border-radius: 8px; }"
            "QPushButton { min-height: 30px; padding: 2px 18px; }"
        )
        layout = QVBoxLayout(dialog)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(8)
        title = QLabel(self.kg_improvement.get("title") or "Graph improvement")
        title.setObjectName("detailTitle")
        title.setWordWrap(True)
        layout.addWidget(title)
        subtitle = QLabel(
            "Review the exact changes SnapOrtho would send through independent "
            "clinical or ontology review."
        )
        subtitle.setObjectName("detailSubtitle")
        subtitle.setWordWrap(True)
        layout.addWidget(subtitle)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        body = QWidget()
        body_layout = QVBoxLayout(body)
        body_layout.setContentsMargins(2, 2, 8, 2)
        body_layout.setSpacing(8)

        hierarchy_heading = QLabel("GOVERNED HIERARCHY")
        hierarchy_heading.setObjectName("sectionHeading")
        body_layout.addWidget(hierarchy_heading)
        subject = self.kg_improvement.get("subject") or {}
        hierarchy_path = subject.get("hierarchyPath") or []
        next_layer = self.kg_improvement.get("nextRequiredLayer") or {}
        hierarchy_card = QFrame()
        hierarchy_card.setObjectName("gateCard")
        hierarchy_layout = QVBoxLayout(hierarchy_card)
        hierarchy_layout.setContentsMargins(11, 9, 11, 10)
        if hierarchy_path:
            path_label = QLabel(
                " → ".join(str(node.get("label") or "Unnamed") for node in hierarchy_path)
            )
            path_label.setStyleSheet("font-size:13px;font-weight:700;color:#0f766e;")
            hierarchy_layout.addWidget(path_label)
        else:
            next_label = QLabel(
                f"Start here: {next_layer.get('label') or 'Resolve card subject'}"
            )
            next_label.setStyleSheet("font-size:13px;font-weight:700;color:#9a3412;")
            hierarchy_layout.addWidget(next_label)
        hierarchy_reason = QLabel(
            next_layer.get("reason")
            or "This subject is attached to a governed hierarchy before detailed claims are added."
        )
        hierarchy_reason.setWordWrap(True)
        hierarchy_reason.setStyleSheet("font-size:11px;color:#475569;")
        hierarchy_layout.addWidget(hierarchy_reason)
        body_layout.addWidget(hierarchy_card)

        change_heading = QLabel("PROPOSED GRAPH CHANGES")
        change_heading.setObjectName("sectionHeading")
        body_layout.addWidget(change_heading)
        operations = self.kg_improvement.get("operations") or []
        if not operations:
            deferred = QLabel(
                "No leaf fact will be proposed yet. Complete the hierarchy step above first."
            )
            deferred.setWordWrap(True)
            deferred.setStyleSheet(
                "background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;"
                "padding:10px;color:#9a3412;font-weight:600;"
            )
            body_layout.addWidget(deferred)
        for operation in operations:
            risk = str(operation.get("risk") or "review").replace("_", " ")
            kind_labels = {
                "add_asset_mapping": "CARD CONNECTION",
                "propose_claim": "TEACHING FACT",
                "propose_entity": "ENTITY REVIEW",
            }
            risk_colors = {
                "low": ("#ecfdf5", "#047857"),
                "medium": ("#fff7ed", "#c2410c"),
                "high": ("#fef2f2", "#b91c1c"),
            }
            background, foreground = risk_colors.get(
                str(operation.get("risk") or ""), ("#f1f5f9", "#475569")
            )
            card = QFrame()
            card.setObjectName("operationCard")
            card_layout = QVBoxLayout(card)
            card_layout.setContentsMargins(11, 9, 11, 10)
            header = QHBoxLayout()
            kind = QLabel(
                kind_labels.get(
                    operation.get("kind"),
                    str(operation.get("kind") or "GRAPH CHANGE").upper(),
                )
            )
            kind.setStyleSheet(
                "font-size:10px;font-weight:700;color:#0369a1;letter-spacing:0.04em;"
            )
            risk_badge = QLabel(f"{risk.upper()} RISK")
            risk_badge.setStyleSheet(
                f"background:{background};color:{foreground};border-radius:8px;"
                "padding:2px 7px;font-size:9px;font-weight:700;"
            )
            header.addWidget(kind)
            header.addStretch(1)
            header.addWidget(risk_badge)
            card_layout.addLayout(header)
            statement = QLabel(operation.get("statement") or "Unnamed graph change")
            statement.setWordWrap(True)
            statement.setStyleSheet("font-size:13px;font-weight:600;color:#1e293b;")
            card_layout.addWidget(statement)
            evidence = QLabel(
                f"Evidence from card: {operation.get('evidence') or 'not provided'}"
            )
            evidence.setWordWrap(True)
            evidence.setStyleSheet("font-size:11px;color:#64748b;")
            card_layout.addWidget(evidence)
            body_layout.addWidget(card)

        gate_heading = QLabel("SAFETY CHECKS")
        gate_heading.setObjectName("sectionHeading")
        body_layout.addWidget(gate_heading)
        for gate in self.kg_improvement.get("qualityGates") or []:
            decision = str(gate.get("decision") or "review")
            icons = {"pass": "✓", "review": "!", "block": "×"}
            colors = {
                "pass": ("#ecfdf5", "#047857"),
                "review": ("#fff7ed", "#c2410c"),
                "block": ("#fef2f2", "#b91c1c"),
            }
            background, foreground = colors.get(decision, ("#f1f5f9", "#475569"))
            gate_card = QFrame()
            gate_card.setObjectName("gateCard")
            gate_layout = QHBoxLayout(gate_card)
            gate_layout.setContentsMargins(9, 7, 9, 7)
            icon = QLabel(icons.get(decision, "•"))
            icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
            icon.setFixedSize(22, 22)
            icon.setStyleSheet(
                f"background:{background};color:{foreground};border-radius:11px;"
                "font-weight:700;"
            )
            reason = QLabel(gate.get("reason") or gate.get("gate") or "Safety check")
            reason.setWordWrap(True)
            reason.setStyleSheet("font-size:11px;color:#334155;")
            gate_layout.addWidget(icon)
            gate_layout.addWidget(reason, 1)
            body_layout.addWidget(gate_card)
        body_layout.addStretch(1)
        scroll.setWidget(body)
        layout.addWidget(scroll, 1)

        footer = QHBoxLayout()
        footer_note = QLabel("No live graph change occurs from this screen.")
        footer_note.setStyleSheet("font-size:10px;color:#64748b;")
        close = QPushButton("Close")
        close.clicked.connect(dialog.accept)
        footer.addWidget(footer_note)
        footer.addStretch(1)
        footer.addWidget(close)
        layout.addLayout(footer)
        dialog.exec()

    def _decide_improvement(self, decision: str):
        if not self.kg_improvement or not self.kg_suggestion_id:
            return
        key = str(uuid.uuid4())
        payload = {
            "contractVersion": "snaportho-anki-kg-improvement-decision.v1",
            "suggestionId": self.kg_suggestion_id,
            "improvementId": self.kg_improvement.get("improvementId"),
            "decision": decision,
            "notes": self.notes.toPlainText().strip(),
            "idempotencyKey": key,
            "clientVersion": ADDON_VERSION,
        }
        self.accept_improvement_btn.setEnabled(False)
        self.reject_improvement_btn.setEnabled(False)

        def done(future):
            try:
                _, body = future.result()
                if body.get("decision") == "accept":
                    self.improvement_summary.setText(
                        "✓ Improvement accepted and queued for independent review. "
                        "The live graph has not changed."
                    )
                else:
                    self.improvement_summary.setText(
                        "Feedback recorded. No graph change was queued."
                    )
                self.review_improvement_btn.setEnabled(False)
                self.mapping_summary.setText("")
            except Exception as error:
                from .errors import describe, headline

                self.accept_improvement_btn.setEnabled(
                    bool(self.kg_improvement.get("canSubmit"))
                )
                self.reject_improvement_btn.setEnabled(True)
                self.mapping_summary.setText(f"{headline(error)} — {describe(error)}")

        self.runtime.background(
            lambda: self.runtime.api.kg_improvement_decision(payload, key), done
        )

    def _resuggest_kg(self):
        self._run_kg_draft(refine=True)

    def _run_kg_draft(self, refine: bool):
        if not self.card or not self.resolution or not self.resolution.get("found"):
            self.state.setText("Resolve a master card first.")
            return
        comment = self.kg_refine.toPlainText().strip() if refine else ""
        if refine and len(comment) < 2:
            self.state.setText("Add a short comment to re-suggest.")
            return
        payload = {
            "contractVersion": "snaportho-anki-kg-draft.v1",
            "localIdentity": self._local_identity(),
            "refineComment": comment,
            "clientVersion": ADDON_VERSION,
        }
        self.suggest_btn.setEnabled(False)
        self.resuggest_btn.setEnabled(False)
        self.suggest_btn.setText("Checking the knowledge graph…")
        self.mapping_summary.setText("Comparing card concepts with governed entities and aliases…")

        def done(future):
            self.suggest_btn.setEnabled(True)
            self.resuggest_btn.setEnabled(True)
            self.suggest_btn.setText("Suggest KG improvements")
            try:
                _, body = future.result()
                suggestions = body.get("suggestions") or []
                self._render_kg_gaps(body.get("ontologyGaps") or [])
                self._render_kg_drafts(suggestions)
                links = [s for s in suggestions if s.get("kind") == "link_existing"]
                if links:
                    self.mapping_summary.setText(
                        f"Found {len(links)} possible existing concept(s). Nothing changes until reviewed."
                    )
                else:
                    self.mapping_summary.setText(
                        "No governed entity matched. The detected card concepts are shown above; "
                        "record this outcome or use Full workspace to search/propose an ontology gap."
                    )
            except Exception as error:
                from .errors import describe, headline

                self.state.setText(f"{headline(error)}\n{describe(error)}")

        self.runtime.background(lambda: self.runtime.api.kg_draft(payload), done)

    def _confirm_kg(self):
        if not self.card or not self.resolution or not self.resolution.get("found"):
            self.state.setText("Resolve a master card first.")
            return
        accepted = []
        for s, cb, role_combo in zip(
            self.kg_drafts, self.kg_checkboxes, self.kg_role_combos
        ):
            if cb.isChecked():
                accepted_draft = dict(s)
                if role_combo is not None:
                    accepted_draft["mappingRole"] = role_combo.currentText()
                accepted.append(accepted_draft)
        if not accepted:
            self.state.setText("Select at least one draft to confirm.")
            return
        import uuid as _uuid

        payload = {
            "contractVersion": "snaportho-anki-kg-confirm.v1",
            "localIdentity": self._local_identity(),
            "baseCard": {
                "canonicalCardId": self.resolution["canonicalCardId"],
                "canonicalCardVersionId": self.resolution["canonicalCardVersionId"],
                "contentHash": self.resolution["contentHash"],
            },
            "accepted": accepted,
            "refineComment": self.kg_refine.toPlainText().strip(),
            "notes": self.notes.toPlainText().strip(),
            "idempotencyKey": str(_uuid.uuid4()),
            "clientVersion": ADDON_VERSION,
        }
        key = payload["idempotencyKey"]
        self.confirm_kg_btn.setEnabled(False)
        self.state.setText("Submitting confirmed KG drafts…")

        def done(future):
            self.confirm_kg_btn.setEnabled(True)
            try:
                _, body = future.result()
                if body.get("outcomeRecorded"):
                    self.state.setText(
                        "✓ No-mapping review recorded. The live graph was not changed."
                    )
                else:
                    pid = body.get("proposalId") or "ok"
                    self.state.setText(
                        f"✓ KG proposal submitted ({pid}). Pending adjudication — graph not updated yet."
                    )
                self._clear_kg_draft_ui()
                self.kg_drafts = []
                self.mapping_summary.setText("Drafts confirmed.")
            except Exception as error:
                from .errors import describe, headline

                self.state.setText(f"{headline(error)}\n{describe(error)}")

        self.runtime.background(lambda: self.runtime.api.kg_confirm(payload, key), done)

    def _local_identity(self):
        note = self.card.note()
        return {
            "noteGuid": note.guid,
            "cardOrdinal": self.card.ord,
            "contentHash": self._gateway.content_hash(self.card),
        }

    def _submit(self):
        if not self.card or not self.resolution:
            self.state.setText("Wait for card resolution.")
            return
        if not self.resolution.get("found"):
            self.state.setText("Card not in master — use Full workspace to propose a new card.")
            return

        self._refresh_ob_summary()
        edited = build_enrichment_edited_fields(
            self._current_fields,
            orthobullets=self.ob_field.toPlainText(),
            orthobullets_link=self.ob_link.text(),
            rock=self.rock_field.text(),
            rock_link=self.rock_link.text(),
        )
        # Merge local tags with server central tags for managed-namespace baseline
        baseline_tags = list(
            dict.fromkeys(
                list(self._current_tags) + list(self.resolution.get("centralTags") or [])
            )
        )
        tag_changes = build_enrichment_tag_changes(
            baseline_tags,
            level_label=self.ob_level.currentText(),
            importance_label=self.ob_importance.currentText(),
            ob_question_id=self.ob_qid.text(),
        )
        has_tags = bool(tag_changes["add"] or tag_changes["remove"])
        if (
            not edited
            and not self.mapping_changes
            and not self.notes.toPlainText().strip()
            and not has_tags
        ):
            self.state.setText(
                "Nothing to submit — expand Orthobullets, add level/importance/QID, KG, or a note."
            )
            return

        payload = build_enrichment_proposal_payload(
            self.resolution,
            self._local_identity(),
            edited_fields=edited,
            mapping_changes=list(self.mapping_changes),
            notes=self.notes.toPlainText().strip(),
            central_tag_changes=tag_changes,
        )
        key = payload["idempotencyKey"]
        self.submit_btn.setEnabled(False)
        self.state.setText("Submitting enrichment proposal…")

        def done(future):
            try:
                _, body = future.result()
                self.mapping_changes = []
                self.mapping_summary.setText("No new mappings staged.")
                pid = body.get("proposalId") or body.get("id") or "ok"
                self.state.setText(f"✓ Submitted ({pid}). No canonical data changed yet.")
            except Exception as error:
                from .errors import describe, headline

                self.state.setText(f"{headline(error)}\n{describe(error)}")
            finally:
                self.submit_btn.setEnabled(True)

        self.runtime.background(
            lambda: self.runtime.api.submit_workspace_proposal(payload, key), done
        )

    def open(self):
        if self.card:
            self.runtime.open_card_workspace(self.card, "reviewer")

    def close(self):
        self.dock.close()
        self.dock.deleteLater()
