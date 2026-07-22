import hashlib,json
MASTER_ID_FIELDS=("SnapOrtho_ID","SnapOrtho ID");VERSION_FIELDS=("SnapOrtho_Version","SnapOrtho Version");HASH_FIELDS=("SnapOrtho_Installed_Hash","SnapOrtho Installed Hash")
def field_value(note,names):
    for name in names:
        if name in note:return note[name]
    return None
def central_sync_hash(card):
    note=card.note();parts=[]
    for name in sorted(note.keys()):
        lower=name.lower()
        if lower.startswith(("personal_","personal::","user::","local::"))or lower in("snaportho_id","snaportho_version","snaportho_installed_hash"):continue
        parts.append(f"{name}\0{note[name]}")
    parts.extend(f"tag\0{tag}"for tag in sorted(t for t in note.tags if t.startswith("SnapOrtho::")));parts.append(f"ord\0{card.ord}");return hashlib.sha256("\n".join(parts).encode()).hexdigest()
def installed_card_inventory(col):
    rows=[]
    for cid in col.find_cards(""):
        card=col.get_card(cid);note=card.note();master_id=field_value(note,MASTER_ID_FIELDS);version=field_value(note,VERSION_FIELDS);installed_hash=field_value(note,HASH_FIELDS)
        if not master_id or not version or not installed_hash:continue
        rows.append({"canonicalCardId":master_id,"canonicalCardVersionId":version,"installedContentHash":installed_hash,"localCentralContentHash":central_sync_hash(card),"noteGuid":note.guid,"cardOrdinal":card.ord,"mediaHashes":[]})
    return rows
class DeckSyncDialog:
    def __init__(self,parent,runtime):
        from aqt.qt import QDialog,QLabel,QPlainTextEdit,QPushButton,QVBoxLayout
        self.runtime=runtime;self.dialog=QDialog(parent);self.dialog.setWindowTitle("SnapOrtho Master Deck Updates");self.dialog.resize(800,650);layout=QVBoxLayout(self.dialog);self.status=QLabel("Checking for a published SnapOrtho release…");self.status.setWordWrap(True);self.detail=QPlainTextEdit();self.detail.setReadOnly(True);close=QPushButton("Close");close.clicked.connect(self.dialog.accept);layout.addWidget(self.status);layout.addWidget(self.detail);layout.addWidget(close);self.check()
    def check(self):
        def release_done(future):
            try:
                _,body=future.result();release=body["release"];self.status.setText(f"Available release: {release['release_version']}\nBuilding a metadata-only update plan…");inventory=installed_card_inventory(self.runtime.mw.col);payload={"contractVersion":"snaportho-anki-sync-request.v1","targetReleaseId":release["id"],"installedCards":inventory}
                self.runtime.background(lambda:self.runtime.api.deck_sync_plan(payload),plan_done)
            except Exception as error:self.status.setText(f"Release check unavailable: {getattr(error,'code','safe_error')}")
        def plan_done(future):
            try:
                _,plan=future.result();counts={}
                for action in plan.get("actions",[]):counts[action["action"]]=counts.get(action["action"],0)+1
                self.status.setText(f"Sync plan ready — {counts.get('update',0)} updates, {counts.get('add',0)} additions, {counts.get('conflict',0)} conflicts.\nPreview only: no Anki cards or scheduling were changed.");self.detail.setPlainText(json.dumps(plan,indent=2))
            except Exception as error:self.status.setText(f"Sync planning failed: {getattr(error,'code','safe_error')}")
        self.runtime.background(self.runtime.api.current_deck_release,release_done)
    def exec(self):return self.dialog.exec()
