import os
import platform
import sys
import unittest
import uuid

ROOT = os.path.join(os.path.dirname(__file__), "..", "addon")
sys.path.insert(0, ROOT)

from snaportho_reviewer.credential_store import WindowsCredentialManagerStore


@unittest.skipUnless(
    platform.system() == "Windows" and os.environ.get("SNAPORTHO_NATIVE_CREDENTIAL_TESTS") == "1",
    "opt-in Windows Credential Manager integration",
)
class WindowsCredentialNativeTests(unittest.TestCase):
    def test_write_read_restart_boundary_and_delete(self):
        profile = f"ci-{uuid.uuid4().hex}"
        token = f"test-{uuid.uuid4().hex}"
        store = WindowsCredentialManagerStore("test", profile, "native-smoke")
        try:
            store.set(token)
            self.assertEqual(store.get(), token)
            reopened = WindowsCredentialManagerStore("test", profile, "native-smoke")
            self.assertEqual(reopened.get(), token)
        finally:
            store.delete()
        self.assertIsNone(store.get())


if __name__ == "__main__":
    unittest.main()
