import os
import sys
import unittest
from types import SimpleNamespace

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "addon"))
from snaportho_reviewer.deck_sync_v2 import checksum, fetch_update_pages
from snaportho_reviewer.master_deck import MasterDeckDialog
from snaportho_reviewer.sync import installed_deck_presence


def page(cursor, remaining=0):
    payload = {"noteGuid": "legacy-guid"}
    ops = [{"cursor": cursor, "operation": "upsert_note", "payload": payload,
            "payloadChecksum": checksum(payload)}]
    return {"contractVersion": "snaportho-anki-note-sync.v2", "operations": ops,
            "nextCursor": cursor, "remaining": remaining, "pageChecksum": checksum(ops)}


class InstallRoutingTests(unittest.TestCase):
    def test_legacy_collection_skips_guid_probe_and_full_scan(self):
        class Collection:
            def find_notes(self, query): return []
            def find_cards(self, query): raise AssertionError("must not scan entire collection")
        col = Collection()
        store = SimpleNamespace(deck_subscription=lambda: {"cursor": 999})
        self.assertFalse(installed_deck_presence(col, store)["installed"])
        calls = []
        dialog = SimpleNamespace(
            runtime=SimpleNamespace(mw=SimpleNamespace(col=col), store=store),
            _set_installed_layout=lambda value: calls.append(value),
            _load_bootstrap_release=lambda inventory: calls.append("install"),
            _load_v2_status=lambda inventory: self.fail("legacy notes are not installed"))
        MasterDeckDialog._load_release_and_plan(dialog)
        self.assertEqual(calls, [False, "install"])

    def test_pages_report_progress(self):
        calls = []
        api = SimpleNamespace(deck_v2_updates=lambda cursor, limit: (200, page(cursor+1, 1 if cursor==0 else 0)))
        pages = fetch_update_pages(api, 0, progress=lambda *args: calls.append(args))
        self.assertEqual(len(pages), 2)
        self.assertEqual(calls, [(1, 1, 1), (2, 2, 2)])

    def test_repeated_cursor_stops(self):
        api = SimpleNamespace(deck_v2_updates=lambda cursor, limit: (200, page(1, 1)))
        with self.assertRaisesRegex(ValueError, "cursor_not_strictly_increasing"):
            fetch_update_pages(api, 0)

    def test_empty_page_with_remaining_stops(self):
        empty = {**page(0, 1), "operations": [], "pageChecksum": checksum([])}
        api = SimpleNamespace(deck_v2_updates=lambda cursor, limit: (200, empty))
        with self.assertRaisesRegex(ValueError, "update_cursor_stalled"):
            fetch_update_pages(api, 0)

    def test_deadline_cancellation_and_page_bound(self):
        api = SimpleNamespace(deck_v2_updates=lambda cursor, limit: (200, page(cursor+1, 1)))
        with self.assertRaisesRegex(RuntimeError, "page_limit"):
            fetch_update_pages(api, 0, max_pages=2)
        with self.assertRaisesRegex(RuntimeError, "cancelled"):
            fetch_update_pages(api, 0, cancelled=lambda: True)
        ticks = iter([0, 0, 181])
        with self.assertRaisesRegex(RuntimeError, "timeout"):
            fetch_update_pages(api, 0, clock=lambda: next(ticks))


if __name__ == "__main__": unittest.main()
