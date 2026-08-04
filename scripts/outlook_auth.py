#!/usr/bin/env python3
"""CLI for Microsoft 365 / Outlook Graph authentication."""
import argparse
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from graph.microsoft_graph import (  # noqa: E402
    complete_device_flow,
    get_auth_status,
    logout,
    start_device_flow,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Outlook Graph authentication")
    parser.add_argument(
        "action",
        choices=["status", "start", "complete", "logout"],
        help="Auth action",
    )
    args = parser.parse_args()

    try:
        if args.action == "status":
            payload = get_auth_status()
        elif args.action == "start":
            payload = start_device_flow()
        elif args.action == "complete":
            payload = complete_device_flow()
        else:
            logout()
            payload = {"success": True, "message": "Signed out."}
        print(json.dumps(payload))
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
