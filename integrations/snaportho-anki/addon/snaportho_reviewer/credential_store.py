"""Native, profile-scoped credential storage for the Anki add-on."""

import hmac
import platform
import secrets
import subprocess


class CredentialStoreError(RuntimeError):
    operation = "credential"

    def __init__(self, backend, native_code=None):
        super().__init__(f"{self.operation} failed ({backend})")
        self.backend = backend
        self.native_code = native_code


class CredentialBackendUnavailable(CredentialStoreError):
    operation = "credential_backend_unavailable"


class CredentialReadError(CredentialStoreError):
    operation = "credential_read"


class CredentialWriteError(CredentialStoreError):
    operation = "credential_write"


class CredentialDeleteError(CredentialStoreError):
    operation = "credential_delete"


class UnsupportedCredentialPlatform(CredentialBackendUnavailable):
    operation = "unsupported_credential_platform"


# Compatibility for callers/tests that imported the former broad exception.
CredentialUnavailable = CredentialStoreError


def credential_service(environment, profile_hash):
    environment = str(environment or "").strip()
    profile_hash = str(profile_hash or "").strip()
    if not environment or not profile_hash or any(c in environment + profile_hash for c in "\r\n\0"):
        raise ValueError("invalid credential namespace")
    return f"com.snaportho.anki-reviewer.{environment}.{profile_hash}"


class _ProbeMixin:
    def probe(self):
        value = secrets.token_urlsafe(24)
        verified = False
        try:
            self._set(value, self._probe_account)
            saved = self._get(self._probe_account)
            verified = bool(saved and hmac.compare_digest(saved, value))
            if not verified:
                raise CredentialWriteError(self.backend_name())
        finally:
            try:
                self._delete(self._probe_account)
            except CredentialDeleteError:
                if verified:
                    raise


class MacOSKeychainStore(_ProbeMixin):
    def __init__(self, environment, profile_hash, device_id, runner=subprocess.run):
        self.service = credential_service(environment, profile_hash)
        self.account = device_id
        self._probe_account = f"{device_id}.probe"
        self.runner = runner

    def backend_name(self):
        return "macos_keychain"

    def is_available(self):
        return platform.system() == "Darwin"

    def _run(self, args):
        if not self.is_available():
            raise CredentialBackendUnavailable(self.backend_name())
        try:
            return self.runner(
                ["/usr/bin/security", *args], text=True, capture_output=True, timeout=10
            )
        except (OSError, subprocess.SubprocessError):
            raise CredentialBackendUnavailable(self.backend_name()) from None

    def _get(self, account):
        result = self._run(["find-generic-password", "-s", self.service, "-a", account, "-w"])
        if result.returncode == 44:
            return None
        if result.returncode:
            raise CredentialReadError(self.backend_name(), result.returncode)
        return result.stdout.strip() or None

    def get(self):
        return self._get(self.account)

    def _set(self, value, account):
        if not value:
            raise ValueError("empty credential")
        # The security CLI has no stdin password option. Direct Security.framework
        # calls remain a follow-up; stdout/stderr are never exposed to callers.
        result = self._run(
            ["add-generic-password", "-U", "-s", self.service, "-a", account, "-w", value]
        )
        if result.returncode:
            raise CredentialWriteError(self.backend_name(), result.returncode)

    def set(self, value):
        self._set(value, self.account)

    def _delete(self, account):
        result = self._run(["delete-generic-password", "-s", self.service, "-a", account])
        if result.returncode not in (0, 44):
            raise CredentialDeleteError(self.backend_name(), result.returncode)

    def delete(self):
        self._delete(self.account)


class WindowsCredentialApi:
    """Small ownership-safe adapter over Windows Credential Manager."""

    ERROR_NOT_FOUND = 1168
    CRED_TYPE_GENERIC = 1
    CRED_PERSIST_LOCAL_MACHINE = 2
    MAX_BLOB_BYTES = 2560

    def __init__(self):
        if platform.system() != "Windows":
            raise CredentialBackendUnavailable("windows_credential_manager")
        try:
            import ctypes
            from ctypes import wintypes

            class CREDENTIALW(ctypes.Structure):
                _fields_ = [
                    ("Flags", wintypes.DWORD), ("Type", wintypes.DWORD),
                    ("TargetName", wintypes.LPWSTR), ("Comment", wintypes.LPWSTR),
                    ("LastWritten", wintypes.FILETIME), ("CredentialBlobSize", wintypes.DWORD),
                    ("CredentialBlob", ctypes.POINTER(ctypes.c_ubyte)),
                    ("Persist", wintypes.DWORD), ("AttributeCount", wintypes.DWORD),
                    ("Attributes", ctypes.c_void_p), ("TargetAlias", wintypes.LPWSTR),
                    ("UserName", wintypes.LPWSTR),
                ]

            self.ctypes = ctypes
            self.CREDENTIALW = CREDENTIALW
            self.PCREDENTIALW = ctypes.POINTER(CREDENTIALW)
            self.dll = ctypes.WinDLL("Advapi32.dll", use_last_error=True)
            self.dll.CredWriteW.argtypes = [ctypes.POINTER(CREDENTIALW), wintypes.DWORD]
            self.dll.CredWriteW.restype = wintypes.BOOL
            self.dll.CredReadW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(self.PCREDENTIALW)]
            self.dll.CredReadW.restype = wintypes.BOOL
            self.dll.CredDeleteW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD]
            self.dll.CredDeleteW.restype = wintypes.BOOL
            self.dll.CredFree.argtypes = [ctypes.c_void_p]
            self.dll.CredFree.restype = None
        except (AttributeError, OSError):
            raise CredentialBackendUnavailable("windows_credential_manager") from None

    def write_generic(self, target, username, blob):
        if len(blob) > self.MAX_BLOB_BYTES:
            raise CredentialWriteError("windows_credential_manager")
        buffer = (self.ctypes.c_ubyte * len(blob)).from_buffer_copy(blob)
        credential = self.CREDENTIALW()
        credential.Type = self.CRED_TYPE_GENERIC
        credential.TargetName = target
        credential.CredentialBlobSize = len(blob)
        credential.CredentialBlob = self.ctypes.cast(buffer, self.ctypes.POINTER(self.ctypes.c_ubyte))
        credential.Persist = self.CRED_PERSIST_LOCAL_MACHINE
        credential.UserName = username
        if not self.dll.CredWriteW(self.ctypes.byref(credential), 0):
            raise CredentialWriteError("windows_credential_manager", self.ctypes.get_last_error())

    def read_generic(self, target):
        pointer = self.PCREDENTIALW()
        if not self.dll.CredReadW(target, self.CRED_TYPE_GENERIC, 0, self.ctypes.byref(pointer)):
            code = self.ctypes.get_last_error()
            if code == self.ERROR_NOT_FOUND:
                return None
            raise CredentialReadError("windows_credential_manager", code)
        try:
            credential = pointer.contents
            return self.ctypes.string_at(credential.CredentialBlob, credential.CredentialBlobSize)
        finally:
            self.dll.CredFree(pointer)

    def delete_generic(self, target):
        if self.dll.CredDeleteW(target, self.CRED_TYPE_GENERIC, 0):
            return
        code = self.ctypes.get_last_error()
        if code != self.ERROR_NOT_FOUND:
            raise CredentialDeleteError("windows_credential_manager", code)


class WindowsCredentialManagerStore(_ProbeMixin):
    def __init__(self, environment, profile_hash, device_id, api=None):
        self.service = credential_service(environment, profile_hash)
        self.account = device_id
        self._probe_account = f"{device_id}.probe"
        self.api = api if api is not None else WindowsCredentialApi()

    def backend_name(self):
        return "windows_credential_manager"

    def is_available(self):
        return True

    def _target(self, account):
        return f"{self.service}/{account}"

    def _get(self, account):
        blob = self.api.read_generic(self._target(account))
        if blob is None:
            return None
        try:
            return blob.decode("utf-8")
        except (AttributeError, UnicodeDecodeError):
            raise CredentialReadError(self.backend_name()) from None

    def get(self):
        return self._get(self.account)

    def _set(self, value, account):
        if not value:
            raise ValueError("empty credential")
        blob = value.encode("utf-8")
        if len(blob) > self.api.MAX_BLOB_BYTES:
            raise CredentialWriteError(self.backend_name())
        self.api.write_generic(self._target(account), account, blob)

    def set(self, value):
        self._set(value, self.account)

    def _delete(self, account):
        self.api.delete_generic(self._target(account))

    def delete(self):
        self._delete(self.account)


class UnsupportedCredentialStore:
    def __init__(self, platform_name):
        self.platform_name = platform_name

    def backend_name(self):
        return "unsupported"

    def is_available(self):
        return False

    def _raise(self, *args):
        raise UnsupportedCredentialPlatform(self.backend_name())

    get = set = delete = probe = _raise


def create_credential_store(environment, profile_hash, device_id, platform_name=None, windows_api=None):
    name = platform.system() if platform_name is None else platform_name
    if name == "Darwin":
        return MacOSKeychainStore(environment, profile_hash, device_id)
    if name == "Windows":
        return WindowsCredentialManagerStore(environment, profile_hash, device_id, windows_api)
    return UnsupportedCredentialStore(name)


class FakeCredentialStore(_ProbeMixin):
    def __init__(self, available=True, backend="fake"):
        self.value = None; self.probe_value = None; self.available = available; self.backend = backend
        self._probe_account = "probe"
    def backend_name(self): return self.backend
    def is_available(self): return self.available
    def _get(self, account):
        if not self.available: raise CredentialBackendUnavailable(self.backend)
        return self.probe_value if account == self._probe_account else self.value
    def get(self): return self._get("real")
    def _set(self, value, account):
        if not self.available: raise CredentialBackendUnavailable(self.backend)
        if account == self._probe_account: self.probe_value = value
        else: self.value = value
    def set(self, value): self._set(value, "real")
    def _delete(self, account):
        if not self.available: raise CredentialBackendUnavailable(self.backend)
        if account == self._probe_account: self.probe_value = None
        else: self.value = None
    def delete(self): self._delete("real")
