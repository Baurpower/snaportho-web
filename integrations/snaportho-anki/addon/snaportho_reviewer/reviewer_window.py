import json
class ReviewerWindow:
    """Curation dashboard: a priority review queue that opens cards into the
    workspace, plus the adjudication queue for submitted proposals. There is no
    assignment concept — reviewers curate card by card."""
    def __init__(self,mw,runtime):
        from aqt.qt import QComboBox,QDialog,QFormLayout,QHBoxLayout,QLabel,QListWidget,QPushButton,QTextEdit,QVBoxLayout,QWidget
        self.mw=mw;self.runtime=runtime;self.dialog=QDialog(mw);self.dialog.setWindowTitle("SnapOrtho Reviewer");self.dialog.resize(1100,760)
        root=QVBoxLayout(self.dialog);self.header=QLabel("SnapOrtho Reviewer — unlinked");self.header.setAccessibleName("Reviewer connection status");self.header.setWordWrap(True);root.addWidget(self.header)
        body=QHBoxLayout();root.addLayout(body)
        left=QVBoxLayout();body.addLayout(left,2)
        self.queue_status=QLabel("Priority review queue");self.queue_status.setWordWrap(True);left.addWidget(self.queue_status)
        self.review_queue=QListWidget();self.review_queue.setAccessibleName("Priority review queue");self.review_queue.itemDoubleClicked.connect(self._queue_activated);left.addWidget(self.review_queue,3)
        proposals_label=QLabel("Submitted proposals awaiting adjudication");proposals_label.setWordWrap(True);left.addWidget(proposals_label)
        self.proposal_queue=QListWidget();self.proposal_queue.setAccessibleName("Editor proposal queue");self.proposal_queue.itemSelectionChanged.connect(self._proposal_selected);left.addWidget(self.proposal_queue,2)
        right=QVBoxLayout();body.addLayout(right,3);right.addWidget(QLabel("Proposal review — before / after and KG changes"))
        self.proposal_detail=QTextEdit();self.proposal_detail.setReadOnly(True);right.addWidget(self.proposal_detail,1)
        form=QWidget();form_layout=QFormLayout(form);self.review_decision=QComboBox();self.review_decision.addItems(["approve_for_incorporation","request_changes","reject","defer"]);self.review_notes=QTextEdit();self.review_submit=QPushButton("Record review decision");self.review_submit.clicked.connect(self.runtime.review_workspace_proposal);form_layout.addRow("Decision",self.review_decision);form_layout.addRow("Review notes",self.review_notes);form_layout.addRow(self.review_submit);right.addWidget(form)
        self.current_proposal=None
        buttons=QHBoxLayout();self.refresh=QPushButton("Refresh");self.curate=QPushButton("Curate selected card");close=QPushButton("Close");self.refresh.clicked.connect(self.runtime.refresh);self.curate.clicked.connect(self._curate_selected);close.clicked.connect(self.dialog.close);buttons.addWidget(self.refresh);buttons.addWidget(self.curate);buttons.addStretch(1);buttons.addWidget(close);root.addLayout(buttons)
    def show(self):self.dialog.show();self.dialog.raise_();self.dialog.activateWindow()
    def close(self):self.dialog.close()
    def _queue_activated(self,item):
        if item and item.data(256):self.runtime.open_review_queue_card(item.data(256))
    def _curate_selected(self):
        item=self.review_queue.currentItem()
        if item and item.data(256):self.runtime.open_review_queue_card(item.data(256))
    def _proposal_selected(self):
        item=self.proposal_queue.currentItem()
        if item:self.runtime.open_workspace_proposal(item.data(256)["id"])
    def set_review_queue(self,rows):
        self.review_queue.clear();self.queue_status.setText(f"Priority review queue — {len(rows)} card(s) flagged. Double-click to curate." if rows else "Priority review queue — nothing flagged. Study or browse any card and use the SnapOrtho panel to curate it.")
        for row in rows:
            label=f"[{row.get('priority','—')}] {row.get('reason','review')} — {row.get('front') or row.get('noteGuid','')}";self.review_queue.addItem(label);self.review_queue.item(self.review_queue.count()-1).setData(256,row)
    def set_review_queue_error(self,error):
        from .errors import describe
        self.review_queue.clear()
        if getattr(error,"status",0)==404:self.queue_status.setText("Priority review queue isn't enabled on this backend yet. Study or browse any card and use the SnapOrtho panel to curate it.")
        else:self.queue_status.setText(f"Priority review queue — {describe(error)}")
    def set_proposals(self,rows):
        self.proposal_queue.clear()
        for row in rows:
            marker="NEW CARD" if row.get("proposal_kind")=="create_missing_card" else "EDIT";kg=" + KG" if row.get("kg_expansion_suggestion") else "";self.proposal_queue.addItem(f"{row.get('status','')} — {marker}{kg} — {row.get('note_guid','')}");self.proposal_queue.item(self.proposal_queue.count()-1).setData(256,row)
    def show_proposal(self,body):
        self.current_proposal=body["proposal"];validation=body.get("validation",{});p=self.current_proposal;summary={"status":p.get("status"),"validation":"Ready to review" if validation.get("ready") else "Manual comparison required","staleCardVersion":validation.get("staleCardVersion"),"editedFields":p.get("edited_fields"),"centralTagChanges":p.get("central_tag_changes"),"proposedDeckPath":p.get("proposed_deck_path"),"mappingChanges":p.get("mapping_changes"),"kgExpansionSuggestion":p.get("kg_expansion_suggestion"),"entities":body.get("entities",[])};self.proposal_detail.setPlainText(json.dumps(summary,indent=2,ensure_ascii=False))
