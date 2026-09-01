"""SnapOrtho Master Deck hub — first-run onboarding + updates.

States:
  A) Not linked → link device
  B) Linked, deck not in this profile → download starter .apkg
  C) Linked, deck present (markers, SnapOrtho Master notetype, v2 cursor, or GUID probe) → v2 updates
  D) Typed errors with honest copy
"""
from __future__ import annotations

import hashlib
import json
import os
import tempfile
import time
import urllib.request

from .errors import describe, headline
from .sync import (
    GUID_PROBE_SAMPLE,
    chunk_list,
    guid_probe_indicates_install,
    installed_card_inventory,
    installed_deck_presence,
    local_guid_hits,
    merge_sync_plan_actions,
)

STEP_LINK, STEP_INSTALL, STEP_UPDATE = 1, 2, 3


def stream_download_to_part(url, part_path, timeout, expected_size=None, progress=None):
    """Download with HTTP Range resume and return (sha256, bytes_written)."""
    existing = os.path.getsize(part_path) if os.path.isfile(part_path) else 0
    if expected_size and existing > expected_size:
        os.remove(part_path)
        existing = 0

    digest = hashlib.sha256()
    if progress:
        progress(existing, expected_size)
    if existing:
        with open(part_path, "rb") as current:
            while True:
                chunk = current.read(1024 * 1024)
                if not chunk:
                    break
                digest.update(chunk)
        if expected_size and existing == expected_size:
            return digest.hexdigest(), existing

    headers = {"User-Agent": "SnapOrtho-Anki-Addon"}
    if existing:
        headers["Range"] = f"bytes={existing}-"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        status = getattr(response, "status", None) or response.getcode()
        resumed = existing > 0 and status == 206
        if existing and not resumed:
            existing = 0
            digest = hashlib.sha256()
        mode = "ab" if resumed else "wb"
        written = existing
        with open(part_path, mode) as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)
                digest.update(chunk)
                written += len(chunk)
                if progress:
                    progress(written, expected_size)
    return digest.hexdigest(), written


def format_download_size(value):
    value = max(0, int(value or 0))
    if value >= 1024 * 1024 * 1024:
        return f"{value / (1024 * 1024 * 1024):.2f} GB"
    if value >= 1024 * 1024:
        return f"{value / (1024 * 1024):.1f} MB"
    if value >= 1024:
        return f"{value / 1024:.1f} KB"
    return f"{value} B"

HUB_STYLE = """
QDialog { background: #f6f7f9; }
QLabel#title { font-size: 20px; font-weight: 700; color: #111827; }
QLabel#subtitle { color: #4b5563; font-size: 13px; }
QFrame#stepCard {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 4px;
}
QFrame#stepCard[active="true"] {
  border: 2px solid #2563eb;
  background: #eff6ff;
}
QFrame#stepCard[done="true"] {
  border: 1px solid #86efac;
  background: #f0fdf4;
}
QFrame#stepCard[disabled="true"] {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}
QLabel#stepTitle { font-size: 14px; font-weight: 600; color: #111827; }
QLabel#stepBody { color: #4b5563; font-size: 12px; }
QLabel#badge {
  background: #e5e7eb;
  color: #374151;
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 11px;
}
QLabel#badgeLinked {
  background: #d1fae5;
  color: #065f46;
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
}
QLabel#badgeWarn {
  background: #fef3c7;
  color: #92400e;
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
}
QLabel#hero {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  font-size: 13px;
  color: #1f2937;
}
QLabel#heroOk {
  background: #ecfdf5;
  border: 1px solid #6ee7b7;
  border-radius: 10px;
  padding: 14px;
  font-size: 13px;
  color: #065f46;
}
QLabel#heroInfo {
  background: #eff6ff;
  border: 1px solid #93c5fd;
  border-radius: 10px;
  padding: 14px;
  font-size: 13px;
  color: #1e3a8a;
}
QPushButton#primary {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 600;
  min-height: 20px;
}
QPushButton#primary:disabled { background: #93c5fd; color: #e5e7eb; }
QPushButton#primary:hover { background: #1d4ed8; }
QPushButton#secondary {
  background: white;
  color: #1f2937;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 14px;
}
QPushButton#secondary:hover { background: #f9fafb; }
QPushButton#ghost {
  background: transparent;
  color: #4b5563;
  border: none;
  padding: 8px 10px;
}
QProgressBar#deckDownloadProgress {
  min-height: 8px;
  max-height: 8px;
  border: none;
  border-radius: 4px;
  background: #dbeafe;
}
QProgressBar#deckDownloadProgress::chunk {
  background: #2563eb;
  border-radius: 4px;
}
QLabel#downloadProgressLabel {
  color: #475569;
  font-size: 11px;
  padding-top: 2px;
}
"""


def has_master_markers(col) -> bool:
    return bool(installed_card_inventory(col))


def has_installed_master_deck(col, store=None) -> bool:
    return bool(installed_deck_presence(col, store).get("installed"))


def plan_counts(plan) -> dict:
    counts = {}
    for action in (plan or {}).get("actions", []):
        kind = action.get("action")
        counts[kind] = counts.get(kind, 0) + 1
    return counts


def v2_content_summary(operations) -> dict:
    """Describe user-visible final content, not internal delta operation kinds."""
    latest_tags = {}
    updated_notes = set()
    media_assets = set()
    for operation in operations or []:
        kind = operation.get("operation")
        note_id = operation.get("noteId")
        payload = operation.get("payload") or {}
        if note_id and kind in ("upsert_note", "update_tags"):
            updated_notes.add(note_id)
        if note_id and "governedTags" in payload:
            latest_tags[note_id] = set(payload.get("governedTags") or [])
        if kind == "media_add":
            media_assets.add(payload.get("sha256") or payload.get("filename"))
    latest_tags.pop(None, None)
    return {
        "updatedNotes": len(updated_notes),
        "taggedNotes": sum(bool(tags) for tags in latest_tags.values()),
        "managedTagAssignments": sum(len(tags) for tags in latest_tags.values()),
        "mediaAssets": len(media_assets),
    }


class MasterDeckDialog:
    def __init__(self, parent, runtime):
        from aqt.qt import (
            QDialog,
            QFrame,
            QHBoxLayout,
            QLabel,
            QPlainTextEdit,
            QProgressBar,
            QPushButton,
            QSizePolicy,
            QVBoxLayout,
            Qt,
        )

        self.runtime = runtime
        self.plan = None
        self.release = None
        self.display_name = None
        self.last_download_path = None
        self.v2_pages = []
        self.v2_release = None
        self.v2_summary = {}
        self._busy = False

        self.dialog = QDialog(parent)
        self.dialog.setWindowTitle("SnapOrtho Master Deck")
        self.dialog.resize(760, 620)
        self.dialog.setStyleSheet(HUB_STYLE)

        root = QVBoxLayout(self.dialog)
        root.setContentsMargins(18, 16, 18, 14)
        root.setSpacing(12)

        # Header
        self.title = QLabel("SnapOrtho Master Deck")
        self.title.setObjectName("title")
        self.subtitle = QLabel("")
        self.subtitle.setObjectName("subtitle")
        self.subtitle.setWordWrap(True)
        header_row = QHBoxLayout()
        header_left = QVBoxLayout()
        header_left.addWidget(self.title)
        header_left.addWidget(self.subtitle)
        header_row.addLayout(header_left, 1)
        self.link_badge = QLabel("Checking…")
        self.link_badge.setObjectName("badge")
        self.link_badge.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.link_badge.setMaximumHeight(30)
        header_row.addWidget(self.link_badge)
        root.addLayout(header_row)

        # Step cards
        self.step_frames = {}
        self.step_titles = {}
        self.step_bodies = {}
        steps = [
            (STEP_LINK, "1 · Sign in", "Continue securely in your browser, then return to Anki automatically."),
            (STEP_INSTALL, "2 · Install Master Deck", "Download the SnapOrtho Master Deck and import it into this Anki profile."),
            (STEP_UPDATE, "3 · Stay up to date", "Check for new cards and content changes. Your scheduling and personal notes are never overwritten."),
        ]
        for key, title_text, body_text in steps:
            frame = QFrame()
            frame.setObjectName("stepCard")
            frame.setProperty("active", False)
            frame.setProperty("done", False)
            frame.setProperty("disabled", True)
            lay = QVBoxLayout(frame)
            lay.setContentsMargins(12, 10, 12, 10)
            t = QLabel(title_text)
            t.setObjectName("stepTitle")
            b = QLabel(body_text)
            b.setObjectName("stepBody")
            b.setWordWrap(True)
            lay.addWidget(t)
            lay.addWidget(b)
            self.step_frames[key] = frame
            self.step_titles[key] = t
            self.step_bodies[key] = b
            root.addWidget(frame)

        # Hero message
        self.hero = QLabel("Getting ready…")
        self.hero.setObjectName("hero")
        self.hero.setWordWrap(True)
        self.hero.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)
        root.addWidget(self.hero)

        self.download_progress = QProgressBar()
        self.download_progress.setObjectName("deckDownloadProgress")
        self.download_progress.setRange(0, 100)
        self.download_progress.setValue(0)
        self.download_progress.setTextVisible(False)
        self.download_progress.hide()
        root.addWidget(self.download_progress)
        self.download_progress_label = QLabel("")
        self.download_progress_label.setObjectName("downloadProgressLabel")
        self.download_progress_label.hide()
        root.addWidget(self.download_progress_label)

        # Actions
        actions = QHBoxLayout()
        self.primary = QPushButton("Continue")
        self.primary.setObjectName("primary")
        self.primary.clicked.connect(self._on_primary)
        self.secondary = QPushButton("Secondary")
        self.secondary.setObjectName("secondary")
        self.secondary.clicked.connect(self._on_secondary)
        self.secondary.hide()
        self.details_toggle = QPushButton("Technical details")
        self.details_toggle.setObjectName("ghost")
        self.details_toggle.clicked.connect(self._toggle_details)
        actions.addWidget(self.primary)
        actions.addWidget(self.secondary)
        actions.addStretch(1)
        actions.addWidget(self.details_toggle)
        root.addLayout(actions)

        self.details = QPlainTextEdit()
        self.details.setReadOnly(True)
        self.details.setMaximumHeight(160)
        self.details.hide()
        root.addWidget(self.details)

        footer = QHBoxLayout()
        self.footer_refresh = QPushButton("Refresh status")
        self.footer_refresh.setObjectName("secondary")
        self.footer_refresh.clicked.connect(self.refresh)
        close = QPushButton("Close")
        close.setObjectName("secondary")
        close.clicked.connect(self.dialog.accept)
        footer.addWidget(self.footer_refresh)
        footer.addStretch(1)
        footer.addWidget(close)
        root.addLayout(footer)

        self._primary_action = None
        self._secondary_action = None
        self.refresh()

    # ── state helpers ─────────────────────────────────────────────
    def _set_step(self, active=None, done=()):
        base_titles = {
            STEP_LINK: "1 · Sign in",
            STEP_INSTALL: "2 · Install Master Deck",
            STEP_UPDATE: (
                "Check and apply updates"
                if not self.step_frames[STEP_INSTALL].isVisible()
                else "3 · Stay up to date"
            ),
        }
        for key, frame in self.step_frames.items():
            is_done = key in done
            is_active = key == active and not is_done
            is_disabled = not is_done and not is_active
            frame.setProperty("done", is_done)
            frame.setProperty("active", is_active)
            frame.setProperty("disabled", is_disabled)
            frame.style().unpolish(frame)
            frame.style().polish(frame)
            base = base_titles[key]
            if is_done:
                self.step_titles[key].setText(f"✓ {base}")
            elif is_active:
                self.step_titles[key].setText(f"→ {base}")
            else:
                self.step_titles[key].setText(base)

    def _set_hero(self, text, kind="default"):
        self.hero.setText(text)
        self.hero.setObjectName(
            {"ok": "heroOk", "info": "heroInfo"}.get(kind, "hero")
        )
        self.hero.style().unpolish(self.hero)
        self.hero.style().polish(self.hero)

    def _set_actions(self, primary_label, primary_action, secondary_label=None, secondary_action=None):
        self._primary_action = primary_action
        self.primary.setText(primary_label)
        self.primary.setEnabled(primary_action is not None and not self._busy)
        self.primary.setVisible(bool(primary_label))
        if secondary_label and secondary_action:
            self._secondary_action = secondary_action
            self.secondary.setText(secondary_label)
            self.secondary.show()
            self.secondary.setEnabled(not self._busy)
        else:
            self._secondary_action = None
            self.secondary.hide()

    def _set_download_progress(self, written=0, total=None, speed=None, phase="downloading"):
        self.download_progress.show()
        self.download_progress_label.show()
        if phase == "preparing":
            self.download_progress.setRange(0, 0)
            self.download_progress_label.setText("Preparing secure download…")
            return
        if phase == "verifying":
            self.download_progress.setRange(0, 0)
            self.download_progress_label.setText(
                f"Download complete · {format_download_size(written)} · Verifying package integrity…"
            )
            return
        if total and total > 0:
            percent = min(100, int(written * 100 / total))
            self.download_progress.setRange(0, 100)
            self.download_progress.setValue(percent)
            amount = f"{format_download_size(written)} of {format_download_size(total)}"
        else:
            self.download_progress.setRange(0, 0)
            amount = format_download_size(written)
        speed_text = f" · {format_download_size(speed)}/s" if speed and speed > 0 else ""
        self.download_progress_label.setText(f"Downloading Master Deck · {amount}{speed_text}")

    def _hide_download_progress(self):
        self.download_progress.hide()
        self.download_progress_label.hide()

    def _set_update_progress(self, value, label, indeterminate=False):
        self.download_progress.show()
        self.download_progress_label.show()
        # Qt's native indeterminate bar renders as two oversized blocks on
        # macOS. Use a calm initial position until real page progress is known.
        self.download_progress.setRange(0, 100)
        shown_value = 10 if indeterminate else value
        self.download_progress.setValue(max(0, min(100, int(shown_value))))
        self.download_progress_label.setText(label)

    def _set_installed_layout(self, installed):
        self.title.setText("Master Deck Updates" if installed else "SnapOrtho Master Deck")
        self.step_frames[STEP_LINK].setVisible(not installed)
        self.step_frames[STEP_INSTALL].setVisible(not installed)
        self.step_frames[STEP_UPDATE].setVisible(not installed)
        self.footer_refresh.setVisible(not installed)
        if installed:
            self.dialog.resize(680, 360)
            self.subtitle.setText(
                "Safe, resumable note updates. Scheduling and protected fields stay local."
            )
        else:
            self.dialog.resize(760, 620)
        self.step_titles[STEP_UPDATE].setText(
            "Check and apply updates" if installed else "3 · Stay up to date"
        )

    def _toggle_details(self):
        self.details.setVisible(not self.details.isVisible())

    def _on_primary(self):
        if self._primary_action:
            self._primary_action()

    def _on_secondary(self):
        if self._secondary_action:
            self._secondary_action()

    def _is_linked(self):
        try:
            return bool(self.runtime.credentials.get())
        except Exception:
            return False

    # ── refresh / load ────────────────────────────────────────────
    def refresh(self):
        env = self.runtime.settings.environment
        self.subtitle.setText(
            "Install once, then keep your cards current without changing your scheduling."
            if env == "production"
            else f"Developer environment: {env} · {self.runtime.settings.base_url}"
        )
        self.plan = None
        self.release = None
        self._hide_download_progress()
        linked = self._is_linked()
        if not linked:
            self.link_badge.setText("Not linked")
            self.link_badge.setObjectName("badgeWarn")
            self.link_badge.style().unpolish(self.link_badge)
            self.link_badge.style().polish(self.link_badge)
            self._show_unlinked()
            return

        self.link_badge.setText("Linked")
        self.link_badge.setObjectName("badgeLinked")
        self.link_badge.style().unpolish(self.link_badge)
        self.link_badge.style().polish(self.link_badge)
        self._set_hero("Checking your account and the latest Master Deck…", "info")
        self._set_actions("Please wait…", None)
        self.details.setPlainText("")

        def me_done(future):
            try:
                _, body = future.result()
                self.display_name = body.get("displayName") or body.get("display_name")
                if self.display_name:
                    self.link_badge.setText(f"Linked · {self.display_name}")
            except Exception:
                # me() may 403 without clinical_editor; device token is still valid for deck APIs
                pass
            self._load_release_and_plan()

        self.runtime.background(self.runtime.api.me, me_done)

    def _show_unlinked(self):
        self._set_step(active=STEP_LINK, done=())
        self._set_hero(
            "<b>Welcome to SnapOrtho.</b><br><br>"
            "Sign in to ask BroBot about the cards you study and download the SnapOrtho Master Deck. "
            "You’ll continue securely in your browser and return here automatically.",
            "info",
        )
        self._set_actions("Sign in to SnapOrtho", self._open_link)
        self.details.setPlainText("Device is not linked. Deck download and updates require a device token.")

    def _load_release_and_plan(self):
        presence = installed_deck_presence(self.runtime.mw.col, self.runtime.store)
        inventory = presence.get("inventory") or []
        if presence.get("installed"):
            self._set_installed_layout(True)
            self._load_v2_status(inventory)
            return

        def probe_done(future):
            try:
                matched = future.result()
            except Exception:
                matched = False
            if matched:
                self._set_installed_layout(True)
                self._load_v2_status(inventory)
                return
            self._load_bootstrap_release(inventory)

        self._set_hero("<b>Checking whether this profile already has the Master Deck…</b>", "info")
        self.runtime.background(self._probe_local_master_by_guid, probe_done)

    def _probe_local_master_by_guid(self):
        """True when published v2 note GUIDs already exist locally, even without v1 markers."""
        self.runtime.api.deck_v2_status()
        _, page = self.runtime.api.deck_v2_updates(0, GUID_PROBE_SAMPLE)
        hits, seen = local_guid_hits(self.runtime.mw.col, page.get("operations") or [])
        return guid_probe_indicates_install(hits, seen)

    def _load_bootstrap_release(self, inventory):
        def release_done(future):
            try:
                _, body = future.result()
                self.release = body.get("release") or body
            except Exception as error:
                self._show_release_error(error, False, inventory)
                return
            self._show_install(self.release)

        self.runtime.background(self.runtime.api.current_deck_release, release_done)

    def _load_v2_status(self, inventory):
        """Only v2 may write an installed deck. v1 remains available solely for first install."""
        self._set_step(active=STEP_UPDATE, done=(STEP_LINK, STEP_INSTALL))
        self._set_hero("<b>Checking the versioned SnapOrtho update service…</b>", "info")
        self._set_update_progress(0, "Checking immutable release and local cursor…", indeterminate=True)
        subscription=self.runtime.store.deck_subscription()
        after=int((subscription or{}).get("cursor")or 0)
        pending=self.runtime.store.pending_deck_journal()
        def work():
            from .api import ApiError
            from .version import ADDON_VERSION, addon_version_at_least
            _,status=self.runtime.api.deck_v2_status()
            release=status["release"]
            minimum=release.get("minimumAddonVersion") or release.get("minimum_addon_version")
            if not addon_version_at_least(ADDON_VERSION, minimum):
                raise ApiError("upgrade_required", 426, body={"minimumAddonVersion": minimum})
            from .deck_sync_v2 import page_has_more
            pages=[];cursor=after;page_limit=100
            while True:
                _,page=self.runtime.api.deck_v2_updates(cursor,page_limit);pages.append(page)
                cursor=int(page["nextCursor"])
                if not(page.get("operations")or[])or not page_has_more(page,page_limit):break
            return release,pages
        def done(future):
            self._hide_download_progress()
            try:release,pages=future.result()
            except Exception as error:
                code=getattr(error,"code","")
                if code in("not_found","no_release"):
                    self._set_hero(
                        "<b>Your deck was not changed.</b><br><br>"
                        "The safe note-level update service has not been published yet. "
                        "The retired v1 writer is disabled because it could misidentify cloze cards. "
                        "Continue studying normally; scheduling is unaffected.",
                        "info",
                    )
                    self._set_actions("Check again",self.refresh)
                elif code=="upgrade_required":
                    self._set_hero(f"<b>Add-on update needed</b><br><br>{describe(error)}","default")
                    self._set_actions("Check again",self.refresh)
                else:
                    self._set_hero(f"<b>Update check failed</b><br><br>{describe(error)}","default")
                    self._set_actions("Try again",self.refresh)
                return
            self.v2_release=release;self.v2_pages=pages
            operations=[op for page in pages for op in(page.get("operations")or[])]
            self.v2_summary=v2_content_summary(operations)
            counts={}
            for op in operations:counts[op["operation"]]=counts.get(op["operation"],0)+1
            interrupted = (
                f"<br><br>A previous update paused at {len(pending)} operation(s). "
                "Resume to finish from the last saved cursor. Do not use Anki Undo — "
                "that would desync the update cursor from your cards."
                if pending else ""
            )
            if not operations:
                from .anki_runtime import NoteCollectionGatewayV2
                from .deck_sync_v2 import NoteSyncV2Importer
                repair=NoteSyncV2Importer(
                    self.runtime.store,
                    NoteCollectionGatewayV2(self.runtime.mw.col,self.runtime.store),
                ).reconcile_tags()
                if repair["repaired"]:self.runtime.mw.reset()
                self.runtime.store.save_deck_subscription(release,cursor=after,status="current")
                self.runtime.store.cache("installed_master_release", release.get("version"))
                self._set_hero(
                    f"<b>✓ Master Deck {release['version']} is up to date.</b><br><br>"
                    f"{release['expectedNoteCount']} notes · {release['expectedCardCount']} cards"
                    + (f"<br><br>Repaired tags on {repair['repaired']} notes." if repair["repaired"] else "")
                    + interrupted,
                    "ok" if not pending else "info",
                )
                self._set_step(active=None,done=(STEP_LINK,STEP_INSTALL,STEP_UPDATE))
                self._set_actions("Check again",self.refresh)
                return
            self._set_hero(
                f"<b>Master Deck {release['version']} is ready</b><br><br>"
                f"{self.v2_summary['updatedNotes']} notes will be refreshed across "
                f"{len(pages)} resumable batch(es).<br>"
                f"{self.v2_summary['managedTagAssignments']} managed tag assignments on "
                f"{self.v2_summary['taggedNotes']} notes · "
                f"{self.v2_summary['mediaAssets']} media assets<br><br>"
                "Personal notes and protected fields stay local. Scheduling is not changed. "
                "Cards you moved to other decks stay where you put them."
                + interrupted,
                "info",
            )
            self.details.setPlainText(json.dumps({
                "release":release,
                "operationCounts":counts,
                "pages":len(pages),
                "localMarkerCards":len(inventory or []),
                "pendingJournal":len(pending),
                "cursor":after,
            },indent=2))
            self._set_actions("Resume" if pending else "Update now",self._apply_v2,"Check again",self.refresh)
        self.runtime.background(work,done)

    def _apply_v2(self):
        if self._busy or not self.v2_pages:return
        self._busy=True;self._set_actions("Updating…",None)
        self._set_update_progress(0,"Checking media files…")
        import os
        media_dir=self.runtime.mw.col.media.dir()
        media_ops=[op for page in self.v2_pages for op in page["operations"]if op["operation"]=="media_add"and not os.path.isfile(os.path.join(media_dir,op["payload"]["filename"]))]
        def fetch_media():
            downloads={}
            for op in media_ops:
                payload=op["payload"];_,desc=self.runtime.api.deck_v2_media(payload["releaseId"],payload["sha256"])
                with urllib.request.urlopen(desc["url"],timeout=max(self.runtime.settings.request_timeout_seconds,120))as response:data=response.read(int(payload.get("byteSize")or 20_000_000)+1)
                if len(data)!=int(payload["byteSize"])or hashlib.sha256(data).hexdigest()!=payload["sha256"]:raise RuntimeError("media_integrity_check_failed")
                downloads[payload["sha256"]]=data
            return downloads
        def media_done(future):
            try:downloads=future.result()
            except Exception as error:
                self._busy=False;self._hide_download_progress();self._set_hero(f"<b>Media download failed safely</b><br><br>{error}","default");self._set_actions("Resume",self.refresh);return
            self._apply_v2_pages(downloads)
        self.runtime.background(fetch_media,media_done)

    def _apply_v2_pages(self,media_payloads):
        try:self.runtime.mw.checkpoint("SnapOrtho versioned deck update")
        except Exception:pass
        from .anki_runtime import NoteCollectionGatewayV2
        from .deck_sync_v2 import NoteSyncV2Importer
        gateway=NoteCollectionGatewayV2(self.runtime.mw.col,self.runtime.store,media_payloads=media_payloads)
        importer=NoteSyncV2Importer(self.runtime.store,gateway)
        totals={"notes":0,"retired":0,"tags":0,"moved":0,"media":0,"overwrittenLocal":[]}
        try:
            for index,page in enumerate(self.v2_pages):
                self._set_update_progress(
                    int(100*index/max(1,len(self.v2_pages))),
                    f"Applying verified page {index+1} of {len(self.v2_pages)}…",
                )
                from aqt.qt import QApplication
                QApplication.processEvents()
                result=importer.apply_page(page)
                for key in("notes","retired","tags","moved","media"):totals[key]+=result[key]
                totals["overwrittenLocal"]+=result["overwrittenLocal"]
            repair=importer.reconcile_tags()
            self.runtime.mw.reset();self._busy=False
            self._hide_download_progress()
            summary=self.v2_summary
            self.runtime.store.cache("installed_master_release", self.v2_release.get("version"))
            self._set_hero(
                f"<b>✓ Master Deck {self.v2_release['version']} updated</b><br><br>"
                f"{summary.get('updatedNotes',totals['notes'])} notes refreshed · "
                f"{summary.get('managedTagAssignments',totals['tags'])} managed tag assignments "
                f"across {summary.get('taggedNotes',0)} notes · "
                f"{summary.get('mediaAssets',totals['media'])} media assets<br><br>"
                + (f"Reconciled tags on {repair['repaired']} additional notes.<br><br>" if repair["repaired"] else "")
                + "Existing scheduling, protected fields, and cards you had moved were preserved.",
                "ok",
            )
            self._set_step(active=None,done=(STEP_LINK,STEP_INSTALL,STEP_UPDATE))
            self._set_actions("Check again",self.refresh)
        except Exception as error:
            self._busy=False
            self._set_hero(
                f"<b>Update paused safely</b><br><br>{type(error).__name__}: {error}<br><br>"
                "The cursor was saved after the last completed operation. Click Resume to continue. "
                "Do not use Anki Undo — that would desync the saved cursor from your collection.",
                "default",
            )
            self._set_actions("Resume",self.refresh)

    def _show_release_error(self, error, has_markers, inventory):
        code = getattr(error, "code", "")
        if code == "no_release":
            if has_markers:
                self._set_step(active=STEP_UPDATE, done=(STEP_LINK, STEP_INSTALL))
                self._set_hero(
                    f"<b>No published release on the server right now.</b><br><br>"
                    f"You already have <b>{len(inventory)}</b> Master cards locally. "
                    "When a new release is published, open this window again to update.",
                    "info",
                )
                self._set_actions("Refresh status", self.refresh)
            else:
                self._set_step(active=STEP_INSTALL, done=(STEP_LINK,))
                self._set_hero(
                    "<b>You're linked — great.</b><br><br>"
                    "No published SnapOrtho Master Deck is available yet. "
                    "This is a server/publishing step, not a problem with your setup. "
                    "Check back when the team publishes a release.",
                    "info",
                )
                self._set_actions("Refresh status", self.refresh, "Open diagnostics", self._open_diagnostics)
            self.details.setPlainText(describe(error))
            return
        if code in ("unlinked", "authorization_failed"):
            self._show_unlinked()
            self._set_hero(
                f"<b>{headline(error)}</b><br><br>{describe(error)}",
                "default",
            )
            self._set_actions("Link this device", self._open_link)
            return
        done = (STEP_LINK, STEP_INSTALL) if has_markers else (STEP_LINK,)
        self._set_step(active=STEP_UPDATE if has_markers else STEP_INSTALL, done=done)
        self._set_hero(f"<b>{headline(error)}</b><br><br>{describe(error)}", "default")
        self._set_actions("Try again", self.refresh, "Open diagnostics", self._open_diagnostics)
        self.details.setPlainText(describe(error))

    def _show_install(self, release):
        version = release.get("release_version") or release.get("releaseVersion") or "?"
        published = release.get("published_at") or release.get("publishedAt") or ""
        self._set_step(active=STEP_INSTALL, done=(STEP_LINK,))
        pub_line = f"<br>Published: {published}" if published else ""
        self._set_hero(
            f"<b>Device linked. Install the starter deck next.</b><br><br>"
            f"Latest release: <b>{version}</b>{pub_line}<br><br>"
            "Download the SnapOrtho Master .apkg, then use <b>File → Import</b> in Anki "
            "(or drag the file onto Anki). After import, return here and refresh — "
            "versioned tag updates apply in place and do not replace this starter package.<br><br>"
            "If this profile already has the Master notes, choose <b>I've already imported it</b>. "
            "SnapOrtho matches existing notes by their stable Anki GUID, even when the old "
            "marker fields are empty.",
            "info",
        )
        self._set_actions(
            "Download SnapOrtho Master Deck",
            self._download_bootstrap,
            "I've already imported it — refresh",
            self.refresh,
        )
        self.details.setPlainText(json.dumps(release, indent=2, default=str))

    def _load_plan(self, release, inventory):
        release_id = release.get("id")
        version = release.get("release_version") or release.get("releaseVersion") or "?"
        all_ids = [row.get("canonicalCardId") for row in inventory if row.get("canonicalCardId")]
        chunks = chunk_list(inventory)
        total_chunks = len(chunks)

        def work():
            action_lists = []
            first_meta = None
            for index, chunk in enumerate(chunks):
                payload = {
                    "contractVersion": "snaportho-anki-sync-request.v1",
                    "targetReleaseId": release_id,
                    "installedCards": chunk,
                    "allInstalledIds": all_ids,
                }
                _, plan = self.runtime.api.deck_sync_plan(payload)
                if first_meta is None:
                    first_meta = plan
                action_lists.append(plan.get("actions") or [])
            merged_actions = merge_sync_plan_actions(action_lists)
            plan = dict(first_meta or {})
            plan["actions"] = merged_actions
            # Stable checksum over merged actions for ack bookkeeping
            import hashlib

            plan["checksum"] = hashlib.sha256(
                json.dumps(merged_actions, sort_keys=True, separators=(",", ":")).encode()
            ).hexdigest()
            plan["_chunkMeta"] = {
                "inventoryCount": len(inventory),
                "chunkCount": total_chunks,
                "allInstalledIds": len(all_ids),
            }
            return plan

        def plan_done(future):
            self._hide_download_progress()
            try:
                plan = future.result()
            except Exception as error:
                self._set_step(active=STEP_UPDATE, done=(STEP_LINK, STEP_INSTALL))
                self._set_hero(f"<b>{headline(error)}</b><br><br>{describe(error)}", "default")
                self._set_actions("Try again", self.refresh)
                self.details.setPlainText(
                    f"{describe(error)}\ninventory_cards={len(inventory)}"
                )
                return
            self.plan = plan
            counts = plan_counts(plan)
            updates = counts.get("update", 0)
            adds = counts.get("add", 0)
            conflicts = counts.get("conflict", 0)
            unchanged = counts.get("unchanged", 0)
            media = counts.get("media_download", 0)
            changes = updates + adds + media
            self._set_step(active=STEP_UPDATE, done=(STEP_LINK, STEP_INSTALL))
            summary = (
                f"<b>Local Master cards:</b> {len(inventory)} &nbsp;·&nbsp; "
                f"<b>Release:</b> {version}<br><br>"
                f"<b>Update plan</b><br>"
                f"• {updates} content updates<br>"
                f"• {adds} new cards<br>"
                f"• {media} media downloads<br>"
                f"• {conflicts} conflicts (kept for you to review)<br>"
                f"• {unchanged} already current"
            )
            if changes == 0 and conflicts == 0:
                self.runtime.store.cache("installed_master_release", version)
                self._set_hero(
                    f"<b>You're up to date on SnapOrtho Master {version}.</b><br><br>"
                    f"Local markers found on {len(inventory)} cards. "
                    "Scheduling and personal notes were not touched.",
                    "ok",
                )
                self._set_actions(
                    "Re-check for updates",
                    self.refresh,
                    "Download full starter pack…",
                    self._download_bootstrap,
                )
            else:
                conflict_note = (
                    f"<br><br><b>{conflicts} conflict(s)</b> will not be overwritten — "
                    "open those cards in the Card Workspace if you want to propose your edits."
                    if conflicts
                    else ""
                )
                self._set_hero(
                    summary
                    + "<br><br>Update to the latest version applies published card content, "
                    "media, and governed SnapOrtho tags. "
                    "Your review scheduling and Personal_* fields stay untouched."
                    + conflict_note,
                    "info",
                )
                self._set_actions(
                    "Update to latest version" if changes > 0 else "Re-check",
                    self._apply if changes > 0 else self.refresh,
                    "Re-check" if changes > 0 else "Download starter pack…",
                    self.refresh if changes > 0 else self._download_bootstrap,
                )
            meta = plan.get("_chunkMeta") or {}
            lines = [
                f"release: {version} ({release_id})",
                f"local_markers: {len(inventory)}",
                f"plan_chunks: {meta.get('chunkCount', 1)}",
                f"update={updates} add={adds} media={media} conflict={conflicts} unchanged={unchanged}",
                "",
                json.dumps(
                    {k: v for k, v in plan.items() if k != "_chunkMeta"},
                    indent=2,
                    default=str,
                ),
            ]
            self.details.setPlainText("\n".join(lines))

        self._set_hero(
            f"Building an update plan from {len(inventory)} local Master markers"
            + (f" ({total_chunks} requests)…" if total_chunks > 1 else "…"),
            "info",
        )
        self._set_update_progress(
            0,
            f"Checking {len(inventory)} cards against the latest release…",
            indeterminate=True,
        )
        self.runtime.background(work, plan_done)

    # ── actions ───────────────────────────────────────────────────
    def _open_link(self):
        from .dialogs import DeviceLinkDialog

        dialog = DeviceLinkDialog(self.dialog, self.runtime, on_linked=self.refresh)
        dialog.exec()
        self.refresh()

    def _open_diagnostics(self):
        from .dialogs import DiagnosticsDialog

        DiagnosticsDialog(self.dialog, self.runtime).exec()

    def _download_bootstrap(self):
        if self._busy:
            return
        if not self.release:
            self._set_hero("No release loaded yet. Refresh status first.", "default")
            return
        release_id = self.release.get("id")
        version = self.release.get("release_version") or self.release.get("releaseVersion") or "deck"
        self._busy = True
        self.primary.setEnabled(False)
        self._set_hero("Preparing the starter package download…", "info")
        self._set_download_progress(phase="preparing")

        timeout = self.runtime.settings.request_timeout_seconds
        # Media-rich master packages can be ~1GB; allow long transfers.
        download_timeout = max(int(timeout or 60), 3600)
        progress_state = {"started": time.monotonic(), "initial": None, "last_update": 0.0}

        def report_progress(written, total):
            now = time.monotonic()
            if progress_state["initial"] is None:
                progress_state["initial"] = written
            if total and written < total and now - progress_state["last_update"] < 0.15:
                return
            progress_state["last_update"] = now
            elapsed = max(now - progress_state["started"], 0.001)
            transferred = max(0, written - progress_state["initial"])
            speed = transferred / elapsed
            self.runtime.mw.taskman.run_on_main(
                lambda w=written, t=total, s=speed: self._set_download_progress(w, t, s)
            )

        def work():
            _, desc = self.runtime.api.deck_bootstrap_apkg(release_id)
            url = desc["url"]
            if desc.get("packageKind") == "text_only":
                raise RuntimeError(
                    "The published package is text-only. A media-complete Master Deck must be published first."
                )
            checksum = (desc.get("checksum") or desc.get("artifactChecksum") or "").lower()
            filename = os.path.basename(desc.get("filename") or f"SnapOrtho-Master-{version}.apkg")
            expected = desc.get("byteSize") or desc.get("byte_size")
            try:
                expected_n = int(expected) if expected is not None else None
            except (TypeError, ValueError):
                expected_n = None
            # Stable .part path survives transient errors and signed-URL refreshes.
            tmp_dir = os.path.join(tempfile.gettempdir(), "snaportho-master-deck")
            os.makedirs(tmp_dir, exist_ok=True)
            safe_name = filename if filename.endswith(".apkg") else f"{filename}.apkg"
            tmp_path = os.path.join(tmp_dir, f"{release_id}-{checksum or version}-{safe_name}.part")
            hex_digest, written = stream_download_to_part(
                url, tmp_path, download_timeout, expected_n, report_progress
            )
            self.runtime.mw.taskman.run_on_main(
                lambda w=written: self._set_download_progress(written=w, phase="verifying")
            )
            if checksum and hex_digest != checksum:
                # Keep an incomplete partial transfer; discard a complete but corrupt object.
                if expected_n is None or written >= expected_n:
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass
                raise RuntimeError(f"checksum_mismatch:expected={checksum}:got={hex_digest}")
            if expected_n is not None and expected_n > 0 and written != expected_n:
                raise RuntimeError(f"size_mismatch:expected={expected_n}:got={written}")
            return tmp_path, tmp_dir, filename, hex_digest, written, desc

        def done(future):
            self._busy = False
            tmp_path = tmp_dir = None
            try:
                tmp_path, tmp_dir, filename, digest, written, desc = future.result()
            except Exception as error:
                self._hide_download_progress()
                code = getattr(error, "code", None)
                if code:
                    self._set_hero(f"<b>{headline(error)}</b><br><br>{describe(error)}", "default")
                else:
                    self._set_hero(
                        f"<b>Download failed</b><br><br>{type(error).__name__}: {error}",
                        "default",
                    )
                self._set_actions("Try download again", self._download_bootstrap, "Refresh status", self.refresh)
                return

            from aqt.qt import QFileDialog

            default_name = filename if str(filename).endswith(".apkg") else f"{filename}.apkg"
            path, _ = QFileDialog.getSaveFileName(
                self.dialog,
                "Save SnapOrtho Master Deck",
                os.path.expanduser(f"~/Downloads/{default_name}"),
                "Anki package (*.apkg)",
            )
            if not path:
                self._hide_download_progress()
                try:
                    if tmp_path and os.path.isfile(tmp_path):
                        os.remove(tmp_path)
                    if tmp_dir and os.path.isdir(tmp_dir):
                        os.rmdir(tmp_dir)
                except OSError:
                    pass
                self._set_hero(
                    "Download cancelled — temporary file discarded. You can try again anytime.",
                    "info",
                )
                self._set_actions("Download SnapOrtho Master Deck", self._download_bootstrap, "Refresh", self.refresh)
                return
            if not path.endswith(".apkg"):
                path += ".apkg"
            try:
                # Move/copy from temp to chosen path without loading whole file into RAM.
                try:
                    os.replace(tmp_path, path)
                except OSError:
                    import shutil

                    shutil.copy2(tmp_path, path)
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass
            finally:
                try:
                    if tmp_dir and os.path.isdir(tmp_dir):
                        # temp file may already be moved; remove dir if empty
                        try:
                            os.rmdir(tmp_dir)
                        except OSError:
                            pass
                except OSError:
                    pass

            self.last_download_path = path
            self._hide_download_progress()
            size_mb = round(written / (1024 * 1024), 1)
            self._set_hero(
                f"<b>SnapOrtho Master deck saved.</b><br><br>"
                f"<code>{path}</code><br>"
                f"Size: <b>{size_mb} MB</b><br>"
                f"SHA-256 verified: <code>{digest[:16]}…</code><br><br>"
                "<b>Next:</b> Click <b>Import into Anki now</b>. "
                "SnapOrtho will open Anki's importer with this deck already selected.",
                "ok",
            )
            self._set_actions(
                "Import into Anki now",
                self._import_downloaded_deck,
                "Open containing folder",
                self._open_download_folder,
            )
            self.details.setPlainText(
                json.dumps(
                    {
                        "path": path,
                        "sha256": digest,
                        "bytes": written,
                        **{k: desc.get(k) for k in ("checksum", "byteSize", "releaseId")},
                    },
                    indent=2,
                )
            )

        self.runtime.background(work, done)

    def _import_downloaded_deck(self):
        path = self.last_download_path
        if not path or not os.path.isfile(path):
            self._set_hero(
                "<b>Downloaded deck not found.</b><br><br>"
                "Download the Master Deck again, then import it.",
                "default",
            )
            self._set_actions(
                "Download again",
                self._download_bootstrap,
                "Refresh status",
                self.refresh,
            )
            return

        # Close this modal first so Anki's native import dialog can take focus.
        # Defer one event-loop turn to avoid stacking modal dialogs on macOS.
        self.dialog.accept()
        from aqt.qt import QTimer

        def launch_import():
            try:
                from aqt.import_export.importing import import_file

                import_file(self.runtime.mw, path)
            except Exception as error:
                from aqt.utils import showWarning

                showWarning(
                    "Anki could not open the downloaded Master Deck automatically.\n\n"
                    f"The file is still available here:\n{path}\n\n"
                    f"Error: {error}"
                )

        QTimer.singleShot(0, launch_import)

    def _open_download_folder(self):
        if not self.last_download_path:
            return
        from aqt.qt import QDesktopServices, QUrl

        folder = os.path.dirname(self.last_download_path)
        QDesktopServices.openUrl(QUrl.fromLocalFile(folder))

    def _apply(self):
        if not self.plan or not self.release or self._busy:
            return
        self._busy = True
        self.primary.setEnabled(False)
        self._set_hero(
            "<b>Update in progress</b><br><br>"
            "Keep this window open. SnapOrtho will show a completion summary when every change has been applied.",
            "info",
        )
        self._set_update_progress(5, "Step 1 of 4 · Downloading the release manifest…")
        release_id = self.plan.get("targetReleaseId") or self.release.get("id")
        actions = self.plan.get("actions", [])
        timeout = self.runtime.settings.request_timeout_seconds

        def fetch():
            from .deck_update import build_operations

            _, manifest = self.runtime.api.deck_manifest(release_id)
            ops = build_operations(actions, manifest.get("cards", []))
            media = {}
            media_hashes = list(ops["media"])
            self.runtime.mw.taskman.run_on_main(
                lambda: self._set_update_progress(
                    25,
                    f"Step 2 of 4 · Preparing {len(ops['update']) + len(ops['add'])} card changes…",
                )
            )
            for index, sha in enumerate(media_hashes):
                try:
                    _, desc = self.runtime.api.deck_media(release_id, sha)
                    with urllib.request.urlopen(desc["url"], timeout=timeout) as response:
                        data = response.read(20_000_000)
                    if hashlib.sha256(data).hexdigest() == sha:
                        media[sha] = (desc["logicalFilename"], data)
                except Exception:
                    pass
                percent = 25 + int(25 * (index + 1) / max(1, len(media_hashes)))
                self.runtime.mw.taskman.run_on_main(
                    lambda p=percent, n=index + 1, total=len(media_hashes): self._set_update_progress(
                        p, f"Step 2 of 4 · Downloading media {n} of {total}…"
                    )
                )
            return manifest, ops, media

        def done(future):
            self._busy = False
            try:
                manifest, ops, media = future.result()
            except Exception as error:
                self._hide_download_progress()
                self._set_hero(f"<b>Update failed</b><br><br>{describe(error)}", "default")
                self._set_actions("Try again", self._apply, "Refresh", self.refresh)
                return
            from .anki_runtime import CollectionGateway
            from .deck_update import ack_status, apply_operations

            gateway = CollectionGateway(self.runtime.mw.col)
            try:
                self.runtime.mw.checkpoint("SnapOrtho deck update")
            except Exception:
                pass
            written = 0
            self._set_update_progress(52, "Step 3 of 4 · Writing media and card updates…")
            for filename, data in media.values():
                try:
                    if not gateway.has_media(filename):
                        gateway.write_media(filename, data)
                    written += 1
                except Exception:
                    pass
            def apply_progress(completed, total, activity):
                from aqt.qt import QApplication

                percent = 55 + int(35 * completed / max(1, total))
                self._set_update_progress(
                    percent,
                    f"Step 3 of 4 · {activity} · {completed} of {total}",
                )
                QApplication.processEvents()

            summary = apply_operations(gateway, ops, progress=apply_progress)
            summary["media"] = written
            if not summary["errors"]:
                version = self.release.get("release_version") or self.release.get("releaseVersion")
                if version:
                    self.runtime.store.cache("installed_master_release", version)
            self.runtime.mw.reset()
            self._set_update_progress(95, "Step 4 of 4 · Verifying and recording completion…")
            payload = {
                "targetReleaseId": release_id,
                "syncPlanChecksum": self.plan.get("checksum"),
                "installedManifestChecksum": manifest.get("manifestChecksum"),
                "status": ack_status(summary),
                "conflictCount": summary["conflicts"],
            }
            self.runtime.background(lambda: self.runtime.api.sync_ack(payload), lambda f: None)

            lines = [
                f"✓ {summary['updated']} updated, {summary['added']} added, {summary['media']} media synced.",
                "Your scheduling and personal notes were left untouched.",
            ]
            if summary["conflicts"]:
                lines.append("")
                lines.append(
                    f"{summary['conflicts']} card(s) you edited locally were NOT overwritten:"
                )
                for entry in ops["conflict"]:
                    lines.append(
                        f"  • [{entry['reason']}] {entry['card'].get('deckPath', '')} — {entry['card'].get('noteGuid', '')}"
                    )
            if summary["errors"]:
                lines.append("")
                lines.append(
                    f"{len(summary['errors'])} item(s) could not be applied: "
                    + ", ".join(summary["errors"][:10])
                )
            self._set_update_progress(
                100,
                "Update complete" if not summary["errors"] else "Update completed with warnings",
            )
            result_title = (
                "<b>✓ Update complete</b><br><br>"
                if not summary["errors"]
                else "<b>Update completed with warnings</b><br><br>"
            )
            self._set_hero(
                result_title + "<br>".join(lines).replace("\n", "<br>"),
                "ok" if not summary["errors"] else "info",
            )
            self._set_step(active=None, done=(STEP_LINK, STEP_INSTALL, STEP_UPDATE))
            self._set_actions("Check again", self.refresh)
            self.details.setPlainText("\n".join(lines))

        self.runtime.background(fetch, done)

    def exec(self):
        return self.dialog.exec()
