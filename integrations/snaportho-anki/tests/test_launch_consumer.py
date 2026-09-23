import os
import sys
import unittest

ROOT = os.path.join(os.path.dirname(__file__), "..", "addon")
sys.path.insert(0, ROOT)

from snaportho_reviewer.launch_consumer import consume_pending_launches, open_launch_command


class Card:
    def __init__(self, card_id):
        self.id = card_id


class Gateway:
    def __init__(self, matches):
        self.matches = matches
        self.queries = []

    def cards_by_guid_ordinal(self, guid, ordinal):
        self.queries.append((guid, ordinal))
        return self.matches


class Opener:
    def __init__(self):
        self.opened = []

    def open_card(self, card):
        self.opened.append(card.id)


class Client:
    def __init__(self, pending):
        self.pending = pending
        self.claimed = []
        self.acks = []

    def poll_pending(self):
        return self.pending

    def claim(self, command_id):
        self.claimed.append(command_id)
        return True

    def acknowledge(self, ack):
        self.acks.append(ack)


class LaunchConsumerTests(unittest.TestCase):
    def test_one_match_opens_by_guid_and_ordinal(self):
        gateway = Gateway([Card(7)])
        opener = Opener()
        ack = open_launch_command(gateway, opener, {
            "launchCommandId": "cmd-1",
            "noteGuid": "note-primary",
            "cardOrdinal": 0,
        })
        self.assertEqual(ack["status"], "opened")
        self.assertEqual(ack["contractVersion"], "claim-overlap.v1")
        self.assertEqual(ack["resolvedNativeCardId"], "7")
        self.assertIn("acknowledgedAt", ack)
        self.assertEqual(opener.opened, [7])
        self.assertEqual(gateway.queries, [("note-primary", 0)])

    def test_missing_and_ambiguous_do_not_open(self):
        opener = Opener()
        missing = open_launch_command(Gateway([]), opener, {"launchCommandId": "a", "noteGuid": "gone", "cardOrdinal": 1})
        ambiguous = open_launch_command(Gateway([Card(1), Card(2)]), opener, {"launchCommandId": "b", "noteGuid": "dup", "cardOrdinal": 0})
        self.assertEqual(missing["status"], "not_found")
        self.assertEqual(ambiguous["status"], "ambiguous")
        self.assertEqual(opener.opened, [])

    def test_deck_name_is_rejected_before_lookup(self):
        gateway = Gateway([Card(7)])
        ack = open_launch_command(gateway, Opener(), {
            "launchCommandId": "cmd-deck",
            "noteGuid": "note-primary",
            "cardOrdinal": 0,
            "deckName": "SnapOrtho",
        })
        self.assertEqual(ack["status"], "unsupported")
        self.assertEqual(gateway.queries, [])

    def test_queue_claims_and_acknowledges(self):
        client = Client([{
            "launchCommandId": "cmd-1",
            "noteGuid": "note-primary",
            "cardOrdinal": 0,
        }])
        acks = consume_pending_launches(client, Gateway([Card(9)]), Opener(), limit=3)
        self.assertEqual(client.claimed, ["cmd-1"])
        self.assertEqual(acks[0]["status"], "opened")
        self.assertEqual(client.acks[0]["resolvedNativeCardId"], "9")


if __name__ == "__main__":
    unittest.main()
