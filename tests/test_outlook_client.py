import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

# Keep this URL-construction test independent of optional runtime dependencies.
requests_stub = types.ModuleType("requests")
requests_stub.exceptions = types.SimpleNamespace(RequestException=Exception)
sys.modules.setdefault("requests", requests_stub)

auth_stub = types.ModuleType("graph.microsoft_graph")
auth_stub.authenticate_and_get_token = lambda *_args, **_kwargs: "token"
sys.modules.setdefault("graph.microsoft_graph", auth_stub)

from graph.outlook_client import OutlookClient  # noqa: E402


class SentItemsQueryTests(unittest.TestCase):
    def test_datetimeoffset_filter_values_are_not_quoted(self):
        client = OutlookClient("client-id", "tenant-id", ["Mail.Read"])

        with patch.object(client, "_paginate", return_value=[]) as paginate:
            result = client.get_sent_items_for_timekeeper(
                "2026-07-04", "2026-08-04"
            )

        self.assertEqual(result, [])
        url = paginate.call_args.args[0]
        self.assertIn(
            "$filter=sentDateTime%20ge%202026-07-04T00%3A00%3A00Z%20"
            "and%20sentDateTime%20lt%202026-08-05T00%3A00%3A00Z",
            url,
        )
        self.assertNotIn("%27", url)
        self.assertNotIn("'2026-", url)


if __name__ == "__main__":
    unittest.main()
