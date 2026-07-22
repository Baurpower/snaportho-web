import platform,subprocess
class CredentialUnavailable(RuntimeError):pass
class MacOSKeychainStore:
    def __init__(self,environment,profile_hash,device_id,runner=subprocess.run):
        self.service=f"com.snaportho.anki-reviewer.{environment}.{profile_hash}";self.account=device_id;self.runner=runner
    def is_available(self):return platform.system()=="Darwin"
    def _run(self,args,input_value=None):
        if not self.is_available():raise CredentialUnavailable("macOS Keychain is required")
        return self.runner(["/usr/bin/security",*args],input=input_value,text=True,capture_output=True,timeout=10)
    def get(self):
        result=self._run(["find-generic-password","-s",self.service,"-a",self.account,"-w"])
        return result.stdout.strip() if result.returncode==0 else None
    def set(self,value):
        if not value:raise ValueError("empty credential")
        # `security` has no stdin password option. The token is written only to Keychain;
        # the short-lived argv exposure is documented as a macOS limitation.
        result=self._run(["add-generic-password","-U","-s",self.service,"-a",self.account,"-w",value])
        if result.returncode:raise CredentialUnavailable("Keychain write failed")
    def delete(self):
        result=self._run(["delete-generic-password","-s",self.service,"-a",self.account])
        if result.returncode not in(0,44):raise CredentialUnavailable("Keychain delete failed")
class FakeCredentialStore:
    def __init__(self,available=True):self.value=None;self.available=available
    def is_available(self):return self.available
    def get(self):
        if not self.available:raise CredentialUnavailable("credential store unavailable")
        return self.value
    def set(self,value):
        if not self.available:raise CredentialUnavailable("credential store unavailable")
        self.value=value
    def delete(self):self.value=None
