import json,uuid
def linked_copy(reviewer=None):
    if reviewer:return("Device linked successfully",f"Signed in as {reviewer.get('displayName','reviewer')}. Reviewer access is ready.")
    return("Device linked successfully","The credential is saved securely. Reviewer access still needs to be provisioned on this backend.")
class SettingsDialog:
    def __init__(self,parent,runtime):
        from aqt.qt import QComboBox,QDialog,QDialogButtonBox,QFormLayout,QLineEdit,QSpinBox
        self.dialog=QDialog(parent);self.dialog.setWindowTitle("SnapOrtho Reviewer Settings");layout=QFormLayout(self.dialog);self.environment=QComboBox();self.environment.addItems(["local","staging","production"]);self.environment.setCurrentText(runtime.settings.environment);self.url=QLineEdit(runtime.settings.base_url);self.timeout=QSpinBox();self.timeout.setRange(5,60);self.timeout.setValue(runtime.settings.request_timeout_seconds);layout.addRow("Environment",self.environment);layout.addRow("Backend URL",self.url);layout.addRow("Timeout",self.timeout);buttons=QDialogButtonBox(QDialogButtonBox.StandardButton.Save|QDialogButtonBox.StandardButton.Cancel);buttons.accepted.connect(lambda:self.save(runtime));buttons.rejected.connect(self.dialog.reject);layout.addRow(buttons)
    def save(self,runtime):
        from .config import validate
        from aqt.utils import showWarning
        raw={"environment":self.environment.currentText(),"base_url":self.url.text(),"request_timeout_seconds":self.timeout.value(),"diagnostics_enabled":runtime.settings.diagnostics_enabled}
        try:validate(raw);runtime.mw.addonManager.writeConfig(__name__.split('.')[0],raw);self.dialog.accept()
        except ValueError as error:showWarning(str(error))
    def exec(self):return self.dialog.exec()
class DeviceLinkDialog:
    def __init__(self,parent,runtime):
        from aqt.qt import QDialog,QLabel,QPushButton,QVBoxLayout
        self.runtime=runtime;self.link_code=None;self.approval_url=None;self.polling=False;self.poll_attempts=0;self.dialog=QDialog(parent);self.dialog.setWindowTitle("Link SnapOrtho Reviewer Device");layout=QVBoxLayout(self.dialog);self.status=QLabel("Start linking to receive a one-time code. Tokens are stored only in macOS Keychain.");self.status.setWordWrap(True);self.code=QLabel("");self.start_button=QPushButton("Start Link");self.start_button.clicked.connect(self.start);self.poll_button=QPushButton("Open Approval Page");self.poll_button.clicked.connect(self.poll);self.close_button=QPushButton("Close");self.close_button.clicked.connect(self.dialog.accept);self.close_button.hide();layout.addWidget(self.status);layout.addWidget(self.code);layout.addWidget(self.start_button);layout.addWidget(self.poll_button);layout.addWidget(self.close_button)
    def show_linked(self,reviewer=None):
        title,detail=linked_copy(reviewer);self.status.setText(f"<h2 style='color:#087f5b'>✓ {title}</h2><p>{detail}</p>");self.code.hide();self.start_button.hide();self.poll_button.hide();self.close_button.show();self.close_button.setDefault(True)
    def start(self):
        def done(future):
            try:_,body=future.result();self.link_code=body.get("linkCode");self.approval_url=body.get("approvalUrl");self.polling=False;self.poll_attempts=0;self.code.setText(self.link_code or "");self.status.setText("Approve this code in the browser, then choose Open Approval Page.")
            except Exception as error:self.status.setText(f"Link error: {getattr(error,'code','safe_error')}")
        self.runtime.background(lambda:self.runtime.api.start_link("SnapOrtho Reviewer Anki"),done)
    def poll(self):
        if not self.link_code or self.polling:return
        if self.approval_url:
            from aqt.utils import openLink
            openLink(self.approval_url);self.approval_url=None
        self.polling=True;self.poll_attempts=0;self.status.setText("Waiting for browser approval...");self._poll_once()
    def _poll_once(self):
        if not self.polling:return
        self.poll_attempts+=1
        def done(future):
            try:
                _,body=future.result()
                if body.get("status")=="pending":
                    if self.poll_attempts>=60:self.polling=False;self.status.setText("Approval timed out; choose Poll to try again.");return
                    from aqt.qt import QTimer
                    self.status.setText("Waiting for browser approval...");QTimer.singleShot(2000,self._poll_once);return
                token=body.pop("deviceToken",None)
                if not token:self.polling=False;self.status.setText(f"Link status: {body.get('status','failed')}");return
                self.runtime.credentials.set(token);token=None
                try:
                    _,reviewer=self.runtime.api.me();self.show_linked(reviewer)
                except Exception:
                    self.show_linked()
                self.polling=False
            except Exception as error:self.polling=False;self.status.setText(f"Link error: {getattr(error,'code','safe_error')}")
        self.runtime.background(lambda:self.runtime.api.poll_link(self.link_code),done)
    def exec(self):return self.dialog.exec()
class DiagnosticsDialog:
    def __init__(self,parent,runtime):
        from aqt.qt import QApplication,QDialog,QPushButton,QTextEdit,QVBoxLayout
        from .diagnostics import build
        self.dialog=QDialog(parent);self.dialog.setWindowTitle("SnapOrtho Safe Diagnostics");layout=QVBoxLayout(self.dialog);data=build({"ankiVersion":__import__('anki').version,"qtVersion":__import__('aqt.qt').qtmajor,"profileHash":runtime.profile_hash,"pendingDrafts":len(runtime.store.pending()),"pendingRetries":len(runtime.store.pending())},runtime.settings,bool(runtime.credentials.get()));self.text=QTextEdit(json.dumps(data,indent=2));self.text.setReadOnly(True);copy=QPushButton("Copy Safe Diagnostics");copy.clicked.connect(lambda:QApplication.clipboard().setText(self.text.toPlainText()));layout.addWidget(self.text);layout.addWidget(copy)
    def exec(self):return self.dialog.exec()
