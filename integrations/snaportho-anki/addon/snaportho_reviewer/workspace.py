import json,re,uuid
from .errors import describe
from .version import ADDON_VERSION
PERSONAL_PREFIXES=("personal::","personal_","user::","local::")
# Structured curation vocabulary. Reviewers pick from these instead of free-typing
# level/yield tags, so the deck stays consistently tagged (the whole product thesis).
# Tag values must satisfy the server's central-tag pattern (SnapOrtho:: namespace).
LEVEL_TAGS=[("—",None),("Medical student","SnapOrtho::Level::MedicalStudent"),("Resident","SnapOrtho::Level::Resident"),("Fellow","SnapOrtho::Level::Fellow"),("Attending","SnapOrtho::Level::Attending")]
YIELD_TAGS=[("—",None),("High yield","SnapOrtho::Yield::High"),("Moderate yield","SnapOrtho::Yield::Moderate"),("Low yield","SnapOrtho::Yield::Low")]
STRUCTURED_PREFIXES=("SnapOrtho::Level::","SnapOrtho::Yield::")
CENTRAL_TAG_RE=re.compile(r"^SnapOrtho::[A-Za-z0-9_:-]+(?:[ :]{0,2}[A-Za-z0-9_:-]+)*$")
def is_personal_name(value):return value.strip().lower().startswith(PERSONAL_PREFIXES)
def central_fields(fields):return[{"name":x["name"],"value":x["value"]}for x in fields if not is_personal_name(x["name"])]
def central_tags(tags):return[t for t in tags if not is_personal_name(t)]
def split_structured(tags):
    structured=[t for t in tags if t.startswith(STRUCTURED_PREFIXES)];free=[t for t in tags if not t.startswith(STRUCTURED_PREFIXES)];return structured,free
def combo_for_tag(options,tags):
    for label,tag in options:
        if tag and tag in tags:return label
    return options[0][0]
def tag_for_label(options,label):
    for candidate_label,tag in options:
        if candidate_label==label:return tag
    return None
def _known_structured():return{tag for _,tag in LEVEL_TAGS+YIELD_TAGS if tag}
class CardWorkspace:
    def __init__(self,parent,runtime,card,gateway,source_surface="reviewer",can_previous=False,can_next=False):
        from aqt.qt import (
            QComboBox,QDialog,QFormLayout,QFrame,QHBoxLayout,QLabel,QLineEdit,
            QListWidget,QPlainTextEdit,QPushButton,QScrollArea,QTabWidget,
            QVBoxLayout,QWidget,Qt
        )
        self.runtime=runtime;self.card=card;self.gateway=gateway;self.source_surface=source_surface;self.navigation_action=None;self.resolution=None;self.mapping_changes=[]
        self.dialog=QDialog(parent);self.dialog.setWindowTitle("SnapOrtho Card Workspace");self.dialog.resize(960,760);self.dialog.setMinimumSize(760,620)
        self.dialog.setStyleSheet("""
            QDialog { background: #f8fafc; }
            QLabel#workspaceTitle { font-size: 20px; font-weight: 700; color: #0f172a; }
            QLabel#workspaceSubtitle { color: #64748b; font-size: 12px; }
            QLabel#workspaceStatus { background: #eff6ff; border: 1px solid #bfdbfe;
                border-radius: 8px; padding: 9px 12px; color: #1e3a8a; }
            QTabWidget::pane { border: 1px solid #dbe3ec; border-radius: 8px; background: white; }
            QTabBar::tab { padding: 8px 16px; margin-right: 2px; }
            QTabBar::tab:selected { color: #0369a1; font-weight: 700; }
            QLineEdit, QPlainTextEdit, QListWidget, QComboBox {
                border: 1px solid #cbd5e1; border-radius: 6px; background: white; padding: 5px;
            }
            QPushButton { min-height: 28px; padding: 2px 12px; }
            QPushButton#primaryAction { background: #0369a1; color: white; border: none;
                border-radius: 6px; font-weight: 700; }
            QFrame#sectionCard { background: #f8fafc; border: 1px solid #e2e8f0;
                border-radius: 8px; }
        """)
        root=QVBoxLayout(self.dialog);root.setContentsMargins(16,14,16,14);root.setSpacing(10)
        title=QLabel("Card workspace");title.setObjectName("workspaceTitle");root.addWidget(title)
        subtitle=QLabel("Review the exact changes below, then submit them to the SnapOrtho backend proposal queue. Canonical cards are not changed until the separate approval and incorporation workflow.");subtitle.setObjectName("workspaceSubtitle");subtitle.setWordWrap(True);root.addWidget(subtitle)
        self.status=QLabel("Resolving exact card version…");self.status.setObjectName("workspaceStatus");self.status.setWordWrap(True);root.addWidget(self.status)
        tabs=QTabWidget();root.addWidget(tabs,1)
        fields,tags,deck=gateway.editable(card);self.original_fields=fields;self.has_personal_fields=any(is_personal_name(x["name"])for x in fields);self.editors={}
        field_names={field["name"] for field in fields}
        primary_names=[name for name in ("Text","Front","Back","Extra") if name in field_names]
        resource_names=[name for name in (
            "Orthobullets","Orthobullets_Link","ROCK","ROCK_Link","Classifications",
            "Anatomy","Nailed_It","Nailed_It_Link","Podcasts","Podcasts_Link",
            "Video","Video_Link","Millers","OKU","Campbells","OITE","CasePrep",
            "BroBot","Additional_Resources","Missed_Questions","One_by_one"
        ) if name in field_names]
        classified=set(primary_names)|set(resource_names)
        metadata_names=[field["name"] for field in fields if field["name"] not in classified]
        def field_tab(names,empty_copy):
            host=QWidget();layout=QVBoxLayout(host);layout.setContentsMargins(12,12,12,12)
            if not names:
                empty=QLabel(empty_copy);empty.setStyleSheet("color:#64748b;padding:20px;");layout.addWidget(empty)
            for name in names:
                field=next(x for x in fields if x["name"]==name)
                card_frame=QFrame();card_frame.setObjectName("sectionCard");card_layout=QVBoxLayout(card_frame);card_layout.setContentsMargins(10,8,10,10)
                label_text=name.replace("_"," ")
                if is_personal_name(name):label_text+="  ·  personal, never uploaded"
                label=QLabel(label_text);label.setStyleSheet("font-weight:700;color:#334155;");card_layout.addWidget(label)
                editor=QPlainTextEdit(field["value"]);editor.setAccessibleName(name)
                editor.setPlaceholderText(f"No {label_text.lower()} added")
                editor.setMinimumHeight(90 if name in primary_names else 64)
                editor.setMaximumHeight(180 if name in primary_names else 105)
                if name.startswith("SnapOrtho_"):
                    editor.setReadOnly(True);editor.setMaximumHeight(58)
                    editor.setStyleSheet("background:#f1f5f9;color:#64748b;")
                self.editors[name]=editor;card_layout.addWidget(editor);layout.addWidget(card_frame)
            layout.addStretch(1)
            scroll=QScrollArea();scroll.setWidgetResizable(True);scroll.setFrameShape(QFrame.Shape.NoFrame);scroll.setWidget(host)
            return scroll
        tabs.addTab(field_tab(primary_names,"No primary content fields on this note type."),"Content")
        tabs.addTab(field_tab(resource_names,"No learning-resource fields on this note type."),"Resources")
        metadata_host=QWidget();metadata_layout=QVBoxLayout(metadata_host);metadata_layout.setContentsMargins(12,12,12,12)
        metadata_scroll=field_tab(metadata_names,"No additional metadata fields.")
        metadata_layout.addWidget(metadata_scroll,1)
        existing_central=central_tags(tags);structured,free=split_structured(existing_central);unmatched=[t for t in structured if t not in _known_structured()]
        self.level=QComboBox();self.level.addItems([label for label,_ in LEVEL_TAGS]);self.level.setCurrentText(combo_for_tag(LEVEL_TAGS,structured))
        self.yield_level=QComboBox();self.yield_level.addItems([label for label,_ in YIELD_TAGS]);self.yield_level.setCurrentText(combo_for_tag(YIELD_TAGS,structured))
        self.central_tags_input=QLineEdit(" ".join(free+unmatched));self.deck_path=QLineEdit(deck)
        curation=QFrame();curation.setObjectName("sectionCard");curation_form=QFormLayout(curation);curation_form.addRow("Trainee level",self.level);curation_form.addRow("Yield",self.yield_level);curation_form.addRow("Central tags",self.central_tags_input);curation_form.addRow("Deck path",self.deck_path);metadata_layout.addWidget(curation)
        tabs.addTab(metadata_host,"Metadata")
        kg=QWidget();kg_layout=QVBoxLayout(kg);kg_layout.setContentsMargins(16,16,16,16)
        kg_title=QLabel("Map this card to established concepts");kg_title.setStyleSheet("font-size:16px;font-weight:700;color:#0f172a;");kg_layout.addWidget(kg_title)
        kg_help=QLabel("Search by a clinical concept, review its definition, then choose how this card relates to it. Nothing changes the live graph until a separate review.");kg_help.setWordWrap(True);kg_help.setStyleSheet("color:#64748b;");kg_layout.addWidget(kg_help)
        search_row=QHBoxLayout();self.search=QLineEdit();self.search.setPlaceholderText("Try “bone”, “hematopoiesis”, or “mineral storage”");search_button=QPushButton("Search concepts");search_button.setObjectName("primaryAction");search_button.clicked.connect(self.search_kg);self.search.returnPressed.connect(self.search_kg);search_row.addWidget(self.search,1);search_row.addWidget(search_button);kg_layout.addLayout(search_row)
        self.results=QListWidget();self.results.setMinimumHeight(220);kg_layout.addWidget(self.results,1)
        mapping_row=QHBoxLayout();role_label=QLabel("This card");self.role=QComboBox();self.role.addItems(["teaches","tests","explains","demonstrates","context_only","broadly_related"]);add_mapping=QPushButton("Add mapping");add_mapping.setObjectName("primaryAction");add_mapping.clicked.connect(self.add_mapping);mapping_row.addWidget(role_label);mapping_row.addWidget(self.role);mapping_row.addStretch(1);mapping_row.addWidget(add_mapping);kg_layout.addLayout(mapping_row)
        self.mapping_summary=QLabel("No mapping changes in this proposal.");self.mapping_summary.setWordWrap(True);self.mapping_summary.setStyleSheet("background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;color:#475569;");kg_layout.addWidget(self.mapping_summary);tabs.addTab(kg,"Knowledge graph")
        expansion=QWidget();expansion_layout=QFormLayout(expansion);expansion_layout.setContentsMargins(18,18,18,18)
        expansion_note=QLabel("Use only when no governed entity or alias represents the concept. Expansion requires additional ontology review.");expansion_note.setWordWrap(True);expansion_note.setStyleSheet("background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:8px;color:#9a3412;");expansion_layout.addRow(expansion_note)
        self.expansion_type=QComboBox();self.expansion_type.addItems(["","new_entity","new_alias"]);self.expansion_label=QLineEdit();self.expansion_entity_type=QLineEdit();self.expansion_description=QPlainTextEdit();self.expansion_description.setMaximumHeight(110);self.expansion_rationale=QPlainTextEdit();self.expansion_rationale.setMaximumHeight(110);expansion_layout.addRow("Suggestion",self.expansion_type);expansion_layout.addRow("Preferred label or alias",self.expansion_label);expansion_layout.addRow("Entity type",self.expansion_entity_type);expansion_layout.addRow("Definition",self.expansion_description);expansion_layout.addRow("Why existing entities fail",self.expansion_rationale);tabs.addTab(expansion,"Ontology gap")
        self.notes=QPlainTextEdit();self.notes.setPlaceholderText("Optional reviewer note for this proposal");self.notes.setMaximumHeight(72);root.addWidget(self.notes)
        actions=QHBoxLayout();previous=QPushButton("← Previous");previous.setEnabled(can_previous);previous.clicked.connect(lambda:self.navigate("previous"));next_button=QPushButton("Next →");next_button.setEnabled(can_next);next_button.clicked.connect(lambda:self.navigate("next"));save=QPushButton("Save local draft");save.clicked.connect(self.save_draft);discard=QPushButton("Discard");discard.clicked.connect(self.discard_draft);preview=QPushButton("Preview upload");preview.clicked.connect(self.preview_upload);self.submit_button=QPushButton("Submit proposal to SnapOrtho");self.submit_button.setObjectName("primaryAction");self.submit_button.clicked.connect(self.submit);close=QPushButton("Close");close.clicked.connect(self.dialog.reject);actions.addWidget(previous);actions.addWidget(next_button);actions.addStretch(1);actions.addWidget(discard);actions.addWidget(save);actions.addWidget(preview);actions.addWidget(self.submit_button);actions.addWidget(close);root.addLayout(actions);self._resolve()
    def navigate(self,action):self.navigation_action=action;self.dialog.accept()
    def _identity(self):
        note=self.card.note();return{"noteGuid":note.guid,"cardOrdinal":self.card.ord,"contentHash":self.gateway.content_hash(self.card)}
    def _resolve(self):
        def done(future):
            try:
                _, self.resolution = future.result()
                if self.resolution.get("found") or self.resolution.get("identityResolved"):
                    version = self.resolution.get("versionNumber", "?")
                    nmap = len(self.resolution.get("mappings") or [])
                    message = (
                        f"Master card resolved · v{version} pinned · {nmap} KG link(s). "
                        "Enrich fields below, or use the side panel for quick OB/KG adds."
                    )
                    if self.resolution.get("contentMatches") is False:
                        message += (
                            " (Import hash differs after Master style — normal; not a conflict.)"
                        )
                else:
                    message = "No master card found. This will be submitted as a missing-card proposal."
                if self.source_surface == "browser":
                    message += " Editing from Browse — submit to propose central changes."
                if not self.has_personal_fields:
                    message += " No protected Personal_ field exists on this note type."
                self.status.setText(message)
                self._restore_draft()
            except Exception as error:
                self.status.setText(f"Card resolution failed — {describe(error)}")
        self.runtime.background(lambda: self.runtime.api.resolve_workspace_card(self._identity()), done)
    def search_kg(self):
        query=self.search.text().strip()
        if len(query)<2:self.status.setText("Enter at least two characters to search.");return
        def done(future):
            try:
                _,body=future.result();self.results.clear()
                for entity in body.get("entities",[]):self.results.addItem(f"{entity['label']} — {entity['entityType']}");self.results.item(self.results.count()-1).setData(256,entity)
                self.status.setText(f"Found {self.results.count()} active canonical entities.")
            except Exception as error:self.status.setText(f"KG search failed — {describe(error)}")
        self.runtime.background(lambda:self.runtime.api.search_entities(query),done)
    def add_mapping(self):
        item=self.results.currentItem()
        if not item:self.status.setText("Select a KG concept first.");return
        entity=item.data(256);self.mapping_changes.append({"action":"add","canonicalEntityId":entity["id"],"mappingRole":self.role.currentText(),"useExpansionSuggestion":False,"rationale":"Reviewer-selected correction","confidence":1.0});self.mapping_summary.setText("; ".join(f"{m['mappingRole']}: {m['canonicalEntityId']}" for m in self.mapping_changes))
    def _expansion(self):
        kind=self.expansion_type.currentText()
        if not kind:return None
        selected=self.results.currentItem();existing=selected.data(256)["id"] if kind=="new_alias" and selected else None
        return{"suggestionType":kind,"preferredLabel":self.expansion_label.text().strip(),"entityType":self.expansion_entity_type.text().strip(),"description":self.expansion_description.toPlainText().strip(),"existingEntityId":existing,"rationale":self.expansion_rationale.toPlainText().strip()}
    def _draft_version(self):return self.resolution.get("canonicalCardVersionId","missing-card") if self.resolution else"unresolved"
    def _proposed_tags(self):
        free=central_tags(self.central_tags_input.text().split());structured=[tag for tag in(tag_for_label(LEVEL_TAGS,self.level.currentText()),tag_for_label(YIELD_TAGS,self.yield_level.currentText()))if tag];return sorted(set(free)|set(structured))
    def _invalid_tags(self):return[tag for tag in self._proposed_tags()if not CENTRAL_TAG_RE.match(tag)]
    def _build_payload(self,idempotency_key):
        edited=central_fields([{"name":name,"value":editor.toPlainText()}for name,editor in self.editors.items()]);base=None
        if self.resolution.get("found"):base={"canonicalCardId":self.resolution["canonicalCardId"],"canonicalCardVersionId":self.resolution["canonicalCardVersionId"],"contentHash":self.resolution["contentHash"]}
        old_tags=set(self.resolution.get("centralTags",[])if self.resolution else[]);new_tags=set(self._proposed_tags());expansion=self._expansion();mappings=list(self.mapping_changes)
        if expansion and not mappings:mappings=[{"action":"add","canonicalEntityId":None,"mappingRole":self.role.currentText(),"useExpansionSuggestion":True,"rationale":expansion["rationale"],"confidence":1.0}]
        return{"contractVersion":"snaportho-anki-reviewer.v1","proposalKind":"edit_existing_card" if base else"create_missing_card","sourceSurface":self.source_surface,"baseCard":base,"localIdentity":self._identity(),"editedFields":edited,"centralTagChanges":{"add":sorted(new_tags-old_tags),"remove":sorted(old_tags-new_tags)},"proposedDeckPath":self.deck_path.text().strip()or None,"mappingChanges":mappings,"kgExpansionSuggestion":expansion,"notes":self.notes.toPlainText(),"idempotencyKey":idempotency_key,"clientVersion":ADDON_VERSION}
    def _restore_draft(self):
        identity=self._identity();draft=self.runtime.store.load_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version())
        if not draft:return
        payload=draft["payload"]
        if payload.get("localIdentity",{}).get("contentHash")!=identity["contentHash"]:self.runtime.store.mark_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version(),"conflict");self.status.setText("Manual comparison required: the local card changed after this draft was created.");return
        for field in payload.get("editedFields",[]):
            if field["name"]in self.editors:self.editors[field["name"]].setPlainText(field["value"])
        old=set(self.resolution.get("centralTags",[]));changes=payload.get("centralTagChanges",{});restored=central_tags(sorted((old-set(changes.get("remove",[])))|set(changes.get("add",[]))));structured,free=split_structured(restored);self.level.setCurrentText(combo_for_tag(LEVEL_TAGS,structured));self.yield_level.setCurrentText(combo_for_tag(YIELD_TAGS,structured));self.central_tags_input.setText(" ".join(free+[t for t in structured if t not in _known_structured()]));self.deck_path.setText(payload.get("proposedDeckPath")or self.deck_path.text());self.mapping_changes=payload.get("mappingChanges",[]);self.mapping_summary.setText("No mapping corrections added."if not self.mapping_changes else"; ".join(f"{m.get('mappingRole')}: {m.get('canonicalEntityId')or'KG expansion'}"for m in self.mapping_changes));expansion=payload.get("kgExpansionSuggestion");
        if expansion:self.expansion_type.setCurrentText(expansion.get("suggestionType",""));self.expansion_label.setText(expansion.get("preferredLabel",""));self.expansion_entity_type.setText(expansion.get("entityType",""));self.expansion_description.setPlainText(expansion.get("description",""));self.expansion_rationale.setPlainText(expansion.get("rationale",""))
        self.notes.setPlainText(payload.get("notes",""));self.status.setText(f"Draft restored ({draft['state']}).")
    def save_draft(self):
        if not self.resolution:self.status.setText("Wait for card resolution before saving.");return
        identity=self._identity();existing=self.runtime.store.load_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version());key=existing["idempotencyKey"]if existing else str(uuid.uuid4());payload=self._build_payload(key);self.runtime.store.save_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version(),payload,key,"draft");self.status.setText("✓ Draft saved locally. Nothing was uploaded.")
    def discard_draft(self):
        if not self.resolution:return
        identity=self._identity();self.runtime.store.delete_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version());self.status.setText("Local draft discarded.")
    def preview_upload(self):
        if not self.resolution:self.status.setText("Wait for card resolution before previewing.");return
        from aqt.qt import QDialog,QPlainTextEdit,QPushButton,QVBoxLayout
        dialog=QDialog(self.dialog);dialog.setWindowTitle("Exact central proposal payload");dialog.resize(700,600);layout=QVBoxLayout(dialog);text=QPlainTextEdit(json.dumps(self._build_payload("00000000-0000-4000-8000-000000000000"),indent=2,ensure_ascii=False));text.setReadOnly(True);close=QPushButton("Close");close.clicked.connect(dialog.accept);layout.addWidget(text);layout.addWidget(close);dialog.exec()
    def submit(self):
        if not self.resolution:self.status.setText("Wait for card resolution before submitting.");return
        invalid=self._invalid_tags()
        if invalid:self.status.setText("Fix these central tags before submitting — each must look like SnapOrtho::Topic: "+", ".join(invalid));return
        identity=self._identity();existing=self.runtime.store.load_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version());key=existing["idempotencyKey"]if existing else str(uuid.uuid4());payload=self._build_payload(key);self.runtime.store.save_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version(),payload,key,"submitting")
        self.submit_button.setEnabled(False);self.submit_button.setText("Submitting to backend…");self.status.setText("Uploading proposal to the SnapOrtho backend…")
        def done(future):
            self.submit_button.setEnabled(True);self.submit_button.setText("Submit proposal to SnapOrtho")
            try:_,body=future.result();self.runtime.store.mark_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version(),"submitted");self.status.setText(f"✓ Saved to backend proposal queue · ID {body.get('proposalId')}. Canonical deck data was not changed.")
            except Exception as error:self.runtime.store.mark_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version(),"conflict"if getattr(error,"conflict_type",None)else"draft");self.status.setText(f"Backend submission failed — {describe(error)}. Your local draft is preserved.")
        self.runtime.background(lambda:self.runtime.api.submit_workspace_proposal(payload,payload["idempotencyKey"]),done)
    def exec(self):self.dialog.exec();return self.navigation_action
