class ReviewerSidePanel:
    def __init__(self,mw,runtime):
        from aqt.qt import QDockWidget,QLabel,QPushButton,QVBoxLayout,QWidget,Qt
        self.runtime=runtime;self.card=None;self.dock=QDockWidget("SnapOrtho",mw);self.dock.setObjectName("snaportho_reviewer_side_panel");body=QWidget();layout=QVBoxLayout(body);self.state=QLabel("Open a card to inspect its master-deck state.");self.state.setWordWrap(True);open_button=QPushButton("Open Card Workspace");open_button.clicked.connect(self.open);layout.addWidget(self.state);layout.addWidget(open_button);self.dock.setWidget(body);mw.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea,self.dock);self.dock.hide()
    def update(self,card):
        self.card=card
        if not card:self.dock.hide();return
        self.dock.show();self.state.setText("Checking master card and KG mappings…")
        from .anki_runtime import CollectionGateway
        gateway=CollectionGateway(self.runtime.mw.col);identity={"noteGuid":card.note().guid,"cardOrdinal":card.ord,"contentHash":gateway.content_hash(card)}
        def done(future):
            try:
                _,body=future.result()
                if body.get("found"):self.state.setText(f"Master card ✓\nVersion {body.get('versionNumber')} · {len(body.get('mappings',[]))} KG concepts")
                else:self.state.setText("Not in the master deck\nYou can propose this as a missing card.")
            except Exception as error:self.state.setText(f"Manual comparison required\n{getattr(error,'conflict_type',None)or getattr(error,'code','unavailable')}")
        self.runtime.background(lambda:self.runtime.api.resolve_workspace_card(identity),done)
    def open(self):
        if self.card:self.runtime.open_card_workspace(self.card,"reviewer")
    def close(self):self.dock.close();self.dock.deleteLater()
