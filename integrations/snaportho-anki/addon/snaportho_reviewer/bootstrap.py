_registered=False;_runtime=None
MIN_ANKI=(26,5)
def register():
    global _registered
    if _registered:return
    try:
        from aqt import gui_hooks,mw
        from aqt.qt import QAction,QMenu,qconnect
    except ImportError:return
    _registered=True
    def on_open():
        global _runtime
        try:_runtime=ProfileRuntime(mw);_runtime.start()
        except Exception as error:
            from aqt.utils import showWarning
            showWarning(f"SnapOrtho Reviewer could not start: {type(error).__name__}")
    def on_close():
        global _runtime
        if _runtime:_runtime.stop();_runtime=None
    def on_reviewer_card(*args):
        if not _runtime:return
        card=next((x for x in args if hasattr(x,"note")and hasattr(x,"ord")),getattr(mw.reviewer,"card",None));_runtime.update_reviewer_panel(card)
    def on_browser_menu(browser):
        if _runtime:_runtime.add_browser_action(browser)
    gui_hooks.profile_did_open.append(on_open);gui_hooks.profile_will_close.append(on_close)
    gui_hooks.reviewer_did_show_question.append(on_reviewer_card);gui_hooks.reviewer_did_show_answer.append(on_reviewer_card);gui_hooks.browser_menus_did_init.append(on_browser_menu)
class ProfileRuntime:
    def __init__(self,mw):
        from anki import version
        from .config import validate
        current=tuple(int(x)for x in version.split(".")[:2])
        if current<MIN_ANKI:raise RuntimeError("Anki 26.05 or newer is required")
        self.mw=mw;self.closed=False;self.window=None;self.current_item=None;self.current_card=None
        raw=mw.addonManager.getConfig(__name__.split('.')[0]) or {}
        self.settings=validate(raw);self.profile_hash=__import__('hashlib').sha256(str(mw.pm.name).encode()).hexdigest()[:16]
        from .credential_store import MacOSKeychainStore
        self.credentials=MacOSKeychainStore(self.settings.environment,self.profile_hash,"reviewer-device")
        from .api import ReviewerApi
        self.api=ReviewerApi(self.settings.base_url,self.credentials,self.settings.request_timeout_seconds,lambda:self.closed)
        from .state import DraftStore
        import os
        state_path=os.path.join(mw.pm.profileFolder(),"snaportho_reviewer","reviewer.sqlite3")
        self.store=DraftStore(state_path,f"{self.profile_hash}:{self.settings.environment}")
    def start(self):
        from aqt.qt import QAction,QMenu,qconnect
        menu=QMenu("SnapOrtho Reviewer",self.mw.form.menuTools);menu.setObjectName("snaportho_reviewer_menu");self.mw.form.menuTools.addMenu(menu);self.menu=menu
        for label,callback in[("Review Current Card",self.open_current_workspace),("Open Review Inbox",self.open_inbox),("Check for Master Deck Updates",self.open_deck_sync),("Link or Manage Device",self.link_device),("Settings",self.open_settings),("Diagnostics",self.open_diagnostics),("Sign Out / Revoke Local Credential",self.sign_out)]:
            action=QAction(label,menu);qconnect(action.triggered,callback);menu.addAction(action)
        from .surfaces import ReviewerSidePanel
        self.side_panel=ReviewerSidePanel(self.mw,self)
    def stop(self):
        self.closed=True
        if self.window:self.window.close();self.window=None
        if hasattr(self,"store"):self.store.close()
        if hasattr(self,"menu"):self.menu.deleteLater()
        if hasattr(self,"side_panel"):self.side_panel.close()
    def background(self,operation,success):
        if self.closed:return
        self.mw.taskman.run_in_background(operation,lambda future:None if self.closed else success(future))
    def open_inbox(self):
        from .reviewer_window import ReviewerWindow
        if not self.window:self.window=ReviewerWindow(self.mw,self)
        self.window.show();self.refresh()
    def open_current_workspace(self):
        from aqt.utils import showInfo
        card=getattr(self.mw.reviewer,"card",None)
        if not card:showInfo("Open a card in Reviewer, then choose Review Current Card.");return
        self.open_card_workspace(card,"reviewer")
    def open_deck_sync(self):
        from .sync import DeckSyncDialog
        DeckSyncDialog(self.mw,self).exec()
    def open_card_workspace(self,card,source_surface):
        from .anki_runtime import CollectionGateway
        from .workspace import CardWorkspace
        CardWorkspace(self.mw,self,card,CollectionGateway(self.mw.col),source_surface).exec()
    def update_reviewer_panel(self,card):
        if hasattr(self,"side_panel"):self.side_panel.update(card)
    def add_browser_action(self,browser):
        from aqt.qt import QAction,qconnect
        action=QAction("Open SnapOrtho Card Workspace",browser);qconnect(action.triggered,lambda:self.open_browser_workspace(browser));browser.form.menuEdit.addAction(action)
    def open_browser_workspace(self,browser):
        from aqt.utils import showInfo
        card_ids=list(browser.selected_cards())
        if not card_ids:showInfo("Select one card in Browse first.");return
        index=0
        while 0<=index<len(card_ids):
            from .anki_runtime import CollectionGateway
            from .workspace import CardWorkspace
            action=CardWorkspace(self.mw,self,self.mw.col.get_card(card_ids[index]),CollectionGateway(self.mw.col),"browser",index>0,index<len(card_ids)-1).exec()
            if action=="previous":index-=1
            elif action=="next":index+=1
            else:break
    def refresh(self):
        if not self.window:return
        def assignments_done(future):
            try:_,body=future.result();self.window.set_assignments(body.get("assignments",[]));self.window.header.setText(f"SnapOrtho Reviewer — {self.settings.environment} — linked")
            except Exception as error:self.window.header.setText(f"Sync error: {getattr(error,'code','safe_error')}")
        def proposals_done(future):
            try:_,body=future.result();self.window.set_proposals(body.get("proposals",[]))
            except Exception as error:self.window.header.setText(f"Proposal sync error: {getattr(error,'code','safe_error')}")
        self.background(self.api.assignments,assignments_done);self.background(lambda:self.api.workspace_proposals("queue"),proposals_done)
    def open_workspace_proposal(self,proposal_id):
        def done(future):
            try:_,body=future.result();self.window.show_proposal(body)
            except Exception as error:self.window.header.setText(f"Proposal error: {getattr(error,'code','safe_error')}")
        self.background(lambda:self.api.workspace_proposal(proposal_id),done)
    def review_workspace_proposal(self):
        if not self.window or not self.window.current_proposal:return
        import uuid
        p=self.window.current_proposal;key=str(uuid.uuid4());payload={"contractVersion":"snaportho-anki-reviewer.v1","decision":self.window.review_decision.currentText(),"proposalEvidenceHash":p["proposal_evidence_hash"],"reasonCodes":["dashboard_direct_review"],"notes":self.window.review_notes.toPlainText(),"idempotencyKey":key,"clientVersion":"0.4.0"}
        def done(future):
            try:_,body=future.result();self.window.header.setText(f"✓ Review recorded: {body.get('decision')}. No canonical data changed.");self.refresh()
            except Exception as error:self.window.header.setText(f"Review rejected: {getattr(error,'conflict_type',None)or getattr(error,'code','safe_error')}")
        self.background(lambda:self.api.review_workspace_proposal(p["id"],payload,key),done)
    def open_assignment(self,assignment_id):
        def done(future):
            try:
                _,body=future.result();assignment=body["assignment"];items=assignment.get("anki_review_assignment_items",[])
                if items:self.resolve_item(items[0])
            except Exception as error:self.window.header.setText(f"Assignment error: {getattr(error,'code','safe_error')}")
        self.background(lambda:self.api.assignment(assignment_id),done)
    def resolve_item(self,item):
        from .anki_runtime import CollectionGateway
        from .contracts import CardIdentity
        from .resolver import resolve_card
        gateway=CollectionGateway(self.mw.col);identity=CardIdentity(item["canonical_card_id"],item["canonical_card_version_id"],item["note_guid"],item["card_ordinal"],item["base_content_hash"],item.get("native_card_id_hint"));result=resolve_card(gateway,identity)
        if result.status!="resolved":self.window.header.setText(f"Submission blocked: {result.status}");return
        self.current_item=item;self.current_card=self.mw.col.get_card(result.card_id);self.window.show_item(item,self.current_card,gateway)
    def save_current_draft(self):
        if not self.current_item:return
        import uuid
        payload={"decision":self.window.decision.currentText(),"confidence":self.window.confidence.value()/100,"mappingRole":self.window.role.currentText(),"ambiguityResolution":self.window.ambiguity.text(),"notes":self.window.notes.toPlainText()}
        self.store.save(self.current_item["id"],self.current_item["canonical_card_version_id"],payload,str(uuid.uuid4()),"draft");self.window.header.setText("Draft saved locally")
    def submit_current(self):
        if not self.current_item:return
        self.save_current_draft();draft=self.store.load(self.current_item["id"],self.current_item["canonical_card_version_id"]);self.store.mark(self.current_item["id"],self.current_item["canonical_card_version_id"],"pending");self.window.header.setText("Queued for version-pinned submission")
    def link_device(self):
        from .dialogs import DeviceLinkDialog
        DeviceLinkDialog(self.mw,self).exec()
    def open_settings(self):
        from .dialogs import SettingsDialog
        SettingsDialog(self.mw,self).exec()
    def open_diagnostics(self):
        from .dialogs import DiagnosticsDialog
        DiagnosticsDialog(self.mw,self).exec()
    def sign_out(self):
        from aqt.utils import askUser,showInfo
        if askUser("Remove the local SnapOrtho Reviewer credential from Keychain?"):self.credentials.delete();showInfo("Local credential removed. Server revocation remains a separate authenticated action.")
