import json
from .contracts import CardIdentity
from .resolver import resolve_card
class ReviewerWindow:
    def __init__(self,mw,runtime):
        from aqt.qt import QComboBox,QDialog,QFormLayout,QHBoxLayout,QLabel,QLineEdit,QListWidget,QPushButton,QSpinBox,QTabWidget,QTextEdit,QVBoxLayout,QWidget
        from aqt.webview import AnkiWebView
        self.mw=mw;self.runtime=runtime;self.dialog=QDialog(mw);self.dialog.setWindowTitle("SnapOrtho Reviewer");self.dialog.resize(1100,760)
        root=QVBoxLayout(self.dialog);self.header=QLabel("SnapOrtho Reviewer — unlinked");self.header.setAccessibleName("Reviewer connection status");root.addWidget(self.header)
        body=QHBoxLayout();root.addLayout(body);queues=QTabWidget();self.inbox=QListWidget();self.inbox.setAccessibleName("Review assignment inbox");self.inbox.itemSelectionChanged.connect(self._assignment_selected);self.proposal_queue=QListWidget();self.proposal_queue.setAccessibleName("Editor proposal queue");self.proposal_queue.itemSelectionChanged.connect(self._proposal_selected);queues.addTab(self.proposal_queue,"Proposals");queues.addTab(self.inbox,"Assignments");body.addWidget(queues,1)
        right=QVBoxLayout();body.addLayout(right,3);self.identity=QLabel("Select an assignment");right.addWidget(self.identity);self.tabs=QTabWidget();right.addWidget(self.tabs)
        self.front=AnkiWebView(title="SnapOrtho reviewer front",parent=self.dialog);self.back=AnkiWebView(title="SnapOrtho reviewer back",parent=self.dialog);self.tabs.addTab(self.front,"Native Front");self.tabs.addTab(self.back,"Native Back")
        form=QWidget();layout=QFormLayout(form);self.proposals=QTextEdit();self.proposals.setReadOnly(True);self.decision=QComboBox();self.decision.addItems(["","approved","rejected","needs_changes","defer"]);self.role=QComboBox();self.role.addItems(["","teaches","tests","explains","demonstrates","context_only","broadly_related"]);self.confidence=QSpinBox();self.confidence.setRange(0,100);self.ambiguity=QLineEdit();self.notes=QTextEdit();layout.addRow("Factory proposals",self.proposals);layout.addRow("Decision",self.decision);layout.addRow("Correct mapping role",self.role);layout.addRow("Confidence %",self.confidence);layout.addRow("Ambiguity resolution",self.ambiguity);layout.addRow("Safe notes",self.notes);self.tabs.addTab(form,"Mapping Review")
        review=QWidget();review_layout=QFormLayout(review);self.proposal_detail=QTextEdit();self.proposal_detail.setReadOnly(True);self.review_decision=QComboBox();self.review_decision.addItems(["approve_for_incorporation","request_changes","reject","defer"]);self.review_notes=QTextEdit();self.review_submit=QPushButton("Record review decision");self.review_submit.clicked.connect(self.runtime.review_workspace_proposal);review_layout.addRow("Before / after and KG changes",self.proposal_detail);review_layout.addRow("Decision",self.review_decision);review_layout.addRow("Review notes",self.review_notes);review_layout.addRow(self.review_submit);self.tabs.addTab(review,"Proposal Review");self.current_proposal=None
        buttons=QHBoxLayout();self.refresh=QPushButton("Refresh");self.save=QPushButton("Save Local Draft");self.submit=QPushButton("Submit Item");self.refresh.clicked.connect(self.runtime.refresh);self.save.clicked.connect(self.runtime.save_current_draft);self.submit.clicked.connect(self.runtime.submit_current);buttons.addWidget(self.refresh);buttons.addWidget(self.save);buttons.addWidget(self.submit);root.addLayout(buttons)
    def show(self):self.dialog.show();self.dialog.raise_();self.dialog.activateWindow()
    def close(self):self.dialog.close()
    def set_assignments(self,rows):
        self.inbox.clear()
        for row in rows:
            self.inbox.addItem(f"{row.get('status','')} — {row.get('id','')}");self.inbox.item(self.inbox.count()-1).setData(256,row)
    def set_proposals(self,rows):
        self.proposal_queue.clear()
        for row in rows:
            marker="NEW CARD"if row.get("proposal_kind")=="create_missing_card"else"EDIT";kg=" + KG"if row.get("kg_expansion_suggestion")else"";self.proposal_queue.addItem(f"{row.get('status','')} — {marker}{kg} — {row.get('note_guid','')}");self.proposal_queue.item(self.proposal_queue.count()-1).setData(256,row)
    def _assignment_selected(self):
        item=self.inbox.currentItem()
        if item:self.runtime.open_assignment(item.data(256)["id"])
    def _proposal_selected(self):
        item=self.proposal_queue.currentItem()
        if item:self.runtime.open_workspace_proposal(item.data(256)["id"])
    def show_proposal(self,body):
        self.current_proposal=body["proposal"];validation=body.get("validation",{});p=self.current_proposal;summary={"status":p.get("status"),"validation":"Ready to review"if validation.get("ready")else"Manual comparison required","staleCardVersion":validation.get("staleCardVersion"),"editedFields":p.get("edited_fields"),"centralTagChanges":p.get("central_tag_changes"),"proposedDeckPath":p.get("proposed_deck_path"),"mappingChanges":p.get("mapping_changes"),"kgExpansionSuggestion":p.get("kg_expansion_suggestion"),"entities":body.get("entities",[])};self.proposal_detail.setPlainText(json.dumps(summary,indent=2,ensure_ascii=False));self.tabs.setCurrentIndex(self.tabs.count()-1)
    def show_item(self,item,card,gateway):
        self.identity.setText(f"Card {item['canonical_card_id']} / version {item['canonical_card_version_id']}")
        front,back=gateway.rendered(card);self.front.stdHtml(front);self.back.stdHtml(back)
        self.proposals.setPlainText(str({"entities":item.get("proposed_entity_ids",[]),"roles":item.get("proposed_mapping_roles",[]),"consensus":item.get("machine_consensus"),"risk":item.get("risk_tier"),"critics":item.get("critic_flags",[])}))
