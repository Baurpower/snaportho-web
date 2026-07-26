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
            showWarning(f"SnapOrtho could not start: {type(error).__name__}")
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
        import os
        from anki import version
        from .config import validate
        current=tuple(int(x)for x in version.split(".")[:2])
        if current<MIN_ANKI:raise RuntimeError("Anki 26.05 or newer is required")
        self.mw=mw;self.closed=False;self.window=None;self.reviewer_enabled=False
        raw=mw.addonManager.getConfig(__name__.split('.')[0]) or {}
        # 0.9.0 was briefly packaged with the developer loopback backend. Repair
        # that unsafe default for users; local developers can opt back in.
        if (
            raw.get("environment")=="local"
            and raw.get("base_url") in {"http://127.0.0.1:3000","http://localhost:3000"}
            and os.environ.get("SNAPORTHO_ANKI_ALLOW_LOCAL")!="1"
        ):
            raw={**raw,"environment":"production","base_url":"https://snap-ortho.com"}
            mw.addonManager.writeConfig(__name__.split('.')[0],raw)
        self.settings=validate(raw);self.profile_hash=__import__('hashlib').sha256(str(mw.pm.name).encode()).hexdigest()[:16]
        from .credential_store import MacOSKeychainStore
        self.credentials=MacOSKeychainStore(self.settings.environment,self.profile_hash,"reviewer-device")
        from .api import ReviewerApi
        self.api=ReviewerApi(self.settings.base_url,self.credentials,self.settings.request_timeout_seconds,lambda:self.closed)
        from .state import DraftStore
        state_path=os.path.join(mw.pm.profileFolder(),"snaportho_reviewer","reviewer.sqlite3")
        self.store=DraftStore(state_path,f"{self.profile_hash}:{self.settings.environment}")
    def start(self):
        from aqt.qt import QAction,QMenu,QTimer,qconnect
        menu=QMenu("SnapOrtho",self.mw.form.menuTools);menu.setObjectName("snaportho_menu");self.mw.form.menuTools.addMenu(menu);self.menu=menu
        for label,callback in[
            ("Get Started / Master Deck…",self.open_deck_sync),
            ("Sign In or Manage Account…",self.link_device),
            ("Settings",self.open_settings),
            ("Sign Out",self.sign_out),
        ]:
            action=QAction(label,menu);qconnect(action.triggered,callback);menu.addAction(action)
        self.reviewer_menu=menu.addMenu("Reviewer tools")
        self.reviewer_menu.menuAction().setVisible(False)
        for label,callback in[
            ("Review Current Card",self.open_current_workspace),
            ("Open Review Dashboard",self.open_dashboard),
            ("Diagnostics",self.open_diagnostics),
        ]:
            action=QAction(label,self.reviewer_menu);qconnect(action.triggered,callback);self.reviewer_menu.addAction(action)
        from .brobot_panel import LearnerSidePanel
        self.side_panel=LearnerSidePanel(self.mw,self)
        self._load_account_capabilities()
        self._maybe_first_run_prompt()
        self.search_relay_timer=QTimer(self.mw)
        self.search_relay_timer.setInterval(10000)
        self.search_relay_timer.timeout.connect(self.poll_search_relay)
        self.search_relay_timer.start()
        QTimer.singleShot(1500,self.poll_search_relay)
    def stop(self):
        self.closed=True
        if self.window:self.window.close();self.window=None
        if hasattr(self,"store"):self.store.close()
        if hasattr(self,"menu"):self.menu.deleteLater()
        if hasattr(self,"side_panel"):self.side_panel.close()
        if hasattr(self,"search_relay_timer"):self.search_relay_timer.stop()
    def background(self,operation,success):
        if self.closed:return
        self.mw.taskman.run_in_background(operation,lambda future:None if self.closed else success(future))
    def open_dashboard(self):
        from .reviewer_window import ReviewerWindow
        if not self.window:self.window=ReviewerWindow(self.mw,self)
        self.window.show();self.refresh()
    def open_current_workspace(self):
        from aqt.utils import showInfo
        card=getattr(self.mw.reviewer,"card",None)
        if not card:showInfo("Open a card in Reviewer, then choose Review Current Card.");return
        self.open_card_workspace(card,"reviewer")
    def open_deck_sync(self):
        from .master_deck import MasterDeckDialog
        MasterDeckDialog(self.mw,self).exec()
        if hasattr(self,"side_panel"):self.side_panel.refresh_deck_footer()
    def _maybe_first_run_prompt(self):
        """Open resumable setup directly until account and Master Deck are ready."""
        try:
            linked=bool(self.credentials.get())
        except Exception:return
        from .sync import installed_card_inventory
        try:installed=bool(installed_card_inventory(self.mw.col))
        except Exception:installed=False
        if linked and installed:return
        if self.store.cached("onboarding_dismissed_at"):return
        from aqt.qt import QTimer
        def show():
            if self.closed:return
            try:self.open_deck_sync()
            except Exception:pass
        QTimer.singleShot(800,show)
    def _load_account_capabilities(self):
        try:
            if not self.credentials.get():return
        except Exception:return
        def done(future):
            try:
                _,body=future.result()
                roles=set(body.get("roles")or[])
                self.reviewer_enabled=bool(roles&{"administrator","clinical_editor","mapping_reviewer","deck_editor","release_manager"})
                self.reviewer_menu.menuAction().setVisible(self.reviewer_enabled)
                if self.reviewer_enabled:self._register_editor_propose_button()
            except Exception:pass
        self.background(self.api.me,done)
    def open_card_workspace(self,card,source_surface):
        from .anki_runtime import CollectionGateway
        from .workspace import CardWorkspace
        CardWorkspace(self.mw,self,card,CollectionGateway(self.mw.col),source_surface).exec()
    def update_reviewer_panel(self,card):
        if hasattr(self,"side_panel"):self.side_panel.update(card)
    def _register_editor_propose_button(self):
        if getattr(self, "_editor_hook_registered", False):
            return
        try:
            from aqt import gui_hooks

            def _editor_buttons(buttons, editor):
                if getattr(editor, "_snaportho_propose_btn", False):
                    return buttons
                editor._snaportho_propose_btn = True

                def on_propose(_=None):
                    self.propose_from_editor(editor)

                try:
                    btn = editor.addButton(
                        icon=None,
                        cmd="snaportho_propose",
                        func=on_propose,
                        tip="Propose SnapOrtho changes for this note",
                        label="Propose to SnapOrtho",
                        keys=None,
                    )
                    buttons.append(btn)
                except Exception:
                    pass
                return buttons

            gui_hooks.editor_did_init_buttons.append(_editor_buttons)
            self._editor_hook_registered = True
        except Exception:
            pass

    def add_browser_action(self, browser):
        if not self.reviewer_enabled:return
        from aqt.qt import QAction, qconnect
        from .resource_search import install_browser_search_surface

        install_browser_search_surface(browser, self.open_resource_search)
        search_action = QAction("Search SnapOrtho by Orthobullets ID…", browser)
        qconnect(search_action.triggered, lambda: self.open_resource_search(browser))
        browser.form.menuEdit.addAction(search_action)
        action = QAction("Propose SnapOrtho changes…", browser)
        qconnect(action.triggered, lambda: self.open_browser_workspace(browser))
        browser.form.menuEdit.addAction(action)

    def open_resource_search(self, browser):
        from aqt.qt import QInputDialog
        from aqt.utils import showInfo
        from .anki_runtime import CollectionGateway
        from .errors import describe
        from .resource_search import (
            anki_card_query,
            apply_browser_query,
            parse_orthobullets_id,
            request_payload,
            resolve_local_results,
            result_summary,
        )

        value, accepted = QInputDialog.getText(
            browser,
            "SnapOrtho Search",
            "Paste an Orthobullets question ID or URL:",
        )
        if not accepted:
            return
        native_id = parse_orthobullets_id(value)
        if not native_id:
            showInfo("Enter an Orthobullets question ID, ob:ID, qid:ID, or Orthobullets URL.")
            return

        def done(future):
            try:
                _, body = future.result()
                local = resolve_local_results(
                    CollectionGateway(self.mw.col), body.get("results") or []
                )
                query = anki_card_query(local["cardIds"])
                if query:
                    apply_browser_query(browser, query)
                    from .resource_search import set_browser_search_status
                    resolution=body.get("resolution")or{}
                    concepts=", ".join(x.get("label","")for x in resolution.get("canonicalEntities")or[]if x.get("label"))
                    set_browser_search_status(browser,native_id,concepts,len(set(local["cardIds"])),"direct_reviewed")
                showInfo(result_summary(body, local))
            except Exception as error:
                showInfo(f"SnapOrtho search failed — {describe(error)}")

        self.background(lambda: self.api.resource_search(request_payload(native_id)), done)

    def poll_search_relay(self):
        if self.closed or not self.reviewer_enabled or getattr(self,"_search_relay_busy",False):return
        try:
            if not self.credentials.get():return
        except Exception:return
        self._search_relay_busy=True
        def pending_done(future):
            try:
                _,body=future.result();requests=body.get("requests")or[]
                if not requests:self._search_relay_busy=False;return
                request=requests[0]
                self.background(lambda:self.api.claim_search_request(request["id"]),lambda f:self._claimed_search(f,request))
            except Exception:self._search_relay_busy=False
        self.background(self.api.pending_search_requests,pending_done)

    def _claimed_search(self,future,queued):
        try:
            _,body=future.result();request=body.get("request")or queued
            from .resource_search import request_payload
            self.background(
                lambda:self.api.resource_search(request_payload(
                    request["normalized_native_id"],50,
                    request.get("tested_concept")or"",
                    request.get("concept_summary")or"",
                    request.get("search_keywords")or[],
                    request.get("query_kind")or"question",
                    request.get("page_sections")or[],
                )),
                lambda f:self._resolve_relay_search(f,request),
            )
        except Exception:self._search_relay_busy=False

    def _resolve_relay_search(self,future,request):
        from .anki_runtime import CollectionGateway
        from .resource_search import local_concept_card_ids,open_browse_with_card_ids,resolve_local_results
        gateway=CollectionGateway(self.mw.col);tier="direct_reviewed";error_code=None
        try:
            _,body=future.result()
            backend_results=body.get("results")or[]
            local=resolve_local_results(gateway,backend_results)
            card_ids=local["cardIds"]
            dispositions=local["dispositions"]
            tier=(backend_results[0].get("tier")if backend_results else"none")or"none"
            local_candidates=local_concept_card_ids(
                    self.mw.col,
                    request.get("tested_concept")or"",
                    request.get("search_keywords")or[],
                    request.get("page_sections")or[],
                    80 if request.get("query_kind")=="topic_page" else 30,
                )
            canonical_ids=set(card_ids)
            supplemental=[cid for cid in local_candidates if cid not in canonical_ids]
            card_ids=list(dict.fromkeys(card_ids+supplemental))
            if canonical_ids and supplemental:tier="hybrid"
            if card_ids and not backend_results:tier="local_concept_candidate"
            status="completed" if card_ids else("review_required" if not backend_results else"no_local_results")
            payload={
                "status":status,"availableCount":len(set(card_ids)),
                "missingCount":sum(1 for x in dispositions if x["status"]=="missing"),
                "ambiguousCount":sum(1 for x in dispositions if x["status"]=="ambiguous"),
                "versionMismatchCount":sum(1 for x in dispositions if x["status"]=="version_mismatch"),
                "backendCandidateCount":len(backend_results),
                "localSupplementCount":len(supplemental),
                "resultTier":tier,"errorCode":error_code,
            }
        except Exception:
            card_ids=[];tier="none"
            payload={"status":"failed","availableCount":0,"missingCount":0,"ambiguousCount":0,"versionMismatchCount":0,"backendCandidateCount":0,"localSupplementCount":0,"resultTier":"none","errorCode":"resolution_failed"}
        if card_ids:
            try:
                open_browse_with_card_ids(self.mw,card_ids,{
                    "nativeId":request.get("normalized_native_id")or request.get("submitted_native_id")or"",
                    "concept":request.get("tested_concept")or request.get("concept_summary")or"",
                    "tier":tier,
                })
            except Exception:
                card_ids=[]
                payload={"status":"failed","availableCount":0,"missingCount":0,"ambiguousCount":0,"versionMismatchCount":0,"backendCandidateCount":payload["backendCandidateCount"],"localSupplementCount":payload["localSupplementCount"],"resultTier":"none","errorCode":"browse_open_failed"}
        def complete_done(complete_future):
            try:
                complete_future.result()
            except Exception:
                pass
            self._search_relay_busy=False
        self.background(lambda:self.api.complete_search_request(request["id"],payload),complete_done)

    def propose_from_editor(self, editor):
        """Save Browse/editor fields, then open workspace for the note's card."""
        from aqt.utils import showInfo
        from .anki_runtime import CollectionGateway
        from .workspace import CardWorkspace

        def after_save():
            try:
                note = editor.note
                if note is None:
                    showInfo("No note is open in the editor.")
                    return
                cids = self.mw.col.find_cards(f"nid:{note.id}")
                if not cids:
                    showInfo("This note has no cards yet.")
                    return
                cards = [self.mw.col.get_card(cid) for cid in cids]
                cards.sort(key=lambda c: c.ord)
                CardWorkspace(
                    self.mw, self, cards[0], CollectionGateway(self.mw.col), "browser"
                ).exec()
            except Exception as error:
                showInfo(f"Propose failed: {type(error).__name__}: {error}")

        try:
            editor.saveNow(after_save)
        except TypeError:
            try:
                editor.saveNow()
            except Exception:
                pass
            after_save()
        except Exception:
            after_save()
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
        from .errors import describe
        def me_done(future):
            try:_,body=future.result();roles=", ".join(body.get("roles",[])) or "no reviewer role yet";self.window.header.setText(f"SnapOrtho Reviewer — {self.settings.environment} — {body.get('displayName','linked')} ({roles})")
            except Exception as error:self.window.header.setText(f"SnapOrtho Reviewer — {describe(error)}")
        def queue_done(future):
            try:_,body=future.result();self.window.set_review_queue(body.get("cards",[]))
            except Exception as error:self.window.set_review_queue_error(error)
        def proposals_done(future):
            try:_,body=future.result();self.window.set_proposals(body.get("proposals",[]))
            except Exception as error:self.window.header.setText(f"Proposal sync — {describe(error)}")
        self.background(self.api.me,me_done);self.background(self.api.review_queue,queue_done);self.background(lambda:self.api.workspace_proposals("queue"),proposals_done)
    def open_review_queue_card(self,entry):
        from aqt.utils import showInfo
        from .anki_runtime import CollectionGateway
        from .workspace import CardWorkspace
        gateway=CollectionGateway(self.mw.col);cards=gateway.cards_by_guid_ordinal(entry.get("noteGuid"),entry.get("cardOrdinal"))
        if not cards:showInfo("This card isn't in your local collection yet. Install or update the Master Deck first (Tools → SnapOrtho → Get Started / Master Deck…).");return
        if len(cards)>1:showInfo("Several local cards share this identity. Open it from Browse to pick the right one.");return
        CardWorkspace(self.mw,self,cards[0],gateway,"dashboard").exec()
    def open_workspace_proposal(self,proposal_id):
        from .errors import describe
        def done(future):
            try:_,body=future.result();self.window.show_proposal(body)
            except Exception as error:self.window.header.setText(f"Proposal — {describe(error)}")
        self.background(lambda:self.api.workspace_proposal(proposal_id),done)
    def review_workspace_proposal(self):
        if not self.window or not self.window.current_proposal:return
        import uuid
        from .errors import describe
        from .version import ADDON_VERSION
        p=self.window.current_proposal;key=str(uuid.uuid4());payload={"contractVersion":"snaportho-anki-reviewer.v1","decision":self.window.review_decision.currentText(),"proposalEvidenceHash":p["proposal_evidence_hash"],"reasonCodes":["dashboard_direct_review"],"notes":self.window.review_notes.toPlainText(),"idempotencyKey":key,"clientVersion":ADDON_VERSION}
        def done(future):
            try:_,body=future.result();self.window.header.setText(f"✓ Review recorded: {body.get('decision')}. No canonical data changed.");self.refresh()
            except Exception as error:self.window.header.setText(f"Review not recorded — {describe(error)}")
        self.background(lambda:self.api.review_workspace_proposal(p["id"],payload,key),done)
    def link_device(self):
        from .dialogs import DeviceLinkDialog
        DeviceLinkDialog(self.mw,self,on_linked=self._after_linked).exec()
    def _after_linked(self):
        self._load_account_capabilities()
        if hasattr(self,"side_panel"):self.side_panel.refresh_deck_footer();self.side_panel._set_enabled(bool(self.side_panel.card))
    def open_settings(self):
        from .dialogs import SettingsDialog
        SettingsDialog(self.mw,self).exec()
    def open_diagnostics(self):
        from .dialogs import DiagnosticsDialog
        DiagnosticsDialog(self.mw,self).exec()
    def sign_out(self):
        from aqt.utils import askUser,showInfo
        if askUser("Sign out of SnapOrtho on this Anki profile?"):self.credentials.delete();showInfo("Signed out of SnapOrtho.")
