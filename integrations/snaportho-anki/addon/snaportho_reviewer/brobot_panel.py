"""Minimal user side panel: card-scoped BroBot follow-up conversations."""
from __future__ import annotations

import html
import re

ATTENDING_PROMPT = "What would an attending ask related to this?"
OITE_PROMPT = "What is a common OITE board trap or question?"
MAX_HISTORY_MESSAGES = 20
MAX_CONTEXT_CHARS = 30000


def plain_text(value):
    """Convert rendered/card HTML into compact model-safe plain text."""
    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", str(value or ""))
    # Reveal cloze content without leaking Anki's {{c1::...}} syntax.
    text = re.sub(r"\{\{c\d+::(.*?)(?:::[^{}]*?)?\}\}", r"\1", text)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</(div|p|li|tr|h[1-6])>", "\n", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = html.unescape(text).replace("\xa0", " ")
    return re.sub(r"[ \t]+", " ", re.sub(r"\n{3,}", "\n\n", text)).strip()


def card_context(card):
    """Build the small, explicit card payload sent only after a user action."""
    note = card.note()
    names = list(note.keys())
    values = {name: plain_text(note[name]) for name in names}
    question = values.get("Front") or values.get("Text") or plain_text(card.question())
    answer = values.get("Back") or values.get("Extra") or plain_text(card.answer())
    topic = (
        values.get("Topic")
        or values.get("Title")
        or next((tag.split("::")[-1] for tag in note.tags if tag.startswith("SnapOrtho::")), "")
        or (question.splitlines()[0][:100] if question else "Current card")
    )
    key = f"{getattr(note, 'guid', note.id)}:{card.ord}"
    try:
        deck = card.col.decks.name(card.did)
    except Exception:
        deck = ""
    return {
        "key": key,
        "topic": topic[:300],
        "question": question[:MAX_CONTEXT_CHARS],
        "answer": answer[:MAX_CONTEXT_CHARS],
        "deck": deck[:500],
        "tags": list(note.tags or [])[:100],
    }


def chat_payload(message, context, conversation=None):
    conversation = conversation or {}
    history = list(conversation.get("messages") or [])[-MAX_HISTORY_MESSAGES:]
    return {
        "message": message.strip(),
        "conversationId": conversation.get("conversationId"),
        "card": context,
        "history": [
            {"role": row["role"], "content": row["content"]}
            for row in history
            if row.get("role") in ("user", "assistant") and row.get("content")
        ],
    }


def deck_footer_text(installed_release, latest_release, card_count):
    installed_release = str(installed_release or "").strip()
    latest_release = str(latest_release or "").strip()
    if not card_count:
        return (
            f"Master Deck not installed · Latest {latest_release}"
            if latest_release
            else "Master Deck not installed"
        )
    if installed_release and latest_release and installed_release != latest_release:
        return f"Master Deck {installed_release} → {latest_release} · Update available"
    if installed_release:
        return f"Master Deck {installed_release} · Up to date"
    if latest_release:
        return f"Master Deck · {card_count} cards · Latest {latest_release}"
    return f"Master Deck · {card_count} cards"


PANEL_STYLE = """
QWidget#snapOrthoPanel { background: #f7f8fb; }
QFrame#headerCard {
  background: #17233b; border: none; border-radius: 14px;
}
QLabel#brand { color: #ffffff; font-size: 19px; font-weight: 700; }
QLabel#eyebrow {
  color: #93c5fd; font-size: 10px; font-weight: 700;
  letter-spacing: 0.8px;
}
QLabel#topic { color: #dbeafe; font-size: 12px; }
QTextBrowser#conversation {
  background: transparent; border: none; padding: 0; color: #172033;
}
QPushButton#prompt {
  text-align: left; background: #ffffff; color: #17233b;
  border: 1px solid #dbe3ef; border-radius: 12px; padding: 11px 12px;
  font-size: 12px; font-weight: 650;
}
QPushButton#prompt:hover { background: #eef5ff; border-color: #7db5ff; }
QPushButton#prompt:pressed { background: #dbeafe; }
QPlainTextEdit#composer {
  background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px;
  padding: 9px 10px; color: #0f172a; font-size: 12px;
}
QPlainTextEdit#composer:focus { border: 1px solid #4f8fe8; }
QLabel#footer {
  background: transparent; color: #64748b; border-top: 1px solid #e2e8f0;
  padding: 9px 2px 2px 2px; font-size: 10px; font-weight: 600;
}
QLabel#notice { color: #92400e; font-size: 11px; padding: 3px; }
"""


class LearnerSidePanel:
    def __init__(self, mw, runtime):
        from aqt.qt import (
            QDockWidget,
            QFrame,
            QLabel,
            QPlainTextEdit,
            QPushButton,
            QTextBrowser,
            QVBoxLayout,
            QWidget,
            Qt,
        )

        self.mw = mw
        self.runtime = runtime
        self.card = None
        self.context = None
        self.card_key = None
        self.conversations = {}
        self.busy = False

        self.dock = QDockWidget("BroBot", mw)
        self.dock.setObjectName("snaportho_learner_side_panel")
        self.dock.setMinimumWidth(310)
        self.dock.setAllowedAreas(
            Qt.DockWidgetArea.LeftDockWidgetArea | Qt.DockWidgetArea.RightDockWidgetArea
        )

        root_widget = QWidget()
        root_widget.setObjectName("snapOrthoPanel")
        root_widget.setStyleSheet(PANEL_STYLE)
        root = QVBoxLayout(root_widget)
        root.setContentsMargins(10, 10, 10, 7)
        root.setSpacing(9)

        header = QFrame()
        header.setObjectName("headerCard")
        header_layout = QVBoxLayout(header)
        header_layout.setContentsMargins(13, 12, 13, 12)
        header_layout.setSpacing(3)
        eyebrow = QLabel("SNAPORTHO  ·  CARD COMPANION")
        eyebrow.setObjectName("eyebrow")
        brand = QLabel("BroBot")
        brand.setObjectName("brand")
        self.topic = QLabel("Open a card to start")
        self.topic.setObjectName("topic")
        self.topic.setWordWrap(True)
        header_layout.addWidget(eyebrow)
        header_layout.addWidget(brand)
        header_layout.addWidget(self.topic)
        root.addWidget(header)

        self.conversation = QTextBrowser()
        self.conversation.setObjectName("conversation")
        self.conversation.setOpenExternalLinks(True)
        self.conversation.setHtml(self._empty_html())
        self.conversation.setMaximumHeight(84)
        root.addWidget(self.conversation, 1)

        self.attending = QPushButton(ATTENDING_PROMPT)
        self.attending.setObjectName("prompt")
        self.attending.setWordWrap(True) if hasattr(self.attending, "setWordWrap") else None
        self.attending.clicked.connect(lambda: self.send_prompt(ATTENDING_PROMPT))
        self.oite = QPushButton(OITE_PROMPT)
        self.oite.setObjectName("prompt")
        self.oite.clicked.connect(lambda: self.send_prompt(OITE_PROMPT))
        root.addWidget(self.attending)
        root.addWidget(self.oite)

        self.notice = QLabel("")
        self.notice.setObjectName("notice")
        self.notice.setWordWrap(True)
        self.notice.hide()
        root.addWidget(self.notice)

        panel = self
        class FollowupComposer(QPlainTextEdit):
            def keyPressEvent(inner, event):
                submit = event.key() in (
                    Qt.Key.Key_Return,
                    Qt.Key.Key_Enter,
                ) and not (event.modifiers() & Qt.KeyboardModifier.ShiftModifier)
                if submit:
                    panel.send_composer()
                    return
                super().keyPressEvent(event)

        self.composer = FollowupComposer()
        self.composer.setObjectName("composer")
        self.composer.setPlaceholderText("Ask a follow-up…")
        self.composer.setMaximumHeight(62)
        self.composer.setToolTip("Press Enter to send · Shift+Enter for a new line")
        root.addWidget(self.composer)

        self.footer = QLabel("Master Deck · Checking version…")
        self.footer.setObjectName("footer")
        root.addWidget(self.footer)

        self.dock.setWidget(root_widget)
        mw.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.dock)
        self._set_enabled(False)
        self.refresh_deck_footer()

    def _empty_html(self):
        return (
            "<div style='color:#52627a; padding:5px 3px; line-height:1.35'>"
            "<b style='color:#17233b'>Go deeper on this card.</b><br>"
            "Choose a teaching prompt or type a follow-up. "
            "<span style='color:#8491a5'>Nothing is sent until you ask.</span></div>"
        )

    def _set_enabled(self, enabled):
        linked = False
        try:
            linked = bool(self.runtime.credentials.get())
        except Exception:
            pass
        active = bool(enabled and linked and not self.busy)
        for widget in (self.attending, self.oite, self.composer):
            widget.setEnabled(active)
        if enabled and not linked:
            self.notice.setText("Sign in to SnapOrtho from Tools → SnapOrtho → Get Started.")
            self.notice.show()
        elif not self.busy:
            self.notice.hide()

    def update(self, card):
        if card is None:
            self.card = self.context = self.card_key = None
            self.topic.setText("Open a card to start")
            self.conversation.setHtml(self._empty_html())
            self._set_enabled(False)
            return
        try:
            context = card_context(card)
        except Exception:
            return
        self.card = card
        self.context = context
        self.card_key = context["key"]
        self.topic.setText(f"Current card · {context['topic']}")
        self._render()
        self._set_enabled(True)

    def send_composer(self):
        self.send_prompt(self.composer.toPlainText())

    def send_prompt(self, message):
        message = (message or "").strip()
        if not message or not self.context or self.busy:
            return
        conversation = self.conversations.setdefault(
            self.card_key, {"conversationId": None, "messages": []}
        )
        payload = chat_payload(message, self.context, conversation)
        conversation["messages"].append({"role": "user", "content": message})
        self.composer.clear()
        self.busy = True
        self.notice.setText("BroBot is thinking…")
        self.notice.show()
        self._set_enabled(True)
        self._render()

        request_key = self.card_key

        def done(future):
            self.busy = False
            current = self.conversations.setdefault(
                request_key, {"conversationId": None, "messages": []}
            )
            try:
                _, body = future.result()
                current["conversationId"] = body.get("conversationId")
                current["messages"].append(
                    {"role": "assistant", "content": body.get("answer") or "No answer returned."}
                )
                self.notice.hide()
            except Exception as error:
                from .errors import describe

                current["messages"].append(
                    {"role": "error", "content": describe(error)}
                )
                self.notice.setText("BroBot could not answer. Your question is still shown below.")
                self.notice.show()
            if self.card_key == request_key:
                self._render()
                self._set_enabled(True)

        self.runtime.background(lambda: self.runtime.api.brobot_chat(payload), done)

    def _render(self):
        conversation = self.conversations.get(self.card_key) or {}
        messages = conversation.get("messages") or []
        if not messages:
            self.conversation.setHtml(self._empty_html())
            self.conversation.setMaximumHeight(84)
            self.attending.show()
            self.oite.show()
            return
        blocks = []
        for row in messages:
            role = row.get("role")
            content = html.escape(row.get("content") or "").replace("\n", "<br>")
            if role == "user":
                blocks.append(
                    "<div style='margin:10px 0 10px 28px;padding:9px 10px;"
                    "background:#dbeafe;border-radius:10px;color:#1e3a5f'>"
                    f"{content}</div>"
                )
            elif role == "assistant":
                blocks.append(
                    "<div style='margin:10px 24px 10px 0;padding:9px 10px;"
                    "background:#f1f5f9;border-radius:10px;color:#172033'>"
                    f"{content}</div>"
                )
            else:
                blocks.append(
                    "<div style='margin:8px 0;color:#b45309;font-size:11px'>"
                    f"{content}</div>"
                )
        self.conversation.setHtml("".join(blocks))
        self.conversation.setMaximumHeight(16777215)
        bar = self.conversation.verticalScrollBar()
        bar.setValue(bar.maximum())
        self.attending.hide()
        self.oite.hide()

    def refresh_deck_footer(self):
        from .sync import installed_card_inventory

        try:
            inventory = installed_card_inventory(self.mw.col)
        except Exception:
            inventory = []
        installed = self.runtime.store.cached("installed_master_release")
        self.footer.setText(deck_footer_text(installed, None, len(inventory)))
        try:
            linked = bool(self.runtime.credentials.get())
        except Exception:
            linked = False
        if not linked:
            return

        def done(future):
            try:
                _, body = future.result()
                release = body.get("release") or body
                latest = release.get("release_version") or release.get("releaseVersion")
                self.footer.setText(
                    deck_footer_text(
                        self.runtime.store.cached("installed_master_release"),
                        latest,
                        len(inventory),
                    )
                )
            except Exception:
                pass

        self.runtime.background(self.runtime.api.current_deck_release, done)

    def close(self):
        self.dock.close()
        self.dock.deleteLater()
