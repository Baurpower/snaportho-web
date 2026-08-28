import json
import uuid

from .version import ADDON_VERSION

SETTINGS_STYLE = """
QDialog { background: #f6f7f9; }
QLabel#title { font-size: 18px; font-weight: 700; color: #111827; }
QLabel#sectionTitle { font-size: 13px; font-weight: 700; color: #111827; margin-top: 4px; }
QLabel#body { color: #374151; font-size: 12px; }
QFrame#card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}
QLabel#badge {
  background: #e5e7eb;
  color: #374151;
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
}
QLabel#badgeOk {
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
QLabel#badgeBad {
  background: #fee2e2;
  color: #991b1b;
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
}
QPushButton#primary {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-weight: 600;
}
QPushButton#secondary {
  background: white;
  color: #1f2937;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 14px;
}
"""

ROLE_LABELS = {
    "administrator": "Administrator",
    "clinical_editor": "Clinical editor",
    "mapping_reviewer": "Mapping reviewer",
    "deck_editor": "Deck editor",
    "release_manager": "Release manager",
}


def linked_copy(reviewer=None):
    if reviewer:
        return (
            "Signed in successfully",
            f"Signed in as {reviewer.get('displayName', 'SnapOrtho user')}. BroBot and Master Deck access are ready.",
        )
    return (
        "Signed in successfully",
        "Your SnapOrtho credential was saved securely for this Anki profile.",
    )


def format_roles(roles):
    roles = list(roles or [])
    if not roles:
        return "No reviewer roles assigned"
    return ", ".join(ROLE_LABELS.get(r, r.replace("_", " ")) for r in sorted(roles))


def access_level_label(roles, status=None, active=True):
    """Human access level for settings display."""
    roles = set(roles or [])
    if status and status != "active":
        return f"Inactive ({status})"
    if not active:
        return "Inactive"
    if "administrator" in roles:
        return "Administrator"
    if "release_manager" in roles:
        return "Release manager"
    if "clinical_editor" in roles:
        return "Clinical editor"
    if "deck_editor" in roles:
        return "Deck editor"
    if "mapping_reviewer" in roles:
        return "Mapping reviewer"
    if roles:
        return "Reviewer"
    return "Linked — no reviewer role yet"


def summarize_local_deck(inventory, presence=None):
    """Pure summary of installed Master notes. Markers are sufficient, not required."""
    inventory = list(inventory or [])
    presence = presence or {}
    if not inventory and presence.get("installed"):
        notes = int(presence.get("masterNotes") or 0)
        return {
            "installed": True,
            "cardCount": notes,
            "versionCount": 0,
            "versions": [],
            "headline": f"{notes} Master notes installed" if notes else "Master Deck installed",
            "detail": (
                f"{notes} SnapOrtho Master notes are in this profile. "
                "Versioned updates match notes by stable Anki GUID; marker fields are not required."
                if notes
                else "This profile already has a SnapOrtho Master Deck subscription. Check for updates to apply the latest release."
            ),
        }
    if not inventory:
        return {
            "installed": False,
            "cardCount": 0,
            "versionCount": 0,
            "versions": [],
            "headline": "Not installed",
            "detail": "No SnapOrtho Master Deck found in this profile. Use Get Started / Master Deck to download the starter package, or choose I've already imported it if the notes are already here.",
        }
    versions = sorted(
        {
            row.get("canonicalCardVersionId")
            for row in inventory
            if row.get("canonicalCardVersionId")
        }
    )
    return {
        "installed": True,
        "cardCount": len(inventory),
        "versionCount": len(versions),
        "versions": versions[:5],
        "headline": f"{len(inventory)} Master cards installed",
        "detail": (
            f"{len(inventory)} linked SnapOrtho Master Deck cards are installed in this profile. "
            "Check below to see whether an update is available."
        ),
    }


class SettingsDialog:
    def __init__(self, parent, runtime):
        from aqt.qt import (
            QComboBox,
            QDialog,
            QFormLayout,
            QFrame,
            QHBoxLayout,
            QLabel,
            QLineEdit,
            QPushButton,
            QSpinBox,
            QVBoxLayout,
        )

        self.runtime = runtime
        self.dialog = QDialog(parent)
        self.dialog.setWindowTitle("SnapOrtho Settings")
        self.dialog.resize(560, 620)
        self.dialog.setStyleSheet(SETTINGS_STYLE)
        root = QVBoxLayout(self.dialog)
        root.setContentsMargins(16, 14, 16, 14)
        root.setSpacing(10)

        title = QLabel("SnapOrtho")
        title.setObjectName("title")
        root.addWidget(title)
        self.subtitle = QLabel(f"Add-on {ADDON_VERSION}")
        self.subtitle.setObjectName("body")
        root.addWidget(self.subtitle)

        # Account card
        self.account_card, self.account_body, self.account_badge = self._make_card(
            "Account & access"
        )
        root.addWidget(self.account_card)

        # Deck card
        self.deck_card, self.deck_body, self.deck_badge = self._make_card("Master Deck")
        deck_actions = QHBoxLayout()
        self.deck_update_btn = QPushButton("Check for deck updates")
        self.deck_update_btn.setObjectName("primary")
        self.deck_update_btn.clicked.connect(self._open_master_deck)
        deck_actions.addWidget(self.deck_update_btn)
        deck_actions.addStretch(1)
        self.deck_card.layout().addLayout(deck_actions)
        root.addWidget(self.deck_card)

        # Connection settings
        conn = QFrame()
        conn.setObjectName("card")
        conn_layout = QVBoxLayout(conn)
        conn_layout.setContentsMargins(12, 10, 12, 10)
        conn_title = QLabel("Connection")
        conn_title.setObjectName("sectionTitle")
        conn_layout.addWidget(conn_title)
        form = QFormLayout()
        self.environment = QComboBox()
        self.environment.addItems(["local", "staging", "production"])
        self.environment.setCurrentText(runtime.settings.environment)
        self.url = QLineEdit(runtime.settings.base_url)
        self.timeout = QSpinBox()
        self.timeout.setRange(5, 60)
        self.timeout.setValue(runtime.settings.request_timeout_seconds)
        form.addRow("Environment", self.environment)
        form.addRow("Backend URL", self.url)
        form.addRow("Timeout (seconds)", self.timeout)
        conn_layout.addLayout(form)
        root.addWidget(conn)

        # Actions
        row1 = QHBoxLayout()
        self.refresh_btn = QPushButton("Refresh status")
        self.refresh_btn.setObjectName("secondary")
        self.refresh_btn.clicked.connect(self.refresh_status)
        self.link_btn = QPushButton("Link / manage device")
        self.link_btn.setObjectName("secondary")
        self.link_btn.clicked.connect(self._open_link)
        row1.addWidget(self.refresh_btn)
        row1.addWidget(self.link_btn)
        root.addLayout(row1)

        row2 = QHBoxLayout()
        self.diag_btn = QPushButton("Diagnostics")
        self.diag_btn.setObjectName("secondary")
        self.diag_btn.clicked.connect(self._open_diagnostics)
        cancel = QPushButton("Close")
        cancel.setObjectName("secondary")
        cancel.clicked.connect(self.dialog.reject)
        save = QPushButton("Save connection")
        save.setObjectName("primary")
        save.clicked.connect(self.save)
        row2.addWidget(self.diag_btn)
        row2.addStretch(1)
        row2.addWidget(cancel)
        row2.addWidget(save)
        root.addLayout(row2)

        self.refresh_status()

    def _make_card(self, title_text):
        from aqt.qt import QFrame, QHBoxLayout, QLabel, QVBoxLayout

        frame = QFrame()
        frame.setObjectName("card")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(12, 10, 12, 10)
        header = QHBoxLayout()
        title = QLabel(title_text)
        title.setObjectName("sectionTitle")
        badge = QLabel("…")
        badge.setObjectName("badge")
        header.addWidget(title)
        header.addStretch(1)
        header.addWidget(badge)
        body = QLabel("Loading…")
        body.setObjectName("body")
        body.setWordWrap(True)
        layout.addLayout(header)
        layout.addWidget(body)
        return frame, body, badge

    def _set_badge(self, badge, text, kind="default"):
        badge.setText(text)
        badge.setObjectName(
            {"ok": "badgeOk", "warn": "badgeWarn", "bad": "badgeBad"}.get(kind, "badge")
        )
        badge.style().unpolish(badge)
        badge.style().polish(badge)

    def _is_linked(self):
        try:
            return bool(self.runtime.credentials.get())
        except Exception:
            return False

    def refresh_status(self):
        from .sync import installed_deck_presence

        try:
            presence = installed_deck_presence(self.runtime.mw.col, self.runtime.store)
        except Exception:
            presence = {"installed": False, "inventory": [], "masterNotes": 0}
        inventory = presence.get("inventory") or []
        local = summarize_local_deck(inventory, presence)
        self.deck_body.setText(local["detail"])
        if local["installed"]:
            self._set_badge(self.deck_badge, f"{local['cardCount']} cards", "ok")
            self.deck_update_btn.setText("Check for deck updates")
        else:
            self._set_badge(self.deck_badge, "Not installed", "warn")
            self.deck_update_btn.setText("Install Master Deck")

        if not self._is_linked():
            self.account_body.setText(
                "This Anki profile is not signed in. Sign in to use BroBot and download the "
                "Master Deck. Credentials are stored securely in macOS Keychain."
            )
            self._set_badge(self.account_badge, "Not linked", "bad")
            self.subtitle.setText(
                f"Add-on {ADDON_VERSION} · {self.runtime.settings.environment} · unlinked"
            )
            return

        self.account_body.setText("Device linked. Checking account and latest release…")
        self._set_badge(self.account_badge, "Linked", "ok")
        self.subtitle.setText(
            f"Add-on {ADDON_VERSION} · {self.runtime.settings.environment} · linked"
        )

        def me_done(future):
            reviewer = None
            me_error = None
            try:
                _, reviewer = future.result()
            except Exception as error:
                me_error = error
            self._render_account(reviewer, me_error)
            self._load_release(local)

        self.runtime.background(self.runtime.api.me, me_done)

    def _render_account(self, reviewer, me_error):
        if me_error is not None:
            from .errors import describe

            # Device may be linked even when /me fails (e.g. no clinical_editor yet)
            self.account_body.setText(
                "You are signed in, but account details could not be loaded.\n"
                f"{describe(me_error)}\n\n"
                "BroBot and Master Deck access use the saved device credential."
            )
            self._set_badge(self.account_badge, "Linked · limited", "warn")
            return
        roles = reviewer.get("roles") or []
        level = access_level_label(
            roles, status=reviewer.get("status"), active=True
        )
        name = reviewer.get("displayName") or reviewer.get("display_name") or "Reviewer"
        status = reviewer.get("status") or "unknown"
        lines = [
            f"<b>{name}</b>",
            f"Access level: <b>{level}</b>",
            f"Status: {status}",
            f"Roles: {format_roles(roles)}",
        ]
        if reviewer.get("userId") or reviewer.get("user_id"):
            uid = reviewer.get("userId") or reviewer.get("user_id")
            lines.append(f"User id: <code>{uid}</code>")
        self.account_body.setText("<br>".join(lines))
        kind = "ok" if status == "active" and roles else "warn"
        self._set_badge(self.account_badge, level, kind)
        self.subtitle.setText(
            f"Add-on {ADDON_VERSION} · {self.runtime.settings.environment} · {name}"
        )

    def _load_release(self, local):
        def release_done(future):
            try:
                _, body = future.result()
                release = body.get("release") or body
                version = (
                    release.get("version")
                    or release.get("release_version")
                    or release.get("releaseVersion")
                    or "?"
                )
                published = (
                    release.get("published_at") or release.get("publishedAt") or ""
                )
                min_addon = (
                    release.get("minimum_addon_version")
                    or release.get("minimumAddonVersion")
                    or "—"
                )
                extra = (
                    f"<br><br><b>Latest published release:</b> {version}"
                    + (f"<br>Published: {published}" if published else "")
                    + f"<br>Minimum add-on: {min_addon}"
                )
                if local["installed"]:
                    self.deck_body.setText(local["detail"] + extra)
                    self._set_badge(
                        self.deck_badge, f"{local['cardCount']} installed · latest v{version}", "ok"
                    )
                else:
                    self.deck_body.setText(
                        "Starter package is available on the server but not installed in this profile."
                        + extra
                        + "<br><br>Use <b>Install Master Deck</b> to download and import."
                    )
                    self._set_badge(self.deck_badge, f"Available · v{version}", "warn")
            except Exception as error:
                from .api import ApiError
                from .errors import describe

                if isinstance(error, ApiError) and error.code == "no_release":
                    if local["installed"]:
                        self.deck_body.setText(
                            local["detail"]
                            + "<br><br>No published release is currently advertised by the server."
                        )
                    else:
                        self.deck_body.setText(describe(error))
                        self._set_badge(self.deck_badge, "No release", "warn")
                else:
                    self.deck_body.setText(
                        local["detail"] + f"<br><br>Release check: {describe(error)}"
                    )

        operation=(
            self.runtime.api.deck_v2_status
            if local["installed"]
            else self.runtime.api.current_deck_release
        )
        self.runtime.background(operation, release_done)

    def _open_link(self):
        DeviceLinkDialog(self.dialog, self.runtime, on_linked=self.refresh_status).exec()
        self.refresh_status()

    def _open_master_deck(self):
        from .master_deck import MasterDeckDialog

        MasterDeckDialog(self.dialog, self.runtime).exec()
        self.refresh_status()

    def _open_diagnostics(self):
        DiagnosticsDialog(self.dialog, self.runtime).exec()

    def save(self):
        from aqt.utils import showInfo, showWarning

        from .config import validate

        raw = {
            "environment": self.environment.currentText(),
            "base_url": self.url.text().strip(),
            "request_timeout_seconds": self.timeout.value(),
            "diagnostics_enabled": self.runtime.settings.diagnostics_enabled,
        }
        try:
            settings = validate(raw)
            self.runtime.mw.addonManager.writeConfig(__name__.split(".")[0], raw)
            self.runtime.settings = settings
            # Rebuild API client against the new origin
            from .api import ReviewerApi

            self.runtime.api = ReviewerApi(
                settings.base_url,
                self.runtime.credentials,
                settings.request_timeout_seconds,
                lambda: self.runtime.closed,
            )
            showInfo("Connection settings saved.")
            self.refresh_status()
        except ValueError as error:
            showWarning(str(error))

    def exec(self):
        return self.dialog.exec()


class DeviceLinkDialog:
    def __init__(self, parent, runtime, on_linked=None):
        from aqt.qt import QDialog, QLabel, QPushButton, QVBoxLayout

        self.runtime = runtime
        self.on_linked = on_linked
        self.link_code = None
        self.approval_url = None
        self.polling = False
        self.poll_attempts = 0
        self.dialog = QDialog(parent)
        self.dialog.setWindowTitle("Sign in to SnapOrtho")
        self.dialog.resize(480, 280)
        layout = QVBoxLayout(self.dialog)
        self.status = QLabel(
            "Continue in your browser to sign in. Your credential is stored securely in macOS Keychain."
        )
        self.status.setWordWrap(True)
        self.code = QLabel("")
        self.code.setStyleSheet("font-size: 22px; font-weight: 700; letter-spacing: 2px;")
        self.start_button = QPushButton("Continue in browser")
        self.start_button.clicked.connect(self.start)
        self.poll_button = QPushButton("Open browser again")
        self.poll_button.clicked.connect(self.poll)
        self.continue_button = QPushButton("Continue to Master Deck")
        self.continue_button.clicked.connect(self._continue_master)
        self.continue_button.hide()
        self.close_button = QPushButton("Close")
        self.close_button.clicked.connect(self.dialog.accept)
        self.close_button.hide()
        layout.addWidget(self.status)
        layout.addWidget(self.code)
        layout.addWidget(self.start_button)
        layout.addWidget(self.poll_button)
        layout.addWidget(self.continue_button)
        layout.addWidget(self.close_button)

    def show_linked(self, reviewer=None):
        title, detail = linked_copy(reviewer)
        self.status.setText(f"<h2 style='color:#087f5b'>✓ {title}</h2><p>{detail}</p>"
                            f"<p>Next: download the SnapOrtho Master Deck.</p>")
        self.code.hide()
        self.start_button.hide()
        self.poll_button.hide()
        self.continue_button.show()
        self.continue_button.setDefault(True)
        self.close_button.show()

    def _continue_master(self):
        self.dialog.accept()
        if self.on_linked:
            self.on_linked()
        else:
            from .master_deck import MasterDeckDialog

            MasterDeckDialog(self.runtime.mw, self.runtime).exec()

    def start(self):
        def done(future):
            try:
                _, body = future.result()
                self.link_code = body.get("linkCode")
                self.approval_url = body.get("approvalUrl")
                self.polling = False
                self.poll_attempts = 0
                self.code.setText(self.link_code or "")
                self.status.setText("Waiting for browser confirmation…")
                if self.approval_url:
                    from aqt.utils import openLink
                    openLink(self.approval_url)
                    self.approval_url = None
                self.polling = True
                self.poll_attempts = 0
                self._poll_once()
            except Exception as error:
                from .errors import describe

                self.status.setText(f"Link error: {describe(error)}")

        self.runtime.background(
            lambda: self.runtime.api.start_link("SnapOrtho Anki"), done
        )

    def poll(self):
        if not self.link_code:
            return
        if self.approval_url:
            from aqt.utils import openLink

            openLink(self.approval_url)
            self.approval_url = None
        if self.polling:
            return
        self.polling = True
        self.poll_attempts = 0
        self.status.setText("Waiting for browser approval…")
        self._poll_once()

    def _poll_once(self):
        if not self.polling:
            return
        self.poll_attempts += 1

        def done(future):
            try:
                _, body = future.result()
                if body.get("status") == "pending":
                    if self.poll_attempts >= 60:
                        self.polling = False
                        self.status.setText("Approval timed out; choose Open Approval Page to try again.")
                        return
                    from aqt.qt import QTimer

                    self.status.setText("Waiting for browser approval…")
                    QTimer.singleShot(2000, self._poll_once)
                    return
                token = body.pop("deviceToken", None)
                if not token:
                    self.polling = False
                    self.status.setText(f"Link status: {body.get('status', 'failed')}")
                    return
                self.runtime.credentials.set(token)
                token = None
                try:
                    _, reviewer = self.runtime.api.me()
                    self.show_linked(reviewer)
                except Exception:
                    self.show_linked()
                self.polling = False
            except Exception as error:
                from .errors import describe

                self.polling = False
                self.status.setText(f"Link error: {describe(error)}")

        self.runtime.background(lambda: self.runtime.api.poll_link(self.link_code), done)

    def exec(self):
        return self.dialog.exec()


class DiagnosticsDialog:
    def __init__(self, parent, runtime):
        from aqt.qt import QApplication, QDialog, QPushButton, QTextEdit, QVBoxLayout

        from .diagnostics import build
        from .sync import recovery_diagnostic

        self.dialog = QDialog(parent)
        self.dialog.setWindowTitle("SnapOrtho Safe Diagnostics")
        layout = QVBoxLayout(self.dialog)
        data = build(
            {
                "ankiVersion": __import__("anki").version,
                "qtVersion": __import__("aqt.qt").qtmajor,
                "profileHash": runtime.profile_hash,
                "pendingDrafts": len(runtime.store.pending()),
                "pendingRetries": len(runtime.store.pending()),
                "deckSubscription": runtime.store.deck_subscription(),
                "deckRecoveryInventory": recovery_diagnostic(runtime.mw.col),
                "pendingDeckJournal": len(runtime.store.pending_deck_journal()),
            },
            runtime.settings,
            bool(runtime.credentials.get()),
        )
        self.text = QTextEdit(json.dumps(data, indent=2))
        self.text.setReadOnly(True)
        copy = QPushButton("Copy Safe Diagnostics")
        copy.clicked.connect(lambda: QApplication.clipboard().setText(self.text.toPlainText()))
        layout.addWidget(self.text)
        layout.addWidget(copy)

    def exec(self):
        return self.dialog.exec()
