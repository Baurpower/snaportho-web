import json,uuid
PERSONAL_PREFIXES=("personal::","personal_","user::","local::")
def is_personal_name(value):return value.strip().lower().startswith(PERSONAL_PREFIXES)
def central_fields(fields):return[{"name":x["name"],"value":x["value"]}for x in fields if not is_personal_name(x["name"])]
def central_tags(tags):return[t for t in tags if not is_personal_name(t)]
class CardWorkspace:
    def __init__(self,parent,runtime,card,gateway,source_surface="reviewer",can_previous=False,can_next=False):
        from aqt.qt import QComboBox,QDialog,QFormLayout,QHBoxLayout,QLabel,QLineEdit,QListWidget,QPlainTextEdit,QPushButton,QTabWidget,QVBoxLayout,QWidget
        self.runtime=runtime;self.card=card;self.gateway=gateway;self.source_surface=source_surface;self.navigation_action=None;self.resolution=None;self.mapping_changes=[];self.dialog=QDialog(parent);self.dialog.setWindowTitle("SnapOrtho Card Workspace");self.dialog.resize(900,700);root=QVBoxLayout(self.dialog);self.status=QLabel("Resolving exact card version…");self.status.setWordWrap(True);root.addWidget(self.status);tabs=QTabWidget();root.addWidget(tabs)
        content=QWidget();content_layout=QFormLayout(content);fields,tags,deck=gateway.editable(card);self.original_fields=fields;self.has_personal_fields=any(is_personal_name(x["name"])for x in fields);self.editors={}
        for field in fields:
            editor=QPlainTextEdit(field["value"]);editor.setAccessibleName(field["name"]);self.editors[field["name"]]=editor;label=field["name"]+(" (personal; never uploaded)" if is_personal_name(field["name"]) else "");content_layout.addRow(label,editor)
        self.central_tags_input=QLineEdit(" ".join(central_tags(tags)));self.deck_path=QLineEdit(deck);content_layout.addRow("Central tags",self.central_tags_input);content_layout.addRow("Proposed central deck path",self.deck_path);tabs.addTab(content,"Card")
        kg=QWidget();kg_layout=QVBoxLayout(kg);search_row=QHBoxLayout();self.search=QLineEdit();self.search.setPlaceholderText("Search the SnapOrtho knowledge graph");search_button=QPushButton("Search");search_button.clicked.connect(self.search_kg);search_row.addWidget(self.search);search_row.addWidget(search_button);kg_layout.addLayout(search_row);self.results=QListWidget();kg_layout.addWidget(self.results);mapping_row=QHBoxLayout();self.role=QComboBox();self.role.addItems(["teaches","tests","explains","demonstrates","context_only","broadly_related"]);add_mapping=QPushButton("Add selected mapping correction");add_mapping.clicked.connect(self.add_mapping);mapping_row.addWidget(self.role);mapping_row.addWidget(add_mapping);kg_layout.addLayout(mapping_row);self.mapping_summary=QLabel("No mapping corrections added.");self.mapping_summary.setWordWrap(True);kg_layout.addWidget(self.mapping_summary);tabs.addTab(kg,"KG Mapping")
        expansion=QWidget();expansion_layout=QFormLayout(expansion);self.expansion_type=QComboBox();self.expansion_type.addItems(["","new_entity","new_alias"]);self.expansion_label=QLineEdit();self.expansion_entity_type=QLineEdit();self.expansion_description=QPlainTextEdit();self.expansion_rationale=QPlainTextEdit();expansion_layout.addRow("Suggestion",self.expansion_type);expansion_layout.addRow("Preferred label or alias",self.expansion_label);expansion_layout.addRow("Entity type",self.expansion_entity_type);expansion_layout.addRow("Description",self.expansion_description);expansion_layout.addRow("Clinical rationale",self.expansion_rationale);tabs.addTab(expansion,"Suggest KG Expansion")
        self.notes=QPlainTextEdit();self.notes.setPlaceholderText("Reviewer notes");root.addWidget(self.notes);actions=QHBoxLayout();previous=QPushButton("← Previous");previous.setEnabled(can_previous);previous.clicked.connect(lambda:self.navigate("previous"));next_button=QPushButton("Next →");next_button.setEnabled(can_next);next_button.clicked.connect(lambda:self.navigate("next"));save=QPushButton("Save draft");save.clicked.connect(self.save_draft);discard=QPushButton("Discard draft");discard.clicked.connect(self.discard_draft);preview=QPushButton("Preview upload");preview.clicked.connect(self.preview_upload);submit=QPushButton("Submit proposal");submit.clicked.connect(self.submit);close=QPushButton("Close");close.clicked.connect(self.dialog.reject);actions.addWidget(previous);actions.addWidget(next_button);actions.addWidget(save);actions.addWidget(discard);actions.addWidget(preview);actions.addWidget(submit);actions.addWidget(close);root.addLayout(actions);self._resolve()
    def navigate(self,action):self.navigation_action=action;self.dialog.accept()
    def _identity(self):
        note=self.card.note();return{"noteGuid":note.guid,"cardOrdinal":self.card.ord,"contentHash":self.gateway.content_hash(self.card)}
    def _resolve(self):
        def done(future):
            try:_,self.resolution=future.result();message="Existing master card resolved and version pinned." if self.resolution.get("found") else "No master card found. This will be submitted as a missing-card proposal.";self.status.setText(message+(""if self.has_personal_fields else" No protected Personal_ field exists on this note type."));self._restore_draft()
            except Exception as error:self.status.setText(f"Card resolution failed: {getattr(error,'conflict_type',None)or getattr(error,'code','safe_error')}")
        self.runtime.background(lambda:self.runtime.api.resolve_workspace_card(self._identity()),done)
    def search_kg(self):
        query=self.search.text().strip()
        if len(query)<2:self.status.setText("Enter at least two characters to search.");return
        def done(future):
            try:
                _,body=future.result();self.results.clear()
                for entity in body.get("entities",[]):self.results.addItem(f"{entity['label']} — {entity['entityType']}");self.results.item(self.results.count()-1).setData(256,entity)
                self.status.setText(f"Found {self.results.count()} active canonical entities.")
            except Exception as error:self.status.setText(f"KG search failed: {getattr(error,'code','safe_error')}")
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
    def _build_payload(self,idempotency_key):
        edited=central_fields([{"name":name,"value":editor.toPlainText()}for name,editor in self.editors.items()]);base=None
        if self.resolution.get("found"):base={"canonicalCardId":self.resolution["canonicalCardId"],"canonicalCardVersionId":self.resolution["canonicalCardVersionId"],"contentHash":self.resolution["contentHash"]}
        proposed_tags=central_tags(self.central_tags_input.text().split());old_tags=set(self.resolution.get("centralTags",[])if self.resolution else[]);new_tags=set(proposed_tags);expansion=self._expansion();mappings=list(self.mapping_changes)
        if expansion and not mappings:mappings=[{"action":"add","canonicalEntityId":None,"mappingRole":self.role.currentText(),"useExpansionSuggestion":True,"rationale":expansion["rationale"],"confidence":1.0}]
        return{"contractVersion":"snaportho-anki-reviewer.v1","proposalKind":"edit_existing_card" if base else"create_missing_card","sourceSurface":self.source_surface,"baseCard":base,"localIdentity":self._identity(),"editedFields":edited,"centralTagChanges":{"add":sorted(new_tags-old_tags),"remove":sorted(old_tags-new_tags)},"proposedDeckPath":self.deck_path.text().strip()or None,"mappingChanges":mappings,"kgExpansionSuggestion":expansion,"notes":self.notes.toPlainText(),"idempotencyKey":idempotency_key,"clientVersion":"0.4.0"}
    def _restore_draft(self):
        identity=self._identity();draft=self.runtime.store.load_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version())
        if not draft:return
        payload=draft["payload"]
        if payload.get("localIdentity",{}).get("contentHash")!=identity["contentHash"]:self.runtime.store.mark_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version(),"conflict");self.status.setText("Manual comparison required: the local card changed after this draft was created.");return
        for field in payload.get("editedFields",[]):
            if field["name"]in self.editors:self.editors[field["name"]].setPlainText(field["value"])
        old=set(self.resolution.get("centralTags",[]));changes=payload.get("centralTagChanges",{});restored=(old-set(changes.get("remove",[])))|set(changes.get("add",[]));self.central_tags_input.setText(" ".join(sorted(restored)));self.deck_path.setText(payload.get("proposedDeckPath")or self.deck_path.text());self.mapping_changes=payload.get("mappingChanges",[]);self.mapping_summary.setText("No mapping corrections added."if not self.mapping_changes else"; ".join(f"{m.get('mappingRole')}: {m.get('canonicalEntityId')or'KG expansion'}"for m in self.mapping_changes));expansion=payload.get("kgExpansionSuggestion");
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
        identity=self._identity();existing=self.runtime.store.load_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version());key=existing["idempotencyKey"]if existing else str(uuid.uuid4());payload=self._build_payload(key);self.runtime.store.save_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version(),payload,key,"submitting")
        def done(future):
            try:_,body=future.result();self.runtime.store.mark_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version(),"submitted");self.status.setText(f"✓ Proposal submitted: {body.get('proposalId')}. No canonical data was changed.")
            except Exception as error:self.runtime.store.mark_workspace(identity["noteGuid"],identity["cardOrdinal"],self._draft_version(),"conflict"if getattr(error,"conflict_type",None)else"draft");self.status.setText(f"Submission failed: {getattr(error,'conflict_type',None)or getattr(error,'code','safe_error')}")
        self.runtime.background(lambda:self.runtime.api.submit_workspace_proposal(payload,payload["idempotencyKey"]),done)
    def exec(self):self.dialog.exec();return self.navigation_action
