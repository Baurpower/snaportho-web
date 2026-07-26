"""SnapOrtho Master Deck hub — first-run onboarding + updates.

States:
  A) Not linked → link device
  B) Linked, no local Master markers → download starter .apkg
  C) Linked, markers present → check / apply updates
  D) Typed errors with honest copy
"""
from __future__ import annotations

import hashlib
import json
import os
import urllib.request

from .errors import describe, headline
from .sync import chunk_list, installed_card_inventory, merge_sync_plan_actions

STEP_LINK, STEP_INSTALL, STEP_UPDATE = 1, 2, 3

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
"""


def has_master_markers(col) -> bool:
    return bool(installed_card_inventory(col))


def plan_counts(plan) -> dict:
    counts = {}
    for action in (plan or {}).get("actions", []):
        kind = action.get("action")
        counts[kind] = counts.get(kind, 0) + 1
    return counts


class MasterDeckDialog:
    def __init__(self, parent, runtime):
        from aqt.qt import (
            QDialog,
            QFrame,
            QHBoxLayout,
            QLabel,
            QPlainTextEdit,
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
        self._busy = False

        self.dialog = QDialog(parent)
        self.dialog.setWindowTitle("SnapOrtho Master Deck")
        self.dialog.resize(760, 620)
        self.dialog.setStyleSheet(HUB_STYLE)

        root = QVBoxLayout(self.dialog)
        root.setContentsMargins(18, 16, 18, 14)
        root.setSpacing(12)

        # Header
        title = QLabel("SnapOrtho Master Deck")
        title.setObjectName("title")
        self.subtitle = QLabel("")
        self.subtitle.setObjectName("subtitle")
        self.subtitle.setWordWrap(True)
        header_row = QHBoxLayout()
        header_left = QVBoxLayout()
        header_left.addWidget(title)
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
        refresh = QPushButton("Refresh status")
        refresh.setObjectName("secondary")
        refresh.clicked.connect(self.refresh)
        close = QPushButton("Close")
        close.setObjectName("secondary")
        close.clicked.connect(self.dialog.accept)
        footer.addWidget(refresh)
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
            STEP_UPDATE: "3 · Stay up to date",
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
        inventory = installed_card_inventory(self.runtime.mw.col)
        has_markers = bool(inventory)

        def release_done(future):
            try:
                _, body = future.result()
                self.release = body.get("release") or body
            except Exception as error:
                self._show_release_error(error, has_markers, inventory)
                return
            if not has_markers:
                self._show_install(self.release)
                return
            self._load_plan(self.release, inventory)

        self.runtime.background(self.runtime.api.current_deck_release, release_done)

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
            "you should see that you're up to date.",
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
                    + "<br><br>Apply updates only writes central content. "
                    "Your review scheduling and Personal_* fields stay untouched."
                    + conflict_note,
                    "info",
                )
                self._set_actions(
                    "Apply updates" if changes > 0 else "Re-check",
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

        timeout = self.runtime.settings.request_timeout_seconds
        # Media-rich master packages can be ~1GB; allow long transfers.
        download_timeout = max(int(timeout or 60), 3600)

        def work():
            _, desc = self.runtime.api.deck_bootstrap_apkg(release_id)
            url = desc["url"]
            checksum = (desc.get("checksum") or desc.get("artifactChecksum") or "").lower()
            filename = desc.get("filename") or f"SnapOrtho-Master-{version}.apkg"
            expected = desc.get("byteSize") or desc.get("byte_size")
            # Stream to a temp file (no 200MB cap) so full media packages download safely.
            tmp_dir = tempfile.mkdtemp(prefix="snaportho-bootstrap-")
            tmp_path = os.path.join(tmp_dir, filename if filename.endswith(".apkg") else f"{filename}.apkg")
            digest = hashlib.sha256()
            written = 0
            req = urllib.request.Request(url, headers={"User-Agent": "SnapOrtho-Anki-Addon"})
            with urllib.request.urlopen(req, timeout=download_timeout) as response:
                with open(tmp_path, "wb") as handle:
                    while True:
                        chunk = response.read(1024 * 1024)  # 1 MiB
                        if not chunk:
                            break
                        handle.write(chunk)
                        digest.update(chunk)
                        written += len(chunk)
            hex_digest = digest.hexdigest()
            if checksum and hex_digest != checksum:
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
                raise RuntimeError(f"checksum_mismatch:expected={checksum}:got={hex_digest}")
            if expected is not None:
                try:
                    expected_n = int(expected)
                except (TypeError, ValueError):
                    expected_n = None
                if expected_n is not None and expected_n > 0 and written != expected_n:
                    raise RuntimeError(f"size_mismatch:expected={expected_n}:got={written}")
            return tmp_path, tmp_dir, filename, hex_digest, written, desc

        def done(future):
            self._busy = False
            tmp_path = tmp_dir = None
            try:
                tmp_path, tmp_dir, filename, digest, written, desc = future.result()
            except Exception as error:
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
            size_mb = round(written / (1024 * 1024), 1)
            self._set_hero(
                f"<b>SnapOrtho Master deck saved.</b><br><br>"
                f"<code>{path}</code><br>"
                f"Size: <b>{size_mb} MB</b><br>"
                f"SHA-256 verified: <code>{digest[:16]}…</code><br><br>"
                "<b>Next:</b> In Anki choose <b>File → Import</b> and select this file "
                "(or drag it onto the Anki window). When import finishes, click "
                "<b>I've already imported it — refresh</b>.",
                "ok",
            )
            self._set_actions(
                "I've already imported it — refresh",
                self.refresh,
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
        self._set_hero("Downloading the latest content and applying updates…", "info")
        release_id = self.plan.get("targetReleaseId") or self.release.get("id")
        actions = self.plan.get("actions", [])
        timeout = self.runtime.settings.request_timeout_seconds

        def fetch():
            from .deck_update import build_operations

            _, manifest = self.runtime.api.deck_manifest(release_id)
            ops = build_operations(actions, manifest.get("cards", []))
            media = {}
            for sha in ops["media"]:
                try:
                    _, desc = self.runtime.api.deck_media(release_id, sha)
                    with urllib.request.urlopen(desc["url"], timeout=timeout) as response:
                        data = response.read(20_000_000)
                    if hashlib.sha256(data).hexdigest() == sha:
                        media[sha] = (desc["logicalFilename"], data)
                except Exception:
                    pass
            return manifest, ops, media

        def done(future):
            self._busy = False
            try:
                manifest, ops, media = future.result()
            except Exception as error:
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
            for filename, data in media.values():
                try:
                    if not gateway.has_media(filename):
                        gateway.write_media(filename, data)
                    written += 1
                except Exception:
                    pass
            summary = apply_operations(gateway, ops)
            summary["media"] = written
            if not summary["errors"]:
                version = self.release.get("release_version") or self.release.get("releaseVersion")
                if version:
                    self.runtime.store.cache("installed_master_release", version)
            self.runtime.mw.reset()
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
            self._set_hero("<br>".join(lines).replace("\n", "<br>"), "ok" if not summary["errors"] else "info")
            self._set_actions("Refresh status", self.refresh)
            self.details.setPlainText("\n".join(lines))

        self.runtime.background(fetch, done)

    def exec(self):
        return self.dialog.exec()
