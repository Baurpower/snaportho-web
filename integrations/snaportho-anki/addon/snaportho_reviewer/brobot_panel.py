"""Minimal user side panel: card-scoped BroBot follow-up conversations."""
from __future__ import annotations

import html
import re
import uuid

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


def chat_payload(
    message,
    context,
    conversation=None,
    mode="auto",
    response_depth="standard",
    training_level="pgy2",
    source="manual",
    source_message_id=None,
):
    conversation = conversation or {}
    if conversation.get("conversationId"):
        card_prompt = message.strip()
    else:
        card_prompt = (
            "Use this Anki card as the primary context for my question.\n\n"
            f"Card topic: {context.get('topic') or 'Current card'}\n"
            f"Card front: {context.get('question') or ''}\n"
            f"Card back: {context.get('answer') or ''}\n\n"
            f"My question: {message.strip()}"
        )
    payload = {
        "message": card_prompt,
        "prompt": card_prompt,
        "mode": mode,
        "responseDepth": response_depth,
        "trainingLevel": training_level,
        "source": source,
        "stream": False,
    }
    if source_message_id:
        payload["sourceMessageId"] = source_message_id
    conversation_id = conversation.get("conversationId")
    try:
        payload["conversationId"] = str(uuid.UUID(str(conversation_id)))
    except (ValueError, TypeError, AttributeError):
        # The API contract makes this field optional, but does not accept null
        # or stale non-UUID values. Omitting it starts a fresh conversation.
        pass
    return payload


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
QFrame#headerCard { background: transparent; border: none; }
QLabel#brand { color: #17233b; font-size: 20px; font-weight: 800; }
QLabel#eyebrow { color: #0f8f83; font-size: 10px; font-weight: 700; }
QLabel#topic { color: #64748b; font-size: 11px; }
QTextBrowser#conversation {
  background: transparent; border: none; padding: 0; color: #172033;
}
QPushButton#prompt {
  text-align: left; background: #ffffff; color: #334155;
  border: 1px solid #dbe3ef; border-radius: 9px; padding: 9px 10px;
  font-size: 11px; font-weight: 650;
}
QPushButton#prompt:hover { background: #f0fdfa; border-color: #5eead4; }
QPushButton#prompt:pressed { background: #ccfbf1; }
QPlainTextEdit#composer {
  background: #ffffff; border: 1px solid #cbd5e1; border-radius: 9px;
  padding: 8px 9px; color: #0f172a; font-size: 12px;
}
QPlainTextEdit#composer:focus { border: 1px solid #14b8a6; }
QPushButton#send {
  background: #0d9488; color: white; border: none; border-radius: 9px;
  min-width: 38px; padding: 9px; font-weight: 700;
}
QPushButton#send:hover { background: #0f766e; }
QPushButton#newChat {
  background: #ffffff; color: #475569; border: 1px solid #e2e8f0;
  border-radius: 7px; padding: 5px 8px; font-size: 10px; font-weight: 650;
}
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
            QHBoxLayout,
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
        header_layout.setContentsMargins(2, 4, 2, 5)
        header_layout.setSpacing(2)
        eyebrow = QLabel("SNAPORTHO")
        eyebrow.setObjectName("eyebrow")
        title_row = QHBoxLayout()
        brand = QLabel("BroBot Chat")
        brand.setObjectName("brand")
        self.new_chat = QPushButton("New chat")
        self.new_chat.setObjectName("newChat")
        self.new_chat.clicked.connect(self.start_new_chat)
        title_row.addWidget(brand)
        title_row.addStretch(1)
        title_row.addWidget(self.new_chat)
        self.topic = QLabel("Open a card to start")
        self.topic.setObjectName("topic")
        self.topic.setWordWrap(True)
        header_layout.addWidget(eyebrow)
        header_layout.addLayout(title_row)
        header_layout.addWidget(self.topic)
        root.addWidget(header)

        self.conversation = QTextBrowser()
        self.conversation.setObjectName("conversation")
        self.conversation.setOpenExternalLinks(True)
        self.conversation.setOpenLinks(False)
        self.conversation.anchorClicked.connect(self._open_conversation_link)
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

        composer_row = QHBoxLayout()
        composer_row.setSpacing(6)
        self.composer = FollowupComposer()
        self.composer.setObjectName("composer")
        self.composer.setPlaceholderText("Ask a follow-up…")
        self.composer.setMaximumHeight(62)
        self.composer.setToolTip("Press Enter to send · Shift+Enter for a new line")
        self.send = QPushButton("➤")
        self.send.setObjectName("send")
        self.send.setToolTip("Send message")
        self.send.clicked.connect(self.send_composer)
        composer_row.addWidget(self.composer, 1)
        composer_row.addWidget(self.send)
        root.addLayout(composer_row)

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
        for widget in (self.attending, self.oite, self.composer, self.send):
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

    def send_prompt(self, message, source="manual", source_message_id=None):
        message = (message or "").strip()
        if not message or not self.context or self.busy:
            return
        conversation = self.conversations.setdefault(
            self.card_key, {"conversationId": None, "messages": []}
        )
        payload = chat_payload(
            message,
            self.context,
            conversation,
            "auto",
            "standard",
            "pgy2",
            source,
            source_message_id,
        )
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
                    {
                        "role": "assistant",
                        "content": body.get("answer") or "No answer returned.",
                        "response": body,
                    }
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
                response = row.get("response") or {}
                mode = html.escape(str(response.get("detectedMode") or "general").replace("_", " ").title())
                confidence = response.get("confidence")
                meta = mode
                if isinstance(confidence, (int, float)):
                    meta += f" · {round(confidence * 100)}% confidence"
                sections = []
                for title, key in (
                    ("Important Concepts", "priorityPoints"),
                    ("What Most Residents Miss", "whatMostResidentsMiss"),
                    ("What to Learn Next", "knowledgeGaps"),
                ):
                    items = response.get(key) or []
                    if items:
                        rendered = "".join(
                            f"<li style='margin:4px 0'>{html.escape(str(item))}</li>"
                            for item in items
                        )
                        sections.append(
                            f"<div style='margin-top:12px;color:#64748b;font-size:10px;"
                            f"font-weight:700;text-transform:uppercase'>{title}</div>"
                            f"<ul style='margin:5px 0 0 16px;padding:0'>{rendered}</ul>"
                        )
                blocks.append(
                    "<div style='margin:10px 8px 10px 0;padding:12px;"
                    "background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;color:#172033'>"
                    f"<div style='color:#0f766e;font-size:10px;font-weight:700'>{meta}</div>"
                    f"<div style='margin-top:9px;line-height:1.45'>{content}</div>"
                    f"{''.join(sections)}</div>"
                )
            else:
                blocks.append(
                    "<div style='margin:8px 0;color:#b45309;font-size:11px'>"
                    f"{content}</div>"
                )
        latest = next(
            (row.get("response") or {} for row in reversed(messages) if row.get("role") == "assistant"),
            {},
        )
        questions = latest.get("nextLearningBranches") or latest.get("suggestedQuestions") or []
        chips = []
        for index, item in enumerate(questions[:5]):
            label = item.get("label") if isinstance(item, dict) else item
            if label:
                chips.append(
                    "<a style='display:block;margin:5px 0;padding:7px 9px;"
                    "color:#0f766e;text-decoration:none;background:#f0fdfa;"
                    "border:1px solid #99f6e4;border-radius:9px' "
                    f"href='brobot-followup:{index}'>{html.escape(str(label))}</a>"
                )
        followups = (
            "<div style='margin:12px 2px 5px;color:#64748b;font-size:10px;"
            "font-weight:700'>KEEP LEARNING</div>" + "".join(chips)
            if chips else ""
        )
        self.conversation.setHtml("".join(blocks) + followups)
        self.conversation.setMaximumHeight(16777215)
        bar = self.conversation.verticalScrollBar()
        bar.setValue(bar.maximum())
        self.attending.hide()
        self.oite.hide()

    def _open_conversation_link(self, url):
        raw = url.toString()
        if not raw.startswith("brobot-followup:") or self.busy:
            return
        try:
            index = int(raw.split(":", 1)[1])
            messages = (self.conversations.get(self.card_key) or {}).get("messages") or []
            latest = next(
                (row.get("response") or {} for row in reversed(messages) if row.get("role") == "assistant"),
                {},
            )
            questions = latest.get("nextLearningBranches") or latest.get("suggestedQuestions") or []
            item = questions[index]
            label = item.get("label") if isinstance(item, dict) else item
            self.send_prompt(
                str(label),
                "branch_selection" if isinstance(item, dict) else "suggested_question",
                latest.get("messageId"),
            )
        except (IndexError, TypeError, ValueError):
            return

    def start_new_chat(self):
        if not self.card_key or self.busy:
            return
        self.conversations[self.card_key] = {"conversationId": None, "messages": []}
        self._render()

    def refresh_deck_footer(self):
        from .sync import installed_deck_presence

        try:
            presence = installed_deck_presence(self.mw.col, self.runtime.store)
        except Exception:
            presence = {"installed": False, "inventory": [], "markerCards": 0, "masterNotes": 0, "subscription": None}
        inventory = presence.get("inventory") or []
        card_count = max(len(inventory), int(presence.get("masterNotes") or 0))
        if presence.get("installed") and card_count == 0:
            card_count = 1
        subscription = presence.get("subscription")
        installed = (subscription or {}).get("releaseVersion") or self.runtime.store.cached("installed_master_release")
        self.footer.setText(deck_footer_text(installed, None, card_count))
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
                latest = (
                    release.get("version")
                    or release.get("releaseVersion")
                    or release.get("release_version")
                )
                self.footer.setText(
                    deck_footer_text(
                        (self.runtime.store.deck_subscription() or {}).get("releaseVersion")
                        or self.runtime.store.cached("installed_master_release"),
                        latest,
                        card_count,
                    )
                )
            except Exception:
                pass

        self.runtime.background(self.runtime.api.deck_v2_status, done)

    def close(self):
        self.dock.close()
        self.dock.deleteLater()
